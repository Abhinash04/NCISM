import axios from 'axios';
import { db } from './db';
import { resolveArtifactUrl } from '@/lib/api/client';

/** PDFs above this size are not persisted locally (IndexedDB quota). */
export const PDF_PERSIST_LIMIT_BYTES = 50 * 1024 * 1024;

/**
 * Saves/updates the document record for a job DTO.
 */
export async function saveDocument(job) {
  const now = new Date().toISOString();
  const existing = await db.documents.get(job.jobId);
  await db.documents.put({
    id: job.jobId,
    filename: job.filename,
    size: job.filesize,
    status: job.status,
    pageCount: job.pageCount,
    processingTimeMs: job.processingTimeMs,
    artifacts: job.artifacts,
    createdAt: existing?.createdAt ?? job.createdAt ?? now,
    updatedAt: now,
    schemaVersion: 1,
  });
}

/**
 * Records a failed upload attempt (no jobId exists).
 */
export async function saveFailedUpload(file) {
  const now = new Date().toISOString();
  await db.documents.put({
    id: crypto.randomUUID(),
    filename: file.name,
    size: file.size,
    status: 'failed',
    pageCount: 0,
    processingTimeMs: 0,
    artifacts: {},
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  });
}

export async function saveArtifact(documentId, type, content, mimeType) {
  const size = content instanceof Blob ? content.size : new Blob([typeof content === 'string' ? content : JSON.stringify(content)]).size;
  await db.artifacts.put({
    documentId,
    type,
    mimeType,
    content,
    size,
    savedAt: new Date().toISOString(),
  });
}

export async function getArtifact(documentId, type) {
  const row = await db.artifacts.get([documentId, type]);
  return row?.content ?? null;
}

export async function getDocument(id) {
  return db.documents.get(id);
}

/**
 * Deletes a document and cascades to its artifacts and assessments.
 */
export async function deleteDocument(id) {
  await db.transaction('rw', db.documents, db.artifacts, db.assessments, async () => {
    await db.artifacts.where('documentId').equals(id).delete();
    await db.assessments.where('documentId').equals(id).delete();
    await db.documents.delete(id);
  });
}

export async function saveAssessment(documentId, assessment) {
  await db.assessments.add({
    documentId,
    rulesetId: assessment.rulesetId,
    rulesetVersion: assessment.rulesetVersion,
    result: assessment.result,
    reportMarkdown: assessment.reportMarkdown,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Fetches every artifact of a freshly extracted job once and persists it so
 * the document survives the backend's retention purge. PDF blobs above the
 * size cap are skipped (still viewable until the backend purge).
 * Failures are non-fatal per artifact.
 *
 * @returns {{ pdfSkipped: boolean }}
 */
export async function persistJobArtifacts(job) {
  let pdfSkipped = false;

  const textTypes = [
    ['markdown', 'text/markdown'],
    ['json', 'application/json'],
    ['html', 'text/html'],
  ];

  for (const [type, mimeType] of textTypes) {
    const url = job.artifacts?.[type];
    if (!url) continue;
    try {
      const response = await axios.get(resolveArtifactUrl(url), {
        transformResponse: type === 'json' ? undefined : [(data) => data],
      });
      await saveArtifact(job.jobId, type, response.data, mimeType);
    } catch (error) {
      console.warn(`Failed to persist ${type} artifact locally`, error);
    }
  }

  const pdfUrl = job.artifacts?.pdf;
  if (pdfUrl) {
    if ((job.filesize ?? 0) > PDF_PERSIST_LIMIT_BYTES) {
      pdfSkipped = true;
    } else {
      try {
        const response = await axios.get(resolveArtifactUrl(pdfUrl), { responseType: 'blob' });
        await saveArtifact(job.jobId, 'pdf', response.data, 'application/pdf');
      } catch (error) {
        console.warn('Failed to persist pdf artifact locally', error);
      }
    }
  }

  return { pdfSkipped };
}

const LEGACY_STORAGE_KEY = 'odl_documents_v1';

/**
 * One-time import of the pre-Dexie localStorage history.
 */
export async function importLegacyLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const docs = JSON.parse(raw);
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        if (!doc.id) continue;
        const existing = await db.documents.get(doc.id);
        if (existing) continue;
        await db.documents.put({
          id: doc.id,
          filename: doc.filename,
          size: doc.size ?? 0,
          status: doc.status ?? 'completed',
          pageCount: doc.pageCount ?? 0,
          processingTimeMs: Math.round((doc.processingTime ?? 0) * 1000),
          artifacts: {},
          createdAt: doc.createdAt ?? new Date().toISOString(),
          updatedAt: doc.updatedAt ?? new Date().toISOString(),
          schemaVersion: 1,
        });
      }
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn('Legacy localStorage import failed', error);
  }
}
