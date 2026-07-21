import { useQuery } from '@tanstack/react-query';
import { listOrgUsers, getOrgUser, listRoles, listPermissions } from './admin.api';

export function useOrgUsers() {
  return useQuery({ queryKey: ['admin', 'users'], queryFn: listOrgUsers });
}

export function useOrgUser(id) {
  return useQuery({ queryKey: ['admin', 'user', id], queryFn: () => getOrgUser(id), enabled: !!id });
}

export function useRoles() {
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: listRoles });
}

export function usePermissions() {
  return useQuery({ queryKey: ['admin', 'permissions'], queryFn: listPermissions });
}
