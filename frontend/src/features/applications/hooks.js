import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listApplications, getApplication, getAllowedActions, getEvents,
  uploadApplication, actOnApplication,
} from './application.api';

export function useApplications() {
  return useQuery({ queryKey: ['applications'], queryFn: listApplications });
}

export function useApplication(id) {
  return useQuery({ queryKey: ['application', id], queryFn: () => getApplication(id), enabled: !!id });
}

export function useAllowedActions(id) {
  return useQuery({ queryKey: ['application', id, 'actions'], queryFn: () => getAllowedActions(id), enabled: !!id });
}

export function useApplicationEvents(id) {
  return useQuery({ queryKey: ['application', id, 'events'], queryFn: () => getEvents(id), enabled: !!id });
}

export function useUploadApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadApplication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
}

/** Generic transition mutation; refreshes the record, its actions/events, and the queue. */
export function useApplicationAction(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, body }) => actOnApplication(id, action, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', id] });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
