import { useLiveQuery } from 'dexie-react-hooks';
import { documentService } from '@/services/documentService';

/** Live list of all documents, newest first. undefined while loading. */
export function useDocuments() {
  return useLiveQuery(() => documentService.listDocuments(), []);
}
