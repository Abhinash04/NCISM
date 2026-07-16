import { apiClient } from '@/lib/api/client';

export async function listOrgUsers() {
  const { data } = await apiClient.get('/admin/users');
  return data.users || [];
}

export async function getOrgUser(id) {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data.user;
}

export async function listRoles() {
  const { data } = await apiClient.get('/admin/roles');
  return data.roles || [];
}

export async function listPermissions() {
  const { data } = await apiClient.get('/admin/permissions');
  return data.permissions || [];
}
