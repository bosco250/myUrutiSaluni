import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';

@Injectable()
export class AppointmentSchedulerService {
  private readonly logger = new Logger(AppointmentSchedulerService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    private appointmentsService: AppointmentsService,
  ) {}

  /**
   * Sends automatic appointment reminders
   * Runs every 15 minutes
   * Sends reminders for appointments starting in 1.5 hours (±7.5 minutes window)
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async sendScheduledReminders() {
    this.logger.log('🔔 Running scheduled appointment reminders check...');

    try {
      const now = new Date();

      // Calculate 1.5 hours from now
      const reminderTime = new Date(now.getTime() + 90 * 60 * 1000);

      // Create a 15-minute window (±7.5 minutes)
      const windowStart = new Date(reminderTime.getTime() - 7.5 * 60 * 1000);
      const windowEnd = new Date(reminderTime.getTime() + 7.5 * 60 * 1000);

      this.logger.log(
        `Looking for appointments between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`,
      );

      // Find appointments that need reminders
      const appointments = await this.appointmentsRepository.find({
        where: {
          scheduledStart: Between(windowStart, windowEnd),
          reminderSent: false,
          status: In([
            AppointmentStatus.PENDING,
            AppointmentStatus.BOOKED,
            AppointmentStatus.CONFIRMED,
          ]),
        },
        relations: [
          'customer',
          'customer.user',
          'service',
          'salon',
          'salonEmployee',
          'salonEmployee.user',
        ],
      });

      this.logger.log(
        `Found ${appointments.length} appointment(s) needing reminders`,
      );

      let successCount = 0;
      let failureCount = 0;

      // Send reminders for each appointment
      for (const appointment of appointments) {
        try {
          // Skip if no customer
          if (!appointment.customerId) {
            this.logger.warn(
              `Skipping appointment ${appointment.id} - no customer`,
            );
            continue;
          }

          // Send reminder
          await this.appointmentsService.sendAppointmentReminder(appointment);

          // Mark as sent
          await this.appointmentsRepository.update(appointment.id, {
            reminderSent: true,
            reminderSentAt: new Date(),
          });

          successCount++;
          this.logger.log(
            `✅ Sent reminder for appointment ${appointment.id} (${appointment.customer?.user?.fullName || 'Unknown'})`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `❌ Failed to send reminder for appointment ${appointment.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ Reminder job complete - Success: ${successCount}, Failed: ${failureCount}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in scheduled reminders job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Automatically marks missed appointments as NO_SHOW
   * Runs every hour
   * Finds appointments where scheduled time has passed (with 3-hour grace period) but status is still active
   */
  @Cron('0 * * * *') // Every hour at minute 0
  async cancelMissedAppointments() {
    this.logger.log('🔍 Running missed appointments check...');

    try {
      const now = new Date();

      // Calculate cutoff time: 3 hours ago from now
      // Only mark appointments as NO_SHOW if they ended more than 3 hours ago
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      this.logger.log(
        `Looking for missed appointments with scheduledEnd before ${threeHoursAgo.toISOString()} (3-hour grace period)`,
      );

      // Find appointments where:
      // 1. scheduledEnd < (current time - 3 hours) - appointment ended more than 3 hours ago
      // 2. Status is still PENDING, BOOKED, or CONFIRMED
      const missedAppointments = await this.appointmentsRepository.find({
        where: {
          scheduledEnd: LessThan(threeHoursAgo),
          status: In([
            AppointmentStatus.PENDING,
            AppointmentStatus.BOOKED,
            AppointmentStatus.CONFIRMED,
          ]),
        },
        relations: [
          'customer',
          'customer.user',
          'service',
          'salon',
          'salonEmployee',
          'salonEmployee.user',
        ],
      });

      this.logger.log(
        `Found ${missedAppointments.length} missed appointment(s) to mark as NO_SHOW`,
      );

      let successCount = 0;
      let failureCount = 0;

      // Mark each missed appointment as NO_SHOW
      for (const appointment of missedAppointments) {
        try {
          const oldStatus = appointment.status;

          // Update to NO_SHOW status
          await this.appointmentsService.update(appointment.id, {
            status: AppointmentStatus.NO_SHOW,
            metadata: {
              ...appointment.metadata,
              autoMarkedNoShow: true,
              autoMarkedAt: now.toISOString(),
              previousStatus: oldStatus,
            },
          });

          successCount++;

          // Calculate how long ago the appointment ended
          const hoursAgo = Math.floor(
            (now.getTime() - new Date(appointment.scheduledEnd).getTime()) /
              (60 * 60 * 1000),
          );

          this.logger.log(
            `✅ Marked appointment ${appointment.id} as NO_SHOW (was ${oldStatus}) - Ended ${hoursAgo}h ago - Customer: ${appointment.customer?.user?.fullName || 'Unknown'}`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `❌ Failed to mark appointment ${appointment.id} as NO_SHOW: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ Missed appointments job complete - Marked ${successCount} as NO_SHOW, Failed: ${failureCount}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in missed appointments job: ${error.message}`,
        error.stack,
      );
    }
  }
}
