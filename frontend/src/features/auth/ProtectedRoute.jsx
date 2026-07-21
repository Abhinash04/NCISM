import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Gates a route subtree on authentication (and optionally roles/permissions). */
export function ProtectedRoute({ children, roles, permissions }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (roles && !roles.some((r) => auth.hasRole(r))) {
    return <Navigate to="/403" replace />;
  }
  if (permissions && !permissions.every((p) => auth.hasPermission(p))) {
    return <Navigate to="/403" replace />;
  }
  return children;
}
