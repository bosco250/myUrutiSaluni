import { api } from "./api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, any>;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

class NotificationsService {
  /**
   * Get in-app notifications
   */
  async getNotifications(options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<NotificationsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (options?.unreadOnly) {
        queryParams.append("unreadOnly", "true");
      }
      if (options?.limit) {
        queryParams.append("limit", options.limit.toString());
      }
      if (options?.offset) {
        queryParams.append("offset", options.offset.toString());
      }
      if (options?.type) {
        queryParams.append("type", options.type);
      }

      const queryString = queryParams.toString();
      const endpoint = `/notifications${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<NotificationsResponse>(endpoint);
      return response;
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      throw new Error(error.message || "Failed to fetch notifications");
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get<UnreadCountResponse>(
        "/notifications/unread-count"
      );
      return response.count || 0;
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      return 0; // Return 0 on error to prevent UI issues
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(`/notifications/${notificationId}/read`, {});
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      throw new Error(error.message || "Failed to mark notification as read");
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.post("/notifications/mark-all-read", {});
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      throw new Error(
        error.message || "Failed to mark all notifications as read"
      );
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      throw new Error(error.message || "Failed to delete notification");
    }
  }
}

export const notificationsService = new NotificationsService();
