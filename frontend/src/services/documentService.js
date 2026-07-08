import { db, DOCUMENT_STATUS } from '@/db/db';
import { documentRepository } from '@/db/repositories/documentRepository';
import { extractionRepository } from '@/db/repositories/extractionRepository';
import { fileRepository } from '@/db/repositories/fileRepository';
import { validateDocumentFile } from '@/lib/fileValidation';
import { getPdfPageCount } from '@/lib/pdf';
import { processingService } from '@/services/processingService';

/**
 * documentService implements the logical Phase-1 API contract over Dexie:
 *
 *   POST /documents/upload          -> uploadDocument(file)
 *   GET  /documents                 -> listDocuments()
 *   GET  /documents/:id             -> getDocument(id)
 *   GET  /documents/:id/extraction  -> getExtraction(id)
 *   POST /documents/:id/process     -> processDocument(id)
 *
 * A future server-side backend replaces this module without touching
 * feature components.
 */
export const documentService = {
  /**
   * Validates and stores a single PDF. Reports progress via onProgress(0-100).
   * Throws with a user-facing message when validation fails.
   */
  async uploadDocument(file, onProgress = () => {}) {
    const validation = await validateDocumentFile(file);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    onProgress(25);

    // Only PDFs are paginated; Office documents show "—" in the list.
    const pages = validation.type === 'pdf' ? await getPdfPageCount(file) : null;
    onProgress(70);

    const document = {
      id: crypto.randomUUID(),
      filename: file.name,
      size: file.size,
      pages,
      type: validation.type,
      status: DOCUMENT_STATUS.UPLOADED,
      uploadedAt: new Date().toISOString(),
    };

    // Document record and its blob are written atomically.
    await db.transaction('rw', db.documents, db.files, async () => {
      await documentRepository.create(document);
      await fileRepository.save(document.id, file);
    });
    onProgress(100);

    return document;
  },

  async listDocuments() {
    return documentRepository.list();
  },

  async getDocument(id) {
    return documentRepository.getById(id);
  },

  async getExtraction(id) {
    return extractionRepository.getByDocumentId(id);
  },

  async processDocument(id) {
    return processingService.process(id);
  },

  async getFileBlob(id) {
    return fileRepository.getByDocumentId(id);
  },
};
