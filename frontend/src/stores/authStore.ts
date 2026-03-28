import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  roles: string[];
  displayName?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  deviceFingerprint: string;
  
  setAuth: (token: string, user?: User) => void;
  setDeviceFingerprint: (fp: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        user: null,
        deviceFingerprint: '',
        
        setAuth: (token, user) => set({ accessToken: token, user }),
        setDeviceFingerprint: (fp) => set({ deviceFingerprint: fp }),
        logout: () => set({ accessToken: null, user: null }),
      }),
      {
        name: 'auth-storage', // saves to localStorage so session persists on reload for now
      }
    )
  )
);
