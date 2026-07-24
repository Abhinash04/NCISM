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
  uploaded: { process: ['consultant_allotted'], delete: ['uploader'] },
  failed: { process: ['consultant_allotted'], delete: ['uploader'] },
  processing: {},
  processed: { process: ['consultant_owner'], submit: ['consultant_owner'] },
  under_validation: { process: ['consultant_owner'], submit: ['consultant_owner'] },
  senior_review: { forward: ['senior_supervisor'], return: ['senior_supervisor'] },
  board_review: { approve: ['board'], reject: ['board'], request_clarification: ['board'], request_hearing: ['board'] },
  clarification_open: { respond: ['college_owner'] },
  clarification_responded: { review_clarification: ['consultant_owner_allotted', 'consultant_owner'] },
  clarification_reviewed: { process: ['consultant_owner'], submit: ['consultant_owner'], request_revision: ['consultant_owner'] },
  hearing_requested: { appoint_committee: ['president'] },
  hearing_scheduled: { record_minutes: ['committee_member'] },
  approved: { dispatch_order: ['secretariat'] },
  closed: {},
  rejected: { revise: ['consultant_owner_allotted'] },
};

function hasCapability(cap, user, ctx) {
  const roles = user.roles || [];
  const isconsultant = roles.includes('consultant');
  switch (cap) {
    case 'consultant_allotted': return isconsultant && ctx.isAllottedconsultant;
    case 'consultant_owner': return isconsultant && ctx.isAssignedconsultant;
    case 'consultant_owner_allotted': return isconsultant && (ctx.isAssignedconsultant || ctx.isAllottedconsultant);
    case 'senior_supervisor': return roles.includes('senior_consultant') && ctx.supervisesSubmitter;
    case 'board': return roles.includes('board_member') || roles.includes('president');
    case 'president': return roles.includes('president');
    case 'committee_member': return roles.includes('hearing_committee') && ctx.isHearingMember;
    case 'secretariat': return roles.includes('secretariat');
    case 'college_owner': return roles.includes('college') && ctx.isCollegeOwner;
    case 'uploader': return roles.includes('visitor') && ctx.isUploader;
    default: return false;
  }
}

/** Actions the user may take on this case right now. */
function allowedActions(app, user, ctx) {
  const forState = POLICY[app.status] || {};
  let actions = Object.entries(forState)
    .filter(([, caps]) => caps.some((c) => hasCapability(c, user, ctx)))
    .map(([action]) => action);

  // Bug 5: Final order dispatch remains disabled unless compliance status is 'complied'
  if (app.status === 'approved' && app.compliance_status && app.compliance_status !== 'complied') {
    actions = actions.filter((a) => a !== 'dispatch_order');
  }

  // Admin override: may delete any case that is not finalized (approved/closed stay immutable).
  if ((user.roles || []).includes('admin') && app.status !== 'approved' && app.status !== 'closed'
    && !actions.includes('delete')) {
    actions.push('delete');
  }
  return actions;
}

/** Throws 403 (or 423 for a finalized case) unless the action is allowed. */
function assertCan(app, user, ctx, action) {
  // `closed` is fully terminal; `approved` accepts only the secretariat's dispatch.
  if (app.status === 'closed' || (app.status === 'approved' && action !== 'dispatch_order')) {
    throw ApiError.locked('CASE_FINALIZED', 'Case is finalized and immutable');
  }
  if (!allowedActions(app, user, ctx).includes(action)) {
    throw ApiError.forbidden('ACTION_NOT_ALLOWED', `Action "${action}" not allowed on a ${app.status} case for your role`);
  }
}

module.exports = { allowedActions, assertCan, POLICY };
