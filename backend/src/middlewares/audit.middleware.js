const auditService = require('../services/audit.service');

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^job_/i;

/** Parses `/api/v1/applications/:id/process` → { entity, entityId, action }. */
function parsePath(originalUrl) {
  const path = originalUrl.split('?')[0];
  const parts = path.split('/').filter(Boolean).filter((p) => p !== 'api' && p !== 'v1');
  const entity = parts[0] || null;
  if (parts[1] && IDISH.test(parts[1])) {
    return { entity, entityId: parts[1], action: parts.slice(2).join('/') || null };
  }
  return { entity, entityId: null, action: parts.slice(1).join('/') || null };
}

/**
 * Records every successful write as an audit_log row. Registered app-wide; reads
 * req.user at res `finish` (after authenticate has run in the route chain).
 */
function auditRequests(req, res, next) {
  if (WRITE.has(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const { entity, entityId, action } = parsePath(req.originalUrl);
      auditService.record({
        actor_id: req.user?.id || null,
        actor_email: req.user?.email || req.body?.email || null,
        action: action || req.method,
        entity,
        entity_id: entityId,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ip: req.ip,
      });
    });
  }
  next();
}

module.exports = { auditRequests };
