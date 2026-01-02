import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useAuth } from "../../context";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
import {
  staffService,
  ClockStatus,
  TodayStats,
  ScheduleItem,
} from "../../services/staff";
import { appointmentsService, Appointment } from "../../services/appointments";
import { attendanceService, AttendanceType } from "../../services/attendance";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatLargeNumber } from "../../utils/formatting";
import { EmployeePermissionGate } from "../../components/permissions/EmployeePermissionGate";
import { EmployeePermission } from "../../constants/employeePermissions";
import { useEmployeePermissionCheck } from "../../hooks/useEmployeePermissionCheck";

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
  const [salonId, setSalonId] = useState<string | undefined>(undefined);
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);

  // Load salon and employee IDs for permission checks
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (user?.id && employeeRecords.length > 0) {
        const firstEmployee = employeeRecords[0];
        if (firstEmployee?.salonId) {
          setSalonId(firstEmployee.salonId);
        }
        if (firstEmployee?.id) {
          setEmployeeId(firstEmployee.id);
        }
      }
    };
    loadEmployeeData();
  }, [user?.id, employeeRecords]);

  useEmployeePermissionCheck({
    salonId,
    employeeId,
    autoFetch: true,
  });

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

    // Add timeout to prevent infinite loading (reduced to 10 seconds)
    const timeoutId = setTimeout(() => {
      console.warn('Dashboard loading timeout - forcing completion');
      setLoading(false);
    }, 6000); // 6 second timeout for faster UX

    try {
      setLoading(true);

      // Get all employee records for this user
      let employeeRecordsList: any[] = [];
      try {
        // Add timeout for employee records fetch (3 seconds)
        const employeePromise = staffService.getEmployeeByUserId(String(user.id));
        const employeeTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Employee fetch timeout')), 3000)
        );
        
        const employeeRecord = await Promise.race([employeePromise, employeeTimeout]) as any;
        if (Array.isArray(employeeRecord)) {
          employeeRecordsList = employeeRecord;
        } else if (employeeRecord) {
          employeeRecordsList = [employeeRecord];
        }
      } catch (error) {
        console.error("Error fetching employee records:", error);
        // Continue with empty records - don't block
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

        // Get current attendance status (if clocked in) - with timeout for faster loading
        try {
          const attendancePromise = staffService.getCurrentAttendance(employeeId);
          const attendanceTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Attendance fetch timeout')), 2000)
          );
          
          currentAttendance = await Promise.race([attendancePromise, attendanceTimeout]).catch(() => null) as any;

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
              // Add timeout for attendance history (2 seconds)
              const logsPromise = attendanceService.getAttendanceHistory(
                employeeId,
                dayStart.toISOString(),
                dayEnd.toISOString()
              );
              const logsTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Attendance logs timeout')), 2000)
              );
              
              const todayLogs = await Promise.race([logsPromise, logsTimeout]) as any[];

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
      // Reduced timeout to 4 seconds for faster loading
      try {
        const appointmentsPromise = appointmentsService.getSalonAppointments({
          myAppointments: true,
        });
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Appointments fetch timeout')), 3000)
        );
        
        try {
          allAppointments = await Promise.race([appointmentsPromise, timeoutPromise]) as Appointment[];
        } catch {
          // Timeout or error - continue with empty appointments
          console.warn('Appointments fetch timed out or failed, continuing with empty appointments');
          allAppointments = [];
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        // Continue with empty appointments - don't block the dashboard
        allAppointments = [];
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
      // Calculate directly from completed appointments to ensure accuracy
      let todayEarnings = 0;
      try {
        // Create a map of employee IDs to commission rates for quick lookup
        const employeeCommissionMap = new Map<string, number>();
        employeeRecordsList.forEach((emp) => {
          const commissionRate = Number(emp.commissionRate) || 0;
          employeeCommissionMap.set(emp.id, commissionRate);
        });

        // Calculate commissions from today's completed appointments
        for (const apt of completedAppointments) {
          // Get the employee ID assigned to this appointment
          const employeeId = apt.salonEmployeeId;
          if (!employeeId) continue;

          // Get the commission rate for this employee
          const commissionRate = employeeCommissionMap.get(employeeId) || 0;
          if (commissionRate === 0) continue;

          // Get the service amount (from appointment or service)
          const serviceAmount =
            Number(apt.serviceAmount) ||
            Number(apt.service?.basePrice) ||
            0;
          if (serviceAmount === 0) continue;

          // Calculate commission: (serviceAmount * commissionRate) / 100
          const commission = (serviceAmount * commissionRate) / 100;
          todayEarnings += commission;
        }

        // Skip sales commissions API call for faster loading
        // Earnings from appointments is sufficient for dashboard display
        // Sales commissions can be calculated separately if needed
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
      
      // Stop loading early once we have the essential data
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      // Don't show alert for every error - some are expected (like no appointments)
      if (error.message && !error.message.includes('404') && !error.message.includes('not found') && !error.message.includes('timeout')) {
        // Only show critical errors, not timeouts
        console.warn("Dashboard loading error (non-critical):", error.message);
      }
    } finally {
      clearTimeout(timeoutId);
      // Ensure loading is always set to false
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
        <Loader fullscreen message="Loading dashboard..." />
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
                  size={24}
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
                  size={24}
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
                  size={24}
                  color={isDark ? theme.colors.warning : "#FF9800"}
                />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {formatLargeNumber(todayStats?.earnings || 0)}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                COMMISSIONS
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

            {/* Wallet Card - Replaced Goal Setting */}
            <Pressable
              style={({ pressed }) => [
                styles.quickActionCard,
                dynamicStyles.card,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Wallet")}
            >
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
                    name="account-balance-wallet"
                    size={theme.sizes.icon.md}
                    color={isDark ? theme.colors.warning : "#FF9800"}
                  />
                </View>
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Wallet
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                View Balance
              </Text>
            </Pressable>

            {/* Create Appointment Card - Permission Based */}
            <EmployeePermissionGate
              requiredPermission={EmployeePermission.MANAGE_APPOINTMENTS}
              salonId={salonId}
              employeeId={employeeId}
              fallback={
                <Pressable
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    dynamicStyles.card,
                    { opacity: 0.5 },
                    pressed && { opacity: 0.3 },
                  ]}
                  disabled={true}
                >
                  <View style={styles.quickActionHeader}>
                    <View
                      style={[
                        styles.quickActionIcon,
                        {
                          backgroundColor: isDark
                            ? `${theme.colors.gray700}20`
                            : theme.colors.gray200,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="event"
                        size={theme.sizes.icon.md}
                        color={isDark ? theme.colors.gray500 : theme.colors.gray400}
                      />
                    </View>
                    <MaterialIcons
                      name="lock"
                      size={16}
                      color={isDark ? theme.colors.gray500 : theme.colors.gray400}
                    />
                  </View>
                  <Text
                    style={[styles.quickActionLabel, dynamicStyles.textSecondary, { opacity: 0.6 }]}
                  >
                    Create Appointment
                  </Text>
                  <Text style={[styles.quickActionValue, dynamicStyles.text, { fontSize: 11, opacity: 0.6 }]}>
                    Permission Required
                  </Text>
                </Pressable>
              }
            >
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionCard,
                  dynamicStyles.card,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("CreateAppointment")}
              >
                <View style={styles.quickActionHeader}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      {
                        backgroundColor: isDark
                          ? `${theme.colors.secondary}20`
                          : `${theme.colors.secondary}15`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="event"
                      size={theme.sizes.icon.md}
                      color={theme.colors.secondary}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
                >
                  Create Appointment
                </Text>
                <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                  New Booking
                </Text>
              </Pressable>
            </EmployeePermissionGate>

            {/* View All Appointments Card - Permission Based */}
            <EmployeePermissionGate
              requiredPermission={EmployeePermission.VIEW_ALL_APPOINTMENTS}
              salonId={salonId}
              employeeId={employeeId}
              fallback={null}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionCard,
                  dynamicStyles.card,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("Appointments")}
              >
                <View style={styles.quickActionHeader}>
                  <View
                    style={[
                      styles.quickActionIcon,
                      {
                        backgroundColor: isDark
                          ? `${theme.colors.info}20`
                          : "#E3F2FD",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="list"
                      size={theme.sizes.icon.md}
                      color={isDark ? theme.colors.info : "#2196F3"}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
                >
                  All Appointments
                </Text>
                <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                  View All
                </Text>
              </Pressable>
            </EmployeePermissionGate>

            {/* Sales Card - Permission Based */}
            <EmployeePermissionGate
              requiredPermission={EmployeePermission.PROCESS_PAYMENTS}
              salonId={salonId}
              employeeId={employeeId}
              fallback={null}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionCard,
                  dynamicStyles.card,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("Sales")}
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
                      name="point-of-sale"
                      size={theme.sizes.icon.md}
                      color={isDark ? theme.colors.success : "#4CAF50"}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
                >
                  New Sale
                </Text>
                <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                  Process Payment
                </Text>
              </Pressable>
            </EmployeePermissionGate>

            {/* Customers Card - Permission Based */}
            <EmployeePermissionGate
              requiredPermission={EmployeePermission.MANAGE_CUSTOMERS}
              salonId={salonId}
              employeeId={employeeId}
              fallback={null}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionCard,
                  dynamicStyles.card,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("CustomerManagement")}
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
                      name="people"
                      size={theme.sizes.icon.md}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
                >
                  Customers
                </Text>
                <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                  Manage
                </Text>
              </Pressable>
            </EmployeePermissionGate>

            {/* Explore Card */}
            <Pressable
              style={({ pressed }) => [
                styles.quickActionCard,
                dynamicStyles.card,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate("Explore")}
            >
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: isDark
                        ? `${theme.colors.info}20`
                        : "#E3F2FD",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="explore"
                    size={theme.sizes.icon.md}
                    color={isDark ? theme.colors.info : "#2196F3"}
                  />
                </View>
              </View>
              <Text
                style={[styles.quickActionLabel, dynamicStyles.textSecondary]}
              >
                Explore
              </Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                Browse Salons
              </Text>
            </Pressable>
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
                size={56}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, { color: dynamicStyles.textSecondary.color }]}>
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
                          size={14}
                          color={dynamicStyles.textSecondary.color}
                        />
                        <Text
                          style={[styles.timeText, { color: dynamicStyles.textSecondary.color }]}
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
    paddingBottom: theme.componentSpacing.screenPaddingLarge + 50,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: theme.fontFamilies.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  profileRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "500",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs,
    position: "absolute",
    bottom: -70,
    left: theme.componentSpacing.screenPadding,
    right: theme.componentSpacing.screenPadding,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: theme.spacing.xs,
    alignItems: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fontFamilies.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    textAlign: "center",
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 14,
  },

  // Section
  section: {
    paddingHorizontal: theme.componentSpacing.screenPadding,
    marginTop: theme.componentSpacing.sectionGap,
  },
  // First section after header needs extra top margin for stats cards
  firstSection: {
    paddingHorizontal: theme.componentSpacing.screenPadding,
    marginTop: theme.componentSpacing.sectionGap + 50, // Extra space for stats cards
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fontFamilies.bold,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "600",
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
    padding: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    minHeight: 120,
  },
  quickActionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "500",
    marginBottom: 4,
    marginTop: 8,
  },
  quickActionValue: {
    fontSize: 15,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "600",
  },
  onTimeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  onTimeBadgeText: {
    fontSize: 11,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Schedule Card
  scheduleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    minHeight: 100,
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
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fontFamilies.bold,
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: theme.fontFamilies.semibold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 14,
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "500",
    marginBottom: 8,
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
    fontSize: 13,
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "500",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fontFamilies.bold,
    letterSpacing: -0.3,
  },

  // Empty State
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    minHeight: 200,
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    fontFamily: theme.fontFamilies.medium,
    fontWeight: "500",
    lineHeight: 22,
  },
  bottomSpacing: {
    height: theme.componentSpacing.screenPaddingLarge * 2,
  },
});
