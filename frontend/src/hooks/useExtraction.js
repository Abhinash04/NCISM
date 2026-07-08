import { useLiveQuery } from 'dexie-react-hooks';
import { documentService } from '@/services/documentService';

/** Live extraction result for a document. undefined while loading, null when absent. */
export function useExtraction(documentId) {
  return useLiveQuery(
    async () =>
      documentId ? ((await documentService.getExtraction(documentId)) ?? null) : null,
    [documentId],
  );
}
