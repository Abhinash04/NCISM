const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const config = require('../config');
const appRepo = require('../repositories/application.repository');
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

  return { isAssignedJunior, isAllottedJunior, supervisesSubmitter };
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

/** Visitor uploads a report for an institution → a new case in `uploaded`. */
async function createUpload({ file, institutionId, session, user }) {
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
  });

  // Persist the raw PDF outside temp/ so job retention can't purge it before processing.
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.renameSync(file.path, path.join(UPLOADS_DIR, `${app.id}.pdf`));

  await appRepo.addEvent({ applicationId: app.id, fromState: null, toState: 'uploaded', actorId: user.id, note: 'Report uploaded' });
  return app;
}

/** Junior runs the extraction + assessment engines and attaches the report. */
async function process(id, user) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, 'process');

  const pdfPath = path.join(UPLOADS_DIR, `${app.id}.pdf`);
  if (!fs.existsSync(pdfPath)) throw ApiError.notFound('SOURCE_NOT_FOUND', 'Uploaded report file is missing');

  const from = app.status;
  await appRepo.update(id, { status: 'processing', assigned_to: app.assigned_to || user.id, error: null });
  await appRepo.addEvent({ applicationId: id, fromState: from, toState: 'processing', actorId: user.id, note: 'Processing started' });

  try {
    const { jobId, jobDir, outputDir } = jobService.createJob();
    fs.copyFileSync(pdfPath, path.join(jobDir, 'input.pdf'));
    const result = await extractionService.extract(path.join(jobDir, 'input.pdf'), outputDir, 'application/pdf');
    jobService.createManifest(jobId, `${app.institute_id || app.id}.pdf`, fs.statSync(pdfPath).size, '0',
      result.artifacts || {}, result.status || 'success', result.warnings || [], result.failedPages || []);

    const output = await assessmentService.generate({ jobId });

    const updated = await appRepo.update(id, {
      status: 'processed', job_id: jobId,
      report_markdown: output.reportMarkdown, report_json: JSON.stringify(output.result),
    });
    await appRepo.addEvent({ applicationId: id, fromState: 'processing', toState: 'processed', actorId: user.id, note: 'Assessment report generated' });
    return updated;
  } catch (error) {
    logger.error(`Processing failed for case ${id}:`, error);
    const updated = await appRepo.update(id, { status: 'failed', error: error.message });
    await appRepo.addEvent({ applicationId: id, fromState: 'processing', toState: 'failed', actorId: user.id, note: error.message });
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

/** Board approves (grant) or rejects (back to junior). */
async function decide(id, user, { action, note }) {
  const { app, ctx } = await getForUser(id, user);
  workflow.assertCan(app, user, ctx, action); // 'approve' | 'reject'
  const toState = action === 'approve' ? 'approved' : 'rejected';
  const updated = await appRepo.update(id, { status: toState, decision: toState, decision_note: note || null, decided_by: user.id });
  await appRepo.addEvent({ applicationId: id, fromState: app.status, toState, actorId: user.id, note: note || `Board ${toState}` });
  return updated;
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
  list, getDetail, allowedActionsFor, events,
  createUpload, process, submit, review, decide, revise,
};
