const auditRepo = require('../repositories/audit.repository');
const createLogger = require('../utils/logger');

const logger = createLogger('AuditService');

/** Fire-and-forget; auditing must never break the request path. */
async function record(evt) {
  try { await auditRepo.record(evt); } catch (err) { logger.error('audit record failed:', err.message); }
}

function list(filters) {
  return auditRepo.list(filters);
}

module.exports = { record, list };
