import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// Inject Firebase ID token into every request
apiClient.interceptors.request.use((config) => {
  // In production, get a fresh Firebase ID token here
  // For now, no-op — token injection wired when auth is active
  return config;
});

// Handle 401 → re-prompt sign-in
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export const api = {
  auth: {
    storeToken: (payload: { accessToken: string; refreshToken: string; expiresIn: number }) =>
      apiClient.post('/auth/store-token', payload),
    me: () => apiClient.get('/auth/me'),
  },

  // ─── Sync ─────────────────────────────────────────────
  sync: {
    all: () => apiClient.post('/sync/all'),
    gmail: () => apiClient.post('/sync/gmail'),
    classroom: () => apiClient.post('/sync/classroom'),
  },

  // ─── Emails ───────────────────────────────────────────
  emails: {
    list: () => apiClient.get('/emails'),
    get: (id: string) => apiClient.get(`/emails/${id}`),
    process: (id: string) => apiClient.post(`/emails/${id}/process`),
  },

  // ─── Classroom ────────────────────────────────────────
  classroom: {
    courses: () => apiClient.get('/classroom/courses'),
    items: (courseId: string) => apiClient.get(`/classroom/${courseId}/items`),
    process: (itemId: string) => apiClient.post(`/classroom/items/${itemId}/process`),
  },

  // ─── Tasks ────────────────────────────────────────────
  tasks: {
    list: () => apiClient.get('/tasks'),
    get: (taskId: string) => apiClient.get(`/tasks/${taskId}`),
    cancel: (taskId: string) => apiClient.post(`/tasks/${taskId}/cancel`),
  },

  // ─── Outputs ──────────────────────────────────────────
  outputs: {
    list: () => apiClient.get('/outputs'),
    get: (id: string) => apiClient.get(`/outputs/${id}`),
  },
};
