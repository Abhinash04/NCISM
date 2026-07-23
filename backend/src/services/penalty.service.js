const { db } = require('../db');
const penaltyRepo = require('../repositories/penalty.repository');
const appRepo = require('../repositories/application.repository');
const ApiError = require('../utils/api-error');

const MANUAL_TYPES = new Set(['monetary', 'teacher_code_revocation', 'seat_reduction', 'denial']);
const STATUSES = new Set(['pending', 'applied', 'paid', 'waived']);
const TERMINAL = new Set(['paid', 'waived']);

function parseReport(app) {
  try { return typeof app.report_json === 'string' ? JSON.parse(app.report_json) : app.report_json; } catch { return null; }
}

/** Auto-derives seat-reduction + denial penalties from the assessment's punitive summary. Idempotent. */
async function deriveForCase(appIn, actor) {
  if (await penaltyRepo.existsAutoFor(appIn.id)) return;
  const app = (await appRepo.getWithReport(appIn.id)) || appIn;
  const contributions = parseReport(app)?.punitiveSummary?.contributions || [];

  const rows = contributions.map((c) => ({
    application_id: app.id,
    type: c.type === 'denial' ? 'denial' : 'seat_reduction',
    description: c.detail || null,
    seats: c.type === 'denial' ? null : (c.seats || null),
    status: 'pending',
    source: 'auto',
    created_by: actor.id,
  }));

  if (rows.length) {
    await penaltyRepo.bulkCreate(rows);
    await db('applications').where({ id: app.id }).update({ compliance_status: 'monitoring' });
  }
}

async function addManual(applicationId, { type, description, amount, seats }, actor) {
  if (!MANUAL_TYPES.has(type)) throw ApiError.badRequest('VALIDATION_ERROR', `Unknown penalty type "${type}"`);
  const app = await appRepo.getById(applicationId);
  if (!app) throw ApiError.notFound('CASE_NOT_FOUND', `Application ${applicationId} not found`);

  const row = await penaltyRepo.create({
    application_id: applicationId, type,
    description: description || null,
    amount: type === 'monetary' && amount != null ? amount : null,
    seats: type === 'seat_reduction' && seats != null ? parseInt(seats, 10) : null,
    status: 'pending', source: 'manual', created_by: actor.id,
  });
  await db('applications').where({ id: applicationId }).whereNull('compliance_status').update({ compliance_status: 'monitoring' });
  return row;
}

async function updateStatus(penaltyId, status, actor) {
  if (!STATUSES.has(status)) throw ApiError.badRequest('VALIDATION_ERROR', `Unknown status "${status}"`);
  const penalty = await penaltyRepo.getById(penaltyId);
  if (!penalty) throw ApiError.notFound('PENALTY_NOT_FOUND', `Penalty ${penaltyId} not found`);

  const patch = { status };
  if (TERMINAL.has(status)) { patch.resolved_by = actor.id; patch.resolved_at = db.fn.now(); }
  else { patch.resolved_by = null; patch.resolved_at = null; }
  const updated = await penaltyRepo.update(penaltyId, patch);

  // Roll the case up to "complied" once nothing is pending/applied.
  const remaining = await penaltyRepo.unresolvedCount(penalty.application_id);
  await db('applications').where({ id: penalty.application_id })
    .update({ compliance_status: remaining === 0 ? 'complied' : 'monitoring' });
  return updated;
}

async function remove(penaltyId) {
  const penalty = await penaltyRepo.getById(penaltyId);
  if (!penalty) throw ApiError.notFound('PENALTY_NOT_FOUND', `Penalty ${penaltyId} not found`);
  await penaltyRepo.remove(penaltyId);

  // Roll the case status back up once the deleted penalty no longer counts.
  const remaining = await penaltyRepo.unresolvedCount(penalty.application_id);
  await db('applications').where({ id: penalty.application_id })
    .update({ compliance_status: remaining === 0 ? 'complied' : 'monitoring' });
  return { id: penaltyId };
}

function list(applicationId) {
  return penaltyRepo.listForCase(applicationId);
}

function queue(filters) {
  return penaltyRepo.queue(filters);
}

module.exports = { deriveForCase, addManual, updateStatus, remove, list, queue };
