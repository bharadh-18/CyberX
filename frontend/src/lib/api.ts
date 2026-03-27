import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Create Axios Instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach device fingerprint if available
  const fp = useAuthStore.getState().deviceFingerprint;
  if (fp) {
    config.headers['X-Device-Fingerprint'] = fp;
  }

  return config;
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic global error handling
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
