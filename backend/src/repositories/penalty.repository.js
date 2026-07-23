const { db } = require('../db');

async function create(data) {
  const [row] = await db('penalties').insert(data).returning('*');
  return row;
}

function bulkCreate(rows) {
  return db('penalties').insert(rows);
}

function getById(id) {
  return db('penalties').where({ id }).first();
}

function listForCase(applicationId) {
  return db('penalties')
    .leftJoin('users as cb', 'penalties.created_by', 'cb.id')
    .where('application_id', applicationId)
    .orderBy('penalties.created_at', 'asc')
    .select('penalties.*', 'cb.name as created_by_name');
}

async function existsAutoFor(applicationId) {
  const hit = await db('penalties').where({ application_id: applicationId, source: 'auto' }).first('id');
  return !!hit;
}

/** Cross-case ledger for the compliance queue (joined to the institution). */
function queue({ status } = {}) {
  const q = db('penalties')
    .join('applications', 'penalties.application_id', 'applications.id')
    .join('institutions', 'applications.institution_id', 'institutions.id')
    .orderBy('penalties.created_at', 'desc')
    .select(
      'penalties.id', 'penalties.type', 'penalties.description', 'penalties.amount', 'penalties.seats',
      'penalties.status', 'penalties.source', 'penalties.created_at',
      'applications.id as application_id', 'applications.system', 'applications.state',
      'institutions.name as institution_name', 'institutions.institute_id',
    );
  if (status) q.where('penalties.status', status);
  return q;
}

async function update(id, patch) {
  await db('penalties').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return getById(id);
}

function remove(id) {
  return db('penalties').where({ id }).del();
}

/** Count of a case's penalties not yet in a terminal state (for compliance rollup). */
async function unresolvedCount(applicationId) {
  const { count } = await db('penalties')
    .where({ application_id: applicationId })
    .whereIn('status', ['pending', 'applied'])
    .count({ count: '*' }).first();
  return Number(count);
}

module.exports = { create, bulkCreate, getById, listForCase, existsAutoFor, queue, update, remove, unresolvedCount };
