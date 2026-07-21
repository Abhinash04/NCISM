const { db } = require('../db');

async function create(data) {
  const [row] = await db('clarifications').insert(data).returning('id');
  return getById(row.id);
}

function getById(id) {
  return db('clarifications').where({ id }).first();
}

/** The most recent still-open round for a case (what the college responds to). */
function latestOpen(applicationId) {
  return db('clarifications')
    .where({ application_id: applicationId, status: 'open' })
    .orderBy('round', 'desc')
    .first();
}

/** How many rounds exist (to number the next one). */
async function countFor(applicationId) {
  const { count } = await db('clarifications').where({ application_id: applicationId }).count({ count: '*' }).first();
  return Number(count);
}

/** All rounds with issuer/responder names, for the case detail tab. */
function list(applicationId) {
  return db('clarifications')
    .leftJoin('users as iss', 'clarifications.issued_by', 'iss.id')
    .leftJoin('users as res', 'clarifications.responded_by', 'res.id')
    .where('application_id', applicationId)
    .orderBy('round', 'asc')
    .select('clarifications.*', 'iss.name as issued_by_name', 'res.name as responded_by_name');
}

async function update(id, patch) {
  await db('clarifications').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return getById(id);
}

module.exports = { create, getById, latestOpen, countFor, list, update };
