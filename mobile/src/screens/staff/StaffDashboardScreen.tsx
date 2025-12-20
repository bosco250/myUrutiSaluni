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
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";

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
      let currentAttendance = null;
      let clockStatusData: ClockStatus = {
        isClockedIn: false,
        clockInTime: null,
        clockOutTime: null,
        totalHoursToday: 0,
      };

      if (employeeRecordsList.length > 0) {
        // Try to get current attendance for the first employee record
        try {
          currentAttendance = await staffService.getCurrentAttendance(
            employeeRecordsList[0].id
          );
          if (currentAttendance) {
            clockStatusData = {
              isClockedIn: true,
              clockInTime: formatTime(currentAttendance.clockIn),
              clockOutTime: currentAttendance.clockOut
                ? formatTime(currentAttendance.clockOut)
                : null,
              totalHoursToday: calculateHoursWorked(
                currentAttendance.clockIn,
                currentAttendance.clockOut
              ),
            };
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
      let todayEarnings = 0;
      try {
        const allEmployeeIds = employeeRecordsList.map((emp) => emp.id);
        for (const empId of allEmployeeIds) {
          try {
            const commissions = await salesService.getCommissions({
              salonEmployeeId: empId,
            });
            // Filter commissions created today
            const todayCommissions = commissions.filter((comm) => {
              const commDate = new Date(comm.createdAt);
              const commDateStr = formatDate(commDate);
              return commDateStr === todayStr;
            });
            todayEarnings += todayCommissions.reduce(
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
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
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
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate("Notifications")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="notifications-none"
                size={26}
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
            </TouchableOpacity>
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
                  size={18}
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
                  size={18}
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
                  size={18}
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Quick Actions
          </Text>

          <View style={styles.quickActionsGrid}>
            {/* Clocked In Card - Click to go to Attendance */}
            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate("Attendance")}
              activeOpacity={0.7}
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
                    size={24}
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
            </TouchableOpacity>

            {/* Commissions Card */}
            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate("Commissions")}
              activeOpacity={0.7}
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
                    size={24}
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
            </TouchableOpacity>

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
                    size={24}
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
                    size={24}
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
            <TouchableOpacity
              onPress={() => navigation.navigate("MySchedule")}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={[styles.emptyCard, dynamicStyles.card]}>
              <MaterialIcons
                name="event-available"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No appointments scheduled for today
              </Text>
            </View>
          ) : (
            schedule.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.scheduleCard, dynamicStyles.card]}
                onPress={() =>
                  navigation.navigate("AppointmentDetail", {
                    appointmentId: item.id,
                  })
                }
                activeOpacity={0.7}
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
                      size={24}
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
                          size={14}
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
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    paddingBottom: theme.spacing.xl,
  },

  // Header
  header: {
    paddingTop: (StatusBar.currentHeight || 0) + theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 90,
    height: 32,
  },
  notificationButton: {
    position: "relative",
    padding: theme.spacing.xs,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },

  // Profile Section
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontFamily: theme.fonts.regular,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs,
    position: "absolute",
    bottom: -30,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Section
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickActionCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  quickActionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  quickActionValue: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  onTimeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  activeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },

  // Schedule Card
  scheduleCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  scheduleCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  customerName: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  scheduleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },

  // Empty State
  emptyCard: {
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
});
