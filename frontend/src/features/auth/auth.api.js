import axios from 'axios';
import { apiClient } from '@/lib/api/client';

const API_URL = import.meta.env.VITE_API_URL;

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data; // { accessToken, user } OR { mfaRequired, challenge }
}

// Completes an MFA login step-up.
export async function mfaLogin(challenge, token) {
  const { data } = await apiClient.post('/auth/mfa/login', { challenge, token });
  return data.data; // { accessToken, user }
}

// MFA self-enrollment (signed-in user).
export async function mfaEnroll() {
  const { data } = await apiClient.post('/auth/mfa/enroll');
  return data.data; // { secret, qr, otpauth }
}

export async function mfaVerify(token) {
  const { data } = await apiClient.post('/auth/mfa/verify', { token });
  return data.data; // { enabled: true }
}

export async function mfaDisable() {
  const { data } = await apiClient.post('/auth/mfa/disable');
  return data.data; // { enabled: false }
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

// Bare axios (no interceptors) so a failed refresh doesn't loop.
export async function refresh() {
  const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
  return data.data; // { accessToken, user }
}
