const { db } = require('../db');

async function create(data) {
  const [row] = await db('hearings').insert(data).returning('*');
  return row;
}

async function addMembers(hearingId, userIds) {
  if (!userIds.length) return;
  await db('hearing_members')
    .insert(userIds.map((user_id) => ({ hearing_id: hearingId, user_id })))
    .onConflict(['hearing_id', 'user_id']).ignore();
}

/** The still-open hearing for a case (what the committee records against). */
function activeForCase(applicationId) {
  return db('hearings').where({ application_id: applicationId, status: 'open' }).orderBy('created_at', 'desc').first();
}

async function isMember(hearingId, userId) {
  const hit = await db('hearing_members').where({ hearing_id: hearingId, user_id: userId }).first('id');
  return !!hit;
}

/** All hearing rounds for a case with panel + appointer/recorder names. */
async function listForCase(applicationId) {
  const rows = await db('hearings')
    .leftJoin('users as ap', 'hearings.appointed_by', 'ap.id')
    .leftJoin('users as rec', 'hearings.recorded_by', 'rec.id')
    .where('application_id', applicationId)
    .orderBy('hearings.created_at', 'asc')
    .select('hearings.*', 'ap.name as appointed_by_name', 'rec.name as recorded_by_name');

  for (const h of rows) {
    h.members = await db('hearing_members')
      .join('users', 'hearing_members.user_id', 'users.id')
      .where('hearing_id', h.id)
      .pluck('users.name');
  }
  return rows;
}

async function update(id, patch) {
  await db('hearings').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return db('hearings').where({ id }).first();
}

module.exports = { create, addMembers, activeForCase, isMember, listForCase, update };
