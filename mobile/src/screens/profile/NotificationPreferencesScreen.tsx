import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

interface NotificationPreferencesScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

interface NotificationPreference {
  type: string;
  channel: string;
  enabled: boolean;
}

interface NotificationItemConf {
  type: string;
  channel: string;
  label: string;
  desc: string;
}

export default function NotificationPreferencesScreen({
  navigation,
}: NotificationPreferencesScreenProps) {
  const { isDark } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchPreferences = async () => {
    try {
      // api.get unwraps the response standardly, so we might receive the array directly or a wrapper
      const response = await api.get<any>('/notifications/preferences');
      // If api.ts unwraps it, response could be the array or an object containing specific data
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      if (Array.isArray(data)) {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
      Alert.alert("Error", "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const isEnabled = (type: string, channel: string) => {
    const pref = preferences.find((p) => p.type === type && p.channel === channel);
    // Default to true if no preference exists yet (opt-in by default)
    return pref ? pref.enabled : true;
  };

  const handleToggle = async (type: string, channel: string) => {
    if (updating) return;
    
    // Optimistic update
    const currentlyEnabled = isEnabled(type, channel);
    const newEnabled = !currentlyEnabled;
    
    // Update local state temporarily
    setPreferences(prev => {
        const existing = prev.find(p => p.type === type && p.channel === channel);
        if (existing) {
            return prev.map(p => p.type === type && p.channel === channel ? { ...p, enabled: newEnabled } : p);
        } else {
            return [...prev, { type, channel, enabled: newEnabled }];
        }
    });

    setUpdating(true);
    try {
      await api.patch('/notifications/preferences', { type, channel, enabled: newEnabled });
    } catch (error) {
      console.error("Failed to update preference:", error);
      Alert.alert("Error", "Failed to update preference");
      // Revert optimistic update
       setPreferences(prev => {
        return prev.map(p => p.type === type && p.channel === channel ? { ...p, enabled: currentlyEnabled } : p);
      });
    } finally {
      setUpdating(false);
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background },
    text: { color: isDark ? theme.colors.white : theme.colors.text },
    textSecondary: { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
    headerBorder: { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
    divider: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
  };

  const sections = [
    {
      title: 'Global Preferences',
      items: [
        { type: 'system_alert', channel: 'in_app', label: 'In-App Notifications', desc: 'Receive real-time updates' },
        { type: 'system_alert', channel: 'push', label: 'Push Notifications', desc: 'Get alerts on your device' },
        { type: 'system_alert', channel: 'email', label: 'System Alerts (Email)', desc: 'Critical system announcements' }
      ]
    },
    {
      title: 'Activity & Scheduling',
      items: [
        { type: 'appointment_reminder', channel: 'email', label: 'Appointment Reminders (Email)', desc: 'Via email for upcoming bookings' },
        { type: 'appointment_reminder', channel: 'sms', label: 'Appointment Reminders (SMS)', desc: 'Instant text messages' },
        { type: 'appointment_booked', channel: 'in_app', label: 'New Bookings', desc: 'When a new appointment is scheduled' }
      ]
    },
    {
      title: 'Financial Alerts',
      items: [
        { type: 'payment_received', channel: 'email', label: 'Payment Confirmations', desc: 'Receipts and updates via email' },
        { type: 'commission_earned', channel: 'in_app', label: 'Commissions', desc: 'When you earn a new commission' }
      ]
    },
    {
      title: 'App Updates',
      items: [
        { type: 'salon_update', channel: 'email', label: 'Product News', desc: 'New features and improvements' }
      ]
    }
  ];

  const renderNotificationItem = (item: NotificationItemConf, isLast: boolean) => (
    <View key={`${item.type}-${item.channel}`}>
      <View style={styles.settingRow}>
        <View style={styles.textContainer}>
            <Text style={[styles.settingLabel, dynamicStyles.text]}>
                {item.label}
            </Text>
            <Text style={[styles.settingDescription, dynamicStyles.textSecondary]}>
                {item.desc}
            </Text>
        </View>
        <Switch
          value={isEnabled(item.type, item.channel)}
          onValueChange={() => handleToggle(item.type, item.channel)}
          trackColor={{
            false: theme.colors.gray300,
            true: theme.colors.primaryLight,
          }}
          thumbColor={isEnabled(item.type, item.channel) ? theme.colors.primary : '#f4f3f4'}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>
      {!isLast && <View style={[styles.divider, dynamicStyles.divider]} />}
    </View>
  );

  const renderSection = (title: string, items: NotificationItemConf[]) => (
    <View style={styles.section} key={title}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>
        {title}
      </Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) =>
          renderNotificationItem(item, index === items.length - 1)
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Notifications
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {sections.map(section => (
                <View key={section.title}>
                    {renderSection(section.title, section.items)}
                    <View style={styles.sectionSpacer} />
                </View>
            ))}
            <View style={{height: 40}} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semibold },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  section: { paddingHorizontal: 16 },
  sectionSpacer: { height: 24 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
    marginBottom: 12,
  },
  sectionContent: {
    // No background, clean look
  },
  
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    minHeight: 56,
  },
  textContainer: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 14, fontFamily: theme.fonts.medium, marginBottom: 2 },
  settingDescription: { fontSize: 11, fontFamily: theme.fonts.regular, opacity: 0.8 },
  
  divider: { height: 1, width: '100%' },
});
