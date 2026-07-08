import { useLiveQuery } from 'dexie-react-hooks';
import { documentService } from '@/services/documentService';

/** Live single document record. undefined while loading, null when missing. */
export function useDocument(id) {
  return useLiveQuery(
    async () => (id ? ((await documentService.getDocument(id)) ?? null) : null),
    [id],
  );
}
