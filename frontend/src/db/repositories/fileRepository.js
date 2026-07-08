import { db } from '@/db/db';

export const fileRepository = {
  async save(documentId, blob) {
    await db.files.put({ documentId, blob });
  },

  async getByDocumentId(documentId) {
    const record = await db.files.get(documentId);
    return record?.blob ?? null;
  },
};
