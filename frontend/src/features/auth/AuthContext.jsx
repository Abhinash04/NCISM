import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAccessToken } from './token-store';
import * as authApi from './auth.api';

const AuthContext = createContext(null);

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

  const login = useCallback(async (email, password) => {
    applySession(await authApi.login(email, password));
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { clearSession(); }
  }, [clearSession]);

  const value = {
    user, status,
    isAuthenticated: status === 'authed',
    roles: user?.roles || [],
    permissions: user?.permissions || [],
    hasPermission: (p) => (user?.permissions || []).includes(p),
    hasRole: (r) => (user?.roles || []).includes(r),
    login, logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
