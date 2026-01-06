import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useTheme, useAuth } from "../context";
import { Loader } from "../components/common";
import { notificationsService, Notification, NotificationsResponse } from "../services/notifications";

// Gesture handler - optional, graceful fallback for swipe-to-delete
let Swipeable: any = null;
let GestureHandlerRootView: React.ComponentType<any> = View;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gestureHandler = require("react-native-gesture-handler");
  Swipeable = gestureHandler.Swipeable;
  GestureHandlerRootView = gestureHandler.GestureHandlerRootView;
} catch {
  // Gesture handler not available, swipe-to-delete will be disabled
}

type FilterType = "all" | "unread" | "appointments" | "payments" | "system";

interface GroupedNotifications {
  title: string;
  data: Notification[];
}

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
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const dynamicStyles = useMemo(() => ({
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
    cardUnread: {
      backgroundColor: isDark ? theme.colors.gray700 : "#FFF9F0",
      borderColor: theme.colors.primary,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    filterInactive: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
    },
  }), [isDark]);

  // Filter configurations
  const filters: { id: FilterType; label: string; icon: string }[] = [
    { id: "all", label: "All", icon: "notifications" },
    { id: "unread", label: "Unread", icon: "markunread" },
    { id: "appointments", label: "Bookings", icon: "event" },
    { id: "payments", label: "Payments", icon: "payment" },
    { id: "system", label: "System", icon: "settings" },
  ];

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      const response = await Promise.race([
        notificationsService.getNotifications({ limit: 100, offset: 0 }),
        timeout(8000)
      ]) as NotificationsResponse;

      setNotifications(response.data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      if (!error.message?.includes('timeout')) {
        Alert.alert("Error", error.message || "Failed to load notifications");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    switch (activeFilter) {
      case "unread":
        filtered = notifications.filter(n => !n.isRead);
        break;
      case "appointments":
        filtered = notifications.filter(n => 
          n.type?.toLowerCase().includes("appointment") ||
          n.type?.toLowerCase().includes("booking")
        );
        break;
      case "payments":
        filtered = notifications.filter(n => 
          n.type?.toLowerCase().includes("payment") ||
          n.type?.toLowerCase().includes("sale") ||
          n.type?.toLowerCase().includes("commission")
        );
        break;
      case "system":
        filtered = notifications.filter(n => 
          n.type?.toLowerCase().includes("system") ||
          n.type?.toLowerCase().includes("permission") ||
          n.type?.toLowerCase().includes("employee") ||
          n.type?.toLowerCase().includes("salon")
        );
        break;
    }

    return filtered;
  }, [notifications, activeFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo((): GroupedNotifications[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 86400000));

    const groups: { [key: string]: Notification[] } = {
      "Today": [],
      "Yesterday": [],
      "This Week": [],
      "Earlier": [],
    };

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (notificationDate.getTime() === today.getTime()) {
        groups["Today"].push(notification);
      } else if (notificationDate.getTime() === yesterday.getTime()) {
        groups["Yesterday"].push(notification);
      } else if (notificationDate >= thisWeekStart) {
        groups["This Week"].push(notification);
      } else {
        groups["Earlier"].push(notification);
      }
    });

    return Object.entries(groups)
      .filter(([_, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }));
  }, [filteredNotifications]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length
  , [notifications]);

  // Notification type to icon mapping
  const getNotificationIcon = (type: string): { icon: string; color: string; bgColor: string } => {
    const typeMap: Record<string, { icon: string; color: string; bgColor: string }> = {
      appointment_booked: { icon: "event", color: theme.colors.primary, bgColor: theme.colors.primary + "15" },
      appointment_reminder: { icon: "schedule", color: theme.colors.warning, bgColor: theme.colors.warning + "15" },
      appointment_confirmed: { icon: "check-circle", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      appointment_cancelled: { icon: "cancel", color: theme.colors.error, bgColor: theme.colors.error + "15" },
      appointment_completed: { icon: "done-all", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      sale_completed: { icon: "shopping-cart", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      payment_received: { icon: "payment", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      payment_failed: { icon: "error", color: theme.colors.error, bgColor: theme.colors.error + "15" },
      commission_earned: { icon: "attach-money", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      commission_paid: { icon: "account-balance-wallet", color: theme.colors.primary, bgColor: theme.colors.primary + "15" },
      points_earned: { icon: "stars", color: theme.colors.warning, bgColor: theme.colors.warning + "15" },
      low_stock_alert: { icon: "warning", color: theme.colors.warning, bgColor: theme.colors.warning + "15" },
      permission_granted: { icon: "verified-user", color: theme.colors.success, bgColor: theme.colors.success + "15" },
      permission_revoked: { icon: "remove-circle", color: theme.colors.error, bgColor: theme.colors.error + "15" },
      employee_assigned: { icon: "person-add", color: theme.colors.primary, bgColor: theme.colors.primary + "15" },
      review: { icon: "rate-review", color: theme.colors.warning, bgColor: theme.colors.warning + "15" },
    };

    return typeMap[type] || { 
      icon: "notifications", 
      color: theme.colors.textSecondary,
      bgColor: theme.colors.gray200 
    };
  };

  // Format timestamp
  const formatTimestamp = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return "Just now";
      if (diffInSeconds < 3600) {
        const min = Math.floor(diffInSeconds / 60);
        return `${min}m ago`;
      }
      if (diffInSeconds < 86400) {
        const hrs = Math.floor(diffInSeconds / 3600);
        return `${hrs}h ago`;
      }
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAllAsRead(true);
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      Alert.alert("Error", "Failed to mark all as read");
    } finally {
      setMarkingAllAsRead(false);
    }
  };

   const handleDeleteNotification = async (notificationId: string) => {
    try {
      setDeleting(notificationId);
      await notificationsService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error: any) {
      console.error("Delete notification error:", error);
      // Remove from UI anyway for better UX
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } finally {
      setDeleting(null);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        setMarkingAsRead(notification.id);
        await notificationsService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error("Error marking as read:", error);
      } finally {
        setMarkingAsRead(null);
      }
    }

    // Navigate based on type
    const metadata = notification.metadata || {};
    const appointmentId = metadata.appointmentId || (notification as any).appointmentId;
    const salonId = metadata.salonId || (notification as any).salonId || metadata.salon_id;
    const employeeId = metadata.employeeId || (notification as any).employeeId || metadata.employee_id;
    const reviewId = metadata.reviewId || (notification as any).reviewId;
    const notificationType = notification.type?.toLowerCase() || "";

    console.log("📱 Notification navigation:", { notificationType, salonId, employeeId, appointmentId });

    // 1️⃣ Permission notifications → WhatCanIDo / EmployeePermissions
    if (notificationType.includes("permission")) {
      if (user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE") {
        navigation?.navigate("WhatCanIDo");
      } else {
        navigation?.navigate("EmployeePermissions", { salonId, employeeId });
      }
      return;
    }

    // 2️⃣ Employee assigned/hired → EmployeeContract / EmployeeDetail
    if (notificationType.includes("employee_assigned") || notificationType.includes("employee_hired") || notificationType.includes("new_job")) {
      if (user?.role === "salon_employee" || user?.role === "SALON_EMPLOYEE") {
        navigation?.navigate("EmployeeContract", { salonId, employeeId });
      } else {
        navigation?.navigate("EmployeeDetail", { salonId, employeeId });
      }
      return;
    }

    // 3️⃣ Appointment/Booking notifications → AppointmentDetail / Bookings
    if (notificationType.includes("appointment") || notificationType.includes("booking") || notificationType.includes("schedule")) {
      if (appointmentId) {
        navigation?.navigate("AppointmentDetail", { appointmentId });
      } else {
        navigation?.navigate("Bookings");
      }
      return;
    }

    // 4️⃣ Commission notifications → Commissions
    if (notificationType.includes("commission")) {
      navigation?.navigate("Commissions");
      return;
    }

    // 5️⃣ Sale notifications → SaleDetail / SalesHistory
    if (notificationType.includes("sale")) {
      const saleId = metadata.saleId || (notification as any).saleId;
      if (saleId) {
        navigation?.navigate("SaleDetail", { saleId });
      } else {
        navigation?.navigate("SalesHistory");
      }
      return;
    }

    // 6️⃣ Payment notifications → PaymentHistory / Finance
    if (notificationType.includes("payment")) {
      const paymentType = metadata.paymentType;
      if (paymentType === "wallet_topup" || paymentType === "WALLET_TOPUP") {
        navigation?.navigate("Finance");
      } else {
        navigation?.navigate("PaymentHistory");
      }
      return;
    }

    // 7️⃣ Loyalty/Points/Rewards notifications → Loyalty
    if (notificationType.includes("points") || notificationType.includes("reward") || notificationType.includes("vip") || notificationType.includes("loyalty")) {
      navigation?.navigate("Loyalty");
      return;
    }

    // 8️⃣ Review notifications → SalonDetail
    if (notificationType.includes("review")) {
      if (salonId) {
        const targetScreen = (user?.role === "salon_owner" || user?.role === "SALON_OWNER") 
          ? "OwnerSalonDetail" 
          : "SalonDetail";
        navigation?.navigate(targetScreen, { salonId, reviewId: String(reviewId || "") });
      }
      return;
    }

    // 9️⃣ Stock/Inventory notifications → Inventory
    if (notificationType.includes("stock") || notificationType.includes("inventory")) {
      navigation?.navigate("Inventory");
      return;
    }

    // 🔟 Salon update notifications → SalonDetail
    if (notificationType.includes("salon")) {
      if (salonId) {
        const targetScreen = (user?.role === "salon_owner" || user?.role === "SALON_OWNER")
          ? "OwnerSalonDetail"
          : "SalonDetail";
        navigation?.navigate(targetScreen, { salonId });
      }
      return;
    }

    // 1️⃣1️⃣ Membership notifications → Membership / Profile
    if (notificationType.includes("membership")) {
      navigation?.navigate("Membership");
      return;
    }

    // 1️⃣2️⃣ System/Security alerts → Settings
    if (notificationType.includes("system") || notificationType.includes("security")) {
      navigation?.navigate("Settings");
      return;
    }

    // Fallback: navigate based on available IDs
    if (appointmentId) {
      navigation?.navigate("AppointmentDetail", { appointmentId });
      return;
    }
    if (salonId) {
      navigation?.navigate("SalonDetail", { salonId });
      return;
    }

    // Ultimate fallback: log unhandled type
    console.log("⚠️ No navigation configured for notification type:", notificationType);
  };

  // Swipe action renderer
  const renderRightActions = (
    _progress: any,
    dragX: any,
    notificationId: string
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteNotification(notificationId)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {deleting === notificationId ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name="delete" size={24} color="#FFFFFF" />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Render notification card
  const renderNotificationCard = ({ item: notification }: { item: Notification }) => {
    const { icon, color, bgColor } = getNotificationIcon(notification.type);
    const isMarkingRead = markingAsRead === notification.id;

    const cardContent = (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !notification.isRead ? dynamicStyles.cardUnread : dynamicStyles.card,
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
        disabled={isMarkingRead}
      >
        {/* Unread Indicator */}
        {!notification.isRead && <View style={styles.unreadIndicator} />}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <MaterialIcons name={icon as any} size={22} color={color} />
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, dynamicStyles.text]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.notificationBody, dynamicStyles.textSecondary]} numberOfLines={2}>
            {notification.body}
          </Text>
          <View style={styles.notificationFooter}>
            <Text style={[styles.timestamp, dynamicStyles.textSecondary]}>
              {formatTimestamp(notification.createdAt)}
            </Text>
            {notification.type && (
              <View style={[styles.typeTag, { backgroundColor: bgColor }]}>
                <Text style={[styles.typeTagText, { color }]}>
                  {notification.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()).substring(0, 15)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <MaterialIcons 
          name="chevron-right" 
          size={20} 
          color={dynamicStyles.textSecondary.color} 
        />
      </TouchableOpacity>
    );

    // If Swipeable is available, wrap with swipe-to-delete
    if (Swipeable) {
      return (
        <Swipeable
          renderRightActions={(progress: any, dragX: any) => 
            renderRightActions(progress, dragX, notification.id)
          }
          rightThreshold={40}
          overshootRight={false}
        >
          {cardContent}
        </Swipeable>
      );
    }

    // Fallback: just render the card without swipe
    return cardContent;
  };

  // Render section header
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>{title}</Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading notifications..." />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              disabled={markingAllAsRead}
            >
              {markingAllAsRead ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <MaterialIcons name="done-all" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={filters}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isActive = activeFilter === item.id;
              const filterUnreadCount = item.id === "unread" ? unreadCount : 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterTab,
                    isActive 
                      ? { backgroundColor: theme.colors.primary }
                      : dynamicStyles.filterInactive,
                  ]}
                  onPress={() => setActiveFilter(item.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={item.icon as any} 
                    size={16} 
                    color={isActive ? "#FFFFFF" : dynamicStyles.textSecondary.color} 
                  />
                  <Text style={[
                    styles.filterTabText,
                    { color: isActive ? "#FFFFFF" : dynamicStyles.textSecondary.color }
                  ]}>
                    {item.label}
                  </Text>
                  {filterUnreadCount > 0 && (
                    <View style={[styles.filterBadge, isActive && { backgroundColor: "#FFFFFF" }]}>
                      <Text style={[styles.filterBadgeText, isActive && { color: theme.colors.primary }]}>
                        {filterUnreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Notifications List */}
        {groupedNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: dynamicStyles.filterInactive.backgroundColor }]}>
              <MaterialIcons 
                name="notifications-none" 
                size={48} 
                color={dynamicStyles.textSecondary.color} 
              />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
              {activeFilter === "all" 
                ? "You'll see your notifications here"
                : `No ${activeFilter} notifications`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedNotifications}
            keyExtractor={(item) => item.title}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
            renderItem={({ item: group }) => (
              <View>
                {renderSectionHeader(group.title)}
                {group.data.map(notification => (
                  <View key={notification.id}>
                    {renderNotificationCard({ item: notification })}
                  </View>
                ))}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  markAllBtn: {
    padding: theme.spacing.sm,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  filterScrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  filterBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontFamily: theme.fonts.medium,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  unreadIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
    fontFamily: theme.fonts.semibold,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
    fontFamily: theme.fonts.regular,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
});
