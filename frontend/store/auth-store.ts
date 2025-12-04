import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/lib/auth';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ user: null, token: null });
        authService.logout();
      },
      isAuthenticated: () => {
        const state = get();
        return !!(state.user && state.token);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

