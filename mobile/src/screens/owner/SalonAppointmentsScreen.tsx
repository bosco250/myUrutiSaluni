import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  appointmentsService,
  Appointment,
  AppointmentStatus,
} from "../../services/appointments";
import { api } from "../../services/api";
import { salonService } from "../../services/salon";
import { Loader } from "../../components/common";
import { getPreviousWeek, getNextWeek } from "../../utils/dateHelpers";
import { useEmployeePermissionCheck } from "../../hooks/useEmployeePermissionCheck";
import { EmployeePermission } from "../../constants/employeePermissions";
import { SalonRequirementGuard } from '../../components/SalonRequirementGuard';


interface SalonAppointmentsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type StatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

interface GroupedAppointments {
  date: string;
  dateLabel: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  appointments: Appointment[];
}

export default function SalonAppointmentsScreen({
  navigation,
}: SalonAppointmentsScreenProps) {
  const { isDark } = useTheme();
  const { checkPermission, isOwner, isAdmin } = useEmployeePermissionCheck();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reassignLoading, setReassignLoading] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // Check permissions
  const canManageAppointments =
    isOwner ||
    isAdmin ||
    checkPermission(EmployeePermission.MANAGE_APPOINTMENTS);
  const canModifyStatus =
    isOwner ||
    isAdmin ||
    checkPermission(EmployeePermission.MODIFY_APPOINTMENT_STATUS);
  const canAssignAppointments =
    isOwner ||
    isAdmin ||
    checkPermission(EmployeePermission.ASSIGN_APPOINTMENTS);

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
    modal: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
    },
    input: {
      backgroundColor: isDark
        ? theme.colors.gray700
        : theme.colors.backgroundSecondary,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray600 : theme.colors.border,
    },
  };

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const [appointmentsData, employeesData] = await Promise.all([
        appointmentsService.getSalonAppointments(),
        salonService.getEmployees("").catch(() => []),
      ]);
      setAppointments(appointmentsData);
      setEmployees(employeesData);
    } catch (error: any) {
      console.error("[SalonAppointments] Error loading:", error);
      Alert.alert("Error", error?.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Format date helper
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date label
  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const tomorrowOnly = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (dateOnly.getTime() === todayOnly.getTime()) return "Today";
    if (dateOnly.getTime() === tomorrowOnly.getTime()) return "Tomorrow";
    if (dateOnly.getTime() === yesterdayOnly.getTime()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // Group appointments by date
  const groupedAppointments = useMemo((): GroupedAppointments[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter by status
    let filtered = appointments;
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => {
        switch (statusFilter) {
          case "pending":
            return (
              apt.status === AppointmentStatus.PENDING ||
              apt.status === AppointmentStatus.BOOKED
            );
          case "confirmed":
            return apt.status === AppointmentStatus.CONFIRMED;
          case "in_progress":
            return apt.status === AppointmentStatus.IN_PROGRESS;
          case "completed":
            return apt.status === AppointmentStatus.COMPLETED;
          case "cancelled":
            return (
              apt.status === AppointmentStatus.CANCELLED ||
              apt.status === AppointmentStatus.NO_SHOW
            );
          default:
            return true;
        }
      });
    }

    // Filter by selected date if a date is selected
    if (selectedDate) {
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.scheduledStart);
        return (
          aptDate.getFullYear() === selectedYear &&
          aptDate.getMonth() === selectedMonth &&
          aptDate.getDate() === selectedDay
        );
      });
    }

    // Group by date
    const grouped: Record<string, Appointment[]> = {};
    filtered.forEach((apt) => {
      const aptDate = new Date(apt.scheduledStart);
      const dateKey = formatDate(aptDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });

    // Convert to array and sort
    const todayStr = formatDate(today);
    return Object.keys(grouped)
      .sort((a, b) => {
        // Today first, then chronological
        if (a === todayStr) return -1;
        if (b === todayStr) return 1;
        return new Date(a).getTime() - new Date(b).getTime(); // Chronological order
      })
      .map((dateKey) => {
        const date = new Date(dateKey);
        const dateOnly = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        const todayOnly = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

        return {
          date: dateKey,
          dateLabel: getDateLabel(dateKey),
          dayNumber: date.getDate(),
          monthName: date.toLocaleDateString("en-US", { month: "short" }),
          isToday: dateOnly.getTime() === todayOnly.getTime(),
          isPast: dateOnly < todayOnly,
          appointments: grouped[dateKey].sort(
            (a, b) =>
              new Date(a.scheduledStart).getTime() -
              new Date(b.scheduledStart).getTime()
          ),
        };
      });
  }, [appointments, selectedDate, statusFilter]);

  // Week calendar helpers
  const getWeekDays = (centerDate: Date): Date[] => {
    const days: Date[] = [];
    const startOfWeek = new Date(centerDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Get Sunday of this week
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateKey = formatDate(date);
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledStart);
      return formatDate(aptDate) === dateKey;
    }).length;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  // Stats (unused but kept for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return {
      total: appointments.length,
      today: appointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledStart);
        return aptDate >= todayStart && aptDate < todayEnd;
      }).length,
      pending: appointments.filter(
        (apt) =>
          apt.status === AppointmentStatus.PENDING ||
          apt.status === AppointmentStatus.BOOKED
      ).length,
      active: appointments.filter(
        (apt) => apt.status === AppointmentStatus.IN_PROGRESS
      ).length,
    };
  }, [appointments]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    if (actionLoading) return; // Prevent double clicks

    try {
      setActionLoading(true);
      await appointmentsService.updateAppointment(appointmentId, {
        status: newStatus,
      });

      // Get user-friendly status label
      const statusLabel = getStatusLabel(newStatus);
      Alert.alert(
        "Success",
        `Appointment ${statusLabel.toLowerCase()} successfully`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowActionModal(false);
              loadAppointments();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("[SalonAppointments] Update status error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update appointment. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async (employeeId: string) => {
    if (!selectedAppointment || reassignLoading) return;

    try {
      setReassignLoading(employeeId);

      // Use updateAppointment with salonEmployeeId instead of separate assign endpoint
      await appointmentsService.updateAppointment(selectedAppointment.id, {
        salonEmployeeId: employeeId,
      });

      Alert.alert("Success", "Appointment reassigned successfully", [
        {
          text: "OK",
          onPress: () => {
            setShowReassignModal(false);
            setSelectedAppointment(null);
            loadAppointments();
          },
        },
      ]);
    } catch (error: any) {
      console.error("[SalonAppointments] Reassign error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reassign appointment. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setReassignLoading(null);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedAppointment || actionLoading) return;

    try {
      setActionLoading(true);

      // Send reminder via notification endpoint
      await api.post(`/appointments/${selectedAppointment.id}/remind`, {});

      Alert.alert(
        "Reminder Sent",
        "Appointment reminder has been sent to the customer",
        [
          {
            text: "OK",
            onPress: () => {
              setShowActionModal(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("[SalonAppointments] Send reminder error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send reminder. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNotes = async () => {
    if (!selectedAppointment || notesLoading) return;

    try {
      setNotesLoading(true);
      await appointmentsService.updateAppointment(selectedAppointment.id, {
        notes: notes.trim(),
      });

      Alert.alert("Success", "Notes saved successfully", [
        {
          text: "OK",
          onPress: () => {
            setShowNotesModal(false);
            setNotes("");
            setSelectedAppointment(null);
            loadAppointments();
          },
        },
      ]);
    } catch (error: any) {
      console.error("[SalonAppointments] Save notes error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save notes. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setNotesLoading(false);
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    return appointmentsService.getStatusColor(status);
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      booked: "Booked",
      confirmed: "Confirmed",
      in_progress: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No Show",
    };
    return labels[status] || status;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const openActionModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowActionModal(true);
  };

  const openReassignModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowActionModal(false);
    setShowReassignModal(true);
  };

  const openNotesModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNotes(appointment.notes || "");
    setShowActionModal(false);
    setShowNotesModal(true);
  };

  // Render week calendar
  const renderCalendar = () => {
    const weekDays = getWeekDays(currentWeek);

    return (
      <View style={[styles.calendarContainer, dynamicStyles.card]}>
        {/* Week Days with Navigation */}
        <View style={styles.weekDaysContainer}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => setCurrentWeek(getPreviousWeek(currentWeek))}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="chevron-left"
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          {weekDays.map((date, index) => {
            const count = getAppointmentsForDate(date);
            const dateIsToday = isToday(date);
            const dateIsSelected = isSelected(date);
            const isPastDate =
              new Date(date.getFullYear(), date.getMonth(), date.getDate()) <
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate()
              );

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDay,
                  dateIsSelected && styles.weekDaySelected,
                  dateIsToday && !dateIsSelected && styles.weekDayToday,
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.weekDayName,
                    dynamicStyles.textSecondary,
                    dateIsSelected && styles.weekDayNameSelected,
                    dateIsToday && !dateIsSelected && styles.weekDayNameToday,
                  ]}
                >
                  {getDayName(date)}
                </Text>
                <Text
                  style={[
                    styles.weekDayNumber,
                    dynamicStyles.text,
                    dateIsSelected && styles.weekDayNumberSelected,
                    isPastDate && styles.weekDayNumberPast,
                    dateIsToday && !dateIsSelected && styles.weekDayNumberToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.weekAppointmentDot,
                      dateIsSelected && styles.weekAppointmentDotSelected,
                      count > 1 && styles.weekAppointmentDotWithCount,
                    ]}
                  >
                    {count > 1 && (
                      <Text
                        style={[
                          styles.weekAppointmentDotText,
                          dateIsSelected &&
                            styles.weekAppointmentDotTextSelected,
                        ]}
                      >
                        {count > 9 ? "9+" : count}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => setCurrentWeek(getNextWeek(currentWeek))}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Clear Selection */}
        {selectedDate && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => setSelectedDate(null)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="clear"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[
                styles.clearDateButtonText,
                { color: theme.colors.primary },
              ]}
            >
              Clear Date Filter
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Memoized appointment card component for performance
  const AppointmentCard = React.memo(
    function AppointmentCard({ item }: { item: Appointment }) {
      const isPending =
        item.status === AppointmentStatus.PENDING ||
        item.status === AppointmentStatus.BOOKED;
      const isConfirmed = item.status === AppointmentStatus.CONFIRMED;
      const isInProgress = item.status === AppointmentStatus.IN_PROGRESS;
      const canTakeAction = isPending || isConfirmed || isInProgress;
      const statusColor = getStatusColor(item.status);

      return (
        <TouchableOpacity
          style={[styles.appointmentCard, dynamicStyles.card]}
          onPress={() => openActionModal(item)}
          activeOpacity={0.7}
        >
          {/* Status indicator bar */}
          <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

          <View style={styles.cardContent}>
            {/* Header Row: Time | Info | Status */}
            <View style={styles.cardHeader}>
              {/* Time Column - Compact */}
              <View
                style={[
                  styles.timeColumn,
                  { backgroundColor: statusColor + "15" },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={14}
                  color={statusColor}
                  style={{ marginBottom: 1 }}
                />
                <Text style={[styles.timeText, { color: statusColor }]}>
                  {formatTime(item.scheduledStart)}
                </Text>
                <Text
                  style={[styles.durationText, dynamicStyles.textSecondary]}
                >
                  {formatTime(item.scheduledEnd)}
                </Text>
              </View>

              {/* Info Column - Compact */}
              <View style={styles.cardInfo}>
                <View style={styles.customerRow}>
                  <View
                    style={[
                      styles.avatarSmall,
                      { backgroundColor: theme.colors.primary + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={12}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.customerName, dynamicStyles.text]}
                    numberOfLines={1}
                  >
                    {item.customer?.user?.fullName || "Walk-in"}
                  </Text>
                </View>
                <View style={styles.serviceRow}>
                  <MaterialIcons
                    name="content-cut"
                    size={12}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text
                    style={[styles.serviceText, dynamicStyles.textSecondary]}
                    numberOfLines={1}
                  >
                    {item.service?.name || "Service"}
                  </Text>
                </View>
                {item.salonEmployee?.user?.fullName && (
                  <View style={styles.staffRow}>
                    <MaterialIcons
                      name="person-outline"
                      size={11}
                      color={theme.colors.secondary}
                    />
                    <Text
                      style={[
                        styles.staffText,
                        { color: theme.colors.secondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.salonEmployee.user.fullName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Status Badge - Compact */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            {/* Price Row - Compact */}
            {item.serviceAmount !== undefined && item.serviceAmount > 0 && (
              <View style={styles.priceRow}>
                <MaterialIcons
                  name="attach-money"
                  size={12}
                  color={theme.colors.primary}
                />
                <Text style={[styles.priceText, dynamicStyles.text]}>
                  {item.serviceAmount.toLocaleString()} RWF
                </Text>
              </View>
            )}

            {/* Quick Actions - Modern Design */}
            {canTakeAction && !actionLoading && (
              <View style={styles.quickActions}>
                {isPending && (
                  <TouchableOpacity
                    style={[
                      styles.quickBtn,
                      styles.quickBtnPrimary,
                      { backgroundColor: theme.colors.success },
                    ]}
                    onPress={() =>
                      handleUpdateStatus(item.id, AppointmentStatus.CONFIRMED)
                    }
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={14}
                      color={theme.colors.white}
                    />
                    <Text style={styles.quickBtnText}>Confirm</Text>
                  </TouchableOpacity>
                )}
                {isConfirmed && (
                  <TouchableOpacity
                    style={[
                      styles.quickBtn,
                      styles.quickBtnPrimary,
                      { backgroundColor: theme.colors.secondary },
                    ]}
                    onPress={() =>
                      handleUpdateStatus(item.id, AppointmentStatus.IN_PROGRESS)
                    }
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="play-circle-filled"
                      size={14}
                      color={theme.colors.white}
                    />
                    <Text style={styles.quickBtnText}>Start</Text>
                  </TouchableOpacity>
                )}
                {isInProgress && (
                  <TouchableOpacity
                    style={[
                      styles.quickBtn,
                      styles.quickBtnPrimary,
                      { backgroundColor: theme.colors.info },
                    ]}
                    onPress={() =>
                      handleUpdateStatus(item.id, AppointmentStatus.COMPLETED)
                    }
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="done-all"
                      size={14}
                      color={theme.colors.white}
                    />
                    <Text style={styles.quickBtnText}>Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison for memoization
      return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.item.scheduledStart === nextProps.item.scheduledStart
      );
    }
  );

  // Flatten appointments for FlatList with date headers
  const flatAppointmentsList = useMemo(() => {
    const flatList: { type: "header" | "appointment"; data: any }[] = [];
    groupedAppointments.forEach((group) => {
      // Add date header
      flatList.push({
        type: "header",
        data: group,
      });
      // Add appointments
      group.appointments.forEach((apt) => {
        flatList.push({
          type: "appointment",
          data: apt,
        });
      });
    });
    return flatList;
  }, [groupedAppointments]);

  // Render date header
  const renderDateHeader = useCallback(
    (group: GroupedAppointments) => (
      <View style={styles.dateSection}>
        <View style={styles.dateHeader}>
          <View style={styles.dateHeaderLeft}>
            {group.isToday && (
              <View
                style={[
                  styles.todayIndicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            )}
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, dynamicStyles.text]}>
                {group.dateLabel}
              </Text>
              <Text style={[styles.dateSubLabel, dynamicStyles.textSecondary]}>
                {group.monthName} {group.dayNumber}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.appointmentCountBadge,
              { backgroundColor: theme.colors.primary + "20" },
            ]}
          >
            <Text
              style={[styles.appointmentCount, { color: theme.colors.primary }]}
            >
              {group.appointments.length}
            </Text>
          </View>
        </View>
      </View>
    ),
    [dynamicStyles.text, dynamicStyles.textSecondary]
  );

  // Render list item (header or appointment)
  const renderListItem = useCallback(
    ({ item }: { item: { type: "header" | "appointment"; data: any } }) => {
      if (item.type === "header") {
        return renderDateHeader(item.data);
      }
      return <AppointmentCard item={item.data} />;
    },
    [AppointmentCard, renderDateHeader]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback(
    (item: { type: "header" | "appointment"; data: any }, index: number) => {
      if (item.type === "header") {
        return `header-${item.data.date}`;
      }
      return `appointment-${item.data.id}`;
    },
    []
  );

  // Render action modal with modern UI/UX
  const renderActionModal = () => {
    if (!selectedAppointment) return null;

    const isPending =
      selectedAppointment.status === AppointmentStatus.PENDING ||
      selectedAppointment.status === AppointmentStatus.BOOKED;
    const isConfirmed =
      selectedAppointment.status === AppointmentStatus.CONFIRMED;
    const isInProgress =
      selectedAppointment.status === AppointmentStatus.IN_PROGRESS;
    const isCompleted =
      selectedAppointment.status === AppointmentStatus.COMPLETED;
    const isCancelled =
      selectedAppointment.status === AppointmentStatus.CANCELLED ||
      selectedAppointment.status === AppointmentStatus.NO_SHOW;

    const statusColor = getStatusColor(selectedAppointment.status);
    const primaryActions: any[] = [];
    const secondaryActions: any[] = [];
    const destructiveActions: any[] = [];

    // Primary actions (status progression) - Check permissions
    if (isPending && canModifyStatus) {
      primaryActions.push({
        label: "Confirm Appointment",
        icon: "check-circle",
        color: theme.colors.success,
        onPress: () => {
          if (!actionLoading) {
            handleUpdateStatus(
              selectedAppointment.id,
              AppointmentStatus.CONFIRMED
            );
          }
        },
      });
    }
    if (isConfirmed && canModifyStatus) {
      primaryActions.push({
        label: "Start Service",
        icon: "play-circle-filled",
        color: theme.colors.secondary,
        onPress: () =>
          handleUpdateStatus(
            selectedAppointment.id,
            AppointmentStatus.IN_PROGRESS
          ),
      });
    }
    if (isInProgress && canModifyStatus) {
      primaryActions.push({
        label: "Mark Complete",
        icon: "done-all",
        color: theme.colors.info,
        onPress: () =>
          handleUpdateStatus(
            selectedAppointment.id,
            AppointmentStatus.COMPLETED
          ),
      });
    }

    // Secondary actions
    secondaryActions.push({
      label: "View Details",
      icon: "visibility",
      color: theme.colors.info,
      onPress: () => {
        setShowActionModal(false);
        navigation.navigate("AppointmentDetail", {
          appointmentId: selectedAppointment.id,
        });
      },
    });

    if (!isCompleted && !isCancelled) {
      if (canAssignAppointments) {
        secondaryActions.push({
          label: "Reassign Staff",
          icon: "swap-horiz",
          color: theme.colors.warning,
          onPress: () => openReassignModal(selectedAppointment),
        });
      }
      if (canManageAppointments) {
        secondaryActions.push({
          label: "Add/Edit Notes",
          icon: "note-add",
          color: theme.colors.secondary,
          onPress: () => openNotesModal(selectedAppointment),
        });
      }

      // Only show reminder for future appointments that are booked/confirmed
      const appointmentDate = new Date(selectedAppointment.scheduledStart);
      const now = new Date();
      const isFutureAppointment = appointmentDate > now;

      if (isFutureAppointment && (isPending || isConfirmed)) {
        secondaryActions.push({
          label: "Send Reminder",
          icon: "notifications-active",
          color: theme.colors.info,
          onPress: () => {
            Alert.alert(
              "Send Reminder",
              "Send a reminder notification to the customer about this appointment?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Send",
                  onPress: () => handleSendReminder(),
                },
              ]
            );
          },
        });
      }
    }

    // Destructive actions - Check permissions
    if (!isCompleted && !isCancelled && canModifyStatus) {
      destructiveActions.push({
        label: "Mark No Show",
        icon: "person-off",
        color: theme.colors.warning,
        onPress: () => {
          Alert.alert("Mark as No Show", "Customer didn't show up?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Yes, No Show",
              onPress: () =>
                handleUpdateStatus(
                  selectedAppointment.id,
                  AppointmentStatus.NO_SHOW
                ),
            },
          ]);
        },
      });
      destructiveActions.push({
        label: "Cancel Appointment",
        icon: "cancel",
        color: theme.colors.error,
        onPress: () => {
          Alert.alert("Cancel Appointment", "Are you sure?", [
            { text: "No", style: "cancel" },
            {
              text: "Yes, Cancel",
              style: "destructive",
              onPress: () =>
                handleUpdateStatus(
                  selectedAppointment.id,
                  AppointmentStatus.CANCELLED
                ),
            },
          ]);
        },
      });
    }

    return (
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalContent, dynamicStyles.modal]}>
              {/* Handle Bar */}
              <View style={styles.modalHandleBar}>
                <View
                  style={[
                    styles.modalHandle,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray600
                        : theme.colors.gray400,
                    },
                  ]}
                />
              </View>

              {/* Modal Header with Title */}
              <View style={styles.actionModalHeader}>
                <Text style={[styles.actionModalTitle, dynamicStyles.text]}>
                  Appointment Actions
                </Text>
                <TouchableOpacity
                  onPress={() => setShowActionModal(false)}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray700
                        : theme.colors.backgroundSecondary,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              </View>

              {/* Appointment Summary Card - Redesigned */}
              <View
                style={[
                  styles.appointmentSummaryCard,
                  {
                    backgroundColor: isDark
                      ? theme.colors.gray800
                      : theme.colors.white,
                    borderColor: isDark
                      ? theme.colors.gray700
                      : theme.colors.borderLight,
                    shadowColor: statusColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 3,
                  },
                ]}
              >
                {/* Status Bar */}
                <View
                  style={[
                    styles.summaryStatusBar,
                    { backgroundColor: statusColor },
                  ]}
                />

                {/* Customer & Status */}
                <View style={styles.summaryCardHeader}>
                  <View style={styles.customerSection}>
                    <View
                      style={[
                        styles.customerAvatar,
                        { backgroundColor: statusColor + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="person"
                        size={20}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text
                        style={[styles.customerNameLarge, dynamicStyles.text]}
                      >
                        {selectedAppointment.customer?.user?.fullName ||
                          "Walk-in Customer"}
                      </Text>
                      <View
                        style={[
                          styles.statusBadgeInline,
                          {
                            backgroundColor: statusColor + "15",
                            borderWidth: 1,
                            borderColor: statusColor + "30",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDotSmall,
                            { backgroundColor: statusColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusTextInline,
                            { color: statusColor },
                          ]}
                        >
                          {getStatusLabel(selectedAppointment.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Appointment Details Grid */}
                <View style={styles.detailsGrid}>
                  {/* Time */}
                  <View
                    style={[
                      styles.detailGridItem,
                      {
                        backgroundColor: isDark
                          ? theme.colors.gray700 + "50"
                          : theme.colors.primary + "08",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.gridIconContainer,
                        { backgroundColor: theme.colors.primary + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="schedule"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.gridTextContainer}>
                      <Text
                        style={[styles.gridLabel, dynamicStyles.textSecondary]}
                      >
                        Time
                      </Text>
                      <Text style={[styles.gridValue, dynamicStyles.text]}>
                        {formatTime(selectedAppointment.scheduledStart)}
                      </Text>
                      <Text
                        style={[
                          styles.gridSubValue,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        to {formatTime(selectedAppointment.scheduledEnd)}
                      </Text>
                    </View>
                  </View>

                  {/* Service */}
                  {selectedAppointment.service?.name && (
                    <View
                      style={[
                        styles.detailGridItem,
                        {
                          backgroundColor: isDark
                            ? theme.colors.gray700 + "50"
                            : theme.colors.secondary + "08",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.gridIconContainer,
                          { backgroundColor: theme.colors.secondary + "20" },
                        ]}
                      >
                        <MaterialIcons
                          name="content-cut"
                          size={16}
                          color={theme.colors.secondary}
                        />
                      </View>
                      <View style={styles.gridTextContainer}>
                        <Text
                          style={[
                            styles.gridLabel,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          Service
                        </Text>
                        <Text
                          style={[styles.gridValue, dynamicStyles.text]}
                          numberOfLines={1}
                        >
                          {selectedAppointment.service.name}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Staff & Price Row */}
                <View style={styles.bottomInfoRow}>
                  {selectedAppointment.salonEmployee?.user?.fullName && (
                    <View style={styles.staffInfo}>
                      <MaterialIcons
                        name="person-outline"
                        size={14}
                        color={dynamicStyles.textSecondary.color}
                      />
                      <Text
                        style={[styles.staffName, dynamicStyles.textSecondary]}
                      >
                        {selectedAppointment.salonEmployee.user.fullName}
                      </Text>
                    </View>
                  )}
                  {selectedAppointment.serviceAmount !== undefined &&
                    selectedAppointment.serviceAmount > 0 && (
                      <View
                        style={[
                          styles.priceTag,
                          { backgroundColor: theme.colors.success + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="payments"
                          size={14}
                          color={theme.colors.success}
                        />
                        <Text
                          style={[
                            styles.priceValue,
                            { color: theme.colors.success },
                          ]}
                        >
                          {selectedAppointment.serviceAmount.toLocaleString()}{" "}
                          RWF
                        </Text>
                      </View>
                    )}
                </View>
              </View>

              <ScrollView
                style={styles.actionsList}
                showsVerticalScrollIndicator={false}
              >
                {actionLoading && (
                  <View style={styles.loadingIndicator}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[styles.loadingText, dynamicStyles.textSecondary]}
                    >
                      Processing...
                    </Text>
                  </View>
                )}

                {/* Primary Actions - Enhanced Design */}
                {primaryActions.length > 0 && (
                  <View style={styles.actionGroup}>
                    <View style={styles.actionGroupHeader}>
                      <View
                        style={[
                          styles.actionGroupIconContainer,
                          { backgroundColor: theme.colors.primary + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="bolt"
                          size={12}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.actionGroupTitle,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        Quick Actions
                      </Text>
                    </View>
                    {primaryActions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionCard,
                          styles.actionCardPrimary,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray800
                              : theme.colors.white,
                            shadowColor: action.color,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 3,
                          },
                          actionLoading && styles.actionCardDisabled,
                        ]}
                        onPress={action.onPress}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.actionCardIcon,
                            styles.actionCardIconLarge,
                            {
                              backgroundColor: action.color + "15",
                              borderWidth: 1,
                              borderColor: action.color + "30",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={action.icon as any}
                            size={26}
                            color={action.color}
                          />
                        </View>
                        <View style={styles.actionCardContent}>
                          <Text
                            style={[styles.actionCardLabel, dynamicStyles.text]}
                          >
                            {action.label}
                          </Text>
                          <Text
                            style={[
                              styles.actionCardHint,
                              dynamicStyles.textSecondary,
                            ]}
                          >
                            Tap to proceed
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.actionChevronContainer,
                            { backgroundColor: action.color + "10" },
                          ]}
                        >
                          <MaterialIcons
                            name="chevron-right"
                            size={22}
                            color={action.color}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Secondary Actions - Enhanced Design */}
                {secondaryActions.length > 0 && (
                  <View style={styles.actionGroup}>
                    <View style={styles.actionGroupHeader}>
                      <View
                        style={[
                          styles.actionGroupIconContainer,
                          { backgroundColor: theme.colors.info + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="tune"
                          size={12}
                          color={theme.colors.info}
                        />
                      </View>
                      <Text
                        style={[
                          styles.actionGroupTitle,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        More Options
                      </Text>
                    </View>
                    {secondaryActions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionCard,
                          styles.actionCardSecondary,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray800 + "50"
                              : theme.colors.gray50,
                          },
                          actionLoading && styles.actionCardDisabled,
                        ]}
                        onPress={action.onPress}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.actionCardIcon,
                            styles.actionCardIconSmall,
                            {
                              backgroundColor: action.color + "15",
                              borderWidth: 1,
                              borderColor: action.color + "20",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={action.icon as any}
                            size={20}
                            color={action.color}
                          />
                        </View>
                        <View style={styles.actionCardContent}>
                          <Text
                            style={[
                              styles.actionCardLabelSecondary,
                              dynamicStyles.text,
                            ]}
                          >
                            {action.label}
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={18}
                          color={dynamicStyles.textSecondary.color}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Destructive Actions - Enhanced Design */}
                {destructiveActions.length > 0 && (
                  <View style={[styles.actionGroup, styles.actionGroupDanger]}>
                    <View style={styles.actionGroupHeader}>
                      <View
                        style={[
                          styles.actionGroupIconContainer,
                          { backgroundColor: theme.colors.error + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="warning"
                          size={12}
                          color={theme.colors.error}
                        />
                      </View>
                      <Text
                        style={[
                          styles.actionGroupTitle,
                          { color: theme.colors.error },
                        ]}
                      >
                        Danger Zone
                      </Text>
                    </View>
                    {destructiveActions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionCard,
                          styles.actionCardDestructive,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray800
                              : theme.colors.white,
                            borderColor: action.color + "30",
                          },
                          actionLoading && styles.actionCardDisabled,
                        ]}
                        onPress={action.onPress}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.actionCardIcon,
                            styles.actionCardIconSmall,
                            {
                              backgroundColor: action.color + "15",
                              borderWidth: 1,
                              borderColor: action.color + "30",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={action.icon as any}
                            size={20}
                            color={action.color}
                          />
                        </View>
                        <View style={styles.actionCardContent}>
                          <Text
                            style={[
                              styles.actionCardLabel,
                              { color: action.color },
                            ]}
                          >
                            {action.label}
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={18}
                          color={action.color + "80"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Render reassign modal
  const renderReassignModal = () => {
    const currentEmployeeId = selectedAppointment?.salonEmployeeId;

    return (
      <Modal
        visible={showReassignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReassignModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReassignModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalContent, dynamicStyles.modal]}>
              <View style={styles.modalHandleBar}>
                <View
                  style={[
                    styles.modalHandle,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray600
                        : theme.colors.gray400,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.modalHeader,
                  {
                    backgroundColor: isDark
                      ? theme.colors.gray800 + "80"
                      : theme.colors.warning + "08",
                  },
                ]}
              >
                <View style={styles.modalHeaderContent}>
                  <View
                    style={[
                      styles.modalHeaderIcon,
                      {
                        backgroundColor: theme.colors.warning + "20",
                        borderWidth: 1,
                        borderColor: theme.colors.warning + "30",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="swap-horiz"
                      size={24}
                      color={theme.colors.warning}
                    />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={[styles.modalTitle, dynamicStyles.text]}>
                      Reassign Appointment
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      Choose a team member
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReassignModal(false)}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray700
                        : theme.colors.white,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.actionsList}
                showsVerticalScrollIndicator={false}
              >
                {employees.length === 0 ? (
                  <View style={styles.emptyEmployeesState}>
                    <View
                      style={[
                        styles.emptyIconContainer,
                        {
                          backgroundColor: theme.colors.textTertiary + "15",
                          borderWidth: 2,
                          borderColor: theme.colors.textTertiary + "30",
                          borderStyle: "dashed",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="person-off"
                        size={48}
                        color={theme.colors.textTertiary}
                      />
                    </View>
                    <Text
                      style={[styles.emptyEmployeesText, dynamicStyles.text]}
                    >
                      No team members available
                    </Text>
                    <Text
                      style={[
                        styles.emptyEmployeesSubtext,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      Add employees to your salon first
                    </Text>
                  </View>
                ) : (
                  employees.map((employee) => {
                    const isLoading = reassignLoading === employee.id;
                    const isCurrentEmployee = employee.id === currentEmployeeId;

                    return (
                      <TouchableOpacity
                        key={employee.id}
                        style={[
                          styles.employeeCard,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray800
                              : theme.colors.white,
                            shadowColor: isCurrentEmployee
                              ? theme.colors.success
                              : theme.colors.black,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isCurrentEmployee ? 0.15 : 0.05,
                            shadowRadius: 4,
                            elevation: isCurrentEmployee ? 3 : 1,
                          },
                          isCurrentEmployee && {
                            borderColor: theme.colors.success + "40",
                            borderWidth: 1.5,
                            backgroundColor: isDark
                              ? theme.colors.success + "10"
                              : theme.colors.success + "05",
                          },
                          isLoading && styles.employeeCardDisabled,
                        ]}
                        onPress={() => handleReassign(employee.id)}
                        disabled={isLoading || !!reassignLoading}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.employeeAvatar,
                            {
                              backgroundColor: isCurrentEmployee
                                ? theme.colors.success + "20"
                                : theme.colors.primary + "20",
                              borderWidth: 2,
                              borderColor: isCurrentEmployee
                                ? theme.colors.success + "40"
                                : theme.colors.primary + "30",
                            },
                          ]}
                        >
                          {isLoading ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.colors.primary}
                            />
                          ) : (
                            <MaterialIcons
                              name="person"
                              size={24}
                              color={
                                isCurrentEmployee
                                  ? theme.colors.success
                                  : theme.colors.primary
                              }
                            />
                          )}
                        </View>
                        <View style={styles.employeeInfo}>
                          <View style={styles.employeeNameRow}>
                            <Text
                              style={[styles.employeeName, dynamicStyles.text]}
                            >
                              {employee.user?.fullName || "Staff Member"}
                            </Text>
                            {isCurrentEmployee && (
                              <View
                                style={[
                                  styles.currentBadge,
                                  {
                                    backgroundColor:
                                      theme.colors.success + "20",
                                    borderWidth: 1,
                                    borderColor: theme.colors.success + "40",
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name="check-circle"
                                  size={10}
                                  color={theme.colors.success}
                                />
                                <Text
                                  style={[
                                    styles.currentBadgeText,
                                    { color: theme.colors.success },
                                  ]}
                                >
                                  Assigned
                                </Text>
                              </View>
                            )}
                          </View>
                          {employee.roleTitle && (
                            <Text
                              style={[
                                styles.employeeRole,
                                dynamicStyles.textSecondary,
                              ]}
                            >
                              {employee.roleTitle}
                            </Text>
                          )}
                        </View>
                        {!isLoading && (
                          <View
                            style={[
                              styles.employeeChevron,
                              {
                                backgroundColor: isCurrentEmployee
                                  ? theme.colors.success + "10"
                                  : theme.colors.gray100,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="chevron-right"
                              size={20}
                              color={
                                isCurrentEmployee
                                  ? theme.colors.success
                                  : dynamicStyles.textSecondary.color
                              }
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Render notes modal
  const renderNotesModal = () => {
    const characterCount = notes.length;
    const maxCharacters = 500;

    return (
      <Modal
        visible={showNotesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotesModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalContent, dynamicStyles.modal]}>
              <View style={styles.modalHandleBar}>
                <View
                  style={[
                    styles.modalHandle,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray600
                        : theme.colors.gray400,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.modalHeader,
                  {
                    backgroundColor: isDark
                      ? theme.colors.gray800 + "80"
                      : theme.colors.secondary + "08",
                  },
                ]}
              >
                <View style={styles.modalHeaderContent}>
                  <View
                    style={[
                      styles.modalHeaderIcon,
                      {
                        backgroundColor: theme.colors.secondary + "20",
                        borderWidth: 1,
                        borderColor: theme.colors.secondary + "30",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="note-add"
                      size={24}
                      color={theme.colors.secondary}
                    />
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Text style={[styles.modalTitle, dynamicStyles.text]}>
                      Appointment Notes
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      Add private notes
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowNotesModal(false)}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray700
                        : theme.colors.white,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.notesContainer}>
                <View
                  style={[
                    styles.notesInputContainer,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray800
                        : theme.colors.white,
                      borderColor:
                        characterCount > maxCharacters
                          ? theme.colors.error
                          : isDark
                            ? theme.colors.gray700
                            : theme.colors.borderLight,
                      shadowColor: theme.colors.secondary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.notesInput, dynamicStyles.text]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes about this appointment..."
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    maxLength={maxCharacters}
                  />
                  <View
                    style={[
                      styles.notesFooter,
                      {
                        backgroundColor: isDark
                          ? theme.colors.gray700 + "50"
                          : theme.colors.gray50,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="edit-note"
                      size={14}
                      color={dynamicStyles.textSecondary.color}
                    />
                    <Text
                      style={[
                        styles.characterCount,
                        dynamicStyles.textSecondary,
                        characterCount > maxCharacters * 0.9 &&
                          styles.characterCountWarning,
                        characterCount > maxCharacters &&
                          styles.characterCountError,
                      ]}
                    >
                      {characterCount}/{maxCharacters} characters
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    styles.saveBtnLarge,
                    {
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                    (notesLoading || characterCount > maxCharacters) &&
                      styles.saveBtnDisabled,
                  ]}
                  onPress={handleAddNotes}
                  disabled={notesLoading || characterCount > maxCharacters}
                  activeOpacity={0.8}
                >
                  {notesLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.white}
                    />
                  ) : (
                    <MaterialIcons
                      name="save"
                      size={20}
                      color={theme.colors.white}
                    />
                  )}
                  <Text style={styles.saveBtnText}>
                    {notesLoading ? "Saving..." : "Save Notes"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading appointments..." />
      </SafeAreaView>
    );
  }

  return (
    <SalonRequirementGuard navigation={navigation}>
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.container]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>
            Appointments
          </Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            {groupedAppointments.reduce(
              (sum, g) => sum + g.appointments.length,
              0
            )}{" "}
            appointment
            {groupedAppointments.reduce(
              (sum, g) => sum + g.appointments.length,
              0
            ) !== 1
              ? "s"
              : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={loading}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={
              loading ? dynamicStyles.textSecondary.color : theme.colors.primary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
      {renderCalendar()}

      {/* Status Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {(() => {
            const filterOptions = [
              { key: "all" as StatusFilter, label: "All", icon: "list" },
              {
                key: "pending" as StatusFilter,
                label: "Pending",
                icon: "pending",
              },
              {
                key: "confirmed" as StatusFilter,
                label: "Confirmed",
                icon: "check-circle",
              },
              {
                key: "in_progress" as StatusFilter,
                label: "Active",
                icon: "play-circle-filled",
              },
              {
                key: "completed" as StatusFilter,
                label: "Done",
                icon: "done-all",
              },
              {
                key: "cancelled" as StatusFilter,
                label: "Cancelled",
                icon: "cancel",
              },
            ];

            const getFilterCount = (filterKey: StatusFilter): number => {
              if (filterKey === "all") return appointments.length;
              return appointments.filter((apt) => {
                switch (filterKey) {
                  case "pending":
                    return (
                      apt.status === AppointmentStatus.PENDING ||
                      apt.status === AppointmentStatus.BOOKED
                    );
                  case "confirmed":
                    return apt.status === AppointmentStatus.CONFIRMED;
                  case "in_progress":
                    return apt.status === AppointmentStatus.IN_PROGRESS;
                  case "completed":
                    return apt.status === AppointmentStatus.COMPLETED;
                  case "cancelled":
                    return (
                      apt.status === AppointmentStatus.CANCELLED ||
                      apt.status === AppointmentStatus.NO_SHOW
                    );
                  default:
                    return true;
                }
              }).length;
            };

            return filterOptions.map((filter) => {
              const count = getFilterCount(filter.key);
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    statusFilter === filter.key && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter.key)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={filter.icon as any}
                    size={14}
                    color={
                      statusFilter === filter.key
                        ? theme.colors.white
                        : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === filter.key && styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        statusFilter === filter.key && styles.filterBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterBadgeText,
                          statusFilter === filter.key &&
                            styles.filterBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            });
          })()}
        </ScrollView>
      </View>

      {/* Appointments List - Using FlatList for performance with many items */}
      <FlatList
        data={flatAppointmentsList}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons
              name="event-busy"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>
              No Appointments
            </Text>
            <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
              {selectedDate
                ? "No appointments on selected date"
                : "No appointments found"}
            </Text>
          </View>
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
        // Note: getItemLayout removed - using dynamic heights for better flexibility
        // If performance issues occur with 100+ items, consider implementing accurate getItemLayout
      />

      {/* Modals */}
      {renderActionModal()}
      {renderReassignModal()}
      {renderNotesModal()}
    </SafeAreaView>
    </SalonRequirementGuard>
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
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  weekDaysContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekNavButton: {
    padding: theme.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 8,
    marginHorizontal: 2,
    position: "relative",
  },
  weekDayToday: {
    backgroundColor: theme.colors.primary + "15",
  },
  weekDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
  },
  weekDayNameSelected: {
    color: theme.colors.white,
  },
  weekDayNameToday: {
    color: theme.colors.primary,
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  weekDayNumberSelected: {
    color: theme.colors.white,
    fontWeight: "700",
  },
  weekDayNumberToday: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  weekDayNumberPast: {
    color: theme.colors.textTertiary,
  },
  weekAppointmentDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  weekAppointmentDotWithCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    minWidth: 18,
  },
  weekAppointmentDotSelected: {
    backgroundColor: theme.colors.white,
  },
  weekAppointmentDotText: {
    fontSize: 8,
    fontWeight: "700",
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
  weekAppointmentDotTextSelected: {
    color: theme.colors.primary,
  },
  clearDateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  clearDateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  filterContainer: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  filterList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + "15",
    marginRight: theme.spacing.xs,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  filterBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + "30",
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: {
    backgroundColor: theme.colors.white + "30",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
  filterBadgeTextActive: {
    color: theme.colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  dateHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  todayIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  dateSubLabel: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  appointmentCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentCount: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  appointmentsList: {
    gap: theme.spacing.sm,
  },
  appointmentCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  timeColumn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginTop: 1,
  },
  durationText: {
    fontSize: 10,
    marginTop: 1,
    fontFamily: theme.fonts.regular,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  serviceText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  staffText: {
    fontSize: 10,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 3,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  quickActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickBtnPrimary: {
    minWidth: 90,
    justifyContent: "center",
  },
  quickBtnText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    paddingHorizontal: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 40, // Reduced from 90 for better space usage
  },
  modalHandleBar: {
    alignItems: "center",
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: theme.spacing.xs,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  actionsList: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl, // Extra padding for better scrolling
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  actionItemDisabled: {
    opacity: 0.5,
  },
  appointmentSummary: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  summaryStatusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
  },
  summaryCustomer: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  summaryDetails: {
    gap: 4,
  },
  summaryDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryDetailText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  actionGroup: {
    marginBottom: theme.spacing.md,
  },
  actionGroupTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
  },
  actionCardSecondary: {
    backgroundColor: "transparent",
  },
  actionCardDestructive: {
    borderColor: theme.colors.error + "30",
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  employeeRole: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  notesContainer: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  notesInputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  notesInputError: {
    borderColor: theme.colors.error,
  },
  notesInput: {
    padding: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    minHeight: 120,
    lineHeight: 20,
  },
  notesFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  characterCount: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  characterCountWarning: {
    color: theme.colors.warning,
  },
  characterCountError: {
    color: theme.colors.error,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.sm,
    borderRadius: 12,
    gap: theme.spacing.xs,
  },
  saveBtnLarge: {
    padding: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  emptyEmployeesState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  emptyEmployeesText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  emptyEmployeesSubtext: {
    fontSize: 13,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 18,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
  },
  employeeCardCurrent: {
    borderColor: theme.colors.success + "40",
    backgroundColor: theme.colors.success + "08",
  },
  employeeCardDisabled: {
    opacity: 0.5,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
  },
  // Enhanced Modal Styles
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  actionGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  actionGroupIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionGroupDanger: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  actionCardPrimary: {
    borderWidth: 1.5,
    paddingVertical: theme.spacing.md,
  },
  actionCardIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  actionCardHint: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  actionCardLabelSecondary: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  actionChevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // Redesigned Action Modal Styles
  actionModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  appointmentSummaryCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryStatusBar: {
    height: 4,
    width: "100%",
  },
  summaryCardHeader: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  customerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerNameLarge: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  statusBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusTextInline: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  detailGridItem: {
    flex: 1,
    flexDirection: "row",
    padding: theme.spacing.sm,
    borderRadius: 12,
    gap: theme.spacing.xs,
    alignItems: "flex-start",
  },
  gridIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTextContainer: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
    fontFamily: theme.fonts.medium,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 1,
  },
  gridSubValue: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  bottomInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  staffInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  staffName: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});
