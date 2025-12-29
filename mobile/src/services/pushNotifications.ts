import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Check if running in Expo Go (where push notifications are not supported)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Conditionally import expo-notifications to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

try {
  if (!isExpoGo) {
    // Only import if not in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    notificationsAvailable = Notifications !== null;
  }
} catch {
  // Silently handle - expo-notifications not available in Expo Go
  notificationsAvailable = false;
}

// Configure how notifications appear - CRITICAL: Always show in device notification system
// This ensures notifications appear like WhatsApp - immediately visible in notification tray
if (Notifications && notificationsAvailable && !isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Always show notification in system tray, even when app is in foreground
      // This mimics WhatsApp behavior - notifications always visible
      return {
        shouldShowAlert: true,      // Show alert/banner
        shouldPlaySound: true,       // Play sound
        shouldSetBadge: true,        // Update badge count
        shouldShowBanner: true,      // Show banner at top
        shouldShowList: true,        // Show in notification list
      };
    },
  });
  
  // Set notification presentation options for iOS
  if (Platform.OS === 'ios') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C89B68',
    });
  }
}

export interface PushNotificationData {
  type?: string;
  appointmentId?: string;
  saleId?: string;
  paymentId?: string;
  customerId?: string;
  salonId?: string;
  [key: string]: any;
}

class PushNotificationsService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications and get the Expo push token
   * Returns the token or null if registration failed
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    // Return null if running in Expo Go or if notifications module is not available
    if (isExpoGo || !Notifications || !notificationsAvailable) {
      if (isExpoGo) {
        console.log('Push notifications are not available in Expo Go. Use a development build instead.');
      }
      return null;
    }

    let token: string | null = null;

    // Must be a physical device for push notifications
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId 
        ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        // For development, use experienceId
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        token = tokenResponse.data;
      } else {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = tokenResponse.data;
      }

      this.expoPushToken = token;
      console.log('📱 Expo Push Token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    return token;
  }

  /**
   * Set up Android notification channels for different notification types
   * Using MAX importance to ensure notifications are always visible like WhatsApp
   */
  private async setupAndroidChannels(): Promise<void> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return;
    }

    try {
      // Default channel for general notifications - MAX importance for immediate visibility
      await Notifications.setNotificationChannelAsync('default', {
        name: 'UrutiSaluni Notifications',
        description: 'Important notifications from UrutiSaluni',
        importance: Notifications.AndroidImportance.MAX, // Highest priority - always visible
        vibrationPattern: [0, 250, 250, 250], // Vibrate pattern
        lightColor: '#C89B68', // LED color
        sound: 'default', // Default notification sound
        enableVibrate: true,
        showBadge: true,
      });

      // Appointments channel - MAX importance for critical appointment updates
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointments',
        description: 'Notifications about your appointments',
        importance: Notifications.AndroidImportance.MAX, // Highest priority
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C89B68',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Sales & Payments channel - MAX importance for financial updates
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments & Sales',
        description: 'Notifications about payments and sales',
        importance: Notifications.AndroidImportance.MAX, // Highest priority
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C89B68',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Promotions & Loyalty channel - HIGH importance (still very visible)
      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions & Rewards',
        description: 'Notifications about loyalty points and promotions',
        importance: Notifications.AndroidImportance.HIGH, // High priority
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C89B68',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      
      console.log('✅ Android notification channels configured with MAX importance');
    } catch (error) {
      console.error('Error setting up Android notification channels:', error);
    }
  }

  /**
   * Send the push token to the backend for storage
   * Includes retry logic for network issues (like WhatsApp reconnection)
   */
  async registerTokenWithBackend(token: string, retries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await api.post('/notifications/push-token', {
          expoPushToken: token,
        });
        console.log('✅ Push token registered with backend');
        return true;
      } catch (error: any) {
        const isLastAttempt = attempt === retries;
        const errorMessage = error.message || 'Unknown error';
        
        if (isLastAttempt) {
          console.error(`❌ Failed to register push token after ${retries} attempts:`, errorMessage);
          // Don't give up - will retry on next app open or network reconnect
          return false;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⚠️ Token registration failed (attempt ${attempt}/${retries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    return false;
  }

  /**
   * Get the current Expo push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Add a listener for notifications received while app is in foreground
   */
  addNotificationReceivedListener(
    callback: (notification: any) => void
  ): { remove: () => void } {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return { remove: () => {} };
    }
    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification received listener:', error);
      return { remove: () => {} };
    }
  }

  /**
   * Add a listener for when user interacts with a notification (taps it)
   */
  addNotificationResponseReceivedListener(
    callback: (response: any) => void
  ): { remove: () => void } {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return { remove: () => {} };
    }
    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
      console.error('Error adding notification response listener:', error);
      return { remove: () => {} };
    }
  }

  /**
   * Get the navigation target based on notification type
   */
  getNavigationTarget(data: PushNotificationData): { screen: string; params: any } {
    const type = data.type || '';

    // Appointment notifications
    if (type.startsWith('appointment_')) {
      if (type === 'appointment_cancelled') {
        return { screen: 'Bookings', params: {} };
      }
      if (data.appointmentId) {
        return {
          screen: 'AppointmentDetail',
          params: { appointmentId: data.appointmentId },
        };
      }
      return { screen: 'Bookings', params: {} };
    }

    // Sale notifications - navigate to SaleDetail for receipt
    if (type.startsWith('sale_') || type === 'sale_completed') {
      if (data.saleId) {
        return {
          screen: 'SaleDetail',
          params: { saleId: data.saleId },
        };
      }
      // Fallback: navigate to SalesHistory if no saleId
      return {
        screen: 'SalesHistory',
        params: {},
      };
    }

    // Payment notifications - navigate to PaymentHistory
    if (type.startsWith('payment_')) {
      return {
        screen: 'PaymentHistory',
        params: { highlightPaymentId: data.paymentId },
      };
    }

    // Commission notifications
    if (type.startsWith('commission_') || type === 'commission_earned' || type === 'commission_paid') {
      return { screen: 'Commissions', params: {} };
    }

    // Loyalty notifications
    if (type.startsWith('points_') || type === 'reward_available' || type === 'vip_status_achieved') {
      return { screen: 'Loyalty', params: {} };
    }

    // Inventory notifications (for salon owners)
    if (type === 'low_stock_alert' || type === 'out_of_stock' || type === 'stock_replenished') {
      return { screen: 'InventoryManagement', params: {} };
    }

    // Salon notifications
    if (type === 'salon_update' && data.salonId) {
      return { screen: 'SalonDetail', params: { salonId: data.salonId } };
    }

    // Default: go to notifications screen
    return { screen: 'Notifications', params: {} };
  }

  /**
   * Schedule a local notification (useful for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
    seconds: number = 1
  ): Promise<string> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return '';
    }
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown>,
          sound: 'default',
        },
        trigger: { 
          seconds,
          repeats: false,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        },
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return '';
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return;
    }
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return 0;
    }
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return;
    }
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return;
    }
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }
}

export const pushNotificationsService = new PushNotificationsService();
