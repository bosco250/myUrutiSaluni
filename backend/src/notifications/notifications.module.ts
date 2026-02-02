import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { DeviceToken } from './entities/device-token.entity';
import { Customer } from '../customers/entities/customer.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { EmailTemplateService } from './services/email-template.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { DeviceTokenService } from './services/device-token.service';
import { SmtpConfigService } from './config/smtp.config';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PushNotificationService } from './services/push-notification.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      DeviceToken,
      Customer,
      User,
    ]),
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
    DeviceTokenService,
    SmtpConfigService,
    PushNotificationService,
  ],
  exports: [
    NotificationsService,
    EmailService,
    EmailTemplateService,
    InAppNotificationService,
    NotificationOrchestratorService,
    DeviceTokenService,
    PushNotificationService,
  ],
})
export class NotificationsModule {}
