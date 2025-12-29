import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import Constants from "expo-constants";
import {
  pushNotificationsService,
  PushNotificationData,
} from "../services/pushNotifications";
import { useAuth } from "./AuthContext";
import { useNetwork } from "./NetworkContext";

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Type definitions for notifications (when available)
type Notification = {
  request: {
    content: {
      title: string;
      body: string;
      data: any;
    };
  };
};

type NotificationResponse = {
  notification: Notification;
};

interface PushNotificationContextType {
  expoPushToken: string | null;
  notification: Notification | null;
  isRegistered: boolean;
  registerForPushNotifications: () => Promise<void>;
  lastNotificationResponse: NotificationResponse | null;
}

const PushNotificationContext = createContext<
  PushNotificationContextType | undefined
>(undefined);

interface PushNotificationProviderProps {
  children: ReactNode;
  onNotificationTap?: (screen: string, params: any) => void;
}

export function PushNotificationProvider({
  children,
  onNotificationTap,
}: PushNotificationProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useNetwork();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] =
    useState<NotificationResponse | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    try {
      const token =
        await pushNotificationsService.registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token);

        // Send token to backend
        const registered =
          await pushNotificationsService.registerTokenWithBackend(token);
        setIsRegistered(registered);

        if (registered) {
          console.log("🔔 Push notifications fully set up");
        }
      }
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    if (isExpoGo) {
      return () => {};
    }

    // Listen for notifications received while app is foregrounded
    const notificationListener = pushNotificationsService.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received in foreground:', notification.request.content.title);
        setNotification(notification);
      }
    );

    // Listen for notification interactions (user taps on notification)
    const responseListener = pushNotificationsService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 User interacted with notification');
        setLastNotificationResponse(response);
        
        // Get navigation target based on notification data
        const data = response.notification.request.content.data as PushNotificationData;
        const { screen, params } = pushNotificationsService.getNavigationTarget(data);
        
        console.log(`📍 Navigating to: ${screen}`, params);
        
        // Call the navigation callback if provided
        if (onNotificationTap) {
          onNotificationTap(screen, params);
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [onNotificationTap]);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isExpoGo) {
      registerForPushNotifications();
    }
  }, [isAuthenticated, user, registerForPushNotifications]);

  // Re-register push token when network reconnects (like WhatsApp reconnection)
  useEffect(() => {
    if (isConnected && isAuthenticated && user && expoPushToken && !isRegistered && !isExpoGo) {
      // Network just came back - retry token registration
      console.log('🌐 Network reconnected - re-registering push token...');
      pushNotificationsService.registerTokenWithBackend(expoPushToken).then((success) => {
        if (success) {
          setIsRegistered(true);
          console.log('✅ Push token re-registered after network reconnect');
        }
      });
    }
  }, [isConnected, isAuthenticated, user, expoPushToken, isRegistered]);

  // Check for initial notification (app was opened from notification)
  useEffect(() => {
    if (isExpoGo) {
      return; // Skip in Expo Go
    }

    const checkInitialNotification = async () => {
      try {
        // Dynamically import to avoid errors in Expo Go
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Notifications = require("expo-notifications");
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          console.log("🚀 App opened from notification");
          setLastNotificationResponse(response);

          const data = response.notification.request.content
            .data as PushNotificationData;
          const { screen, params } =
            pushNotificationsService.getNavigationTarget(data);

          if (onNotificationTap) {
            // Delay navigation slightly to ensure app is ready
            setTimeout(() => {
              onNotificationTap(screen, params);
            }, 500);
          }
        }
      } catch {
        // Silently fail in Expo Go or if notifications are not available
        console.log("Could not check initial notification (likely in Expo Go)");
      }
    };

    checkInitialNotification();
  }, [onNotificationTap]);

  const value: PushNotificationContextType = {
    expoPushToken,
    notification,
    isRegistered,
    registerForPushNotifications,
    lastNotificationResponse,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error(
      "usePushNotifications must be used within a PushNotificationProvider"
    );
  }
  return context;
}
