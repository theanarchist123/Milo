import axios from 'axios';
import { auth } from './firebase';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add Firebase token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error fetching Firebase token for API request', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
