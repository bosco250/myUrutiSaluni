import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './services/push-notification.service';
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
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

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
    @Body() body: { reminderHours?: number },
  ) {
    return this.notificationsService.sendAppointmentReminder(
      appointmentId,
      body.reminderHours || 24,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: NotificationType,
  ) {
    // If user is a customer and no customerId provided, try to find their customer record
    let finalCustomerId = customerId;
    if (!finalCustomerId && user.role === 'customer') {
      try {
        const customer = await this.notificationsService.findCustomerByUserId(
          user.id,
        );
        if (customer) {
          finalCustomerId = customer.id;
        }
      } catch (error) {
        // Ignore errors, just proceed without customerId
      }
    }

    const result = await this.notificationsService.getInAppNotifications(
      user.id,
      finalCustomerId,
      {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        type,
      },
    );
    return {
      data: result.data || result,
      total: result.total || (Array.isArray(result) ? result.length : 0),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
  ) {
    // If user is a customer and no customerId provided, try to find their customer record
    let finalCustomerId = customerId;
    if (!finalCustomerId && user.role === 'customer') {
      try {
        const customer = await this.notificationsService.findCustomerByUserId(
          user.id,
        );
        if (customer) {
          finalCustomerId = customer.id;
        }
      } catch (error) {
        // Ignore errors, just proceed without customerId
      }
    }

    const count = await this.notificationsService.getUnreadCount(
      user.id,
      finalCustomerId,
    );
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
  ) {
    // If user is a customer and no customerId provided, try to find their customer record
    let finalCustomerId = customerId;
    if (!finalCustomerId && user.role === 'customer') {
      try {
        const customer = await this.notificationsService.findCustomerByUserId(
          user.id,
        );
        if (customer) {
          finalCustomerId = customer.id;
        }
      } catch (error) {
        // Ignore errors, just proceed without customerId
      }
    }

    return this.notificationsService.markAsRead(id, user.id, finalCustomerId);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
  ) {
    // If user is a customer and no customerId provided, try to find their customer record
    let finalCustomerId = customerId;
    if (!finalCustomerId && user.role === 'customer') {
      try {
        const customer = await this.notificationsService.findCustomerByUserId(
          user.id,
        );
        if (customer) {
          finalCustomerId = customer.id;
        }
      } catch (error) {
        // Ignore errors, just proceed without customerId
      }
    }

    return this.notificationsService.markAllAsRead(user.id, finalCustomerId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('customerId') customerId?: string,
  ) {
    // If user is a customer and no customerId provided, try to find their customer record
    let finalCustomerId = customerId;
    if (!finalCustomerId && user.role === 'customer') {
      try {
        const customer = await this.notificationsService.findCustomerByUserId(
          user.id,
        );
        if (customer) {
          finalCustomerId = customer.id;
        }
      } catch (error) {
        // Ignore errors, just proceed without customerId
      }
    }

    return this.notificationsService.deleteNotification(
      id,
      user.id,
      finalCustomerId,
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

  @Post('push-token')
  @ApiOperation({ summary: 'Register Expo push token for current user' })
  async registerPushToken(
    @CurrentUser() user: any,
    @Body() body: { expoPushToken: string },
  ) {
    const success = await this.pushNotificationService.registerPushToken(
      user.id,
      body.expoPushToken,
    );
    return { success };
  }

  @Delete('push-token')
  @ApiOperation({
    summary: 'Remove push token for current user (e.g., on logout)',
  })
  async removePushToken(@CurrentUser() user: any) {
    const success = await this.pushNotificationService.removePushToken(user.id);
    return { success };
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Send a test push notification to current user' })
  async sendTestPushNotification(@CurrentUser() user: any) {
    const success =
      await this.pushNotificationService.sendPushNotificationToUser(
        user.id,
        '🧪 Test Push Notification',
        'This is a test notification. If you see this, push notifications are working correctly!',
        {
          type: 'test',
          timestamp: new Date().toISOString(),
          testData: 'Push notifications are working!',
        },
        {
          priority: 'high',
          channelId: 'default',
          badge: 1,
        },
      );

    if (success) {
      return {
        success: true,
        message:
          'Test push notification sent successfully! Check your mobile device.',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        success: false,
        message:
          'Failed to send test push notification. Make sure you have a push token registered.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test-all-channels')
  @ApiOperation({
    summary: 'Test all notification channels (in-app, email, push)',
  })
  async testAllChannels(@CurrentUser() user: any) {
    try {
      // Send test notification via all channels
      await this.notificationsService.sendTestNotification(
        user.id,
        'Test Notification',
        'This is a test of all notification channels.',
      );

      return {
        success: true,
        message:
          'Test notifications sent via all channels (in-app, email, push)',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test notifications: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
