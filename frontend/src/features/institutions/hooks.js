import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  listInstitutions, getInstitution, getInstitutionMeta, importInstitutions,
} from './institution.api';

export function useImportInstitutions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importInstitutions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institutions'] });
      qc.invalidateQueries({ queryKey: ['institution-meta'] });
    },
  });
}

export function useInstitutionMeta() {
  return useQuery({
    queryKey: ['institution-meta'],
    queryFn: getInstitutionMeta,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstitutions(params) {
  return useQuery({
    queryKey: ['institutions', params],
    queryFn: () => listInstitutions(params),
    placeholderData: keepPreviousData, // keep the table steady across page/filter changes
  });
}

/** Loads the full registry once (~672 rows) for client-side combobox filtering. */
export function useAllInstitutions() {
  return useQuery({
    queryKey: ['institutions', 'all'],
    queryFn: () => listInstitutions({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.rows || [],
  });
}

export function useInstitution(id) {
  return useQuery({
    queryKey: ['institution', id],
    queryFn: () => getInstitution(id),
    enabled: !!id,
  });
}
