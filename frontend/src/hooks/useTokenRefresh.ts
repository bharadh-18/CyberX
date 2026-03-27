import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

export function useTokenRefresh() {
  const { accessToken, logout, setAuth, user } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    // Decode JWT to find expiry
    let expiresAt = 0;
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      expiresAt = payload.exp * 1000;
    } catch (e) {
      return;
    }

    // Refresh 2 minutes before expiry (or immediately if close)
    const timeUntilExpiry = expiresAt - Date.now();
    const timeUntilRefresh = timeUntilExpiry - (2 * 60 * 1000); // 2 minutes before

    if (timeUntilRefresh <= 0) {
      // Refresh immediately
      performRefresh();
    } else {
      const timer = setTimeout(performRefresh, timeUntilRefresh);
      return () => clearTimeout(timer);
    }
  }, [accessToken]);

  const performRefresh = async () => {
    try {
      // The backend endpoint reads the HttpOnly cookie `refresh_token`
      const res = await api.post('/auth/refresh');
      if (res.data.access_token) {
        setAuth(res.data.access_token, user || undefined);
      }
    } catch (err) {
      console.warn("Token auto-refresh failed. Logging user out.");
      logout();
      window.location.href = '/login';
    }
  };
}
