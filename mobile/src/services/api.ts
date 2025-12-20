import { config } from '../config';
import { tokenStorage } from './tokenStorage';

// API service configuration and methods
const API_BASE_URL = config.apiUrl;

interface RequestOptions {
  headers?: Record<string, string>;
  requireAuth?: boolean;
  isLoginRequest?: boolean; // Set to true for login endpoints to get proper credential error messages
}

class ApiService {
  /**
   * Get authentication headers
   * Automatically includes Bearer token for authenticated requests
   * Backend expects: Authorization: Bearer <token>
   */
  private async getHeaders(requireAuth: boolean = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = await tokenStorage.getToken();
      if (token) {
        // Backend uses JWT Bearer token authentication
        // Format: Authorization: Bearer <jwt_token>
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response
   * @param response - The fetch Response object
   * @param isLoginRequest - Whether this is a login request (401 = invalid credentials, not session expired)
   */
  private async handleResponse<T>(response: Response, isLoginRequest: boolean = false): Promise<T> {
    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        // For login requests, 401 means invalid credentials
        if (isLoginRequest) {
          // Try to get the actual error message from the response
          let errorMessage = 'Invalid email or password';
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Use default message if response is not JSON
          }
          
          const error = new Error(errorMessage);
          (error as any).status = 401;
          (error as any).isLoginError = true;
          throw error;
        }
        
        // For other requests, 401 means token expired or invalid
        // Clear stored token
        try {
          await tokenStorage.clearToken();
        } catch {
          // Ignore errors on clear
        }
        
        const error = new Error('Session expired. Please login again.');
        (error as any).status = 401;
        (error as any).isSessionExpired = true;
        throw error;
      }
      
      let errorMessage = `API Error: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If response is not JSON, use status text
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return {} as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true } = options;
    const headers = await this.getHeaders(requireAuth);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: unknown, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true, isLoginRequest = false } = options;
    const headers = await this.getHeaders(requireAuth);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...headers,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response, isLoginRequest);
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: unknown, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true } = options;
    const headers = await this.getHeaders(requireAuth);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          ...headers,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: unknown, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true } = options;
    const headers = await this.getHeaders(requireAuth);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true } = options;
    const headers = await this.getHeaders(requireAuth);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }
}

export const api = new ApiService();


