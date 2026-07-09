import { useQuery } from '@tanstack/react-query';
import { getJob } from '@/lib/api/endpoints';

/**
 * Canonical job DTO for a jobId.
 */
export function useJob(jobId) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId),
    enabled: !!jobId,
    staleTime: 60_000,
    retry: 1,
  });
}
