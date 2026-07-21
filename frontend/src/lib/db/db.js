import Dexie from 'dexie';

/**
 * Client-side document store. Extracted artifacts are persisted here so
 * History and the Workspace keep working after the backend's 24h job purge.
 */
export const db = new Dexie('ncism-platform');

db.version(1).stores({
  // id === backend jobId. Only indexed fields are listed; rows carry more.
  documents: 'id, filename, status, createdAt, updatedAt',
  // one row per artifact; compound primary key prevents duplicates
  artifacts: '[documentId+type], documentId, type',
  // multiple assessments per document (rulesets are versioned)
  assessments: '++id, documentId, rulesetId, createdAt',
});
