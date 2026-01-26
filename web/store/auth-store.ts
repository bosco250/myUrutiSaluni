import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService, clearAllSessionData } from '@/lib/auth';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  avatar?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

// Custom storage that safely handles SSR
const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      refreshUser: async () => {
        const updatedUser = await authService.refreshUser();
        if (updatedUser) {
          set({ user: updatedUser });
        }
      },
      logout: () => {
        set({ user: null, token: null });
        // Clear all session data including localStorage
        clearAllSessionData();
      },
      isAuthenticated: () => {
        const state = get();
        return !!(state.user && state.token);
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

