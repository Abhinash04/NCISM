import { db } from '@/db/db';

export const extractionRepository = {
  async save(extraction) {
    await db.extractions.put(extraction);
    return extraction;
  },

  async getByDocumentId(documentId) {
    return db.extractions.get(documentId);
  },

  async deleteByDocumentId(documentId) {
    await db.extractions.delete(documentId);
  },
};
