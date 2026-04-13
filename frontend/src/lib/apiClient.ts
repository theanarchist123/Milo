import axios from 'axios';
import { auth } from './firebase';

const baseURL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12_000,
});

// ─── Request interceptor: attach Firebase ID token ───────────────────────────
// auth.authStateReady() is a Promise that resolves once Firebase has finished
// initialising its cached session. Without this, requests fired immediately on
// page-load may run before auth.currentUser is populated → 401 with no token.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      await auth.authStateReady(); // wait for Firebase to restore session
      const user = auth.currentUser;
      if (user) {
        // getIdToken() returns cached token; auto-refreshes if near expiry
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('[apiClient] Could not get Firebase ID token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle errors ────────────────────────────────────
// Only force-logout on 401 when the backend explicitly says the token is
// invalid/expired — NOT on every 401 (e.g. network glitch). This avoids the
// "logged-out immediately after sign-in" bug caused by transient errors.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail: string = error.response?.data?.detail ?? '';
    const is401 = error.response?.status === 401;
    // Only force-logout when the backend explicitly rejects the token as
    // invalid or expired. 'Not authenticated' just means no token was sent
    // (race condition on init) and must NOT cause a logout.
    const isTokenRejected =
      is401 &&
      (detail.toLowerCase().includes('invalid') ||
        detail.toLowerCase().includes('expired'));

    if (isTokenRejected) {
      console.warn('[apiClient] Token rejected by backend — logging out:', detail);
      import('@/stores/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
    return Promise.reject(error);
  }
);
