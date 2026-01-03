// Environment configuration using Expo constants
// This reads from .env file using expo-constants

import Constants from 'expo-constants';

// Environment variables interface
interface Env {
  apiUrl: string;
  appName: string;
  appVersion: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryUploadPreset?: string;
  expoProjectId?: string;
  googleMapsApiKey?: string;
}

// Get environment variables from Expo config
const getEnvVars = (): Env => {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    apiUrl: extra.apiUrl || getDefaultApiUrl(),
    appName: extra.appName || 'URUTI Saluni',
    appVersion: extra.appVersion || '1.0.0',
    cloudinaryCloudName: extra.cloudinaryCloudName,
    cloudinaryApiKey: extra.cloudinaryApiKey,
    cloudinaryUploadPreset: extra.cloudinaryUploadPreset,
    expoProjectId: extra.expoProjectId,
    googleMapsApiKey: extra.googleMapsApiKey,
  };
};

// Default API URL for development
const getDefaultApiUrl = (): string => {
  if (!__DEV__) {
    return 'https://api.production.com/api';
  }
  
  // Warn if API_URL is missing in development
  console.warn('⚠️ API_URL is not set in mobile/.env. Using http://localhost:4000/api as default. Use your computer IP for physical devices!');
  
  return 'http://localhost:4000/api';
};

// Export environment configuration
export const env = getEnvVars();

// Export config for backward compatibility
export const config = {
  apiUrl: env.apiUrl,
  appVersion: env.appVersion,
  appName: env.appName,
  isDevelopment: __DEV__,
};
