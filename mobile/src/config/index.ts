// App configuration

export const config = {
  apiUrl: __DEV__ 
    ? 'http://localhost:4000/api' 
    : 'https://api.production.com',
  appVersion: '1.0.0',
  isDevelopment: __DEV__,
};

