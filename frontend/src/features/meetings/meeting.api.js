import { apiClient } from '@/lib/api/client';

export async function listMeetings() {
  const { data } = await apiClient.get('/meetings');
  return data.meetings || [];
}

export async function getMeeting(id) {
  const { data } = await apiClient.get(`/meetings/${id}`);
  return data.meeting;
}

export async function createMeeting({ number, scheduledAt }) {
  const { data } = await apiClient.post('/meetings', { number, scheduledAt });
  return data.meeting;
}

export async function addMeetingItem(id, applicationId) {
  const { data } = await apiClient.post(`/meetings/${id}/items`, { applicationId });
  return data.meeting;
}

export async function updateMeeting(id, payload) {
  const { data } = await apiClient.patch(`/meetings/${id}`, payload);
  return data.meeting;
}

export async function updateMeetingItem(meetingId, itemId, payload) {
  const { data } = await apiClient.patch(`/meetings/${meetingId}/items/${itemId}`, payload);
  return data.meeting;
}

export async function confirmMeeting(id, minutesText) {
  const { data } = await apiClient.post(`/meetings/${id}/confirm`, { minutesText });
  return data.meeting;
}
