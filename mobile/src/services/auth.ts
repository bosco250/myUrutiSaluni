import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { tokenStorage } from './tokenStorage';
import { config } from '../config';

const USER_KEY = '@auth_user';

/**
 * User data structure returned from backend and saved to AsyncStorage
 * This includes all essential user information needed for API authentication
 */
export interface User {
  id: number; // User ID - used for API requests and user identification
  email: string; // User email address
  phone?: string; // User phone number (optional)
  fullName: string; // User's full name
  role: string; // User role (e.g., 'customer', 'salon_employee', 'salon_owner')
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Login endpoint doesn't require authentication
      const response = await api.post<LoginResponse>(
        '/auth/login',
        credentials,
        { requireAuth: false }
      );
      
      // Store token and user data (including ID, email, phone, fullName, role)
      await this.setToken(response.access_token);
      await this.setUser(response.user);
      
      console.log('Login successful - Token and user data saved:', {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });
      
      return response;
    } catch (error: any) {
      // Handle API errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('Invalid email or password');
      }
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<LoginResponse> {
    try {
      // Register endpoint doesn't require authentication
      const response = await api.post<LoginResponse>(
        '/auth/register',
        credentials,
        { requireAuth: false }
      );
      
      // Store token and user data (including ID, email, phone, fullName, role)
      await this.setToken(response.access_token);
      await this.setUser(response.user);
      
      console.log('Registration successful - Token and user data saved:', {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
      });
      
      return response;
    } catch (error: any) {
      // Handle API errors
      if (error.message?.includes('409') || error.message?.includes('Conflict')) {
        throw new Error('Email already exists');
      }
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  }

  /**
   * Logout and clear stored data
   */
  async logout(): Promise<void> {
    await tokenStorage.clearToken();
    await AsyncStorage.removeItem(USER_KEY);
    this.token = null;
    this.user = null;
  }

  /**
   * Get stored authentication token
   */
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }
    
    const token = await tokenStorage.getToken();
    this.token = token;
    return token;
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<User | null> {
    if (this.user) {
      return this.user;
    }
    
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        this.user = JSON.parse(userJson);
        return this.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Set authentication token
   */
  private async setToken(token: string): Promise<void> {
    await tokenStorage.setToken(token);
    this.token = token;
  }

  /**
   * Set user data
   */
  private async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      this.user = user;
    } catch (error) {
      console.error('Error setting user:', error);
      throw error;
    }
  }

  /**
   * Initialize auth state from storage
   */
  async initialize(): Promise<void> {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        this.token = token;
      }
      
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        this.user = JSON.parse(userJson);
      }
    } catch (error) {
      // Ignore initialization errors
    }
  }
}

export const authService = new AuthService();

