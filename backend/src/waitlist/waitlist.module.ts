import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry]),
    AppointmentsModule,
    NotificationsModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}

