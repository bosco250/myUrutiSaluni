import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';

export interface CreateInAppNotificationDto {
  userId?: string;
  customerId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  metadata?: Record<string, any>;
  appointmentId?: string;
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async createInAppNotification(
    dto: CreateInAppNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = this.notificationsRepository.create({
        userId: dto.userId,
        customerId: dto.customerId,
        channel: NotificationChannel.IN_APP,
        type: dto.type,
        title: dto.title,
        body: dto.message,
        status: NotificationStatus.SENT, // In-app notifications are immediately "sent"
        isRead: false,
        actionUrl: dto.actionUrl,
        actionLabel: dto.actionLabel,
        priority: dto.priority || 'medium',
        icon: dto.icon,
        metadata: dto.metadata || {},
        appointmentId: dto.appointmentId,
      });

      const saved = await this.notificationsRepository.save(notification);
      this.logger.log(
        `✅ In-app notification created: ${saved.id} for ${dto.userId || dto.customerId}`,
      );
      return saved;
    } catch (error: any) {
      this.logger.error(`Failed to create in-app notification:`, error);
      throw error;
    }
  }

  async getUserNotifications(
    userId?: string,
    customerId?: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
    },
  ): Promise<{ data: Notification[]; total: number }> {
    const where:
      | FindOptionsWhere<Notification>
      | FindOptionsWhere<Notification>[] = {
      channel: NotificationChannel.IN_APP,
    };

    // Build OR conditions for userId and customerId
    const conditions: FindOptionsWhere<Notification>[] = [];

    if (userId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        userId: userId,
        ...(options?.unreadOnly && { isRead: false }),
        ...(options?.type && { type: options.type }),
      });
    }

    if (customerId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        customerId: customerId,
        ...(options?.unreadOnly && { isRead: false }),
        ...(options?.type && { type: options.type }),
      });
    }

    // If both userId and customerId are provided, use OR condition
    // If only one is provided, use that single condition
    const finalWhere =
      conditions.length > 1 ? conditions : conditions[0] || where;

    const [data, total] = await this.notificationsRepository.findAndCount({
      where: finalWhere,
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      relations: ['appointment', 'customer', 'user'],
    });

    return { data, total };
  }

  async getUnreadCount(userId?: string, customerId?: string): Promise<number> {
    // Build OR conditions for userId and customerId
    const conditions: FindOptionsWhere<Notification>[] = [];

    if (userId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        isRead: false,
        userId: userId,
      });
    }

    if (customerId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        isRead: false,
        customerId: customerId,
      });
    }

    // If no conditions, return 0
    if (conditions.length === 0) {
      return 0;
    }

    // Use OR condition to get count for either userId or customerId
    const where = conditions.length > 1 ? conditions : conditions[0];

    return this.notificationsRepository.count({ where });
  }

  async markAsRead(
    notificationId: string,
    userId?: string,
    customerId?: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Verify ownership - notification belongs to user if EITHER:
    // 1. It has userId and matches the provided userId, OR
    // 2. It has customerId and matches the provided customerId
    const belongsToUser =
      (userId && notification.userId === userId) ||
      (customerId && notification.customerId === customerId);

    if (!belongsToUser) {
      throw new Error('Unauthorized: Notification does not belong to user');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId?: string, customerId?: string): Promise<number> {
    const conditions: FindOptionsWhere<Notification>[] = [];

    if (userId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        isRead: false,
        userId: userId,
      });
    }

    if (customerId) {
      conditions.push({
        channel: NotificationChannel.IN_APP,
        isRead: false,
        customerId: customerId,
      });
    }

    if (conditions.length === 0) {
      return 0;
    }

    // Use OR condition if multiple, or single condition if just one
    const where = conditions.length > 1 ? conditions : conditions[0];

    const result = await this.notificationsRepository.update(where, {
      isRead: true,
      readAt: new Date(),
    });

    return result.affected || 0;
  }

  async deleteNotification(
    notificationId: string,
    userId?: string,
    customerId?: string,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Verify ownership - notification belongs to user if EITHER:
    // 1. It has userId and matches the provided userId, OR
    // 2. It has customerId and matches the provided customerId
    const belongsToUser =
      (userId && notification.userId === userId) ||
      (customerId && notification.customerId === customerId);

    if (!belongsToUser) {
      throw new Error('Unauthorized: Notification does not belong to user');
    }

    await this.notificationsRepository.remove(notification);
  }
}
