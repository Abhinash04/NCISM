const { db } = require('../db');

async function create(data) {
  const [row] = await db('board_meetings').insert(data).returning('*');
  return row;
}

function list() {
  return db('board_meetings')
    .leftJoin('users', 'board_meetings.created_by', 'users.id')
    .orderBy('board_meetings.created_at', 'desc')
    .select('board_meetings.*', 'users.name as created_by_name');
}

function getById(id) {
  return db('board_meetings').where({ id }).first();
}

/** Meeting + agenda items joined to their case (institution, status, decision). */
async function getWithItems(id) {
  const meeting = await db('board_meetings')
    .leftJoin('users', 'board_meetings.created_by', 'users.id')
    .where('board_meetings.id', id)
    .first('board_meetings.*', 'users.name as created_by_name');
  if (!meeting) return null;

  meeting.items = await db('board_meeting_items')
    .join('applications', 'board_meeting_items.application_id', 'applications.id')
    .join('institutions', 'applications.institution_id', 'institutions.id')
    .where('board_meeting_items.meeting_id', id)
    .select(
      'board_meeting_items.id',
      'board_meeting_items.discussion_notes',
      'board_meeting_items.item_decision',
      'board_meeting_items.item_observations',
      'applications.id as application_id', 'applications.status', 'applications.decision',
      'institutions.name as institution_name', 'institutions.institute_id',
    );
  return meeting;
}

async function addItem(meetingId, applicationId) {
  await db('board_meeting_items')
    .insert({ meeting_id: meetingId, application_id: applicationId })
    .onConflict(['meeting_id', 'application_id']).ignore();
}

async function update(id, patch) {
  await db('board_meetings').where({ id }).update({ ...patch, updated_at: db.fn.now() });
  return getWithItems(id);
}

async function updateItem(itemId, patch) {
  await db('board_meeting_items').where({ id: itemId }).update(patch);
}

async function confirm(id, minutesText) {
  await db('board_meetings').where({ id }).update({ status: 'confirmed', minutes_text: minutesText || null, updated_at: db.fn.now() });
  return getWithItems(id);
}

module.exports = { create, list, getById, getWithItems, addItem, update, updateItem, confirm };
