import { apiClient } from '@/lib/api/client';

export async function listApplications() {
  const { data } = await apiClient.get('/applications');
  return data.rows || [];
}

export async function getApplication(id) {
  const { data } = await apiClient.get(`/applications/${id}`);
  return data.application;
}

export async function getAllowedActions(id) {
  const { data } = await apiClient.get(`/applications/${id}/allowed-actions`);
  return data.actions || [];
}

export async function getEvents(id) {
  const { data } = await apiClient.get(`/applications/${id}/events`);
  return data.events || [];
}

export async function uploadApplication({ institutionId, session, file }) {
  const form = new FormData();
  form.append('institutionId', institutionId);
  if (session) form.append('session', session);
  form.append('file', file);
  const { data } = await apiClient.post('/applications', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.application;
}

/** Runs a workflow transition. `action` ∈ process|submit|review|decide|revise. */
export async function actOnApplication(id, action, body = {}) {
  const { data } = await apiClient.post(`/applications/${id}/${action}`, body);
  return data.application;
}
