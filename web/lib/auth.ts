import api from './api';
import { secureStorage } from './secure-storage';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
    avatar?: string;
  };
}

/**
 * Clears all session data from localStorage and secureStorage
 * This should be called when session expires or user logs out
 * to prevent unauthorized access to stored data
 * 
 * This function comprehensively clears:
 * - All auth tokens and user data
 * - Zustand persist storage
 * - Secure storage items
 * - Any other auth-related localStorage items
 * - Finally clears ALL localStorage as a safety measure
 */
export function clearAllSessionData(): void {
  if (typeof window === 'undefined') return;

  try {
    // First, clear secureStorage items (items with salon_app_ prefix)
    // This must be done before clearing localStorage
    secureStorage.clear();
    
    // Clear known auth-related items explicitly
    const knownAuthKeys = [
      'token',
      'user',
      'auth-storage', // Zustand persist storage
    ];
    
    knownAuthKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key: ${key}`, error);
      }
    });
    
    // Clear any other potential auth-related items by scanning
    // We collect keys first to avoid iteration issues
    const keysToRemove: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const lowerKey = key.toLowerCase();
          // Remove any item that might be auth-related
          if (
            lowerKey.includes('auth') ||
            lowerKey.includes('token') ||
            lowerKey.includes('session') ||
            lowerKey.includes('user') ||
            lowerKey.startsWith('salon_app_')
          ) {
            keysToRemove.push(key);
          }
        }
      }
    } catch (error) {
      console.warn('Error scanning localStorage keys:', error);
    }
    
    // Remove all identified keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key: ${key}`, error);
      }
    });

    // As a final safety measure, clear ALL localStorage
    // This ensures no sensitive data remains, even if we missed something
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing session data:', error);
    // If individual removal fails, try clearing everything as last resort
    try {
      localStorage.clear();
    } catch (clearError) {
      console.error('Failed to clear localStorage:', clearError);
    }
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<any>('/auth/login', credentials);
    const data = response.data.data || response.data;
    if (data.access_token && typeof window !== 'undefined') {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<any>('/auth/register', data);
    const authData = response.data.data || response.data;
    if (authData.access_token && typeof window !== 'undefined') {
      localStorage.setItem('token', authData.access_token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
    return authData;
  },

  logout() {
    clearAllSessionData();
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  getUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async refreshUser(): Promise<AuthResponse['user'] | null> {
    try {
      const response = await api.get<any>('/users/me');
      const userData = response.data.data || response.data;
      if (userData && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }
      return userData;
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      return null;
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<any>('/auth/forgot-password', { email });
    return response.data.data || response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<any>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data.data || response.data;
  },
};

