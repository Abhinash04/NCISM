import { DOCUMENT_STATUS, EXTRACTION_STATUS } from '@/db/db';
import { documentRepository } from '@/db/repositories/documentRepository';
import { extractionRepository } from '@/db/repositories/extractionRepository';
import { fileRepository } from '@/db/repositories/fileRepository';
import { extractionApi } from '@/services/extractionApi';

const EXTRACTION_TO_DOCUMENT_STATUS = {
  [EXTRACTION_STATUS.COMPLETED]: DOCUMENT_STATUS.PROCESSED,
  [EXTRACTION_STATUS.REQUIRES_OCR]: DOCUMENT_STATUS.REQUIRES_OCR,
  [EXTRACTION_STATUS.FAILED]: DOCUMENT_STATUS.FAILED,
};

/**
 * Orchestrates the manual processing flow for one document:
 * status transitions in Dexie + round-trip to the Python pipeline.
 * All state changes are observable live through Dexie liveQuery.
 */
export const processingService = {
  async process(documentId) {
    const document = await documentRepository.getById(documentId);
    if (!document) throw new Error('Document not found');

    const blob = await fileRepository.getByDocumentId(documentId);
    if (!blob) throw new Error('Stored PDF file not found for this document');

    await documentRepository.setStatus(documentId, DOCUMENT_STATUS.PROCESSING);

    try {
      const result = await extractionApi.processDocument(blob, document.filename);

      const extraction = {
        documentId,
        rawText: result.rawText ?? '',
        markdown: result.markdown ?? '',
        pageWiseExtraction: result.pageWiseExtraction ?? [],
        // Every preserved pipeline-stage output, in order (never overwritten).
        artifacts: result.artifacts ?? [],
        processingTime: result.processingTime ?? null,
        metadata: result.metadata ?? {},
        status: result.status ?? EXTRACTION_STATUS.COMPLETED,
        error: result.error ?? null,
        generatedAt: new Date().toISOString(),
      };
      await extractionRepository.save(extraction);

      const documentStatus =
        EXTRACTION_TO_DOCUMENT_STATUS[extraction.status] ?? DOCUMENT_STATUS.FAILED;
      await documentRepository.setStatus(documentId, documentStatus);

      return extraction;
    } catch (error) {
      const failedExtraction = {
        documentId,
        rawText: '',
        markdown: '',
        pageWiseExtraction: [],
        artifacts: [],
        processingTime: null,
        metadata: {},
        status: EXTRACTION_STATUS.FAILED,
        error: error.message,
        generatedAt: new Date().toISOString(),
      };
      await extractionRepository.save(failedExtraction);
      await documentRepository.setStatus(documentId, DOCUMENT_STATUS.FAILED);
      throw error;
    }
  },
};
