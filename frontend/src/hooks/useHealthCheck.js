import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '@/lib/api/endpoints';

/**
 * Shared 30s health poll. All consumers subscribe to the same react-query
 * entry, so mounting this hook in several components runs ONE interval.
 */
export function useHealthCheck() {
  const { data, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const status = isPending ? 'checking' : (data?.status ?? 'offline');
  const message = isPending ? 'Checking Server...' : (data?.message ?? 'Unknown status');

  return { status, message };
}
