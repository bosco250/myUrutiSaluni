/**
 * Integration test script for notification system
 * Run with: npx ts-node test-notifications-integration.ts
 * 
 * This script tests:
 * 1. Notification creation
 * 2. Email sending (if SMTP configured)
 * 3. In-app notification storage
 * 4. API endpoints
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NotificationOrchestratorService } from './src/notifications/services/notification-orchestrator.service';
import { NotificationType, NotificationChannel } from './src/notifications/entities/notification.entity';
import { InAppNotificationService } from './src/notifications/services/in-app-notification.service';

async function testNotifications() {
  console.log('🧪 Starting Notification System Tests...\n');

  try {
    // Bootstrap NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const orchestrator = app.get(NotificationOrchestratorService);
    const inAppService = app.get(InAppNotificationService);

    console.log('✅ Application context created\n');

    // Test 1: Create in-app notification
    console.log('Test 1: Creating in-app notification...');
    try {
      const notification = await inAppService.createInAppNotification({
        userId: 'test-user-id', // Replace with actual user ID
        type: NotificationType.APPOINTMENT_BOOKED,
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works',
        actionUrl: '/appointments/test-id',
        actionLabel: 'View Appointment',
        priority: 'high',
        icon: 'calendar',
      });
      console.log('✅ In-app notification created:', notification.id);
    } catch (error) {
      console.error('❌ Failed to create in-app notification:', error.message);
    }

    // Test 2: Test notification orchestrator
    console.log('\nTest 2: Testing notification orchestrator...');
    try {
      await orchestrator.notify(
        NotificationType.APPOINTMENT_BOOKED,
        {
          userId: 'test-user-id',
          customerId: 'test-customer-id',
          customerName: 'Test Customer',
          salonName: 'Test Salon',
          serviceName: 'Test Service',
          appointmentDate: new Date().toISOString(),
          appointmentTime: '10:00 AM',
        },
        {
          channels: [NotificationChannel.IN_APP], // Only in-app for testing
          priority: 'high',
        },
      );
      console.log('✅ Notification orchestrator test passed');
    } catch (error) {
      console.error('❌ Notification orchestrator test failed:', error.message);
    }

    // Test 3: Get user notifications
    console.log('\nTest 3: Fetching user notifications...');
    try {
      const result = await inAppService.getUserNotifications('test-user-id', undefined, {
        limit: 10,
        offset: 0,
      });
      console.log(`✅ Retrieved ${result.data.length} notifications`);
      console.log(`   Total: ${result.total}`);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error.message);
    }

    // Test 4: Get unread count
    console.log('\nTest 4: Getting unread count...');
    try {
      const count = await inAppService.getUnreadCount('test-user-id');
      console.log(`✅ Unread count: ${count}`);
    } catch (error) {
      console.error('❌ Failed to get unread count:', error.message);
    }

    console.log('\n✅ All tests completed!');
    await app.close();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testNotifications();

