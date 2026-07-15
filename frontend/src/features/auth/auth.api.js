import axios from 'axios';
import { apiClient } from '@/lib/api/client';

const API_URL = import.meta.env.VITE_API_URL;

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data; // { accessToken, user }
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

// Bare axios (no interceptors) so a failed refresh doesn't loop.
export async function refresh() {
  const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
  return data.data; // { accessToken, user }
}
