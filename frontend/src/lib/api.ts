// Consolidated API client — uses the single authenticated apiClient instance
// which automatically attaches Firebase ID tokens on every request.
import { apiClient } from './apiClient';

export { apiClient };

// ─── Auth ────────────────────────────────────────────────
export const api = {
  auth: {
    storeToken: (payload: {
      accessToken: string;
      displayName?: string | null;
      email?: string | null;
      photoURL?: string | null;
    }) => apiClient.post('/auth/store-token', payload),
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
