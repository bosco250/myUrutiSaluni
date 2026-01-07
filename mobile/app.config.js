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
    icon: './assets/logo_square.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/Welcome page.png',
      resizeMode: 'cover',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      icon: './assets/logo_square.png',
      bundleIdentifier: 'com.boscotech.urutisaluni',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/logo_square.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: false,
      predictiveBackGestureEnabled: false,
      package: 'com.boscotech.urutisaluni',
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'com.android.alarm.permission.SET_ALARM',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
      ],
    },
    web: {
      favicon: './assets/logo_square.png',
    },
    plugins: [
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/logo_square.png',
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
      
      // EAS configuration - Set via: npx eas project:init
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || 'bba1bdca-d156-4d7d-90b9-4d58f56ff6ca',
      },
    },
  };
};
