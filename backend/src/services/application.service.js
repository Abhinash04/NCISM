const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const config = require('../config');
const appRepo = require('../repositories/application.repository');
const clarificationRepo = require('../repositories/clarification.repository');
const hearingRepo = require('../repositories/hearing.repository');
const userRepo = require('../repositories/user.repository');
const letterService = require('./letter.service');
const penaltyService = require('./penalty.service');
const rulesetService = require('./ruleset.service');
const queueService = require('./queue.service');
const institutionRepo = require('../repositories/institution.repository');
const jobService = require('./job.service');
const extractionService = require('./extraction.service');
const assessmentService = require('./assessment.service');
const workflow = require('./workflow.service');
const ApiError = require('../utils/api-error');
const createLogger = require('../utils/logger');

const logger = createLogger('ApplicationService');
const UPLOADS_DIR = path.join(config.dataDir, 'applications'); // persistent (survives job retention purge)

/** Computes the ownership context the workflow guard needs for this user × case. */
async function buildContext(app, user) {
  const isAssignedJunior = !!app.assigned_to && app.assigned_to === user.id;

  let isAllottedJunior = false;
  if ((user.roles || []).includes('junior_consultant')) {
    const hit = await db('staff_allotments')
      .where({ user_id: user.id, system: app.system, state: app.state }).first('id');
    isAllottedJunior = !!hit;
  }

  let supervisesSubmitter = false;
  if (app.submitted_by && (user.roles || []).includes('senior_consultant')) {
    const sub = await db('users').where({ id: app.submitted_by }).first('supervisor_id');
    supervisesSubmitter = !!sub && sub.supervisor_id === user.id;
  }

  const isCollegeOwner = (user.roles || []).includes('college')
    && !!user.institution_id && user.institution_id === app.institution_id;

  const isUploader = !!app.uploaded_by && app.uploaded_by === user.id;

  let isHearingMember = false;
  if ((user.roles || []).includes('hearing_committee')) {
    const active = await hearingRepo.activeForCase(app.id);
    isHearingMember = !!active && (await hearingRepo.isMember(active.id, user.id));
  }

  return { isAssignedJunior, isAllottedJunior, supervisesSubmitter, isCollegeOwner, isHearingMember, isUploader };
}

async function getForUser(id, user) {
  const app = await appRepo.getById(id);
  if (!app) throw ApiError.notFound('CASE_NOT_FOUND', `Application ${id} not found`);
  const ctx = await buildContext(app, user);
  return { app, ctx, allowedActions: workflow.allowedActions(app, user, ctx) };
}

function list(user) {
  return appRepo.queueFor(user);
}

async function getDetail(id, user) {
  const { allowedActions } = await getForUser(id, user);
  const app = await appRepo.getWithReport(id);
  return { ...app, allowedActions };
}

async function allowedActionsFor(id, user) {
  const { allowedActions } = await getForUser(id, user);
  return allowedActions;
}

function events(id) {
  return appRepo.listEvents(id);
}

/** Absolute path to a case's uploaded PDF, after an access check. Feeds the in-app viewer + download. */
async function sourcePath(id, user) {
  await getForUser(id, user); // 404 if the case isn't found / not visible to this user
  const pdfPath = path.join(UPLOADS_DIR, `${id}.pdf`);
  if (!fs.existsSync(pdfPath)) throw ApiError.notFound('SOURCE_NOT_FOUND', 'Uploaded report file is missing');
  return pdfPath;
}

/** Visitor uploads a report for an institution → a new case in `uploaded`. */
async function createUpload({ file, institutionId, session, user, intake, level, permissionType, visitationFrom, visitationTo, visitationMode }) {
  if (!file) throw ApiError.badRequest('NO_FILE', 'A report PDF is required');
  const institution = await institutionRepo.getById(institutionId);
  if (!institution) throw ApiError.badRequest('VALIDATION_ERROR', 'Unknown institution');

  const app = await appRepo.create({
    institution_id: institution.id,
    system: institution.system,
    state: institution.state,
    session: session || null,
    status: 'uploaded',
    uploaded_by: user.id,
    intake: intake ? parseInt(intake, 10) : null,
    level: level || 'UG',
    permission_type: permissionType || null,
    visitation_from: visitationFrom || null,
    visitation_to: visitationTo || null,
    visitation_mode: visitationMode || 'hybrid',
  });

  // Persist the raw PDF outside temp/ so job retention can't purge it before processing.
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.renameSync(file.path, path.join(UPLOADS_DIR, `${app.id}.pdf`));

  await appRepo.addEvent({ applicationId: app.id, fromState: null, toState: 'uploaded', actorId: user.id, note: 'Report uploaded' });
  return app;
}

/**
 * Junior triggers processing: guards, marks the case `processing`, then either
 * enqueues the engine run on the background worker (default) or runs it inline
 * (`ASYNC_PROCESSING=false`). Returns immediately in async mode.
 */
async function process(id, user) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'process');

  const pdfPath = path.join(UPLOADS_DIR, `${app.id}.pdf`);
  if (!fs.existsSync(pdfPath)) throw ApiError.notFound('SOURCE_NOT_FOUND', 'Uploaded report file is missing');

  const from = app.status;
  await appRepo.update(id, { status: 'processing', assigned_to: app.assigned_to || user.id, error: null });
  await appRepo.addEvent({ applicationId: id, fromState: from, toState: 'processing', actorId: user.id, note: 'Processing started' });

  if (config.asyncProcessing) {
    await queueService.enqueueProcessing(id, user.id);
    return appRepo.getById(id); // status: processing — the worker settles it
  }
  return runProcessing(id, user.id);
}

/**
 * Runs the extraction + assessment engines for a case already marked
 * `processing` and persists the report (→ `processed`) or the error (→ `failed`).
 * Called inline by `process` or by the background worker (queue.service).
 */
async function runProcessing(id, actorId) {
  const app = await appRepo.getById(id);
  const pdfPath = path.join(UPLOADS_DIR, `${app.id}.pdf`);
  try {
    // Resolve the active ruleset for this case's (system, level) — fails loudly
    // for systems whose ruleset has not been authored/activated yet.
    const { rulesetId, version: rulesetVersion } = await rulesetService.resolveForCase(app.system, app.level);

    const { jobId, jobDir, outputDir } = jobService.createJob();
    fs.copyFileSync(pdfPath, path.join(jobDir, 'input.pdf'));
    const result = await extractionService.extract(path.join(jobDir, 'input.pdf'), outputDir, 'application/pdf');
    jobService.createManifest(jobId, `${app.institute_id || app.id}.pdf`, fs.statSync(pdfPath).size, '0',
      result.artifacts || {}, result.status || 'success', result.warnings || [], result.failedPages || []);

    const output = await assessmentService.generate({ jobId, rulesetId, rulesetVersion });

    const updated = await appRepo.update(id, {
      status: 'processed', job_id: jobId,
      report_markdown: output.reportMarkdown, report_json: JSON.stringify(output.result),
    });
    await appRepo.addEvent({ applicationId: id, fromState: 'processing', toState: 'processed', actorId, note: 'Assessment report generated' });
    return updated;
  } catch (error) {
    logger.error(`Processing failed for case ${id}:`, error);
    const updated = await appRepo.update(id, { status: 'failed', error: error.message });
    await appRepo.addEvent({ applicationId: id, fromState: 'processing', toState: 'failed', actorId, note: error.message });
    return updated;
  }
}

/** Junior submits the generated report up to their senior consultant. */
async function submit(id, user) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'submit');
  const updated = await appRepo.update(id, { status: 'senior_review', submitted_by: user.id });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'senior_review', actorId: user.id, note: 'Submitted for senior review' });
  return updated;
}

/** Senior forwards to the board or returns to the junior. */
async function review(id, user, { action, note }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, action); // 'forward' | 'return'
  const toState = action === 'forward' ? 'board_review' : 'under_validation';
  const updated = await appRepo.update(id, { status: toState, reviewed_by: user.id });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState, actorId: user.id, note: note || (action === 'forward' ? 'Forwarded to board' : 'Returned to junior') });
  return updated;
}

/** Board approves (grant) or rejects (back to junior). Approve carries a structured outcome. */
async function decide(id, user, { action, note, outcome, approvedSeats }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, action); // 'approve' | 'reject'
  const toState = action === 'approve' ? 'approved' : 'rejected';
  const patch = { status: toState, decision: toState, decision_note: note || null, decided_by: user.id };
  if (action === 'approve') {
    patch.outcome = outcome || 'grant';
    patch.approved_seats = Number.isFinite(approvedSeats) ? approvedSeats : (approvedSeats ? parseInt(approvedSeats, 10) : null);
  }
  let updated = await appRepo.update(id, patch);
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState, actorId: user.id, note: note || `Board ${toState}${action === 'approve' && outcome ? ` (${outcome})` : ''}` });
  // Auto-derive the seat-reduction / denial penalty ledger from the punitive summary.
  if (action === 'approve') { await penaltyService.deriveForCase(updated, user); updated = await appRepo.getById(id); }
  return updated;
}

/** Penalty ledger for a case. */
function penalties(id) {
  return penaltyService.list(id);
}

/** Dealing staff adds a manual penalty (monetary / teacher-code revocation). */
function addPenalty(id, user, body) {
  return penaltyService.addManual(id, body || {}, user);
}

/** Board issues a clarification letter to the college → opens a response window. */
async function requestClarification(id, user, { letterText }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'request_clarification');
  if (!letterText || !letterText.trim()) throw ApiError.badRequest('VALIDATION_ERROR', 'letterText is required');

  const round = (await clarificationRepo.countFor(id)) + 1;
  await clarificationRepo.create({ application_id: id, round, letter_text: letterText, issued_by: user.id, status: 'open' });
  // The confirmed text is the edited Clarification Letter → store it as an issued letter too.
  await letterService.issue(app, { kind: 'clarification', content: letterText, actor: user });
  const updated = await appRepo.update(id, { status: 'clarification_open' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'clarification_open', actorId: user.id, note: `Clarification requested (round ${round})` });
  return updated;
}

/** College answers the open clarification (text + optional PDF). */
async function respondClarification(id, user, { file, responseText }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'respond');

  const open = await clarificationRepo.latestOpen(id);
  if (!open) throw ApiError.badRequest('NO_OPEN_CLARIFICATION', 'No open clarification to respond to');

  let responseFile = null;
  if (file) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    responseFile = `${id}-clarification-${open.round}.pdf`;
    fs.renameSync(file.path, path.join(UPLOADS_DIR, responseFile));
  }

  await clarificationRepo.update(open.id, {
    response_text: responseText || null, response_file: responseFile,
    responded_by: user.id, responded_at: db.fn.now(), status: 'responded',
  });
  const updated = await appRepo.update(id, { status: 'clarification_responded' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'clarification_responded', actorId: user.id, note: `College responded (round ${open.round})` });
  return updated;
}

/** Consultant reviews clarification submitted by college */
async function reviewClarification(id, user, { remarks, verdict }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'review_clarification');

  const latestResponded = await clarificationRepo.latestResponded(id);
  if (latestResponded) {
    await clarificationRepo.update(latestResponded.id, {
      review_remarks: remarks || null,
      review_verdict: verdict || 'accepted',
      reviewed_by: user.id,
      reviewed_at: db.fn.now(),
    });
  }

  const updated = await appRepo.update(id, { status: 'clarification_reviewed' });
  await appRepo.addEvent({
    applicationId: id,
    fromState: app.status,
    toState: 'clarification_reviewed',
    actorId: user.id,
    note: remarks ? `Clarification reviewed (${verdict || 'accepted'}): ${remarks}` : `Clarification reviewed (${verdict || 'accepted'})`,
  });
  return updated;
}

/** Consultant requests revision on incomplete clarification response */
async function requestRevision(id, user, { remarks }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'request_revision');
  if (!remarks || !remarks.trim()) throw ApiError.badRequest('VALIDATION_ERROR', 'Revision remarks are required');

  const count = await clarificationRepo.countFor(id);
  const nextRound = count + 1;

  const letterText = `[Revision R${count}] Further clarification required:\n\n${remarks}`;
  await clarificationRepo.create({
    application_id: id,
    round: nextRound,
    letter_text: letterText,
    issued_by: user.id,
    status: 'open',
  });

  const updated = await appRepo.update(id, { status: 'clarification_open' });
  await appRepo.addEvent({
    applicationId: id,
    fromState: app.status,
    toState: 'clarification_open',
    actorId: user.id,
    note: `Clarification revision requested (Round ${nextRound}): ${remarks}`,
  });
  return updated;
}

function clarifications(id) {
  return clarificationRepo.list(id);
}

/** Board flags unresolved shortcomings for a hearing. */
async function requestHearing(id, user, { note } = {}) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'request_hearing');
  const updated = await appRepo.update(id, { status: 'hearing_requested' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'hearing_requested', actorId: user.id, note: note || 'Hearing requested' });
  return updated;
}

/** President appoints the 2-member hearing committee (SoD-03). */
async function appointCommittee(id, user, { memberIds, scheduledAt }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'appoint_committee');
  const members = Array.isArray(memberIds) ? [...new Set(memberIds)] : [];
  if (members.length !== 2) throw ApiError.badRequest('VALIDATION_ERROR', 'Exactly two committee members are required');

  const hearing = await hearingRepo.create({ application_id: id, appointed_by: user.id, scheduled_at: scheduledAt || null, status: 'open' });
  await hearingRepo.addMembers(hearing.id, members);
  const updated = await appRepo.update(id, { status: 'hearing_scheduled' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'hearing_scheduled', actorId: user.id, note: 'Hearing committee appointed' });
  // Auto-issue the Hearing Notice (with/without prior clarification depending on the case history).
  const hadClarification = (await clarificationRepo.countFor(id)) > 0;
  const kind = hadClarification ? 'hearing_with_clarification' : 'hearing_without_clarification';
  await letterService.issue(app, { kind, actor: user });
  return updated;
}

/** Committee records minutes; the case returns to the board. */
async function recordMinutes(id, user, { minutes, verdict }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'record_minutes');
  const active = await hearingRepo.activeForCase(id);
  if (!active) throw ApiError.badRequest('NO_OPEN_HEARING', 'No open hearing for this case');

  await hearingRepo.update(active.id, {
    status: 'held', minutes_text: minutes || null, verdict: verdict || null,
    recorded_by: user.id, recorded_at: db.fn.now(),
  });
  const updated = await appRepo.update(id, { status: 'board_review' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'board_review', actorId: user.id, note: `Hearing minutes recorded${verdict ? ` — ${verdict}` : ''}` });
  return updated;
}

/** Secretariat dispatches the final order → the case closes. */
async function dispatchOrder(id, user, { orderText } = {}) {
  const { app, ctx } = await getForUser(id, user);

  // Compliance must be 'complied' before dispatch. Checked BEFORE the workflow
  // guard so a forced API call gets this clear message (allowedActions already
  // hides the button by filtering dispatch_order while compliance is monitoring).
  if (app.compliance_status && app.compliance_status !== 'complied') {
    throw ApiError.badRequest('COMPLIANCE_INCOMPLETE', 'Dispatch Final Order is blocked until application compliance status becomes complied.');
  }

  workflow.assertCan(app, user, ctx, 'dispatch_order');

  // Issue the Final Order (edited text if provided, else generated from the outcome + punitive data).
  await letterService.issue(app, { kind: 'final_order', content: orderText || null, actor: user });
  const updated = await appRepo.update(id, { status: 'closed', decision_note: orderText || app.decision_note });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'closed', actorId: user.id, note: orderText || 'Final order dispatched' });
  return updated;
}

function hearings(id) {
  return hearingRepo.listForCase(id);
}

function committeeMembers() {
  return userRepo.listByRole('hearing_committee');
}

/** Issued letters for a case (Letters tab). */
function letters(id) {
  return letterService.list(id);
}

/**
 * Monetary penalty rates for a case, derived from its active ruleset's punitive
 * policy JSON (not hardcoded). Currently exposes the ghost-faculty per-instance
 * amount (PUNITIVE POLICY §§ 4–5). Falls back to the standard ₹25 lakh if the
 * policy has no monetary entry.
 */
async function penaltyPolicy(id, user) {
  const { app } = await getForUser(id, user);
  const FALLBACK_GHOST = 2500000;
  try {
    const { rulesetId, version } = await rulesetService.resolveForCase(app.system, app.level);
    const dir = path.join(config.dataDir, 'rulesets', rulesetId, version);
    const file = fs.readdirSync(dir).find((f) => /^punitive-policy.*\.json$/i.test(f));
    if (file) {
      const policy = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const ghost = policy?.entries?.['ghost-faculty']?.amountPerInstance;
      return { ghostFacultyPenalty: Number.isFinite(ghost) ? ghost : FALLBACK_GHOST };
    }
  } catch {
    // No active ruleset / unreadable policy → fall back to the standard rate.
  }
  return { ghostFacultyPenalty: FALLBACK_GHOST };
}

/** A drafted (unstored) letter of the given kind, for the board to review/edit before issuing. */
async function previewLetter(id, user, kind) {
  const { app } = await getForUser(id, user);
  const { contentMarkdown } = await letterService.render(kind, app, user);
  return contentMarkdown;
}

/**
 * Hard-deletes a case. The uploader (visitor) may remove their own pre-processing
 * upload; admin may delete any non-finalized case (the guard enforces both). Row
 * children cascade via FK; the on-disk PDF(s) are removed here. The DELETE is
 * recorded in audit_log (path-derived, survives the cascade).
 */
async function remove(id, user) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'delete');

  // Remove the raw upload + any clarification-response PDFs (all named `<id>*.pdf`).
  if (fs.existsSync(UPLOADS_DIR)) {
    for (const name of fs.readdirSync(UPLOADS_DIR)) {
      if (name.startsWith(app.id)) fs.unlinkSync(path.join(UPLOADS_DIR, name));
    }
  }

  await appRepo.deleteById(id);
  return { id };
}

/** Junior reopens a rejected case for rework. */
async function revise(id, user) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'revise');
  const updated = await appRepo.update(id, { status: 'under_validation' });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState: 'under_validation', actorId: user.id, note: 'Reopened for revision' });
  return updated;
}

module.exports = {
  list, getDetail, allowedActionsFor, events, sourcePath,
  createUpload, process, runProcessing, submit, review, decide, revise, remove,
  requestClarification, respondClarification, reviewClarification, requestRevision, clarifications,
  requestHearing, appointCommittee, recordMinutes, dispatchOrder, hearings, committeeMembers,
  letters, previewLetter, penalties, addPenalty, penaltyPolicy,
};
