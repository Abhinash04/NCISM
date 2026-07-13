import { useQuery } from '@tanstack/react-query';
import { getJob } from '@/lib/api/endpoints';
import { getDocument } from '@/lib/db/documents.repository';

/**
 * Canonical job DTO for a jobId. Network first; if the backend job has
 * expired (retention purge), falls back to the locally persisted document so
 * History entries keep opening. Local DTOs carry source: 'local'.
 */
export function useJob(jobId) {
  return useQuery({
    queryKey: ['job', jobId],
    enabled: !!jobId,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const job = await getJob(jobId);
        return { ...job, source: 'network' };
      } catch (error) {
        const doc = await getDocument(jobId);
        if (!doc) throw error;
        return {
          jobId: doc.id,
          status: doc.status,
          filename: doc.filename,
          filesize: doc.size,
          pageCount: doc.pageCount ?? 0,
          processingTimeMs: doc.processingTimeMs ?? 0,
          warnings: [],
          failedPages: [],
          createdAt: doc.createdAt,
          artifacts: doc.artifacts ?? {},
          source: 'local',
        };
      }
    },
  });
}
