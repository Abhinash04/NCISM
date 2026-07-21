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

export async function confirmMeeting(id, minutesText) {
  const { data } = await apiClient.post(`/meetings/${id}/confirm`, { minutesText });
  return data.meeting;
}
