/**
 * Comprehensive test script for Push Notifications
 * Run with: npx ts-node -r tsconfig-paths/register test-push-notifications.ts <userId>
 * 
 * This script tests:
 * 1. Push token registration
 * 2. Sending push notifications
 * 3. Notification delivery via Expo
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PushNotificationService } from './src/notifications/services/push-notification.service';
import { NotificationOrchestratorService } from './src/notifications/services/notification-orchestrator.service';
import { NotificationType, NotificationChannel } from './src/notifications/entities/notification.entity';
import { UsersService } from './src/users/users.service';

async function testPushNotifications() {
  console.log('🧪 Testing Push Notification System...\n');
  console.log('='.repeat(70));

  let app: any;
  try {
    // Bootstrap NestJS application
    console.log('\n1. Starting application context...');
    app = await NestFactory.createApplicationContext(AppModule);
    console.log('✅ Application context created\n');

    const pushService = app.get(PushNotificationService);
    const orchestrator = app.get(NotificationOrchestratorService);
    const usersService = app.get(UsersService);

    // Get user ID from command line or find first user
    const userIdArg = process.argv[2];
    let testUserId: string | undefined = userIdArg;

    if (!testUserId) {
      console.log('2. Finding test user...');
      try {
        // findAll() may require a role parameter, but we'll try without first
        const users = await usersService.findAll();
        if (users && Array.isArray(users) && users.length > 0) {
          // Find user with push token if available
          const userWithToken = users.find((u: any) => u.expoPushToken);
          if (userWithToken) {
            testUserId = userWithToken.id;
            console.log(`✅ Found user with push token: ${userWithToken.email || userWithToken.fullName || testUserId}`);
            console.log(`   User ID: ${testUserId}`);
            console.log(`   Push Token: ${userWithToken.expoPushToken?.substring(0, 30)}...`);
          } else {
            testUserId = users[0].id;
            console.log(`✅ Found test user: ${users[0].email || users[0].fullName || testUserId}`);
            console.log(`   User ID: ${testUserId}`);
            console.log(`   ⚠️  No push token registered - user needs to login on mobile app first`);
          }
        } else {
          console.log('⚠️  No users found');
          console.log('   Please provide a user ID as argument: npx ts-node test-push-notifications.ts <userId>');
          await app.close();
          return;
        }
      } catch (error: any) {
        console.error(`❌ Error fetching users: ${error.message}`);
        if (error.stack) {
          console.error(error.stack);
        }
        await app.close();
        return;
      }
    } else {
      console.log(`2. Using provided user ID: ${testUserId}`);
    }

    // Check if user has push token
    console.log('\n3. Checking push token...');
    const pushToken = await pushService.getUserPushToken(testUserId);
    if (!pushToken) {
      console.log('❌ No push token found for this user');
      console.log('\n💡 To register a push token:');
      console.log('   1. Login to the mobile app on a physical device');
      console.log('   2. Grant notification permissions');
      console.log('   3. The app will automatically register the push token');
      console.log('   4. Then run this test again');
      await app.close();
      return;
    }
    console.log(`✅ Push token found: ${pushToken.substring(0, 30)}...`);

    // Test 1: Send push notification directly
    console.log('\n4. Test 1: Sending push notification directly...');
    try {
      const success = await pushService.sendPushNotificationToUser(
        testUserId,
        '🧪 Test Push Notification',
        'This is a test notification from the backend. If you see this, push notifications are working!',
        {
          type: 'test',
          testId: 'direct-test',
        },
        {
          priority: 'high',
          channelId: 'default',
        },
      );

      if (success) {
        console.log('✅ Push notification sent successfully!');
        console.log('   Check your mobile device - you should see the notification immediately');
      } else {
        console.log('❌ Push notification failed to send');
      }
    } catch (error: any) {
      console.error(`❌ Error sending push notification: ${error.message}`);
      console.error(error.stack);
    }

    // Wait a bit before next test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Send via notification orchestrator (full flow)
    console.log('\n5. Test 2: Sending via notification orchestrator (full flow)...');
    try {
      await orchestrator.notify(
        NotificationType.APPOINTMENT_BOOKED,
        {
          userId: testUserId,
          customerName: 'Test Customer',
          salonName: 'Test Salon',
          serviceName: 'Test Service',
          appointmentDate: new Date().toLocaleDateString(),
          appointmentTime: new Date().toLocaleTimeString(),
        },
        {
          channels: [NotificationChannel.PUSH], // Only push for this test
          priority: 'high',
        },
      );
      console.log('✅ Notification orchestrator sent push notification!');
      console.log('   Check your mobile device - you should see an appointment notification');
    } catch (error: any) {
      console.error(`❌ Error in notification orchestrator: ${error.message}`);
      console.error(error.stack);
    }

    // Wait a bit before next test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Test different notification types
    console.log('\n6. Test 3: Testing different notification types...');
    const testTypes = [
      { type: NotificationType.PAYMENT_RECEIVED, context: { amount: '1000', paymentMethod: 'Mobile Money' } },
      { type: NotificationType.COMMISSION_EARNED, context: { commissionAmount: '500' } },
      { type: NotificationType.POINTS_EARNED, context: { pointsEarned: 100, pointsBalance: 500 } },
    ];

    for (const test of testTypes) {
      try {
        await orchestrator.notify(
          test.type,
          {
            userId: testUserId,
            ...test.context,
          },
          {
            channels: [NotificationChannel.PUSH],
            priority: 'high',
          },
        );
        console.log(`✅ Sent ${test.type} notification`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`❌ Failed to send ${test.type}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Push Notification Tests Complete!');
    console.log('\n📱 What to check on your mobile device:');
    console.log('   1. Notifications should appear in the device notification tray');
    console.log('   2. Notifications should have sound and vibration');
    console.log('   3. Tapping a notification should open the app');
    console.log('   4. Notifications should appear even if app is closed');
    console.log('\n💡 If notifications are not appearing:');
    console.log('   - Check that the mobile app has notification permissions');
    console.log('   - Verify the push token is registered (check backend logs)');
    console.log('   - Ensure you are testing on a physical device (not simulator)');
    console.log('   - Check network connectivity');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Run the test
testPushNotifications().catch(console.error);

