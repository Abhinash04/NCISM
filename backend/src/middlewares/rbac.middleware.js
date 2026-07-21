const ApiError = require('../utils/api-error');

/**
 * Coarse capability guard: requires the authenticated user to hold a
 * permission key (e.g. 'assessment:approve'). Ownership + workflow-state
 * checks are layered on top inside services (see workflow-guard, Phase 4).
 * Must run after `authenticate`.
 */
function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('NO_TOKEN', 'Authentication required'));
    const held = new Set(req.user.permissions);
    const ok = required.every((p) => held.has(p));
    if (!ok) return next(ApiError.forbidden('FORBIDDEN', 'You do not have permission for this action', { required }));
    next();
  };
}

/** Requires the user to hold at least one of the given roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('NO_TOKEN', 'Authentication required'));
    if (!roles.some((r) => req.user.roles.includes(r))) {
      return next(ApiError.forbidden('FORBIDDEN', 'Insufficient role', { roles }));
    }
    next();
  };
}

module.exports = { requirePermission, requireRole };
