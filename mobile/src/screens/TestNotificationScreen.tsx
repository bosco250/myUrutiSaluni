import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTheme } from '../context';
import { api } from '../services/api';
import { usePushNotifications } from '../context/PushNotificationContext';

interface TestNotificationScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function TestNotificationScreen({ navigation }: TestNotificationScreenProps) {
  const { isDark } = useTheme();
  const { expoPushToken, isRegistered } = usePushNotifications();
  const [testing, setTesting] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  const testPushNotification = async () => {
    if (!isRegistered) {
      Alert.alert(
        'Not Registered',
        'Push notifications are not registered. Please ensure you have granted notification permissions.',
      );
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/notifications/test-push');
      
      if (response.success) {
        Alert.alert(
          'Test Sent! 🎉',
          'A test push notification has been sent to your device. You should see it in your notification tray.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Test Failed',
          response.message || 'Failed to send test notification',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Test push notification error:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to send test notification',
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  const testAllChannels = async () => {
    setTestingAll(true);
    try {
      const response = await api.post('/notifications/test-all-channels');
      
      if (response.success) {
        Alert.alert(
          'All Tests Sent! 🚀',
          'Test notifications have been sent via all channels (in-app, push, email). Check your device and email.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Test Failed',
          response.message || 'Failed to send test notifications',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Test all channels error:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to send test notifications',
        [{ text: 'OK' }]
      );
    } finally {
      setTestingAll(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Test Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, dynamicStyles.card]}>
          <View style={styles.statusHeader}>
            <MaterialIcons 
              name={isRegistered ? 'check-circle' : 'error'} 
              size={24} 
              color={isRegistered ? theme.colors.success : theme.colors.error} 
            />
            <Text style={[styles.statusTitle, dynamicStyles.text]}>
              Push Notification Status
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, dynamicStyles.textSecondary]}>Registration:</Text>
            <Text style={[
              styles.statusValue, 
              { color: isRegistered ? theme.colors.success : theme.colors.error }
            ]}>
              {isRegistered ? 'Registered ✅' : 'Not Registered ❌'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, dynamicStyles.textSecondary]}>Push Token:</Text>
            <Text style={[styles.statusValue, dynamicStyles.text]} numberOfLines={1}>
              {expoPushToken ? `${expoPushToken.substring(0, 30)}...` : 'None'}
            </Text>
          </View>
        </View>

        {/* Test Buttons */}
        <View style={[styles.testCard, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.text]}>Test Push Notifications</Text>
          <Text style={[styles.cardDescription, dynamicStyles.textSecondary]}>
            Test if push notifications are working correctly on your device.
          </Text>
          
          <TouchableOpacity
            style={[
              styles.testButton,
              { backgroundColor: theme.colors.primary },
              testing && styles.buttonDisabled,
            ]}
            onPress={testPushNotification}
            disabled={testing || !isRegistered}
            activeOpacity={0.8}
          >
            <MaterialIcons name="notifications" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>
              {testing ? 'Sending Test...' : 'Test Push Notification'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.testButton,
              { backgroundColor: theme.colors.secondary },
              testingAll && styles.buttonDisabled,
            ]}
            onPress={testAllChannels}
            disabled={testingAll}
            activeOpacity={0.8}
          >
            <MaterialIcons name="all-inclusive" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>
              {testingAll ? 'Testing All...' : 'Test All Channels'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsCard, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.text]}>How to Test</Text>
          
          <View style={styles.instruction}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.instructionText, dynamicStyles.text]}>
              Tap "Test Push Notification" to send a test notification
            </Text>
          </View>
          
          <View style={styles.instruction}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.instructionText, dynamicStyles.text]}>
              Check your device's notification tray for the test notification
            </Text>
          </View>
          
          <View style={styles.instruction}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.instructionText, dynamicStyles.text]}>
              The notification should appear even when the app is open (like WhatsApp)
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.fonts.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: 'right',
  },
  testCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: theme.fonts.bold,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  instructionsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
});