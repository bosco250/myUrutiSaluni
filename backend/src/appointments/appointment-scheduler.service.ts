import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
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
}
