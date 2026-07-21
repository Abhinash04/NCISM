import { apiClient } from '@/lib/api/client';

export async function listAudit(params = {}) {
  const { data } = await apiClient.get('/audit', { params });
  return data; // { rows, total, page, limit }
}
