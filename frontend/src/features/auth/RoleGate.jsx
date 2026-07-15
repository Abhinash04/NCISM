import { useAuth } from './AuthContext';

/**
 * Conditionally renders children based on roles/permissions. For coarse UI
 * gating only — never the sole enforcement (the backend re-checks everything).
 * Prefer `allowedActions` for record-level action buttons (later phases).
 */
export function RoleGate({ roles, permissions, fallback = null, children }) {
  const auth = useAuth();
  if (roles && !roles.some((r) => auth.hasRole(r))) return fallback;
  if (permissions && !permissions.every((p) => auth.hasPermission(p))) return fallback;
  return children;
}
