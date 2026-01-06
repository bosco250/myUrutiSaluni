import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../users/entities/user.entity';

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Register or update a user's push token
   */
  async registerPushToken(
    userId: string,
    expoPushToken: string,
  ): Promise<boolean> {
    try {
      await this.usersRepository.update(userId, { expoPushToken });
      this.logger.log(`✅ Push token registered for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to register push token for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get a user's push token
   */
  async getUserPushToken(userId: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['expoPushToken'],
    });
    return user?.expoPushToken || null;
  }

  /**
   * Send a push notification to a single user
   * Optimized for immediate delivery like WhatsApp
   */
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: {
      channelId?: string;
      priority?: 'default' | 'normal' | 'high';
      badge?: number;
    },
  ): Promise<boolean> {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
      this.logger.warn(`Invalid push token: ${expoPushToken}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(), // Add timestamp for immediate processing
      },
      channelId: options?.channelId || 'default',
      priority: 'high', // Always use high priority for WhatsApp-like delivery
      badge: options?.badge,
    };

    try {
      // Use fetch with optimized settings for immediate delivery
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          'User-Agent': 'UrutiSaluni/1.0.0', // Custom user agent
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const ticket = result.data?.[0] as ExpoPushTicket;

      if (ticket?.status === 'ok') {
        this.logger.log(`📱 Push notification sent immediately: ${title}`);
        return true;
      } else {
        this.logger.error(
          `Push notification failed:`,
          ticket?.message || result,
        );
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error('Push notification timeout - retrying...');
        // Retry once on timeout
        return this.sendPushNotificationWithRetry(
          expoPushToken,
          title,
          body,
          data,
          options,
        );
      }
      this.logger.error(`Error sending push notification:`, error);
      return false;
    }
  }

  /**
   * Retry mechanism for failed push notifications
   */
  private async sendPushNotificationWithRetry(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: {
      channelId?: string;
      priority?: 'default' | 'normal' | 'high';
      badge?: number;
    },
  ): Promise<boolean> {
    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        retry: true,
      },
      channelId: options?.channelId || 'default',
      priority: 'high',
      badge: options?.badge,
    };

    try {
      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          'User-Agent': 'UrutiSaluni/1.0.0',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      const ticket = result.data?.[0] as ExpoPushTicket;

      if (ticket?.status === 'ok') {
        this.logger.log(`📱 Push notification sent on retry: ${title}`);
        return true;
      } else {
        this.logger.error(
          `Push notification retry failed:`,
          ticket?.message || result,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Push notification retry error:`, error);
      return false;
    }
  }

  /**
   * Send push notification to a user by their user ID
   */
  async sendPushNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: {
      channelId?: string;
      priority?: 'default' | 'normal' | 'high';
      badge?: number;
    },
  ): Promise<boolean> {
    const token = await this.getUserPushToken(userId);
    if (!token) {
      this.logger.log(
        `No push token for user ${userId}, skipping push notification`,
      );
      return false;
    }

    return this.sendPushNotification(token, title, body, data, options);
  }

  /**
   * Send push notifications to multiple users
   */
  async sendBatchPushNotifications(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: {
      channelId?: string;
      priority?: 'default' | 'normal' | 'high';
    },
  ): Promise<{ success: number; failed: number }> {
    // Get all users with push tokens
    const users = await this.usersRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'expoPushToken'],
    });

    const validTokens = users
      .filter((u) => u.expoPushToken?.startsWith('ExponentPushToken'))
      .map((u) => u.expoPushToken);

    if (validTokens.length === 0) {
      this.logger.log('No valid push tokens for batch notification');
      return { success: 0, failed: userIds.length };
    }

    // Send batch (Expo supports up to 100 messages per request)
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId: options?.channelId || 'default',
      priority: options?.priority || 'high',
    }));

    try {
      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      const tickets = (result.data || []) as ExpoPushTicket[];

      const success = tickets.filter((t) => t.status === 'ok').length;
      const failed = tickets.filter((t) => t.status === 'error').length;

      this.logger.log(
        `📱 Batch push notifications: ${success} sent, ${failed} failed`,
      );

      return {
        success,
        failed: failed + (userIds.length - validTokens.length),
      };
    } catch (error) {
      this.logger.error(`Error sending batch push notifications:`, error);
      return { success: 0, failed: userIds.length };
    }
  }

  /**
   * Get the appropriate channel ID based on notification type
   */
  getChannelIdForType(type: string): string {
    if (type.startsWith('appointment_')) {
      return 'appointments';
    }
    if (
      type.startsWith('payment_') ||
      type.startsWith('sale_') ||
      type.startsWith('commission_')
    ) {
      return 'payments';
    }
    if (
      type.startsWith('points_') ||
      type === 'reward_available' ||
      type === 'vip_status_achieved'
    ) {
      return 'promotions';
    }
    return 'default';
  }

  /**
   * Remove a user's push token (e.g., on logout)
   */
  async removePushToken(userId: string): Promise<boolean> {
    try {
      await this.usersRepository.update(userId, { expoPushToken: null });
      this.logger.log(`Push token removed for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove push token for user ${userId}:`,
        error,
      );
      return false;
    }
  }
}
