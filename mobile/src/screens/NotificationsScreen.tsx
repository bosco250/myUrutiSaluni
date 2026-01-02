import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import { useTheme, useAuth } from "../context";
import { Loader } from "../components/common";
import { notificationsService, Notification, NotificationsResponse } from "../services/notifications";

export default function NotificationsScreen({
  navigation,
}: {
  navigation?: any;
}) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  // Fetch notifications from API with timeout
  const fetchNotifications = useCallback(async () => {
    try {
      // PERFORMANCE: Add timeout to prevent hanging
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      const response = await Promise.race([
        notificationsService.getNotifications({
          limit: 50,
          offset: 0,
        }),
        timeout(8000) // 8 second timeout
      ]) as NotificationsResponse;

      setNotifications(response.data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      // Don't show alert for timeout, just log
      if (!error.message?.includes('timeout')) {
        Alert.alert(
          "Error",
          error.message || "Failed to load notifications. Please try again."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Map notification type to icon and color using theme colors
  const getNotificationIcon = (
    type: string
  ): { icon: string; color: string } => {
    const typeMap: Record<string, { icon: string; color: string }> = {
      // Appointment events
      appointment_booked: { icon: "event", color: theme.colors.primary },
      appointment_reminder: { icon: "schedule", color: theme.colors.warning },
      appointment_confirmed: {
        icon: "check-circle",
        color: theme.colors.success,
      },
      appointment_cancelled: { icon: "cancel", color: theme.colors.error },
      appointment_rescheduled: { icon: "update", color: theme.colors.warning },
      appointment_completed: {
        icon: "check-circle",
        color: theme.colors.success,
      },
      appointment_no_show: { icon: "error", color: theme.colors.error },
      // Payment events
      sale_completed: { icon: "shopping-cart", color: theme.colors.success },
      payment_received: { icon: "payment", color: theme.colors.success },
      payment_failed: { icon: "error", color: theme.colors.error },
      payment: { icon: "payment", color: theme.colors.primary },
      // Commission events
      commission_earned: { icon: "attach-money", color: theme.colors.success },
      commission_paid: {
        icon: "account-balance-wallet",
        color: theme.colors.primary,
      },
      commission_updated: { icon: "update", color: theme.colors.warning },
      // Loyalty events
      points_earned: { icon: "stars", color: theme.colors.warning },
      points_redeemed: { icon: "card-giftcard", color: theme.colors.primary },
      reward_available: { icon: "card-giftcard", color: theme.colors.warning },
      vip_status_achieved: {
        icon: "workspace-premium",
        color: theme.colors.primary,
      },
      // Inventory events
      low_stock_alert: { icon: "warning", color: theme.colors.warning },
      out_of_stock: { icon: "error", color: theme.colors.error },
      stock_replenished: { icon: "inventory", color: theme.colors.success },
      // System events
      salon_update: { icon: "store", color: theme.colors.primary },
      employee_assigned: { icon: "person", color: theme.colors.primary },
      membership_status: {
        icon: "card-membership",
        color: theme.colors.primary,
      },
      system_alert: { icon: "info", color: theme.colors.textSecondary },
      security_alert: { icon: "security", color: theme.colors.error },
      // Review events
      review: { icon: "rate-review", color: theme.colors.warning },
    };

    return (
      typeMap[type] || {
        icon: "notifications",
        color: theme.colors.textSecondary,
      }
    );
  };

  // Format timestamp to relative time
  const formatTimestamp = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "Just now";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? "day" : "days"} ago`;
      } else {
        // Return formatted date for older notifications
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
      }
    } catch {
      return "Recently";
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAllAsRead(true);
      await notificationsService.markAllAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read first (if not already read)
    if (!notification.isRead) {
      try {
        setMarkingAsRead(notification.id);
        await notificationsService.markAsRead(notification.id);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error: any) {
        console.error("Error marking notification as read:", error);
        // Continue with navigation even if marking as read fails
      } finally {
        setMarkingAsRead(null);
      }
    }

    // Always navigate, even if notification is already read

    // Navigate based on notification type and metadata
    try {
      const metadata = notification.metadata || {};
      // Check metadata first, then fallback to checking notification type
      // Note: appointmentId might be in metadata or as a direct field (if backend includes it)
      const appointmentId =
        metadata.appointmentId || (notification as any).appointmentId;
      const salonId = metadata.salonId || (notification as any).salonId;
      const serviceId = metadata.serviceId || (notification as any).serviceId;
      const employeeId =
        metadata.employeeId || (notification as any).employeeId;

      // Handle appointment-related notifications
      if (notification.type?.startsWith("appointment_")) {
        if (appointmentId) {
          // Try to fetch appointment first to pass full data
          try {
            // Note: We need to get appointment by ID - check if there's a method for this
            // For now, navigate with appointmentId - the screen will fetch it
            navigation?.navigate("AppointmentDetail", {
              appointmentId: appointmentId,
            });
          } catch (error) {
            console.error("Error navigating to appointment:", error);
            // Fallback: navigate to Bookings screen
            navigation?.navigate("Bookings");
          }
        } else {
          // No appointmentId, just go to Bookings
          navigation?.navigate("Bookings");
        }
      }
      // Handle salon-related notifications
      else if (
        salonId &&
        (notification.type === "salon_update" ||
          notification.type === "employee_assigned")
      ) {
        navigation?.navigate("SalonDetail", {
          salonId: salonId,
        });
      }
      // Handle service-related notifications
      else if (serviceId) {
        navigation?.navigate("ServiceDetail", {
          serviceId: serviceId,
        });
      }
      // Handle employee-related notifications
      else if (employeeId && salonId) {
        navigation?.navigate("EmployeeDetail", {
          employeeId: employeeId,
          salonId: salonId,
        });
      }
      // Handle commission notifications - go to Commissions screen
      else if (
        notification.type?.startsWith("commission_") ||
        notification.type === "commission_earned" ||
        notification.type === "commission_paid"
      ) {
        navigation?.navigate("Commissions");
      }
      // Handle sale notifications - go to SaleDetail for receipt
      else if (
        notification.type?.startsWith("sale_") ||
        notification.type === "sale_completed"
      ) {
        const saleId = metadata.saleId || (notification as any).saleId;
        if (saleId) {
          navigation?.navigate("SaleDetail", {
            saleId: saleId,
          });
        } else {
          // Fallback: navigate to SalesHistory if no saleId
          navigation?.navigate("SalesHistory");
        }
      }
      // Handle payment notifications - navigate based on payment type
      else if (
        notification.type?.startsWith("payment_") ||
        notification.type === "payment"
      ) {
        const paymentType =
          metadata.paymentType || (notification as any).paymentType;
        const paymentId = metadata.paymentId || (notification as any).paymentId;
        const walletTransactionId =
          metadata.walletTransactionId ||
          (notification as any).walletTransactionId;

        // If it's a wallet top-up, navigate to Finance screen
        if (paymentType === "wallet_topup" || paymentType === "WALLET_TOPUP") {
          navigation?.navigate("Finance");
        } else if (
          paymentType === "wallet_withdrawal" ||
          paymentType === "WALLET_WITHDRAWAL"
        ) {
          navigation?.navigate("PaymentHistory", {
            mode: "wallet",
            title: "Wallet History",
            highlightTransactionId: walletTransactionId,
          });
        } else {
          // For other payments, navigate to PaymentHistory (default mode is "payment")
          navigation?.navigate("PaymentHistory", {
            highlightPaymentId: paymentId,
          });
        }
      }
      // Handle loyalty/points notifications - go to Loyalty screen
      else if (
        notification.type?.startsWith("points_") ||
        notification.type === "points_earned" ||
        notification.type === "points_redeemed" ||
        notification.type === "reward_available" ||
        notification.type === "vip_status_achieved"
      ) {
        navigation?.navigate("Loyalty");
      }
      // Handle review notifications - navigate to salon detail with reviewId
      else if (
        notification.type === "review" ||
        notification.type?.toLowerCase() === "review" ||
        notification.type?.startsWith("review_") ||
        notification.type?.toLowerCase().includes("review")
      ) {
        const reviewSalonId =
          metadata.salonId ||
          (notification as any).salonId ||
          metadata.salon_id;
        const reviewId =
          metadata.reviewId ||
          (notification as any).reviewId ||
          metadata.review_id;
        console.log("Review notification clicked:", {
          type: notification.type,
          fullNotification: notification,
          metadata,
          reviewSalonId,
          reviewId,
          userRole: user?.role,
        });
        if (reviewSalonId) {
          const params: any = { salonId: reviewSalonId };
          if (reviewId) {
            params.reviewId = String(reviewId); // Ensure it's a string
          }
          
          // Determine which screen to navigate to based on user role
          // Salon owners use "OwnerSalonDetail", customers use "SalonDetail"
          const targetScreen = 
            user?.role === "salon_owner" || user?.role === "SALON_OWNER"
              ? "OwnerSalonDetail"
              : "SalonDetail";
          
          console.log("Navigating to", targetScreen, "with params:", params);
          navigation?.navigate(targetScreen, params);
        } else {
          console.warn("No salonId found in review notification", {
            metadata,
            notification,
          });
        }
      }
      // Handle permission notifications
      else if (
        notification.type === "permission_granted" ||
        notification.type === "permission_revoked"
      ) {
        const permissionSalonId =
          metadata.salonId ||
          (notification as any).salonId ||
          metadata.salon_id;
        const permissionEmployeeId =
          metadata.employeeId ||
          (notification as any).employeeId ||
          metadata.employee_id;

        // For employees: Navigate to screen where they can USE the permissions
        // For owners: Navigate to permissions management screen
        if (user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE") {
          // Employee - navigate to where they can use permissions
          if (notification.type === "permission_granted") {
            // Get granted permissions from metadata
            // CRITICAL: Backend sends:
            // - metadata.grantedPermissions = array of CODES like ["MANAGE_APPOINTMENTS"]
            // - permissions = array of DESCRIPTIONS like ["Create, update, and cancel..."]
            // We need the CODES, not the descriptions!
            let grantedPermissions: string[] = 
              metadata.grantedPermissions || // This has the codes we need
              (notification as any).grantedPermissions ||
              [];
            
            console.log("🔍 Permission notification metadata:", {
              grantedPermissions: metadata.grantedPermissions,
              permissions: metadata.permissions,
              selectedPermissions: grantedPermissions,
            });
            
            // If permissions not in metadata, try to fetch from API
            if (grantedPermissions.length === 0 && permissionSalonId && permissionEmployeeId) {
              try {
                console.log("📡 Fetching permissions from API for employee:", permissionEmployeeId);
                // Dynamically import to avoid circular dependencies
                const { employeePermissionsService } = await import("../services/employeePermissions");
                const permissionsData = await employeePermissionsService.getEmployeePermissions(
                  permissionSalonId,
                  permissionEmployeeId
                );
                grantedPermissions = permissionsData
                  .filter(p => p.isActive)
                  .map(p => p.permissionCode);
                console.log("✅ Fetched permissions from API:", grantedPermissions);
              } catch (error) {
                console.error("❌ Error fetching permissions for navigation:", error);
              }
            }
            
            
            // Import helper function to get primary screen
            // Use dynamic import to avoid circular dependencies
             const { getPrimaryScreenFromPermissions } = await import("../utils/permissionNavigation");
            
            if (grantedPermissions.length > 0) {
              // Navigate to the primary screen based on granted permissions
              const primaryScreen = getPrimaryScreenFromPermissions(grantedPermissions as any);
              console.log("🎯 Navigating employee to primary screen:", primaryScreen, "based on permission CODES:", grantedPermissions);
              navigation?.navigate(primaryScreen);
            } else {
              // If permissions not available, navigate to MyPermissions to see them
              console.log("⚠️ No permissions found, navigating to MyPermissions");
              navigation?.navigate("MyPermissions");
            }
          } else {
            // Permission revoked - show permissions screen
            navigation?.navigate("MyPermissions");
          }
        } else {
          // Owner/Admin - navigate to permissions management screen
          if (permissionSalonId) {
            navigation?.navigate("EmployeePermissions", {
              salonId: permissionSalonId,
              employeeId: permissionEmployeeId,
            });
          } else {
            navigation?.navigate("EmployeePermissions");
          }
        }
      }
      // For other notifications, stay on notifications screen or navigate to relevant screen
      else {
        console.log(
          "No specific navigation for notification type:",
          notification.type
        );
      }
    } catch (error: any) {
      console.error("Error handling notification navigation:", error);
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
    cardUnread: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.background,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark
        ? theme.colors.gray700
        : theme.colors.borderLight,
    },
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading notifications..." />
      </View>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: dynamicStyles.text.color }]}
          >
            Notifications
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="notifications-none"
            size={64}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyText, { color: dynamicStyles.text.color }]}>
            No notifications yet
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              { color: dynamicStyles.textSecondary.color },
            ]}
          >
            You'll see your notifications here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dynamicStyles.text.color }]}>
          Notifications
        </Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Recent Section Header */}
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              { color: dynamicStyles.textSecondary.color },
            ]}
          >
            RECENT
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              disabled={markingAllAsRead}
              activeOpacity={0.7}
            >
              {markingAllAsRead ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.markAllReadLink}>Mark all as read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {notifications.map((notification) => {
            const { icon, color } = getNotificationIcon(notification.type);
            const isMarkingRead = markingAsRead === notification.id;

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.isRead
                    ? [styles.notificationCardUnread, dynamicStyles.cardUnread]
                    : dynamicStyles.card,
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
                disabled={isMarkingRead}
              >
                {/* Unread Indicator */}
                {!notification.isRead && (
                  <View style={styles.unreadIndicator} />
                )}

                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${color}20` },
                  ]}
                >
                  <MaterialIcons name={icon as any} size={24} color={color} />
                </View>

                {/* Content */}
                <View style={styles.notificationContent}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: dynamicStyles.text.color },
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={[
                      styles.notificationDescription,
                      { color: dynamicStyles.textSecondary.color },
                    ]}
                  >
                    {notification.body}
                  </Text>
                  <Text
                    style={[
                      styles.notificationTimestamp,
                      { color: dynamicStyles.textSecondary.color },
                    ]}
                  >
                    {formatTimestamp(notification.createdAt)}
                  </Text>
                </View>

                {/* Loading indicator for marking as read */}
                {isMarkingRead && (
                  <View style={styles.markingIndicator}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
    borderBottomColor: theme.colors.borderLight,
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
  placeholder: {
    width: 40,
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
    shadowColor: theme.colors.black,
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
  markingIndicator: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
});
