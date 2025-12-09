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
}
