import axios from 'axios';
import { logger } from './logger';
import { secureStorage } from './secure-storage';
import { clearAllSessionData } from './auth';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://161.97.148.53:4000/api';

// Log API URL in development (only in browser)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  logger.debug('API Base URL', { apiUrl });
}

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Try to get token from secure storage first, fallback to localStorage
    const token = secureStorage.getToken() || localStorage.getItem('token');
    if (token) {
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      logger.debug('Request with authentication', { url: config.url });
    } else {
      // Only warn if not an auth request
      const url = String(config.url || '');
      const isPublicEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/signin') || url.includes('/auth/signup');
      
      if (!isPublicEndpoint) {
        logger.warn('No authentication token found', { url: config.url });
      }
    }
  }

  // If Content-Type is explicitly set to undefined, remove it to let axios set it for FormData
  if (config.headers['Content-Type'] === undefined) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Do NOT redirect on invalid login/register credentials (these legitimately return 401/403).
      // Redirecting here causes a full page reload and wipes the inline error UX on the auth pages.
      const url = String(error.config?.url || '');
      const isAuthAttempt =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/signin') ||
        url.includes('/auth/signup');
      if (isAuthAttempt) {
        return Promise.reject(error);
      }

      // Session expired - clear ALL localStorage data for security
      clearAllSessionData();

      // Redirect to login
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }

    // Log error using logger
    if (error.response) {
      if (!(error.config as any)?.suppressErrorLog) {
        logger.logAPIError(error.config?.url || 'unknown', error);
      }
    } else if (error.request) {
      if (!(error.config as any)?.suppressErrorLog) {
        logger.error('No response received from server', { url: error.config?.url });
      }
    } else {
      logger.error('Error setting up request', { message: error.message });
    }

    return Promise.reject(error);
  }
);

export default api;
