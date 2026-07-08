const STORAGE_KEY = 'odl_documents_v1';

/**
 * Service to manage local storage persistence for documents.
 * This abstracts away the persistence layer so it can be swapped
 * for a database later.
 */
export const StorageService = {
  /**
   * Get all documents from storage
   * @returns {Array} List of document objects
   */
  getAllDocuments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from storage', error);
      return [];
    }
  },

  /**
   * Get a single document by ID
   * @param {string} id 
   * @returns {Object|null}
   */
  getDocument: (id) => {
    const docs = StorageService.getAllDocuments();
    return docs.find(doc => doc.id === id) || null;
  },

  /**
   * Save or update a document
   * @param {Object} documentData 
   * @returns {Object} the saved document
   */
  saveDocument: (documentData) => {
    const docs = StorageService.getAllDocuments();
    
    // Ensure it has an ID
    const docToSave = {
      ...documentData,
      id: documentData.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString()
    };

    if (!docToSave.createdAt) {
      docToSave.createdAt = new Date().toISOString();
    }

    const existingIndex = docs.findIndex(d => d.id === docToSave.id);
    if (existingIndex >= 0) {
      docs[existingIndex] = docToSave;
    } else {
      docs.unshift(docToSave);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      return docToSave;
    } catch (error) {
      console.error('Error saving to storage', error);
      return null;
    }
  },

  /**
   * Delete a document by ID
   * @param {string} id 
   */
  deleteDocument: (id) => {
    const docs = StorageService.getAllDocuments();
    const newDocs = docs.filter(doc => doc.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
    } catch (error) {
      console.error('Error deleting from storage', error);
    }
  },
  
  /**
   * Clear all documents
   */
  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing storage', error);
    }
  }
};
