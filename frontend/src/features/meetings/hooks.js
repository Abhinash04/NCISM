import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMeetings, getMeeting, createMeeting, addMeetingItem, confirmMeeting,
} from './meeting.api';

export function useMeetings() {
  return useQuery({ queryKey: ['meetings'], queryFn: listMeetings });
}

export function useMeeting(id) {
  return useQuery({ queryKey: ['meeting', id], queryFn: () => getMeeting(id), enabled: !!id });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createMeeting, onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }) });
}

export function useAddMeetingItem(id) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (applicationId) => addMeetingItem(id, applicationId), onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting', id] }) });
}

export function useConfirmMeeting(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutesText) => confirmMeeting(id, minutesText),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meeting', id] }); qc.invalidateQueries({ queryKey: ['meetings'] }); },
  });
}
