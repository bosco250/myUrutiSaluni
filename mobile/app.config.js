// Dynamic Expo configuration with environment variables
// This file loads .env and passes values to the app

import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: process.env.APP_NAME || 'UrutiSaluni',
    slug: 'uruti-saluni',
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/Welcome page.png',
      resizeMode: 'cover',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      icon: './assets/icon.png',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.douce11.urutisaluni',
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'com.android.alarm.permission.SET_ALARM',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#C89B68',
        },
      ],
      'expo-secure-store',
      '@react-native-community/datetimepicker',
    ],
    extra: {
      // Environment variables exposed to the app
      apiUrl: process.env.API_URL,
      appName: process.env.APP_NAME || 'URUTI Saluni',
      appVersion: process.env.APP_VERSION || '1.0.0',
      
      // Cloudinary configuration
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
      
      // Expo
      expoProjectId: process.env.EXPO_PROJECT_ID,
      
      // Google Maps
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      
      // EAS configuration
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || '010bf482-772d-4810-b30c-39fa0fc7fcab',
      },
    },
  };
};
