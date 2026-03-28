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
  isProfileCreated: boolean;
  
  setAuth: (token: string, user?: User) => void;
  setProfileCreated: (status: boolean) => void;
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
        isProfileCreated: false,
        
        setAuth: (token, user) => set({ accessToken: token, user }),
        setProfileCreated: (status) => set({ isProfileCreated: status }),
        setDeviceFingerprint: (fp) => set({ deviceFingerprint: fp }),
        logout: () => set({ accessToken: null, user: null, isProfileCreated: false }),
      }),
      {
        name: 'auth-storage', // saves to localStorage so session persists on reload for now
      }
    )
  )
);
