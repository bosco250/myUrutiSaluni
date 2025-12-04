import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // Ensure token doesn't have extra whitespace
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      console.debug('Request with token:', { url: config.url, hasToken: !!cleanToken });
    } else {
      console.warn('No authentication token found. Request may fail:', config.url);
    }
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Log error details for debugging
    if (error.response) {
      const errorData = error.response.data;
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: errorData,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      });
      
      // Log validation errors in detail
      if (errorData?.message && Array.isArray(errorData.message)) {
        console.error('Validation errors:', errorData.message);
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

