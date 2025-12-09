import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Customer } from '../customers/entities/customer.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { EmailTemplateService } from './services/email-template.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { SmtpConfigService } from './config/smtp.config';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference, Customer]),
    ScheduleModule.forRoot(),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    EmailTemplateService,
    InAppNotificationService,
    NotificationOrchestratorService,
    SmtpConfigService,
  ],
  exports: [
    NotificationsService,
    EmailService,
    InAppNotificationService,
    NotificationOrchestratorService,
  ],
})
export class NotificationsModule {}
