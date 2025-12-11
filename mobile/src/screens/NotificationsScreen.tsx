import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";

interface Notification {
  id: string;
  type: "appointment" | "offer" | "payment" | "review";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  icon: string;
  iconColor: string;
}

export default function NotificationsScreen({ navigation }: { navigation?: any }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "appointment",
      title: "Appointment Confirmed",
      description: "Your booking with Jessica at Glamour Studio is confirmed for today at 2:30 PM.",
      timestamp: "2 hours ago",
      isRead: false,
      icon: "event",
      iconColor: "#5AC8FA",
    },
    {
      id: "2",
      type: "offer",
      title: "Special Offer!",
      description: "Get 20% off on all spa treatments this weekend. Limited slots available.",
      timestamp: "5 hours ago",
      isRead: false,
      icon: "local-offer",
      iconColor: "#FF9500",
    },
    {
      id: "3",
      type: "payment",
      title: "Payment Successful",
      description: "You have successfully paid $85.00 for your recent Hair Styling service.",
      timestamp: "Yesterday",
      isRead: true,
      icon: "check-circle",
      iconColor: "#34C759",
    },
    {
      id: "4",
      type: "review",
      title: "Review Request",
      description: "How was your experience at Luxe Nails? Rate your service now.",
      timestamp: "Yesterday",
      isRead: true,
      icon: "info",
      iconColor: "#8E8E93",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  const handleNotificationPress = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{unreadCount} New</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recent Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead}>
              <Text style={styles.markAllReadLink}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification.id)}
              activeOpacity={0.7}
            >
              {/* Unread Indicator */}
              {!notification.isRead && (
                <View style={styles.unreadIndicator} />
              )}

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${notification.iconColor}20` },
                ]}
              >
                <MaterialIcons
                  name={notification.icon as any}
                  size={24}
                  color={notification.iconColor}
                />
              </View>

              {/* Content */}
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationDescription}>
                  {notification.description}
                </Text>
                <Text style={styles.notificationTimestamp}>
                  {notification.timestamp}
                </Text>
              </View>
            </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  newBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  newBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    fontFamily: theme.fonts.medium,
  },
  markAllReadLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontWeight: "600",
  },
  notificationsList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    position: "relative",
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadIndicator: {
    position: "absolute",
    top: theme.spacing.md + 2,
    right: theme.spacing.md + 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  notificationDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
});

