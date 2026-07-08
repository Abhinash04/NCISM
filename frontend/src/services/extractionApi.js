/**
 * HTTP client for the Python extraction service (FastAPI).
 * The service is stateless — it receives a PDF and returns the full
 * extraction result; persistence happens client-side in Dexie.
 */
const BASE_URL =
  import.meta.env.VITE_EXTRACTION_API_URL ?? 'http://localhost:8000/api/v1';

export const extractionApi = {
  /** Sends a PDF blob through the extraction pipeline. */
  async processDocument(blob, filename) {
    const formData = new FormData();
    formData.append('file', blob, filename);

    let response;
    try {
      response = await fetch(`${BASE_URL}/extraction/process`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      throw new Error(
        'Extraction service is unreachable. Make sure the Python service is running.',
      );
    }

    if (!response.ok) {
      let detail = `Extraction failed (HTTP ${response.status})`;
      try {
        const body = await response.json();
        if (body?.detail) detail = body.detail;
      } catch {
        // keep default detail
      }
      throw new Error(detail);
    }

    return response.json();
  },

  /** Returns true when the extraction service is up. */
  async checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },
};
