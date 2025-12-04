import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { Communication } from './entities/communication.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Communication]),
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}

