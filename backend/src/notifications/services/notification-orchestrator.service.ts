import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { EmailTemplateVariables } from './email-template.service';
import { format } from 'date-fns';

export interface NotificationContext {
  userId?: string;
  customerId?: string;
  appointmentId?: string;
  saleId?: string;
  commissionId?: string;
  productId?: string;
  recipientEmail?: string; // Email for email notifications
  saleItems?: Array<{ name: string; quantity: number; price: string }>;
  isEmployee?: boolean;
  [key: string]: any;
}

@Injectable()
export class NotificationOrchestratorService {
  private readonly logger = new Logger(NotificationOrchestratorService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
    private emailService: EmailService,
    private inAppService: InAppNotificationService,
  ) {}

  /**
   * Main method to send notifications for any event
   */
  async notify(
    type: NotificationType,
    context: NotificationContext,
    options?: {
      channels?: NotificationChannel[];
      scheduledFor?: Date;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    },
  ): Promise<void> {
    try {
      this.logger.log(
        `🔔 Notification request - Type: ${type}, UserId: ${context.userId || 'N/A'}, CustomerId: ${context.customerId || 'N/A'}`,
      );

      const channels = options?.channels || [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ];
      const handler = this.getHandler(type);

      if (!handler) {
        this.logger.warn(`No handler found for notification type: ${type}`);
        return;
      }

      this.logger.log(`📝 Generating notification data using handler...`);
      const notificationData = await handler(context);
      this.logger.log(
        `📝 Notification data generated - Title: "${notificationData.title}", Message: "${notificationData.message}"`,
      );

      // Send via each channel
      for (const channel of channels) {
        this.logger.log(`📤 Sending via ${channel} channel...`);
        if (channel === NotificationChannel.EMAIL) {
          await this.sendEmailNotification(type, context, notificationData);
        } else if (channel === NotificationChannel.IN_APP) {
          await this.sendInAppNotification(
            type,
            context,
            notificationData,
            options?.priority,
          );
        }
      }

      this.logger.log(`✅ All notifications sent successfully for ${type}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send notification for ${type}:`,
        error.stack,
      );
      // Don't throw - notifications should not break main flow
    }
  }

  private async sendEmailNotification(
    type: NotificationType,
    context: NotificationContext,
    data: { title: string; message: string; variables: EmailTemplateVariables },
  ): Promise<void> {
    // Check preferences
    const shouldSend = await this.shouldSendNotification(
      type,
      NotificationChannel.EMAIL,
      context.userId,
      context.customerId,
    );

    if (!shouldSend) {
      this.logger.debug(
        `Email notification skipped due to preferences: ${type}`,
      );
      return;
    }

    // Get recipient email from context or fetch from user/customer
    let email = context.recipientEmail;

    if (!email) {
      if (context.userId) {
        // Try to find user email
        // Note: We don't have direct access to UserService here to avoid circular deps
        // But we can try to look up the user via the preferences repository which joins user
        const pref = await this.preferencesRepository.findOne({
          where: { userId: context.userId },
          relations: ['user'],
        });
        email = pref?.user?.email;
      } else if (context.customerId) {
        // Try to find customer email - we can't easily do this without injecting CustomerRepository
        // But we can rely on the caller to provide it, or try to find it if we have the repo
        // For now, we'll log a warning if it's missing for high priority
      }
    }

    if (!email) {
      this.logger.warn(
        `No email found for notification ${type} (User: ${context.userId}, Customer: ${context.customerId}) - skipping email send`,
      );
      return;
    }

    // Determine template name
    const templateName = type.toLowerCase().replace(/_/g, '_');

    let success = false;
    let errorMessage: string | undefined;

    try {
      // Send email
      const result = await this.emailService.sendEmailNotification({
        to: email,
        subject: data.title,
        template: templateName,
        variables: {
          ...data.variables,
          unsubscribeUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
        },
      });

      success = result.success;
      errorMessage = result.error;

      if (!success) {
        this.logger.error(`Failed to send email to ${email}: ${errorMessage}`);
      } else {
        this.logger.log(`📧 Email sent successfully to ${email}`);
      }
    } catch (error) {
      success = false;
      errorMessage = error.message;
      this.logger.error(
        `❌ Error sending email to ${email}: ${errorMessage}`,
        error.stack,
      );
    }

    // Log notification
    await this.logNotification({
      userId: context.userId,
      customerId: context.customerId,
      appointmentId: context.appointmentId,
      channel: NotificationChannel.EMAIL,
      type,
      title: data.title,
      body: data.message,
      recipientEmail: email,
      status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      errorMessage: errorMessage,
    });
  }

  private async sendInAppNotification(
    type: NotificationType,
    context: NotificationContext,
    data: { title: string; message: string; variables: EmailTemplateVariables },
    priority?: 'low' | 'medium' | 'high' | 'critical',
  ): Promise<void> {
    this.logger.log(
      `📱 Creating in-app notification - Type: ${type}, UserId: ${context.userId || 'N/A'}, CustomerId: ${context.customerId || 'N/A'}`,
    );

    // Check preferences
    const shouldSend = await this.shouldSendNotification(
      type,
      NotificationChannel.IN_APP,
      context.userId,
      context.customerId,
    );

    if (!shouldSend) {
      this.logger.debug(
        `⏭️ In-app notification skipped due to preferences: ${type}`,
      );
      return;
    }

    // Determine action URL and label
    const { actionUrl, actionLabel } = this.getActionUrl(type, context);

    // Determine icon
    const icon = this.getIcon(type);

    const notificationPayload = {
      userId: context.userId,
      customerId: context.customerId,
      type,
      title: data.title,
      message: data.message,
      actionUrl,
      actionLabel,
      priority: priority || this.getDefaultPriority(type),
      icon,
      metadata: context,
      appointmentId: context.appointmentId,
    };

    this.logger.log(
      `💾 Saving in-app notification to database - UserId: ${notificationPayload.userId}, CustomerId: ${notificationPayload.customerId}, Title: "${notificationPayload.title}"`,
    );

    try {
      const saved =
        await this.inAppService.createInAppNotification(notificationPayload);
      this.logger.log(
        `✅ In-app notification saved successfully - ID: ${saved.id}, isRead: ${saved.isRead}`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to save in-app notification:`, error.stack);
      throw error;
    }
  }

  private async shouldSendNotification(
    type: NotificationType,
    channel: NotificationChannel,
    userId?: string,
    customerId?: string,
  ): Promise<boolean> {
    const preference = await this.preferencesRepository.findOne({
      where: [
        { userId, type, channel },
        { customerId, type, channel },
      ],
    });

    // If preference exists and is disabled, don't send
    if (preference && !preference.enabled) {
      return false;
    }

    // Check quiet hours
    if (preference && preference.quietHoursStart && preference.quietHoursEnd) {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      if (
        this.isInQuietHours(
          currentTime,
          preference.quietHoursStart,
          preference.quietHoursEnd,
        )
      ) {
        this.logger.debug(
          `Notification skipped due to quiet hours: ${currentTime}`,
        );
        return false;
      }
    }

    // Default: send if no preference exists (opt-in by default)
    return true;
  }

  private isInQuietHours(
    currentTime: string,
    start: string,
    end: string,
  ): boolean {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const current = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return current >= startTime || current < endTime;
    }

    return current >= startTime && current < endTime;
  }

  // Removed getRecipientEmail - now using context.recipientEmail directly

  private getActionUrl(
    type: NotificationType,
    context: NotificationContext,
  ): { actionUrl?: string; actionLabel?: string } {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    switch (type) {
      case NotificationType.APPOINTMENT_BOOKED:
      case NotificationType.APPOINTMENT_REMINDER:
      case NotificationType.APPOINTMENT_CONFIRMED:
      case NotificationType.APPOINTMENT_COMPLETED:
        return {
          actionUrl: context.appointmentId
            ? `${baseUrl}/appointments/${context.appointmentId}`
            : undefined,
          actionLabel: 'View Appointment',
        };
      case NotificationType.SALE_COMPLETED:
        return {
          actionUrl: context.saleId
            ? `${baseUrl}/sales/${context.saleId}`
            : undefined,
          actionLabel: 'View Sale',
        };
      case NotificationType.COMMISSION_EARNED:
      case NotificationType.COMMISSION_PAID:
        return {
          actionUrl: `${baseUrl}/commissions`,
          actionLabel: 'View Commissions',
        };
      case NotificationType.POINTS_EARNED:
        return {
          actionUrl: context.customerId
            ? `${baseUrl}/customers/${context.customerId}`
            : undefined,
          actionLabel: 'View Points',
        };
      case NotificationType.LOW_STOCK_ALERT:
        return {
          actionUrl: context.productId
            ? `${baseUrl}/inventory/products/${context.productId}`
            : `${baseUrl}/inventory`,
          actionLabel: 'Manage Inventory',
        };
      default:
        return {};
    }
  }

  private getIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.APPOINTMENT_BOOKED]: 'calendar',
      [NotificationType.APPOINTMENT_REMINDER]: 'bell',
      [NotificationType.APPOINTMENT_CONFIRMED]: 'check-circle',
      [NotificationType.APPOINTMENT_CANCELLED]: 'x-circle',
      [NotificationType.APPOINTMENT_RESCHEDULED]: 'calendar-clock',
      [NotificationType.APPOINTMENT_COMPLETED]: 'check',
      [NotificationType.APPOINTMENT_NO_SHOW]: 'alert-circle',
      [NotificationType.SALE_COMPLETED]: 'dollar-sign',
      [NotificationType.PAYMENT_RECEIVED]: 'credit-card',
      [NotificationType.PAYMENT_FAILED]: 'alert-triangle',
      [NotificationType.COMMISSION_EARNED]: 'trending-up',
      [NotificationType.COMMISSION_PAID]: 'check-circle',
      [NotificationType.COMMISSION_UPDATED]: 'edit',
      [NotificationType.POINTS_EARNED]: 'star',
      [NotificationType.POINTS_REDEEMED]: 'gift',
      [NotificationType.REWARD_AVAILABLE]: 'award',
      [NotificationType.VIP_STATUS_ACHIEVED]: 'crown',
      [NotificationType.LOW_STOCK_ALERT]: 'package',
      [NotificationType.OUT_OF_STOCK]: 'alert-triangle',
      [NotificationType.STOCK_REPLENISHED]: 'check-circle',
      [NotificationType.SALON_UPDATE]: 'info',
      [NotificationType.MEMBERSHIP_STATUS]: 'user-check',
      [NotificationType.EMPLOYEE_ASSIGNED]: 'briefcase',
      [NotificationType.SYSTEM_ALERT]: 'alert-circle',
      [NotificationType.SECURITY_ALERT]: 'shield-alert',
    };

    return iconMap[type] || 'bell';
  }

  private getDefaultPriority(
    type: NotificationType,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const priorityMap: Record<
      NotificationType,
      'low' | 'medium' | 'high' | 'critical'
    > = {
      [NotificationType.APPOINTMENT_BOOKED]: 'high',
      [NotificationType.APPOINTMENT_REMINDER]: 'high',
      [NotificationType.APPOINTMENT_CONFIRMED]: 'medium',
      [NotificationType.APPOINTMENT_CANCELLED]: 'high',
      [NotificationType.APPOINTMENT_RESCHEDULED]: 'high',
      [NotificationType.APPOINTMENT_COMPLETED]: 'low',
      [NotificationType.APPOINTMENT_NO_SHOW]: 'medium',
      [NotificationType.SALE_COMPLETED]: 'low',
      [NotificationType.PAYMENT_RECEIVED]: 'medium',
      [NotificationType.PAYMENT_FAILED]: 'high',
      [NotificationType.COMMISSION_EARNED]: 'medium',
      [NotificationType.COMMISSION_PAID]: 'high',
      [NotificationType.COMMISSION_UPDATED]: 'low',
      [NotificationType.POINTS_EARNED]: 'low',
      [NotificationType.POINTS_REDEEMED]: 'medium',
      [NotificationType.REWARD_AVAILABLE]: 'medium',
      [NotificationType.VIP_STATUS_ACHIEVED]: 'high',
      [NotificationType.LOW_STOCK_ALERT]: 'high',
      [NotificationType.OUT_OF_STOCK]: 'critical',
      [NotificationType.STOCK_REPLENISHED]: 'low',
      [NotificationType.SALON_UPDATE]: 'medium',
      [NotificationType.EMPLOYEE_ASSIGNED]: 'high',
      [NotificationType.MEMBERSHIP_STATUS]: 'high',
      [NotificationType.SYSTEM_ALERT]: 'medium',
      [NotificationType.SECURITY_ALERT]: 'critical',
    };

    return priorityMap[type] || 'medium';
  }

  private async logNotification(
    data: Partial<Notification>,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create(data);
    return this.notificationsRepository.save(notification);
  }

  // Event Handlers
  private getHandler(type: NotificationType) {
    const handlers: Record<
      NotificationType,
      (context: NotificationContext) => Promise<{
        title: string;
        message: string;
        variables: EmailTemplateVariables;
      }>
    > = {
      [NotificationType.APPOINTMENT_BOOKED]:
        this.handleAppointmentBooked.bind(this),
      [NotificationType.APPOINTMENT_REMINDER]:
        this.handleAppointmentReminder.bind(this),
      [NotificationType.APPOINTMENT_CONFIRMED]:
        this.handleAppointmentConfirmed.bind(this),
      [NotificationType.APPOINTMENT_CANCELLED]:
        this.handleAppointmentCancelled.bind(this),
      [NotificationType.APPOINTMENT_RESCHEDULED]:
        this.handleAppointmentRescheduled.bind(this),
      [NotificationType.APPOINTMENT_COMPLETED]:
        this.handleAppointmentCompleted.bind(this),
      [NotificationType.APPOINTMENT_NO_SHOW]:
        this.handleAppointmentNoShow.bind(this),
      [NotificationType.SALE_COMPLETED]: this.handleSaleCompleted.bind(this),
      [NotificationType.PAYMENT_RECEIVED]:
        this.handlePaymentReceived.bind(this),
      [NotificationType.PAYMENT_FAILED]: this.handlePaymentFailed.bind(this),
      [NotificationType.COMMISSION_EARNED]:
        this.handleCommissionEarned.bind(this),
      [NotificationType.COMMISSION_PAID]: this.handleCommissionPaid.bind(this),
      [NotificationType.COMMISSION_UPDATED]:
        this.handleCommissionUpdated.bind(this),
      [NotificationType.POINTS_EARNED]: this.handlePointsEarned.bind(this),
      [NotificationType.POINTS_REDEEMED]: this.handlePointsRedeemed.bind(this),
      [NotificationType.REWARD_AVAILABLE]:
        this.handleRewardAvailable.bind(this),
      [NotificationType.VIP_STATUS_ACHIEVED]:
        this.handleVipStatusAchieved.bind(this),
      [NotificationType.LOW_STOCK_ALERT]: this.handleLowStockAlert.bind(this),
      [NotificationType.OUT_OF_STOCK]: this.handleOutOfStock.bind(this),
      [NotificationType.STOCK_REPLENISHED]:
        this.handleStockReplenished.bind(this),
      [NotificationType.SALON_UPDATE]: this.handleSalonUpdate.bind(this),
      [NotificationType.EMPLOYEE_ASSIGNED]:
        this.handleEmployeeAssigned.bind(this),
      [NotificationType.MEMBERSHIP_STATUS]:
        this.handleMembershipStatus.bind(this),
      [NotificationType.SYSTEM_ALERT]: this.handleSystemAlert.bind(this),
      [NotificationType.SECURITY_ALERT]: this.handleSecurityAlert.bind(this),
    };

    return handlers[type];
  }

  // Appointment Handlers
  private async handleAppointmentBooked(context: NotificationContext) {
    // Check if this is for salon owner/employee (has userId) or customer
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      // Message for employee
      if (context.isEmployee) {
        return {
          title: 'New Booking Assigned',
          message: `You have a new booking with ${context.customerName || 'a customer'} for ${context.serviceName || 'a service'} on ${context.appointmentDate} at ${context.appointmentTime}.`,
          variables: {
            customerName: context.customerName || 'Customer',
            salonName: context.salonName || 'Salon',
            serviceName: context.serviceName || 'Service',
            appointmentDate: context.appointmentDate || '',
            appointmentTime: context.appointmentTime || '',
            employeeName: context.employeeName,
          },
        };
      }

      // Message for salon owner
      return {
        title: 'New Appointment Booked',
        message: `${context.customerName || 'A customer'} has booked an appointment for ${context.serviceName || 'a service'}.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '', // Already formatted
          appointmentTime: context.appointmentTime || '', // Already formatted
          employeeName: context.employeeName,
        },
      };
    } else {
      // Message for customer
      return {
        title: 'Appointment Booked',
        message: `Your appointment has been successfully booked!`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '', // Already formatted
          appointmentTime: context.appointmentTime || '', // Already formatted
          employeeName: context.employeeName,
        },
      };
    }
  }

  private async handleAppointmentReminder(context: NotificationContext) {
    return {
      title: 'Appointment Reminder',
      message: `Reminder: Your appointment is scheduled for ${context.appointmentDate}`,
      variables: {
        customerName: context.customerName || 'Customer',
        salonName: context.salonName || 'Salon',
        serviceName: context.serviceName || 'Service',
        appointmentDate: context.appointmentDate || '',
        appointmentTime: context.appointmentTime || '',
        employeeName: context.employeeName,
      },
    };
  }

  private async handleAppointmentConfirmed(context: NotificationContext) {
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      return {
        title: 'Appointment Confirmed',
        message: `You confirmed ${context.customerName || 'a customer'}'s appointment.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
          appointmentTime: context.appointmentTime || '',
        },
      };
    } else {
      return {
        title: 'Appointment Confirmed',
        message: `Your appointment has been confirmed!`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
          appointmentTime: context.appointmentTime || '',
        },
      };
    }
  }

  private async handleAppointmentCancelled(context: NotificationContext) {
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      return {
        title: 'Appointment Cancelled',
        message: `${context.customerName || 'A customer'}'s appointment has been cancelled.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
        },
      };
    } else {
      return {
        title: 'Appointment Cancelled',
        message: `Your appointment has been cancelled.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
        },
      };
    }
  }

  private async handleAppointmentRescheduled(context: NotificationContext) {
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      return {
        title: 'Appointment Rescheduled',
        message: `${context.customerName || 'A customer'}'s appointment has been rescheduled.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
          appointmentTime: context.appointmentTime || '',
        },
      };
    } else {
      return {
        title: 'Appointment Rescheduled',
        message: `Your appointment has been rescheduled.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
          appointmentTime: context.appointmentTime || '',
        },
      };
    }
  }

  private async handleAppointmentCompleted(context: NotificationContext) {
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      return {
        title: 'Appointment Completed',
        message: `${context.customerName || 'A customer'}'s appointment has been completed.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
        },
      };
    } else {
      return {
        title: 'Thank You!',
        message: `Thank you for visiting ${context.salonName || 'us'}!`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
        },
      };
    }
  }

  private async handleAppointmentNoShow(context: NotificationContext) {
    const isForSalonStaff = !!context.userId;

    if (isForSalonStaff) {
      return {
        title: 'No-Show',
        message: `${context.customerName || 'A customer'} did not show up for their appointment.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
        },
      };
    } else {
      return {
        title: 'Missed Appointment',
        message: `You missed your appointment at ${context.salonName || 'the salon'}.`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          serviceName: context.serviceName || 'Service',
          appointmentDate: context.appointmentDate || '',
        },
      };
    }
  }

  // Sale Handlers
  private async handleSaleCompleted(context: NotificationContext) {
    const isForSalonOwner = !!context.userId;

    if (isForSalonOwner) {
      // Message for salon owner
      return {
        title: 'New Sale Completed',
        message: `A sale of ${context.saleAmount} was completed${context.customerName ? ` for ${context.customerName}` : ''}.`,
        variables: {
          customerName: context.customerName || 'Walk-in Customer',
          salonName: context.salonName || 'Salon',
          saleAmount: context.saleAmount || '',
          paymentMethod: context.paymentMethod || '',
          pointsEarned: context.pointsEarned,
          saleItems: context.saleItems,
        },
      };
    } else {
      // Message for customer
      return {
        title: 'Sale Receipt',
        message: `Thank you for your purchase!`,
        variables: {
          customerName: context.customerName || 'Customer',
          salonName: context.salonName || 'Salon',
          saleAmount: context.saleAmount || '',
          paymentMethod: context.paymentMethod || '',
          pointsEarned: context.pointsEarned,
          saleItems: context.saleItems,
        },
      };
    }
  }

  private async handlePaymentReceived(context: NotificationContext) {
    return {
      title: 'Payment Received',
      message: `Payment of ${context.amount} has been received.`,
      variables: {
        amount: context.amount
          ? `RWF ${Number(context.amount).toLocaleString()}`
          : '',
        paymentMethod: context.paymentMethod || '',
      },
    };
  }

  private async handlePaymentFailed(context: NotificationContext) {
    return {
      title: 'Payment Failed',
      message: `Payment failed. Please try again.`,
      variables: {
        amount: context.amount
          ? `RWF ${Number(context.amount).toLocaleString()}`
          : '',
        errorMessage: context.errorMessage || 'Unknown error',
      },
    };
  }

  // Commission Handlers
  private async handleCommissionEarned(context: NotificationContext) {
    return {
      title: 'Commission Earned',
      message: `You have earned a new commission!`,
      variables: {
        commissionAmount: context.commissionAmount
          ? `RWF ${Number(context.commissionAmount).toLocaleString()}`
          : '',
      },
    };
  }

  private async handleCommissionPaid(context: NotificationContext) {
    return {
      title: 'Commission Paid',
      message: `Your commission has been paid!`,
      variables: {
        commissionAmount: context.commissionAmount
          ? `RWF ${Number(context.commissionAmount).toLocaleString()}`
          : '',
      },
    };
  }

  private async handleCommissionUpdated(context: NotificationContext) {
    return {
      title: 'Commission Updated',
      message: `Your commission has been updated.`,
      variables: {
        commissionAmount: context.commissionAmount
          ? `RWF ${Number(context.commissionAmount).toLocaleString()}`
          : '',
      },
    };
  }

  private async handleEmployeeAssigned(context: NotificationContext) {
    return {
      title: 'New Job Assignment',
      message: `You have been hired at ${context.salonName || 'a salon'}!`,
      variables: {
        salonName: context.salonName || 'Salon',
        employeeName: context.employeeName || 'Employee',
      },
    };
  }

  // Loyalty Handlers
  private async handlePointsEarned(context: NotificationContext) {
    return {
      title: 'Loyalty Points Earned',
      message: `You've earned ${context.pointsEarned || 0} loyalty points!`,
      variables: {
        customerName: context.customerName || 'Customer',
        pointsEarned: context.pointsEarned || 0,
        pointsBalance: context.pointsBalance || 0,
      },
    };
  }

  private async handlePointsRedeemed(context: NotificationContext) {
    return {
      title: 'Points Redeemed',
      message: `You've redeemed ${context.pointsRedeemed || 0} loyalty points.`,
      variables: {
        customerName: context.customerName || 'Customer',
        pointsRedeemed: context.pointsRedeemed || 0,
        pointsBalance: context.pointsBalance || 0,
      },
    };
  }

  private async handleRewardAvailable(context: NotificationContext) {
    return {
      title: 'Reward Available',
      message: `A new reward is available for you!`,
      variables: {
        customerName: context.customerName || 'Customer',
        rewardName: context.rewardName || 'Reward',
      },
    };
  }

  private async handleVipStatusAchieved(context: NotificationContext) {
    return {
      title: 'VIP Status Achieved!',
      message: `Congratulations! You've achieved VIP status!`,
      variables: {
        customerName: context.customerName || 'Customer',
      },
    };
  }

  // Inventory Handlers
  private async handleLowStockAlert(context: NotificationContext) {
    return {
      title: 'Low Stock Alert',
      message: `Product "${context.productName || 'Unknown'}" is running low in stock.`,
      variables: {
        productName: context.productName || 'Product',
        stockLevel: context.stockLevel || 0,
        minStock: context.minStock || 0,
      },
    };
  }

  private async handleOutOfStock(context: NotificationContext) {
    return {
      title: 'Out of Stock',
      message: `Product "${context.productName || 'Unknown'}" is out of stock!`,
      variables: {
        productName: context.productName || 'Product',
      },
    };
  }

  private async handleStockReplenished(context: NotificationContext) {
    return {
      title: 'Stock Replenished',
      message: `Stock for "${context.productName || 'Product'}" has been replenished.`,
      variables: {
        productName: context.productName || 'Product',
        stockLevel: context.stockLevel || 0,
      },
    };
  }

  // System Handlers
  private async handleSalonUpdate(context: NotificationContext) {
    return {
      title: 'Salon Update',
      message: context.message || 'Your salon information has been updated.',
      variables: {
        salonName: context.salonName || 'Salon',
      },
    };
  }

  private async handleMembershipStatus(context: NotificationContext) {
    return {
      title: 'Membership Status Update',
      message: `Your membership status has been updated to ${context.status || 'unknown'}.`,
      variables: {
        status: context.status || '',
      },
    };
  }

  private async handleSystemAlert(context: NotificationContext) {
    return {
      title: 'System Alert',
      message: context.message || 'A system alert has been issued.',
      variables: {},
    };
  }

  private async handleSecurityAlert(context: NotificationContext) {
    return {
      title: 'Security Alert',
      message: context.message || 'A security alert has been issued.',
      variables: {},
    };
  }
}
