const meetingRepo = require('../repositories/meeting.repository');
const ApiError = require('../utils/api-error');

function list() {
  return meetingRepo.list();
}

async function get(id) {
  const meeting = await meetingRepo.getWithItems(id);
  if (!meeting) throw ApiError.notFound('MEETING_NOT_FOUND', `Meeting ${id} not found`);
  return meeting;
}

function create({ number, scheduledAt, user }) {
  if (!number || !String(number).trim()) throw ApiError.badRequest('VALIDATION_ERROR', 'Meeting number is required');
  return meetingRepo.create({ number, scheduled_at: scheduledAt || null, created_by: user.id });
}

async function addItem(id, applicationId) {
  await get(id); // 404 if missing
  if (!applicationId) throw ApiError.badRequest('VALIDATION_ERROR', 'applicationId is required');
  await meetingRepo.addItem(id, applicationId);
  return meetingRepo.getWithItems(id);
}

async function update(id, { number, scheduledAt, agendaText, participants, observations, actionItems, recommendations }) {
  await get(id);
  const patch = {};
  if (number !== undefined) patch.number = number;
  if (scheduledAt !== undefined) patch.scheduled_at = scheduledAt || null;
  if (agendaText !== undefined) patch.agenda_text = agendaText || null;
  if (participants !== undefined) patch.participants = participants || null;
  if (observations !== undefined) patch.observations = observations || null;
  if (actionItems !== undefined) patch.action_items = actionItems || null;
  if (recommendations !== undefined) patch.recommendations = recommendations || null;

  return meetingRepo.update(id, patch);
}

async function updateItem(meetingId, itemId, { discussionNotes, itemDecision, itemObservations }) {
  await get(meetingId);
  const patch = {};
  if (discussionNotes !== undefined) patch.discussion_notes = discussionNotes || null;
  if (itemDecision !== undefined) patch.item_decision = itemDecision || null;
  if (itemObservations !== undefined) patch.item_observations = itemObservations || null;

  await meetingRepo.updateItem(itemId, patch);
  return meetingRepo.getWithItems(meetingId);
}

async function confirm(id, minutesText) {
  await get(id);
  return meetingRepo.confirm(id, minutesText);
}

module.exports = { list, get, create, addItem, update, updateItem, confirm };
