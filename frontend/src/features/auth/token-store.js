// Access token lives in memory only (never localStorage). The httpOnly refresh
// cookie restores the session on reload via POST /auth/refresh.
let accessToken = null;
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  listeners.forEach((fn) => fn(accessToken));
}

export function onTokenChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
