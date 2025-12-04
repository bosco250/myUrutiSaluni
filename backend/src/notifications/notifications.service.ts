import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationChannel, NotificationType, NotificationStatus } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { format, addHours, isBefore } from 'date-fns';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
    private emailService: EmailService,
    private smsService: SmsService,
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
      status: scheduledFor ? NotificationStatus.PENDING : NotificationStatus.PENDING,
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
      const preference = await this.preferencesRepository.findOne({
        where: [
          { userId: notification.userId, type: notification.type, channel: notification.channel },
          { customerId: notification.customerId, type: notification.type, channel: notification.channel },
        ],
      });

      if (preference && !preference.enabled) {
        this.logger.log(`Notification ${notification.id} skipped - preference disabled`);
        notification.status = NotificationStatus.FAILED;
        notification.errorMessage = 'Notification preference disabled';
        await this.notificationsRepository.save(notification);
        return false;
      }

      let success = false;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          if (notification.recipientEmail) {
            success = await this.emailService.sendEmail(
              notification.recipientEmail,
              notification.title,
              notification.body,
            );
          }
          break;
        case NotificationChannel.SMS:
          if (notification.recipientPhone) {
            success = await this.smsService.sendSms(notification.recipientPhone, notification.body);
          }
          break;
        case NotificationChannel.PUSH:
        case NotificationChannel.IN_APP:
          // TODO: Implement push notifications
          success = true;
          break;
      }

      notification.status = success ? NotificationStatus.SENT : NotificationStatus.FAILED;
      notification.sentAt = new Date();
      await this.notificationsRepository.save(notification);

      return success;
    } catch (error) {
      this.logger.error(`Failed to process notification ${notification.id}:`, error);
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationsRepository.save(notification);
      return false;
    }
  }

  async sendAppointmentReminder(
    appointmentId: string,
    reminderHours: number = 24,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.SMS],
  ): Promise<void> {
    const appointment = await this.appointmentsService.findOne(appointmentId);
    if (!appointment) {
      this.logger.warn(`Appointment ${appointmentId} not found`);
      return;
    }

    const appointmentDate = new Date(appointment.scheduledStart);
    const reminderTime = addHours(appointmentDate, -reminderHours);

    // Only schedule if reminder time is in the future
    if (isBefore(reminderTime, new Date())) {
      this.logger.log(`Reminder time for appointment ${appointmentId} is in the past, skipping`);
      return;
    }

    const customer = appointment.customer;
    if (!customer) {
      this.logger.warn(`Appointment ${appointmentId} has no customer`);
      return;
    }

    const title = `Appointment Reminder - ${appointment.salon?.name || 'Salon'}`;
    const body = `Your appointment for ${appointment.service?.name || 'service'} is scheduled for ${format(appointmentDate, 'PPpp')} at ${appointment.salon?.name || 'the salon'}.`;

    for (const channel of channels) {
      const notification = await this.sendNotification(
        undefined,
        customer.id,
        appointmentId,
        channel,
        NotificationType.APPOINTMENT_REMINDER,
        title,
        body,
        reminderTime,
      );

      // Set recipient info
      if (channel === NotificationChannel.EMAIL && customer.email) {
        notification.recipientEmail = customer.email;
      }
      if (channel === NotificationChannel.SMS && customer.phone) {
        notification.recipientPhone = customer.phone;
      }
      await this.notificationsRepository.save(notification);
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
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
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
        return aptDate >= tomorrow && aptDate <= dayAfter && apt.status === 'booked';
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
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
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

  async getPreferences(userId?: string, customerId?: string): Promise<NotificationPreference[]> {
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
}
