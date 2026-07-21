import { apiClient } from '@/lib/api/client';

export async function getOverview() {
  const { data } = await apiClient.get('/reports/overview');
  return data; // { success, summary, throughput, bySystem, penalties, topInstitutions }
}

/** Fetches a CSV dataset as a Blob (carries the Bearer token; a bare href would not). */
export async function fetchExport(dataset) {
  const { data } = await apiClient.get('/reports/export', {
    params: { dataset },
    responseType: 'blob',
  });
  return data;
}
