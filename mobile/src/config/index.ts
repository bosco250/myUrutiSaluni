// Environment configuration - all values are defined directly here
// No .env file needed for mobile

// Configuration values
const CONFIG = {
  // API URL - change this to your backend URL
  // For development on physical device, use your computer's IP address
  // For emulator, use 10.0.2.2 (Android) or localhost (iOS)
  API_URL: 'http://192.168.1.76:4000/api',
  // API_URL: 'http://161.97.148.53:4000/api',
  
  // App info
  APP_NAME: 'URUTI Saluni',
  APP_VERSION: '1.0.0',
  
  // Optional: External services (only if needed)
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_UPLOAD_PRESET: '',
  GOOGLE_MAPS_API_KEY: '',
};

// Environment variables interface
interface Env {
  apiUrl: string;
  appName: string;
  appVersion: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  googleMapsApiKey?: string;
}

// Get environment variables from config
const getEnvVars = (): Env => {
  return {
    apiUrl: CONFIG.API_URL,
    appName: CONFIG.APP_NAME,
    appVersion: CONFIG.APP_VERSION,
    cloudinaryCloudName: CONFIG.CLOUDINARY_CLOUD_NAME || undefined,
    cloudinaryUploadPreset: CONFIG.CLOUDINARY_UPLOAD_PRESET || undefined,
    googleMapsApiKey: CONFIG.GOOGLE_MAPS_API_KEY || undefined,
  };
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

