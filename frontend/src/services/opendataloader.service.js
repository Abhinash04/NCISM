import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL in environment configuration");
}

console.log('Current API URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
});

export const openDataLoaderService = {
  /**
   * Check if the backend and Hybrid Server are online
   */
  async checkHealth() {
    try {
      console.log('Checking health at:', `${API_URL}/health`);
      const response = await apiClient.get('/health', { timeout: 10000 });
      console.log('Health response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      
      let status = 'offline';
      let message = 'Backend Offline';
      
      if (error.code === 'ECONNABORTED') {
        status = 'timeout';
        message = 'Connection Timeout';
      } else if (!error.response) {
        status = 'network_error';
        message = 'Network Error - Backend unreachable';
      }
      
      return { status, message, error };
    }
  },

  /**
   * Upload PDF to the backend for extraction
   * @param {File} file 
   */
  async uploadPdf(file) {
    const formData = new FormData();
    formData.append('files', file);

    console.log('Uploading to:', `${API_URL}/extract`);
    try {
      const response = await apiClient.post('/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },

  /**
   * Fetch a job's metadata and artifact URLs
   * @param {string} jobId 
   */
  async getJob(jobId) {
    try {
      const response = await apiClient.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Download a blob as a file
   * @param {string} content 
   * @param {string} filename 
   * @param {string} mimeType 
   */
  _download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadJson(jsonData, originalFilename) {
    const content = JSON.stringify(jsonData, null, 2);
    const filename = originalFilename.replace(/\.[^/.]+$/, "") + ".json";
    this._download(content, filename, 'application/json');
  },

  downloadMarkdown(markdownData, originalFilename) {
    const filename = originalFilename.replace(/\.[^/.]+$/, "") + ".md";
    this._download(markdownData, filename, 'text/markdown');
  },

  downloadHtml(htmlData, originalFilename) {
    const filename = originalFilename.replace(/\.[^/.]+$/, "") + ".html";
    this._download(htmlData, filename, 'text/html');
  }
};
