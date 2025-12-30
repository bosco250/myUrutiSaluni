import { useState, useEffect } from 'react';
import { useAuth } from '../context';

/**
 * Hook to fetch and maintain unread notification count
 * Automatically refreshes every 30 seconds
 */
export function useUnreadNotifications() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Dynamically import to avoid circular dependencies
        const { notificationsService } = await import('../services/notifications');
        
        // Check if notificationsService is available
        if (!notificationsService || typeof notificationsService.getUnreadCount !== 'function') {
          console.warn("NotificationsService not available");
          setUnreadCount(0);
          return;
        }
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count || 0);
      } catch (error: any) {
        // Silently fail - badge just won't show
        const msg = error?.message || String(error);
        if (!msg.includes('Session expired')) {
           console.error("Error fetching unread count:", msg);
        }
        setUnreadCount(0);
      }
    };

    // Defer initial fetch to not block app startup
    const initialTimeout = setTimeout(fetchUnreadCount, 500);
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  return unreadCount;
}

