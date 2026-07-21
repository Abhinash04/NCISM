import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRulesets, activateRuleset } from './rulesets.api';

export function useRulesets() {
  return useQuery({ queryKey: ['rulesets'], queryFn: listRulesets });
}

export function useActivateRuleset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardRef }) => activateRuleset(id, boardRef),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rulesets'] }),
  });
}
