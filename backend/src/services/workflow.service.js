/**
 * Phase 3a workflow policy — the single source of truth for which actions a user
 * may take on a case, given its status × their roles × ownership. Pure: callers
 * pass a precomputed ownership `ctx` (see application.service.buildContext). Both
 * the transition endpoints and GET /:id/allowed-actions call this, so the UI and
 * the guard can never disagree.
 */

const ApiError = require('../utils/api-error');

// status → { action: [capability, ...] }  (any capability satisfies the action)
const POLICY = {
  uploaded: { process: ['junior_allotted'] },
  failed: { process: ['junior_allotted'] },
  processing: {},
  processed: { process: ['junior_owner'], submit: ['junior_owner'] },
  under_validation: { process: ['junior_owner'], submit: ['junior_owner'] },
  senior_review: { forward: ['senior_supervisor'], return: ['senior_supervisor'] },
  board_review: { approve: ['board'], reject: ['board'] },
  approved: {},
  rejected: { revise: ['junior_owner_allotted'] },
};

function hasCapability(cap, user, ctx) {
  const roles = user.roles || [];
  const isJunior = roles.includes('junior_consultant');
  switch (cap) {
    case 'junior_allotted': return isJunior && ctx.isAllottedJunior;
    case 'junior_owner': return isJunior && ctx.isAssignedJunior;
    case 'junior_owner_allotted': return isJunior && (ctx.isAssignedJunior || ctx.isAllottedJunior);
    case 'senior_supervisor': return roles.includes('senior_consultant') && ctx.supervisesSubmitter;
    case 'board': return roles.includes('board_member') || roles.includes('president');
    default: return false;
  }
}

/** Actions the user may take on this case right now. */
function allowedActions(app, user, ctx) {
  const forState = POLICY[app.status] || {};
  return Object.entries(forState)
    .filter(([, caps]) => caps.some((c) => hasCapability(c, user, ctx)))
    .map(([action]) => action);
}

/** Throws 403 (or 423 for a finalized case) unless the action is allowed. */
function assertCan(app, user, ctx, action) {
  if (app.status === 'approved') {
    throw ApiError.locked('CASE_FINALIZED', 'Approved cases are immutable');
  }
  if (!allowedActions(app, user, ctx).includes(action)) {
    throw ApiError.forbidden('ACTION_NOT_ALLOWED', `Action "${action}" not allowed on a ${app.status} case for your role`);
  }
}

module.exports = { allowedActions, assertCan, POLICY };
