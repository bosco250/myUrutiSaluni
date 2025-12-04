import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      await AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  },
);

export default api;

