import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    ScheduleModule.forRoot(),
    AppointmentsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, SmsService],
  exports: [NotificationsService, EmailService, SmsService],
})
export class NotificationsModule {}
