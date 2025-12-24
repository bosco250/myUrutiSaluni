import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useAuth } from "../../context";
import { useTheme } from "../../context";
import {
  staffService,
  ClockStatus,
  TodayStats,
  ScheduleItem,
} from "../../services/staff";
import { appointmentsService, Appointment } from "../../services/appointments";
import { salesService } from "../../services/sales";
import { attendanceService, AttendanceType } from "../../services/attendance";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { SafeAreaView } from "react-native-safe-area-context";

// Import assets
const logo = require("../../../assets/Logo.png");
const profileImage = require("../../../assets/Logo.png");

interface StaffDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function StaffDashboardScreen({
  navigation,
}: StaffDashboardScreenProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const unreadNotificationCount = useUnreadNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [employeeLevel] = useState(3);
  const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);

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

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateHoursWorked = (clockIn: string, clockOut?: string): number => {
    if (!clockIn) return 0;
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
  };

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all employee records for this user
      let employeeRecordsList: any[] = [];
      try {
        const employeeRecord = await staffService.getEmployeeByUserId(
          String(user.id)
        );
        if (Array.isArray(employeeRecord)) {
          employeeRecordsList = employeeRecord;
        } else if (employeeRecord) {
          employeeRecordsList = [employeeRecord];
        }
      } catch (error) {
        console.error("Error fetching employee records:", error);
      }

      setEmployeeRecords(employeeRecordsList);

      // Get current attendance status
      let currentAttendance: any = null;
      let clockStatusData: ClockStatus = {
        isClockedIn: false,
        clockInTime: null,
        clockOutTime: null,
        totalHoursToday: 0,
      };

      if (employeeRecordsList.length > 0) {
        const employeeId = employeeRecordsList[0].id;

        // Get current attendance status (if clocked in)
        try {
          currentAttendance =
            await staffService.getCurrentAttendance(employeeId);

          if (
            currentAttendance &&
            currentAttendance.type === AttendanceType.CLOCK_IN
          ) {
            // Get today's attendance logs to find clock out time
            const today = new Date();
            const dayStart = new Date(today);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(today);
            dayEnd.setHours(23, 59, 59, 999);

            try {
              const todayLogs = await attendanceService.getAttendanceHistory(
                employeeId,
                dayStart.toISOString(),
                dayEnd.toISOString()
              );

              const clockOutLog = todayLogs.find(
                (log) =>
                  log.type === AttendanceType.CLOCK_OUT &&
                  new Date(log.recordedAt) >
                    new Date(currentAttendance.recordedAt)
              );

              const clockInTime = currentAttendance.recordedAt;
              const clockOutTime = clockOutLog?.recordedAt;

              clockStatusData = {
                isClockedIn: true,
                clockInTime: formatTime(clockInTime),
                clockOutTime: clockOutTime ? formatTime(clockOutTime) : null,
                totalHoursToday: calculateHoursWorked(
                  clockInTime,
                  clockOutTime
                ),
              };
            } catch {
              // If we can't get today's logs, just use the current attendance
              clockStatusData = {
                isClockedIn: true,
                clockInTime: formatTime(currentAttendance.recordedAt),
                clockOutTime: null,
                totalHoursToday: calculateHoursWorked(
                  currentAttendance.recordedAt,
                  undefined
                ),
              };
            }
          }
        } catch {
          // No active attendance is normal - employee might not be clocked in yet
          // Silently handle this case without logging
        }
      }

      setClockStatus(clockStatusData);

      // Get today's appointments
      const today = new Date();
      const todayStr = formatDate(today);
      let allAppointments: Appointment[] = [];

      // Get appointments for the current user (backend filters by myAppointments=true)
      try {
        const appointments = await appointmentsService.getSalonAppointments({
          myAppointments: true,
        });
        allAppointments = appointments;
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }

      // Remove duplicates
      const uniqueAppointments = Array.from(
        new Map(allAppointments.map((apt) => [apt.id, apt])).values()
      );

      const todayAppointments = uniqueAppointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledStart);
        const aptDateStr = formatDate(aptDate);
        return (
          aptDateStr === todayStr &&
          apt.status !== "cancelled" &&
          apt.status !== "no_show"
        );
      });

      // Sort by scheduled start time
      todayAppointments.sort((a, b) => {
        return (
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
        );
      });

      // Format schedule items
      const scheduleItems: ScheduleItem[] = todayAppointments.map((apt) => ({
        id: apt.id,
        serviceName: apt.service?.name || "Service",
        customerName: apt.customer?.user?.fullName || "Customer",
        startTime: formatTime(apt.scheduledStart),
        endTime: formatTime(apt.scheduledEnd),
        status: apt.status || "pending",
        price: apt.serviceAmount || apt.service?.basePrice || 0,
      }));

      setSchedule(scheduleItems);

      // Calculate stats
      const now = new Date();
      const completedAppointments = todayAppointments.filter(
        (apt) => apt.status === "completed"
      );
      const upcomingAppointments = todayAppointments.filter((apt) => {
        const aptStart = new Date(apt.scheduledStart);
        return aptStart > now && apt.status !== "completed";
      });

      // Get unique customer count
      const uniqueCustomers = new Set(
        todayAppointments
          .map((apt) => apt.customerId)
          .filter((id) => id !== undefined && id !== null)
      );

      // Calculate earnings from commissions for today
      // Use backend date filtering for accurate results
      // Backend expects YYYY-MM-DD format, not ISO string
      let todayEarnings = 0;
      try {
        const allEmployeeIds = employeeRecordsList.map((emp) => emp.id);

        // Use the same todayStr that was already formatted (YYYY-MM-DD format)
        // This matches what the backend parseDateFilter expects
        const startDateStr = todayStr; // Already in YYYY-MM-DD format
        const endDateStr = todayStr; // Same day for start and end

        for (const empId of allEmployeeIds) {
          try {
            // Use backend date filtering to get commissions for today
            // Backend parseDateFilter expects YYYY-MM-DD format
            const commissions = await salesService.getCommissions({
              salonEmployeeId: empId,
              startDate: startDateStr,
              endDate: endDateStr,
            });
            // Sum all commissions (already filtered by backend)
            todayEarnings += commissions.reduce(
              (sum, comm) => sum + Number(comm.amount || 0),
              0
            );
          } catch (error) {
            console.error(
              `Error fetching commissions for employee ${empId}:`,
              error
            );
          }
        }
      } catch (error) {
        console.error("Error calculating earnings:", error);
      }

      const stats: TodayStats = {
        appointmentsCount: todayAppointments.length,
        completedCount: completedAppointments.length,
        upcomingCount: upcomingAppointments.length,
        earnings: todayEarnings,
        customerCount: uniqueCustomers.size,
      };

      setTodayStats(stats);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to load dashboard data. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return isDark ? theme.colors.success : "#4CAF50";
      case "pending":
        return isDark ? theme.colors.warning : "#FF9800";
      case "completed":
        return isDark ? theme.colors.info : "#2196F3";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return isDark ? `${theme.colors.success}20` : "#E8F5E9";
      case "pending":
        return isDark ? `${theme.colors.warning}20` : "#FFF3E0";
      case "completed":
        return isDark ? `${theme.colors.info}20` : "#E3F2FD";
      default:
        return isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary;
    }
  };

  // Get user position/role formatted
  const getUserPosition = () => {
    if (employeeRecords.length > 0 && employeeRecords[0].roleTitle) {
      return employeeRecords[0].roleTitle;
    }
    return "Employee";
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, dynamicStyles.container]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
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
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Pressable
              style={({ pressed }) => [
                styles.notificationButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <MaterialIcons
                name="notifications-none"
                size={theme.sizes.icon.md}
                color="#FFFFFF"
              />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 9
                      ? "9+"
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Image source={profileImage} style={styles.profileImage} />
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.fullName || "Employee"}
              </Text>
              <Text style={styles.profileRole}>
                {getUserPosition()} • Level {employeeLevel}
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, dynamicStyles.card]}>
              <View
                style={[
                  styles.statIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${theme.colors.info}20`
                      : "#E3F2FD",
                  },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={theme.sizes.icon.sm}
                  color={isDark ? theme.colors.info : "#2196F3"}
                />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {todayStats?.appointmentsCount || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                TODAY'S{"\n"}TASKS
              </Text>
            </View>

            <View style={[styles.statCard, dynamicStyles.card]}>
              <View
                style={[
                  styles.statIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${theme.colors.success}20`
                      : "#E8F5E9",
                  },
                ]}
              >
                <MaterialIcons
                  name="people"
                  size={theme.sizes.icon.sm}
                  color={isDark ? theme.colors.success : "#4CAF50"}
                />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {todayStats?.customerCount || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                CUSTOMERS
              </Text>
            </View>

            <View style={[styles.statCard, dynamicStyles.card]}>
              <View
                style={[
                  styles.statIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${theme.colors.warning}20`
                      : "#FFF3E0",
                  },
                ]}
              >
                <MaterialIcons
                  name="attach-money"
                  size={theme.sizes.icon.sm}
                  color={isDark ? theme.colors.warning : "#FF9800"}
                />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                ${todayStats?.earnings || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                EARNINGS
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.firstSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Quick Actions
          </Text>

          <View style={styles.quickActionsGrid}>
            {/* Clocked In Card - Click to go to Attendance */}
            <Pressable
              style={({ pressed }) => [
                styles.quickActionCard,
                dynamicStyles.card,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Attendance")}
            >
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.success}20`
                        : "#E8F5E9",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="access-time"
                    size={theme.sizes.icon.md}
                    color={isDark ? theme.colors.success : "#4CAF50"}
                  />
                </View>
                {clockStatus?.isClockedIn && (
                  <View
                    style={[
                      styles.onTimeBadge,
                      {
                        backgroundColor: isDark
                          ? `${theme.colors.success}20`
                          : "#E8F5E9",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.onTimeBadgeText,
                        {
                          color: isDark ? theme.colors.success : "#4CAF50",
                        },
                      ]}
                    >
                      On Time
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Clocked In
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                {clockStatus?.clockInTime || "--:--"}
              </Text>
            </Pressable>

            {/* Commissions Card */}
            <Pressable
              style={({ pressed }) => [
                styles.quickActionCard,
                dynamicStyles.card,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Commissions")}
            >
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.primary}20`
                        : `${theme.colors.primary}15`,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="payments"
                    size={theme.sizes.icon.md}
                    color={theme.colors.primary}
                  />
                </View>
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Commissions
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                View Earnings
              </Text>
            </Pressable>

            {/* Goal Setting Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.secondary}20`
                        : "#F3E5F5",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="track-changes"
                    size={theme.sizes.icon.md}
                    color={isDark ? theme.colors.secondary : "#9C27B0"}
                  />
                </View>
                <View
                  style={[
                    styles.activeBadge,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.success}20`
                        : "#E8F5E9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      {
                        color: isDark ? theme.colors.success : "#4CAF50",
                      },
                    ]}
                  >
                    Active
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Goal Setting
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                2 Targets
              </Text>
            </View>

            {/* Training Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.warning}20`
                        : "#FFF3E0",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="play-circle-outline"
                    size={theme.sizes.icon.md}
                    color={isDark ? theme.colors.warning : "#FF9800"}
                  />
                </View>
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Training
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                2 Pending
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Today's Schedule
            </Text>
            <Pressable
              onPress={() => navigation.navigate("MySchedule")}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={styles.viewAllLink}>View Calendar</Text>
            </Pressable>
          </View>

          {schedule.length === 0 ? (
            <View style={[styles.emptyCard, dynamicStyles.card]}>
              <MaterialIcons
                name="event-available"
                size={theme.sizes.icon.xl}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No appointments scheduled for today
              </Text>
            </View>
          ) : (
            schedule.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.scheduleCard,
                  dynamicStyles.card,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  navigation.navigate("AppointmentDetail", {
                    appointmentId: item.id,
                  })
                }
              >
                <View style={styles.scheduleCardLeft}>
                  <View
                    style={[
                      styles.customerAvatar,
                      {
                        backgroundColor: isDark
                          ? `${theme.colors.primary}20`
                          : `${theme.colors.primary}15`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={theme.sizes.icon.md}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleMainRow}>
                      <Text style={[styles.serviceName, dynamicStyles.text]}>
                        {item.serviceName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusBgColor(item.status) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(item.status) },
                          ]}
                        >
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.customerName, dynamicStyles.textSecondary]}
                    >
                      {item.customerName}
                    </Text>
                    <View style={styles.scheduleDetails}>
                      <View style={styles.scheduleTime}>
                        <MaterialIcons
                          name="schedule"
                          size={theme.sizes.icon.xs}
                          color={theme.colors.textSecondary}
                        />
                        <Text
                          style={[styles.timeText, dynamicStyles.textSecondary]}
                        >
                          {item.startTime} - {item.endTime}
                        </Text>
                      </View>
                      <Text style={[styles.priceText, dynamicStyles.text]}>
                        ${item.price}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Bottom spacing for safe area */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: theme.componentSpacing.screenPaddingLarge,
  },

  // Header
  header: {
    paddingTop: theme.componentSpacing.screenPadding,
    paddingHorizontal: theme.componentSpacing.screenPadding,
    paddingBottom: theme.componentSpacing.screenPaddingLarge + 40,
    borderBottomLeftRadius: theme.sizes.radius.xl,
    borderBottomRightRadius: theme.sizes.radius.xl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    minHeight: theme.touchTargets.comfortable,
  },
  logo: {
    width: 90,
    height: 32,
  },
  notificationButton: {
    position: "relative",
    width: theme.touchTargets.comfortable,
    height: theme.touchTargets.comfortable,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.sizes.radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: theme.sizes.badge.md / 2,
    minWidth: theme.sizes.badge.md,
    height: theme.sizes.badge.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: "700",
    fontFamily: theme.fontFamilies.bold,
    lineHeight: 12,
  },

  // Profile Section
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.componentSpacing.sectionGap,
  },
  profileImage: {
    width: theme.sizes.avatar.lg,
    height: theme.sizes.avatar.lg,
    borderRadius: theme.sizes.avatar.lg / 2,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...theme.typography.h2,
    color: "#FFFFFF",
    fontFamily: theme.fontFamilies.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  profileRole: {
    ...theme.typography.bodySmall,
    color: "rgba(255,255,255,0.85)",
    fontFamily: theme.fontFamilies.regular,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs,
    position: "absolute",
    bottom: -60, // Increased from -30 to give more space
    left: theme.componentSpacing.screenPadding,
    right: theme.componentSpacing.screenPadding,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.sizes.radius.lg,
    padding: theme.componentSpacing.cardPadding,
    marginHorizontal: theme.spacing.xs,
    alignItems: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: theme.sizes.elevation.md,
    borderWidth: 1,
  },
  statIconContainer: {
    width: theme.sizes.icon.lg,
    height: theme.sizes.icon.lg,
    borderRadius: theme.sizes.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.h3,
    fontFamily: theme.fontFamilies.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  statLabel: {
    ...theme.typography.overline,
    textAlign: "center",
    fontFamily: theme.fontFamilies.regular,
  },

  // Section
  section: {
    paddingHorizontal: theme.componentSpacing.screenPadding,
    marginTop: theme.componentSpacing.sectionGap,
  },
  // First section after header needs extra top margin for stats cards
  firstSection: {
    paddingHorizontal: theme.componentSpacing.screenPadding,
    marginTop: theme.componentSpacing.sectionGap + 40, // Extra space for stats cards
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontFamily: theme.fontFamilies.semibold,
    marginBottom: theme.spacing.md,
  },
  viewAllLink: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontFamily: theme.fontFamilies.medium,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickActionCard: {
    width: "48.5%",
    borderRadius: theme.sizes.radius.lg,
    padding: theme.componentSpacing.cardPadding,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: theme.sizes.elevation.sm,
    borderWidth: 1,
    minHeight: theme.touchTargets.comfortable * 2,
  },
  quickActionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  quickActionIcon: {
    width: theme.touchTargets.comfortable,
    height: theme.touchTargets.comfortable,
    borderRadius: theme.sizes.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    ...theme.typography.bodySmall,
    fontFamily: theme.fontFamilies.regular,
    marginBottom: theme.spacing.xs / 2,
  },
  quickActionValue: {
    ...theme.typography.bodyMedium,
    fontFamily: theme.fontFamilies.semibold,
  },
  onTimeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.sizes.radius.md,
  },
  onTimeBadgeText: {
    ...theme.typography.caption,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "600",
  },
  activeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.sizes.radius.md,
  },
  activeBadgeText: {
    ...theme.typography.caption,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "600",
  },

  // Schedule Card
  scheduleCard: {
    borderRadius: theme.sizes.radius.lg,
    padding: theme.componentSpacing.cardPadding,
    marginBottom: theme.componentSpacing.listItemGap,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: theme.sizes.elevation.sm,
    borderWidth: 1,
    minHeight: theme.touchTargets.comfortable * 2,
  },
  scheduleCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  customerAvatar: {
    width: theme.sizes.avatar.md,
    height: theme.sizes.avatar.md,
    borderRadius: theme.sizes.avatar.md / 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs / 2,
  },
  serviceName: {
    ...theme.typography.h4,
    fontFamily: theme.fontFamilies.semibold,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.sizes.radius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "600",
  },
  customerName: {
    ...theme.typography.bodySmall,
    fontFamily: theme.fontFamilies.regular,
    marginBottom: theme.spacing.xs,
  },
  scheduleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  scheduleTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  timeText: {
    ...theme.typography.bodySmall,
    fontFamily: theme.fontFamilies.regular,
  },
  priceText: {
    ...theme.typography.bodyMedium,
    fontFamily: theme.fontFamilies.semibold,
  },

  // Empty State
  emptyCard: {
    borderRadius: theme.sizes.radius.lg,
    padding: theme.componentSpacing.screenPaddingLarge,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    minHeight: 200,
    justifyContent: "center",
  },
  emptyText: {
    ...theme.typography.bodySmall,
    textAlign: "center",
    marginTop: theme.spacing.md,
    fontFamily: theme.fontFamilies.regular,
  },
  bottomSpacing: {
    height: theme.componentSpacing.screenPaddingLarge * 2,
  },
});
