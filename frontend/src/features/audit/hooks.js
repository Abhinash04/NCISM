import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listAudit } from './audit.api';

export function useAuditLog(params) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => listAudit(params),
    placeholderData: keepPreviousData,
  });
}
