import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from './DashboardLayout';

/**
 * Guards the `/:role/*` subtree: the URL role segment must match the authed
 * user's primary role, else they're bounced to their own dashboard. This is
 * cosmetic scoping only — the backend re-checks every permission.
 */
export function RoleLayout() {
  const { role } = useParams();
  const auth = useAuth();

  if (role !== auth.primaryRole) {
    return <Navigate to={`/${auth.primaryRole}/dashboard`} replace />;
  }
  return <DashboardLayout />;
}
