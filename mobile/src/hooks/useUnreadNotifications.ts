import { useState, useEffect } from 'react';

/**
 * Hook to fetch and maintain unread notification count
 * Automatically refreshes every 30 seconds
 */
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
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
        console.error("Error fetching unread count:", error?.message || error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return unreadCount;
}

