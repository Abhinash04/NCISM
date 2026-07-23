import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listApplications, getApplication, getAllowedActions, getEvents,
  uploadApplication, actOnApplication, deleteApplication,
  getClarifications, issueClarification, respondClarification,
  getHearings, getCommitteeMembers, getLetters, previewLetter,
  getPenalties, addPenalty, listPenalties, updatePenaltyStatus, deletePenalty,
} from './application.api';

export function useApplications() {
  return useQuery({ queryKey: ['applications'], queryFn: listApplications });
}

export function useApplication(id) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
    enabled: !!id,
    // Poll while the background worker is running the engine, then stop.
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2500 : false),
  });
}

export function useAllowedActions(id, poll = false) {
  return useQuery({
    queryKey: ['application', id, 'actions'],
    queryFn: () => getAllowedActions(id),
    enabled: !!id,
    refetchInterval: poll ? 2500 : false,
  });
}

export function useApplicationEvents(id, poll = false) {
  return useQuery({
    queryKey: ['application', id, 'events'],
    queryFn: () => getEvents(id),
    enabled: !!id,
    refetchInterval: poll ? 2500 : false,
  });
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

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
}

export function useClarifications(id) {
  return useQuery({ queryKey: ['application', id, 'clarifications'], queryFn: () => getClarifications(id), enabled: !!id });
}

function invalidateCase(qc, id) {
  qc.invalidateQueries({ queryKey: ['application', id] });
  qc.invalidateQueries({ queryKey: ['applications'] });
}

export function useIssueClarification(id) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (letterText) => issueClarification(id, letterText), onSuccess: () => invalidateCase(qc, id) });
}

export function useRespondClarification(id) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (payload) => respondClarification(id, payload), onSuccess: () => invalidateCase(qc, id) });
}

export function useHearings(id) {
  return useQuery({ queryKey: ['application', id, 'hearings'], queryFn: () => getHearings(id), enabled: !!id });
}

export function useCommitteeMembers(enabled) {
  return useQuery({ queryKey: ['committee-members'], queryFn: getCommitteeMembers, enabled: !!enabled, staleTime: 5 * 60 * 1000 });
}

export function useLetters(id) {
  return useQuery({ queryKey: ['application', id, 'letters'], queryFn: () => getLetters(id), enabled: !!id });
}

export function usePenalties(id) {
  return useQuery({ queryKey: ['application', id, 'penalties'], queryFn: () => getPenalties(id), enabled: !!id });
}

export function useAddPenalty(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => addPenalty(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['application', id] }); qc.invalidateQueries({ queryKey: ['penalties'] }); },
  });
}

/** Status change usable from the case tab and the cross-case queue. */
export function useUpdatePenalty(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ penaltyId, status }) => updatePenaltyStatus(penaltyId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penalties'] });
      if (applicationId) qc.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
}

export function useDeletePenalty(applicationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (penaltyId) => deletePenalty(penaltyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penalties'] });
      if (applicationId) qc.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
}

export function useComplianceQueue(status) {
  return useQuery({ queryKey: ['penalties', status || 'all'], queryFn: () => listPenalties(status) });
}

export { previewLetter };
