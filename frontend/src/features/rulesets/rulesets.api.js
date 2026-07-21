import { apiClient } from '@/lib/api/client';

export async function listRulesets() {
  const { data } = await apiClient.get('/rulesets');
  return data.rulesets || [];
}

export async function activateRuleset(id, boardRef) {
  const { data } = await apiClient.post(`/rulesets/${id}/activate`, { boardRef });
  return data.ruleset;
}
