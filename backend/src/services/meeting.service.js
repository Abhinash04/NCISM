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

async function confirm(id, minutesText) {
  await get(id);
  return meetingRepo.confirm(id, minutesText);
}

module.exports = { list, get, create, addItem, confirm };
