import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

export function useTokenRefresh() {
  const { accessToken, logout, setAuth, user } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const performRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (res.data.access_token) {
          setAuth(res.data.access_token, user || undefined);
        }
      } catch {
        console.warn("Token auto-refresh failed. Logging user out.");
        logout();
        window.location.href = '/login';
      }
    };

    let expiresAt = 0;
    try {
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      expiresAt = payload.exp * 1000;
    } catch {
      return;
    }

    const timeUntilExpiry = expiresAt - Date.now();
    const timeUntilRefresh = timeUntilExpiry - (2 * 60 * 1000); 

    if (timeUntilRefresh <= 0) {
      performRefresh();
    } else {
      const timer = setTimeout(performRefresh, timeUntilRefresh);
      return () => clearTimeout(timer);
    }
  }, [accessToken, logout, setAuth, user]);
}
