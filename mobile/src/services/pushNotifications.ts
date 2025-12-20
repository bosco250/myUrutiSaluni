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

// Configure how notifications appear when app is in foreground
// TEMPORARILY DISABLED: Push notifications are disabled until deployment
/*
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
*/

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
   */
  private async setupAndroidChannels(): Promise<void> {
    if (!Notifications || !notificationsAvailable || isExpoGo) {
      return;
    }

    try {
      // Default channel for general notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C89B68',
        sound: 'default',
      });

      // Appointments channel
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointments',
        description: 'Notifications about your appointments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C89B68',
        sound: 'default',
      });

      // Sales & Payments channel
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments & Sales',
        description: 'Notifications about payments and sales',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });

      // Promotions & Loyalty channel
      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions & Rewards',
        description: 'Notifications about loyalty points and promotions',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    } catch (error) {
      console.error('Error setting up Android notification channels:', error);
    }
  }

  /**
   * Send the push token to the backend for storage
   */
  async registerTokenWithBackend(token: string): Promise<boolean> {
    try {
      await api.post('/notifications/push-token', {
        expoPushToken: token,
      });
      console.log('✅ Push token registered with backend');
      return true;
    } catch (error: any) {
      console.error('Failed to register push token with backend:', error.message);
      return false;
    }
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

    // Sales & Payment notifications
    if (type.startsWith('sale_') || type.startsWith('payment_')) {
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
