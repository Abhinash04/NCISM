import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { resolveArtifactUrl } from '@/lib/api/client';
import { getArtifact, saveArtifact } from '@/lib/db/documents.repository';

const MIME_BY_TYPE = {
  markdown: 'text/markdown',
  json: 'application/json',
  html: 'text/html',
  pdf: 'application/pdf',
  report: 'text/markdown',
  assessment: 'application/json',
};

/**
 * Fetches a job artifact once and shares it between every subscribed panel
 * via the ['artifact', jobId, type] key. Network first with a write-through
 * to Dexie; falls back to the local copy when the backend job has expired.
 * PDF artifacts resolve to a Blob; markdown/html to strings; JSON to objects.
 */
export function useArtifact(job, type) {
  const url = job?.artifacts?.[type] ?? null;

  return useQuery({
    queryKey: ['artifact', job?.jobId, type],
    enabled: !!job?.jobId && !!url,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      try {
        const response = await axios.get(resolveArtifactUrl(url), {
          responseType: type === 'pdf' ? 'blob' : undefined,
          transformResponse: type === 'json' || type === 'pdf' ? undefined : [(data) => data],
        });
        // Write-through so pre-purge documents become available offline even
        // if they were uploaded before local persistence existed.
        saveArtifact(job.jobId, type, response.data, MIME_BY_TYPE[type]).catch(() => {});
        return response.data;
      } catch (networkError) {
        const local = await getArtifact(job.jobId, type);
        if (local !== null) return local;
        throw networkError;
      }
    },
  });
}
