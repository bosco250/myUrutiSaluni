import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";

interface NotificationPreferencesScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function NotificationPreferencesScreen({
  navigation,
}: NotificationPreferencesScreenProps) {
  const { isDark } = useTheme();
  const [newAppointmentBookings, setNewAppointmentBookings] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [cancellations, setCancellations] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [tips, setTips] = useState(true);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    headerBorder: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    divider: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    iconBg: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.gray200,
    },
  };

  const bookingSettings: NotificationSetting[] = [
    {
      id: "appointments",
      label: "New Appointments",
      description: "Get notified when you have a new booking",
      icon: "event",
      value: newAppointmentBookings,
      onChange: setNewAppointmentBookings,
    },
    {
      id: "reminders",
      label: "Appointment Reminders",
      description: "Receive reminders before appointments",
      icon: "alarm",
      value: appointmentReminders,
      onChange: setAppointmentReminders,
    },
    {
      id: "cancellations",
      label: "Cancellations",
      description: "Notify when appointments are cancelled",
      icon: "cancel",
      value: cancellations,
      onChange: setCancellations,
    },
  ];

  const paymentSettings: NotificationSetting[] = [
    {
      id: "payments",
      label: "Payment Alerts",
      description: "Get notified about payment updates",
      icon: "payment",
      value: paymentNotifications,
      onChange: setPaymentNotifications,
    },
    {
      id: "tips",
      label: "Tips Received",
      description: "Notify when you receive a tip",
      icon: "favorite",
      value: tips,
      onChange: setTips,
    },
  ];

  const marketingSettings: NotificationSetting[] = [
    {
      id: "promotions",
      label: "Promotions & Offers",
      description: "Special deals and promotional offers",
      icon: "local-offer",
      value: promotions,
      onChange: setPromotions,
    },
  ];

  const renderNotificationItem = (setting: NotificationSetting, isLast: boolean) => (
    <View key={setting.id}>
      <View style={styles.settingRow}>
        <View style={[styles.settingIconContainer, dynamicStyles.iconBg]}>
          <MaterialIcons
            name={setting.icon as any}
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingLabel, dynamicStyles.text]}>
            {setting.label}
          </Text>
          <Text style={[styles.settingDescription, dynamicStyles.textSecondary]}>
            {setting.description}
          </Text>
        </View>
        <Switch
          value={setting.value}
          onValueChange={setting.onChange}
          trackColor={{
            false: isDark ? "#3A3A3C" : theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={isDark ? "#3A3A3C" : theme.colors.border}
        />
      </View>
      {!isLast && <View style={[styles.divider, dynamicStyles.divider]} />}
    </View>
  );

  const renderSection = (title: string, settings: NotificationSetting[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        {title}
      </Text>
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        {settings.map((setting, index) =>
          renderNotificationItem(setting, index === settings.length - 1)
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
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
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.colors.primary + '15' }]}>
          <MaterialIcons
            name="notifications-active"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={[styles.infoBannerText, { color: theme.colors.primary }]}>
            Manage how you receive notifications
          </Text>
        </View>

        {renderSection("BOOKINGS", bookingSettings)}
        {renderSection("PAYMENTS", paymentSettings)}
        {renderSection("MARKETING", marketingSettings)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.sm,
    marginLeft: 56,
  },
});
