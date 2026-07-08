import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
});

export const openDataLoaderService = {
  /**
   * Check if the backend and Hybrid Server are online
   */
  async checkHealth() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'offline', message: 'Backend Offline', error };
    }
  },

  /**
   * Upload PDF to the backend for extraction
   * @param {File} file 
   */
  async uploadPdf(file) {
    const formData = new FormData();
    formData.append('files', file);

    const response = await apiClient.post('/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // You can add onUploadProgress here if needed
    });
    return response.data;
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
