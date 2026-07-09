import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';

/**
 * Reactive list of stored documents, newest first.
 */
export function useDocuments() {
  return useLiveQuery(
    () => db.documents.orderBy('createdAt').reverse().toArray(),
    [],
    []
  );
}
