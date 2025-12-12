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
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";

interface NotificationPreferencesScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export default function NotificationPreferencesScreen({
  navigation,
}: NotificationPreferencesScreenProps) {
  const { isDark } = useTheme();
  const [newAppointmentBookings, setNewAppointmentBookings] = useState(true);
  const [cancellations, setCancellations] = useState(true);
  const [tipsReceived, setTipsReceived] = useState(true);
  const [marketingUpdates, setMarketingUpdates] = useState(false);
  const [teamAnnouncements, setTeamAnnouncements] = useState(false);
  const [paymentNotifications, setPaymentNotifications] = useState(true);

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
    },
  };

  const notificationSettings = [
    {
      label: "New Appointment Bookings",
      value: newAppointmentBookings,
      onChange: setNewAppointmentBookings,
    },
    {
      label: "Cancellations",
      value: cancellations,
      onChange: setCancellations,
    },
    {
      label: "Tips Received",
      value: tipsReceived,
      onChange: setTipsReceived,
    },
    {
      label: "Marketing Updates",
      value: marketingUpdates,
      onChange: setMarketingUpdates,
    },
    {
      label: "Team Announcements",
      value: teamAnnouncements,
      onChange: setTeamAnnouncements,
    },
    {
      label: "Payment Notifications",
      value: paymentNotifications,
      onChange: setPaymentNotifications,
    },
  ];

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dynamicStyles.text.color }]}>
          Notification Preferences
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sectionCard, dynamicStyles.card]}>
          {notificationSettings.map((setting) => (
            <View key={setting.label} style={styles.settingRow}>
              <Text
                style={[styles.settingLabel, { color: dynamicStyles.text.color }]}
              >
                {setting.label}
              </Text>
              <Switch
                value={setting.value}
                onValueChange={setting.onChange}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.white}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
});
