import { useQuery } from '@tanstack/react-query';
import { getOverview } from './report.api';

export function useReportsOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: getOverview,
  });
}
