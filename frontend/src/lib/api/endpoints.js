import { apiClient } from './client';

/**
 * GET /health — never throws; maps transport errors to an offline status.
 */
export async function checkHealth() {
  try {
    const response = await apiClient.get('/health', { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (error.response?.data?.status) {
      return error.response.data;
    }
    return {
      status: 'offline',
      message: error.code === 'ECONNABORTED' ? 'Connection Timeout' : 'Backend unreachable',
    };
  }
}

/**
 * POST /extract — uploads a document, returns the canonical job DTO.
 * @param {File} file
 */
export async function extractDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.job;
}

/**
 * GET /jobs/:jobId — returns the canonical job DTO.
 */
export async function getJob(jobId) {
  const response = await apiClient.get(`/jobs/${jobId}`);
  return response.data.job;
}

/**
 * POST /assessments — runs the deterministic assessment engine.
 * Returns { assessment: { result, reportMarkdown, ... }, job }.
 */
export async function generateAssessment({ jobId, rulesetId, rulesetVersion } = {}) {
  const response = await apiClient.post('/assessments', { jobId, rulesetId, rulesetVersion });
  return response.data;
}
