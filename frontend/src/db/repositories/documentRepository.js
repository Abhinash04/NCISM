import { db } from '@/db/db';

export const documentRepository = {
  async create(document) {
    await db.documents.add(document);
    return document;
  },

  async list() {
    return db.documents.orderBy('uploadedAt').reverse().toArray();
  },

  async getById(id) {
    return db.documents.get(id);
  },

  async update(id, changes) {
    await db.documents.update(id, changes);
    return db.documents.get(id);
  },

  async setStatus(id, status) {
    await db.documents.update(id, { status });
  },
};
