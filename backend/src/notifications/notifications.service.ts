import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Customer } from '../customers/entities/customer.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { User } from '../users/entities/user.entity';
import { PushNotificationService } from './services/push-notification.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { DeviceTokenService } from './services/device-token.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { format, addHours } from 'date-fns';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushNotificationService,
    private deviceTokenService: DeviceTokenService,
    @Inject(forwardRef(() => InAppNotificationService))
    private inAppService: InAppNotificationService,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private orchestrator: NotificationOrchestratorService,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
  ) {}

  async sendNotification(
    userId: string | undefined,
    customerId: string | undefined,
    appointmentId: string | undefined,
    channel: NotificationChannel,
    type: NotificationType,
    title: string,
    body: string,
    scheduledFor?: Date,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      customerId,
      appointmentId,
      channel,
      type,
      title,
      body,
      scheduledFor,
      status: scheduledFor
        ? NotificationStatus.PENDING
        : NotificationStatus.PENDING,
      metadata: metadata || {},
    });

    const saved = await this.notificationsRepository.save(notification);

    // If not scheduled, send immediately
    if (!scheduledFor) {
      await this.processNotification(saved);
    }

    return saved;
  }

  async processNotification(notification: Notification): Promise<boolean> {
    try {
      // Check if user/customer has this notification type enabled
      const prefWhere: any[] = [];
      if (notification.userId) {
        prefWhere.push({
          userId: notification.userId,
          type: notification.type,
          channel: notification.channel,
        });
      }
      if (notification.customerId) {
        prefWhere.push({
          customerId: notification.customerId,
          type: notification.type,
          channel: notification.channel,
        });
      }

      const preference =
        prefWhere.length > 0
          ? await this.preferencesRepository.findOne({ where: prefWhere })
          : null;

      if (preference && !preference.enabled) {
        this.logger.log(
          `Notification ${notification.id} skipped - preference disabled`,
        );
        notification.status = NotificationStatus.FAILED;
        notification.errorMessage = 'Notification preference disabled';
        await this.notificationsRepository.save(notification);
        return false;
      }

      let success = false;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          if (notification.recipientEmail) {
            const emailResult = await this.emailService.sendEmail(
              notification.recipientEmail,
              notification.title,
              notification.body,
            );
            success = emailResult.success;
            if (!success) {
              notification.errorMessage = emailResult.error;
            }
          } else {
            success = false;
            notification.errorMessage = 'Recipient email is missing';
            this.logger.warn(
              `Notification ${notification.id} failed: Recipient email is missing`,
            );
          }
          break;
        case NotificationChannel.SMS:
          if (notification.recipientPhone) {
            success = await this.smsService.sendSms(
              notification.recipientPhone,
              notification.body,
            );
          }
          break;
        case NotificationChannel.PUSH:
          if (notification.userId) {
            success = await this.pushService.sendPushNotificationToUser(
              notification.userId,
              notification.title,
              notification.body,
              notification.metadata || {},
              {
                priority: 'high',
                channelId: this.pushService.getChannelIdForType(
                  notification.type,
                ),
              },
            );
          } else if (notification.customerId) {
            // Handle customer push notifications using device tokens
            const customer = await this.customersRepository.findOne({
              where: { id: notification.customerId },
              relations: ['user'],
            });

            if (customer?.user?.id) {
              const tokens = await this.deviceTokenService.getUserTokens(
                customer.user.id,
              );

              if (tokens.length > 0) {
                // Send to all registered devices
                for (const deviceToken of tokens) {
                  try {
                    await this.pushService.sendPushNotification(
                      deviceToken.token,
                      notification.title,
                      notification.body,
                      notification.metadata || {},
                      {
                        priority: 'high',
                        channelId: this.pushService.getChannelIdForType(
                          notification.type,
                        ),
                      },
                    );
                  } catch (error) {
                    this.logger.error(
                      `Failed to send push to device ${deviceToken.deviceId}: ${error.message}`,
                    );
                  }
                }
                success = true;
              } else {
                this.logger.warn(
                  `No device tokens found for customer ${notification.customerId}`,
                );
                success = false;
              }
            } else {
              this.logger.warn(
                `Customer ${notification.customerId} has no associated user`,
              );
              success = false;
            }
          } else {
            this.logger.warn('Push notification has no userId or customerId');
            success = false;
          }
          break;
        case NotificationChannel.IN_APP:
          // In-app notifications are "read" when fetched, so "sending" them just means they persist in DB
          // which is already done.
          success = true;
          break;
      }

      notification.status = success
        ? NotificationStatus.SENT
        : NotificationStatus.FAILED;
      notification.sentAt = new Date();
      await this.notificationsRepository.save(notification);

      return success;
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notification.id}:`,
        error,
      );
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationsRepository.save(notification);
      return false;
    }
  }

  async sendAppointmentReminder(
    appointmentId: string,
    reminderHours: number = 24,
  ): Promise<void> {
    try {
      const appointment = await this.appointmentsService.findOne(appointmentId);
      if (!appointment) {
        this.logger.warn(`Appointment ${appointmentId} not found`);
        return;
      }

      this.logger.log(
        `📅 Preparing reminder for appointment ${appointmentId} - ${reminderHours}h before`,
      );

      const customerId = appointment.customerId;
      if (!customerId) {
        this.logger.warn(`Appointment ${appointmentId} has no customer`);
        return;
      }

      // Send reminder notification using orchestrator
      await this.orchestrator.notify(NotificationType.APPOINTMENT_REMINDER, {
        customerId,
        appointmentId: appointment.id,
        recipientEmail: appointment.customer?.email,
        customerName: appointment.customer?.fullName,
        salonName: appointment.salon?.name,
        serviceName: appointment.service?.name,
        appointmentDate: format(new Date(appointment.scheduledStart), 'PPP'),
        appointmentTime: format(new Date(appointment.scheduledStart), 'p'),
        employeeName: appointment.salonEmployee?.user?.fullName,
      });

      this.logger.log(
        `✅ Reminder sent for appointment ${appointmentId} to customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send appointment reminder for ${appointmentId}: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const pendingNotifications = await this.notificationsRepository.find({
        where: {
          status: NotificationStatus.PENDING,
          scheduledFor: LessThanOrEqual(now),
        },
        take: 50, // Process in batches
      });

      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      // Only log actual errors, not missing table errors
      if (
        error?.code === '42P01' ||
        error?.message?.includes('does not exist')
      ) {
        // Table doesn't exist yet, skip silently
        return;
      }
      // Log real errors
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleAppointmentReminders() {
    try {
      // Get appointments in the next 24-48 hours
      const now = new Date();
      const tomorrow = addHours(now, 24);
      const dayAfter = addHours(now, 48);

      const appointments = await this.appointmentsService.findAll();
      const upcomingAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledStart);
        return (
          aptDate >= tomorrow && aptDate <= dayAfter && apt.status === 'booked'
        );
      });

      for (const appointment of upcomingAppointments) {
        // Check if reminder already sent
        const existingReminder = await this.notificationsRepository.findOne({
          where: {
            appointmentId: appointment.id,
            type: NotificationType.APPOINTMENT_REMINDER,
          },
        });

        if (!existingReminder) {
          await this.sendAppointmentReminder(appointment.id, 24);
        }
      }
    } catch (error) {
      // Only log actual errors, not missing table errors
      if (
        error?.code === '42P01' ||
        error?.message?.includes('does not exist')
      ) {
        // Table doesn't exist yet, skip silently
        return;
      }
      // Log real errors
      this.logger.error('Error scheduling appointment reminders:', error);
    }
  }

  async getNotifications(
    userId?: string,
    customerId?: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;

    return this.notificationsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['appointment', 'customer', 'user'],
    });
  }

  // In-app notification methods (delegated to InAppNotificationService)
  async getInAppNotifications(
    userId?: string,
    customerId?: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
    },
  ) {
    return this.inAppService.getUserNotifications(userId, customerId, options);
  }

  async getUnreadCount(userId?: string, customerId?: string): Promise<number> {
    return this.inAppService.getUnreadCount(userId, customerId);
  }

  async markAsRead(
    notificationId: string,
    userId?: string,
    customerId?: string,
  ): Promise<Notification> {
    return this.inAppService.markAsRead(notificationId, userId, customerId);
  }

  async markAllAsRead(userId?: string, customerId?: string): Promise<number> {
    return this.inAppService.markAllAsRead(userId, customerId);
  }

  async deleteNotification(
    notificationId: string,
    userId?: string,
    customerId?: string,
  ): Promise<void> {
    return this.inAppService.deleteNotification(
      notificationId,
      userId,
      customerId,
    );
  }

  async getPreferences(
    userId?: string,
    customerId?: string,
  ): Promise<NotificationPreference[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;

    return this.preferencesRepository.find({ where });
  }

  async updatePreference(
    userId: string | undefined,
    customerId: string | undefined,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    let preference = await this.preferencesRepository.findOne({
      where: [
        { userId, type, channel },
        { customerId, type, channel },
      ],
    });

    if (!preference) {
      preference = this.preferencesRepository.create({
        userId,
        customerId,
        type,
        channel,
        enabled,
      });
    } else {
      preference.enabled = enabled;
    }

    return this.preferencesRepository.save(preference);
  }

  async findCustomerByUserId(userId: string): Promise<Customer | null> {
    return this.customersRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Send test notification via all channels for testing purposes
   */
  async sendTestNotification(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    try {
      this.logger.log(`🧪 Sending test notification to user ${userId}`);

      // Fetch user email
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      const recipientEmail = user?.email;

      if (!recipientEmail) {
        this.logger.warn(
          `Could not find email for user ${userId}, skipping email test`,
        );
      }

      // Send via orchestrator to test all channels
      await this.orchestrator.notify(
        NotificationType.SYSTEM_ALERT,
        {
          userId,
          message: body,
          recipientEmail,
        },
        {
          channels: [
            NotificationChannel.IN_APP,
            NotificationChannel.PUSH,
            NotificationChannel.EMAIL,
          ],
          priority: 'high',
        },
      );

      this.logger.log(
        `✅ Test notification sent successfully to user ${userId} (${recipientEmail})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send test notification to user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
