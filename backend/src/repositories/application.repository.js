const { db } = require('../db');

const FIELDS = [
  'applications.id', 'applications.institution_id', 'applications.system', 'applications.state',
  'applications.session', 'applications.status', 'applications.job_id', 'applications.decision',
  'applications.decision_note', 'applications.error',
  'applications.uploaded_by', 'applications.assigned_to', 'applications.submitted_by',
  'applications.reviewed_by', 'applications.decided_by',
  'applications.created_at', 'applications.updated_at',
];

/** Base select joined to the institution (name + institute_id for display). */
function baseQuery() {
  return db('applications')
    .leftJoin('institutions', 'applications.institution_id', 'institutions.id')
    .select(FIELDS)
    .select('institutions.name as institution_name', 'institutions.institute_id as institute_id');
}

async function create(data) {
  const [row] = await db('applications').insert(data).returning('id');
  return getById(row.id);
}

function getById(id) {
  return baseQuery().where('applications.id', id).first();
}

/** Includes the large report fields — used by the detail/report endpoints. */
function getWithReport(id) {
  return baseQuery()
    .select('applications.report_markdown', 'applications.report_json')
    .where('applications.id', id)
    .first();
}

async function update(id, patch) {
  await db('applications').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return getById(id);
}

async function addEvent({ applicationId, fromState, toState, actorId, note }) {
  await db('application_events').insert({
    application_id: applicationId, from_state: fromState, to_state: toState, actor_id: actorId, note: note || null,
  });
}

function listEvents(applicationId) {
  return db('application_events')
    .leftJoin('users', 'application_events.actor_id', 'users.id')
    .where('application_id', applicationId)
    .orderBy('application_events.created_at', 'asc')
    .select('application_events.*', 'users.name as actor_name');
}

/**
 * Role-scoped queue. Ownership/routing follows the org hierarchy:
 * - visitor: cases they uploaded
 * - junior_consultant: cases whose (system,state) is in their allotments
 * - senior_consultant: cases submitted by a junior they supervise
 * - board_member / president: board-review + decided cases (all)
 * - admin / viewer: everything
 */
async function queueFor(user) {
  const roles = user.roles || [];
  const q = baseQuery().orderBy('applications.updated_at', 'desc');

  if (roles.includes('admin') || roles.includes('viewer')) return q;
  if (roles.includes('board_member') || roles.includes('president')) {
    return q.whereIn('applications.status', ['board_review', 'approved', 'rejected']);
  }
  if (roles.includes('senior_consultant')) {
    const supervisees = db('users').where({ supervisor_id: user.id }).select('id');
    return q.whereIn('applications.submitted_by', supervisees);
  }
  if (roles.includes('junior_consultant')) {
    const allot = db('staff_allotments').where({ user_id: user.id });
    return q.whereExists(
      allot.whereRaw('staff_allotments.system = applications.system')
        .andWhereRaw('staff_allotments.state = applications.state')
        .select(db.raw('1')),
    );
  }
  if (roles.includes('visitor')) return q.where('applications.uploaded_by', user.id);
  return q.whereRaw('false');
}

module.exports = { create, getById, getWithReport, update, addEvent, listEvents, queueFor };
