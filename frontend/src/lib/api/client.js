import axios from 'axios';
import { getAccessToken, setAccessToken } from '@/features/auth/token-store';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('Missing VITE_API_URL in environment configuration');
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly refresh cookie on /auth/refresh
});

// Attach the in-memory access token to every request.
apiClient.interceptors.request.use((cfg) => {
  const token = getAccessToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// On a 401, try one silent refresh, then replay the original request. A bare
// axios instance is used for the refresh so it can't recurse through this
// interceptor. On failure, clear the token and let the app redirect to /login.
let refreshing = null;
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const url = config?.url || '';
    if (response?.status !== 401 || config?._retried || url.includes('/auth/')) {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      if (!refreshing) {
        refreshing = axios
          .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
          .then((r) => r.data?.data?.accessToken)
          .finally(() => { refreshing = null; });
      }
      const token = await refreshing;
      if (!token) throw error;
      setAccessToken(token);
      config.headers.Authorization = `Bearer ${token}`;
      return apiClient(config);
    } catch {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(error);
    }
  },
);

/**
 * Artifact URLs from the backend are origin-relative ("/api/v1/jobs/.../pdf").
 * Resolve them against the API origin so they work when the frontend is
 * served from a different host than the API.
 */
export function resolveArtifactUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return new URL(API_URL).origin + path;
}
