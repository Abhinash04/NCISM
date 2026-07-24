import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAccessToken } from './token-store';
import * as authApi from './auth.api';

const AuthContext = createContext(null);

// Highest-authority role wins; drives the /:role landing + shell.
const ROLE_PRIORITY = [
  'admin', 'president', 'board_member', 'senior_consultant', 'consultant',
  'secretariat', 'hearing_committee', 'commission_observer', 'visitor', 'college',
  'reviewer', 'analyst', 'viewer',
];

// eslint-disable-next-line react-refresh/only-export-components -- helper co-located with the provider
export function primaryRoleOf(roles = []) {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0] || 'viewer';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authed | anon

  const applySession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authed');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anon');
  }, []);

  // Silent login on mount via the refresh cookie.
  useEffect(() => {
    let alive = true;
    authApi.refresh()
      .then((s) => { if (alive) applySession(s); })
      .catch(() => { if (alive) clearSession(); });
    return () => { alive = false; };
  }, [applySession, clearSession]);

  // The API client fires this when a refresh ultimately fails.
  useEffect(() => {
    const onLogout = () => clearSession();
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [clearSession]);

  // Returns { mfaRequired, challenge } when the account has MFA on — the caller
  // then collects a code and calls completeMfaLogin. Otherwise the session is
  // applied and it returns nothing.
  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    if (result.mfaRequired) return result;
    applySession(result);
    return undefined;
  }, [applySession]);

  const completeMfaLogin = useCallback(async (challenge, token) => {
    applySession(await authApi.mfaLogin(challenge, token));
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { clearSession(); }
  }, [clearSession]);

  const roles = user?.roles || [];

  const value = {
    user, status,
    isAuthenticated: status === 'authed',
    roles,
    permissions: user?.permissions || [],
    hasPermission: (p) => (user?.permissions || []).includes(p),
    hasRole: (r) => roles.includes(r),
    primaryRole: primaryRoleOf(roles),
    login, completeMfaLogin, logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with the provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
