import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { resolveArtifactUrl } from '@/lib/api/client';

/**
 * Fetches a job artifact once and shares it between every subscribed panel
 * (viewer tabs, inspector outline) via the ['artifact', jobId, type] key.
 * Markdown stays a string; JSON artifacts parse to objects.
 */
export function useArtifact(job, type) {
  const url = job?.artifacts?.[type] ?? null;

  return useQuery({
    queryKey: ['artifact', job?.jobId, type],
    enabled: !!url,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const response = await axios.get(resolveArtifactUrl(url), {
        // keep markdown/html as raw text; JSON parses normally
        transformResponse: type === 'json' ? undefined : [(data) => data],
      });
      return response.data;
    },
  });
}
