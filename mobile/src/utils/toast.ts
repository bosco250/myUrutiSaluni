import { Platform, ToastAndroid, Alert } from 'react-native';

/**
 * Show a toast message to the user
 * @param message The message to display
 * @param type The type of message (success, error, info) - mainly affects iOS Alert title or internal logging
 */
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // Fallback for iOS since it doesn't support ToastAndroid
    // For errors, we show an alert. For success/info, we might want to be less intrusive,
    // but without a toast library, Alert is the only standard way to show a message.
    const title = type === 'error' ? 'Error' : (type === 'success' ? 'Success' : 'Info');
    Alert.alert(title, message);
  }
};
