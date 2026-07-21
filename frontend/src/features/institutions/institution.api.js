import { apiClient } from '@/lib/api/client';

/** GET /institutions — returns { rows, total, page, limit }. */
export async function listInstitutions(params = {}) {
  const { data } = await apiClient.get('/institutions', { params });
  return data; // { success, rows, total, page, limit }
}

/** GET /institutions/meta — distinct systems + states for filters. */
export async function getInstitutionMeta() {
  const { data } = await apiClient.get('/institutions/meta');
  return { systems: data.systems || [], states: data.states || [] };
}

/** GET /institutions/:id — returns the institution row. */
export async function getInstitution(id) {
  const { data } = await apiClient.get(`/institutions/${id}`);
  return data.institution;
}

/**
 * POST /institutions/import — accepts a File (multipart) or a raw text string.
 * Returns { inserted, updated, parsed, exceptions }.
 */
export async function importInstitutions(fileOrText) {
  if (fileOrText instanceof File) {
    const form = new FormData();
    form.append('file', fileOrText);
    const { data } = await apiClient.post('/institutions/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await apiClient.post('/institutions/import', { text: fileOrText });
  return data;
}
