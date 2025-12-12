// App configuration
// For physical devices, replace 'YOUR_LOCAL_IP' with your computer's local IP address
// Find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
// Look for IPv4 Address under your WiFi adapter (usually 192.168.x.x)
//
// IMPORTANT: Make sure your phone and computer are on the same WiFi network
// IMPORTANT: Make sure your firewall allows connections on the backend port

const getApiUrl = () => {
  if (!__DEV__) {
    return "https://api.production.com";
  }

  // For Android Emulator, use 10.0.2.2 instead of localhost
  // For iOS Simulator, localhost works fine
  // For Physical Device, use your computer's local IP (e.g., 192.168.1.74)

  // TODO: Replace with your computer's local IP address
  // You can find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
  const LOCAL_IP = "192.168.1.74"; // Change this to your computer's IP
  const BACKEND_PORT = "4000"; // Change this if your backend uses a different port

  // Uncomment the line that matches your setup:
  // return `http://localhost:${BACKEND_PORT}/api`; // iOS Simulator
  // return `http://10.0.2.2:${BACKEND_PORT}/api`; // Android Emulator
  return `http://${LOCAL_IP}:${BACKEND_PORT}/api`; // Physical Device (same WiFi)
};

export const config = {
  apiUrl: getApiUrl(),
  appVersion: "1.0.0",
  isDevelopment: __DEV__,
};
