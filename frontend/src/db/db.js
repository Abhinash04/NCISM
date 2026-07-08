import Dexie from 'dexie';

/**
 * NCISM Document Intelligence — client-side storage (IndexedDB via Dexie).
 *
 * Tables
 *  - documents:   document master records (list queries never touch blobs)
 *  - extractions: pipeline results, keyed by documentId
 *  - files:       original PDF blobs, keyed by documentId
 *
 * Future phases add tables (e.g. parameters, assessments) via db.version(n+1)
 * upgrades — never by mutating this version.
 */
export const db = new Dexie('ncism-document-intelligence');

db.version(1).stores({
  documents: 'id, filename, status, uploadedAt',
  extractions: 'documentId, status, generatedAt',
  files: 'documentId',
});

/**
 * v2 — the extraction pipeline now preserves every intermediate stage output
 * (classification, pdfplumber, pymupdf, normalized, merged, markitdown,
 * structurer, opendataloader, final) plus a validation report. These live as
 * non-indexed fields (`artifacts`, `metadata.validation`) inside the existing
 * `extractions` record, so the indexes are unchanged; the version bump follows
 * the "new fields via db.version(n+1)" convention and lets records upgrade in
 * place. Nothing is dropped — older extractions simply carry no `artifacts`.
 */
db.version(2).stores({
  documents: 'id, filename, status, uploadedAt',
  extractions: 'documentId, status, generatedAt',
  files: 'documentId',
});

export const DOCUMENT_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  REQUIRES_OCR: 'requires_ocr',
};

export const EXTRACTION_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  REQUIRES_OCR: 'requires_ocr',
};
