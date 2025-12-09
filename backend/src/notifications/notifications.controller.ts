import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  NotificationChannel,
  NotificationType,
} from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Send a notification' })
  sendNotification(@Body() sendNotificationDto: any) {
    return this.notificationsService.sendNotification(
      sendNotificationDto.userId,
      sendNotificationDto.customerId,
      sendNotificationDto.appointmentId,
      sendNotificationDto.channel,
      sendNotificationDto.type,
      sendNotificationDto.title,
      sendNotificationDto.body,
      sendNotificationDto.scheduledFor
        ? new Date(sendNotificationDto.scheduledFor)
        : undefined,
    );
  }

  @Post('appointments/:appointmentId/reminder')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Send appointment reminder' })
  sendAppointmentReminder(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { reminderHours?: number; channels?: NotificationChannel[] },
  ) {
    return this.notificationsService.sendAppointmentReminder(
      appointmentId,
      body.reminderHours || 24,
      body.channels || [NotificationChannel.EMAIL, NotificationChannel.SMS],
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  getNotifications(
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      customerId,
      limit,
    );
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences(
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
  ) {
    return this.notificationsService.getPreferences(user.id, customerId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  updatePreference(
    @CurrentUser() user: any,
    @Body()
    body: {
      customerId?: string;
      type: NotificationType;
      channel: NotificationChannel;
      enabled: boolean;
    },
  ) {
    return this.notificationsService.updatePreference(
      user.id,
      body.customerId,
      body.type,
      body.channel,
      body.enabled,
    );
  }
}
