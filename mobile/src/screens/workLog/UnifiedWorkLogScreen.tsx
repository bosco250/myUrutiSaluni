import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useAuth, useTheme } from "../../context";
import { useEmployeeId } from "../../hooks/useEmployeeId";
import { useAppointmentsForDate } from "../../hooks/useAppointmentsForDate";
import { workLogService, WorkLogDay } from "../../services/workLog";
import { staffService } from "../../services/staff";
import { salesService, Sale } from "../../services/sales";
import { Appointment, AppointmentStatus } from "../../services/appointments";
import { salonService, SalonDetails } from "../../services/salon";
import {
  formatDateDisplay,
  formatTime,
  formatDuration,
  formatDate,
  generateCalendarDaysForMonth,
  getPreviousWeek,
  getNextWeek,
  CalendarDay,
  getMonthName,
} from "../../utils/dateHelpers";
import { formatCurrency, formatCompactCurrency } from "../../utils/formatting";
import { CalendarStrip } from "../../components/common/CalendarStrip";
import { StatCard } from "../../components/common/StatCard";
import { EmptyState } from "../../components/common/EmptyState";
import { Loader } from "../../components/common/Loader";

type ViewMode = "tasks" | "worklog";
type TaskFilter = "all" | "pending" | "in_progress" | "completed";

interface ServiceTask {
  id: string;
  type: "appointment" | "sale";
  serviceName: string;
  customerName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus | "sale_completed";
  serviceAmount: number;
  commissionAmount?: number;
  saleId?: string;
  appointment?: Appointment;
}

export const UnifiedWorkLogScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const defaultEmployeeId = useEmployeeId();

  // Dynamic Theme Colors
  const bgColor = isDark ? theme.colors.gray900 : theme.colors.background;
  const cardColor = isDark ? theme.colors.gray800 : theme.colors.background;
  const textColor = isDark ? theme.colors.white : theme.colors.text;
  const subTextColor = isDark ? theme.colors.gray400 : theme.colors.textSecondary;
  const navBtnColor = isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary;

  const [viewMode, setViewMode] = useState<ViewMode>("tasks");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

  // Salon Selection State
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<SalonDetails | null>(null);
  const [showSalonPicker, setShowSalonPicker] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(defaultEmployeeId);

  // Work Log State
  const [workLogDay, setWorkLogDay] = useState<WorkLogDay | null>(null);

  // Tasks State
  const [tasks, setTasks] = useState<ServiceTask[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track which task is loading
  
  // Track if we're currently loading to prevent infinite loops
  const loadingRef = useRef(false);

  // Use shared hook for appointments
  const { appointments, refetch: refetchAppointments } =
    useAppointmentsForDate(selectedDate);

  // Initialize calendar days
  useEffect(() => {
    setCalendarDays(generateCalendarDaysForMonth(selectedDate));
  }, [selectedDate]);

  // Load salons on mount
  useEffect(() => {
    const loadSalons = async () => {
      if (!user?.id) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      try {
        setLoading(true);
        const salonList = await salonService.getMySalons();
        setSalons(salonList);
        
        if (salonList.length > 0) {
          // Auto-select first salon if none selected or if selected salon is not in list
          const currentSalon = selectedSalon && salonList.find(s => s.id === selectedSalon.id)
            ? selectedSalon
            : salonList[0];
          
          if (!selectedSalon || !salonList.find(s => s.id === selectedSalon.id)) {
            setSelectedSalon(currentSalon);
          }
          
          // Fetch employee ID for current salon
          try {
            const empRecord = await salonService.getCurrentEmployee(currentSalon.id);
            if (empRecord) {
              setEmployeeId(empRecord.id);
            } else {
              setEmployeeId(null);
              setLoading(false);
              loadingRef.current = false;
            }
          } catch (err) {
            console.error('Error fetching employee record:', err);
            setEmployeeId(null);
            setLoading(false);
            loadingRef.current = false;
          }
        } else {
          // No salons found
          setLoading(false);
          loadingRef.current = false;
        }
      } catch (err) {
        console.error('Error loading salons:', err);
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    loadSalons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handle salon selection
  const handleSalonSelect = async (salon: SalonDetails) => {
    setShowSalonPicker(false);
    setSelectedSalon(salon);
    
    // Fetch employee ID for selected salon
    try {
      const empRecord = await salonService.getCurrentEmployee(salon.id);
      if (empRecord) {
        setEmployeeId(empRecord.id);
      } else {
        setEmployeeId(null);
      }
    } catch (err) {
      console.error('Error fetching employee record:', err);
      setEmployeeId(null);
    }
  };


  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
      return;
    }

    // Prevent concurrent loads
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setError(null);
      setLoading(true);
      const dateString = formatDate(selectedDate);

      if (viewMode === "worklog") {
        // Fetch work log data
        const dayLog = await workLogService.getWorkLogForDate(
          employeeId,
          dateString
        );
        setWorkLogDay(dayLog);

        // Summary can be fetched if needed for future features
        await workLogService.getWorkLogSummary(employeeId, "week");
      } else {
        // Fetch tasks data (appointments + sales)
        // Transform appointments to tasks
        const appointmentTasks: ServiceTask[] = appointments.map((apt) => ({
          id: apt.id,
          type: "appointment",
          serviceName: apt.service?.name || "Service",
          customerName: apt.customer?.user?.fullName || "Customer",
          scheduledStart: apt.scheduledStart,
          scheduledEnd: apt.scheduledEnd,
          status: apt.status,
          serviceAmount: Number(apt.serviceAmount) || Number(apt.service?.basePrice) || 0,
          appointment: apt,
        }));

        // Fetch sales
        const periodStart = new Date(selectedDate);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(selectedDate);
        periodEnd.setHours(23, 59, 59, 999);

        const startDateStr = formatDate(periodStart);
        const endDateStr = formatDate(periodEnd);

        try {
          const salesResponse = await salesService.getSales(
            undefined,
            1,
            100,
            startDateStr,
            endDateStr
          );

          const salesData = salesResponse.data || [];

          // Add sales to tasks
          const saleTasks: ServiceTask[] = salesData
            .filter((sale: Sale) => {
              const employeeCommissions =
                sale.commissions?.filter(
                  (c) => c.salonEmployee?.id === employeeId
                ) || [];
              return (
                employeeCommissions.length > 0 ||
                sale.items?.some((item) => item.salonEmployeeId === employeeId)
              );
            })
            .map((sale: Sale) => {
              const employeeCommissions =
                sale.commissions?.filter(
                  (c) => c.salonEmployee?.id === employeeId
                ) || [];
              const totalCommission = employeeCommissions.reduce(
                (sum, c) => sum + Number(c.amount),
                0
              );
              const itemNames =
                sale.items
                  ?.map((item) => item.name || "Service/Product")
                  .join(", ") || "Sale";

              return {
                id: `sale_${sale.id}`,
                type: "sale",
                serviceName:
                  itemNames.length > 30
                    ? itemNames.substring(0, 30) + "..."
                    : itemNames,
                customerName: sale.customer?.fullName || "Walk-in Customer",
                scheduledStart: sale.createdAt,
                scheduledEnd: sale.createdAt,
                status: "sale_completed" as const,
                serviceAmount: Number(sale.totalAmount) || 0,
                saleId: sale.id,
                commissionAmount: totalCommission,
              };
            });

          setTasks([...appointmentTasks, ...saleTasks]);
        } catch (error) {
          console.log("Could not fetch sales:", error);
          setTasks(appointmentTasks);
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [employeeId, selectedDate, viewMode, appointments]);

  // Initial load and when key dependencies change
  useEffect(() => {
    // Don't fetch if no salons
    if (salons.length === 0) {
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    
    if (employeeId && !loadingRef.current) {
      fetchData();
    } else if (!employeeId && salons.length > 0) {
      // If we have salons but no employee ID, stop loading
      setLoading(false);
      loadingRef.current = false;
    }
  }, [employeeId, selectedDate, viewMode, fetchData, salons.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAppointments();
    await fetchData();
  };

  // Calculate statistics
  const getTaskStats = () => {
    const pending = tasks.filter(
      (t) =>
        t.type === "appointment" &&
        (t.status === AppointmentStatus.PENDING ||
          t.status === AppointmentStatus.BOOKED ||
          t.status === AppointmentStatus.CONFIRMED)
    ).length;

    const inProgress = tasks.filter(
      (t) =>
        t.type === "appointment" && t.status === AppointmentStatus.IN_PROGRESS
    ).length;

    const completed = tasks.filter(
      (t) =>
        t.status === AppointmentStatus.COMPLETED ||
        t.status === "sale_completed"
    ).length;

    const totalEarnings = tasks
      .filter(
        (t) =>
          t.status === AppointmentStatus.COMPLETED ||
          t.status === "sale_completed"
      )
      .reduce((sum, t) => sum + (Number(t.commissionAmount) || Number(t.serviceAmount) || 0), 0);

    return {
      pending,
      inProgress,
      completed,
      total: tasks.length,
      totalEarnings,
    };
  };

  const getWorkLogStats = (): {
    label: string;
    value: string;
    icon: string;
    color: string;
  }[] => {
    if (!workLogDay) {
      return [
        {
          label: "Hours",
          value: "0",
          icon: "access-time",
          color: theme.colors.primary,
        },
        {
          label: "Services",
          value: "0",
          icon: "work",
          color: theme.colors.secondary,
        },
        {
          label: "Earnings",
          value: "0",
          icon: "attach-money",
          color: theme.colors.success,
        },
      ];
    }

    return [
      {
        label: "Hours",
        value: workLogDay.totalHours.toFixed(1),
        icon: "access-time",
        color: theme.colors.primary,
      },
      {
        label: "Services",
        value: workLogDay.completedAppointments.length.toString(),
        icon: "work",
        color: theme.colors.secondary,
      },
      {
        label: "Earnings",
        value: formatCompactCurrency(Number(workLogDay.earnings) || 0),
        icon: "attach-money",
        color: theme.colors.success,
      },
    ];
  };

  const taskStats = getTaskStats();
  const workLogStats = getWorkLogStats();

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "all") return true;
    if (taskFilter === "pending") {
      return (
        task.type === "appointment" &&
        (task.status === AppointmentStatus.PENDING ||
          task.status === AppointmentStatus.BOOKED ||
          task.status === AppointmentStatus.CONFIRMED)
      );
    }
    if (taskFilter === "in_progress") {
      return (
        task.type === "appointment" &&
        task.status === AppointmentStatus.IN_PROGRESS
      );
    }
    if (taskFilter === "completed") {
      return (
        task.status === AppointmentStatus.COMPLETED ||
        task.status === "sale_completed"
      );
    }
    return true;
  });

  // Sort tasks: pending/in-progress first, then completed
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aCompleted =
      a.status === AppointmentStatus.COMPLETED || a.status === "sale_completed";
    const bCompleted =
      b.status === AppointmentStatus.COMPLETED || b.status === "sale_completed";
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    return (
      new Date(a.scheduledStart).getTime() -
      new Date(b.scheduledStart).getTime()
    );
  });

  const handleStartService = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await staffService.startAppointment(taskId);
      await refetchAppointments();
      await fetchData();
      // Success feedback
      Alert.alert(
        "✅ Service Started",
        "The appointment is now in progress.",
        [{ text: "OK", style: "default" }]
      );
    } catch (error: any) {
      console.error("Error starting service:", error);
      Alert.alert(
        "❌ Error",
        error.message || "Failed to start service. Please try again.",
        [{ text: "OK", style: "cancel" }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteService = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await staffService.completeAppointment(taskId);
      await refetchAppointments();
      await fetchData();
      // Success feedback
      Alert.alert(
        "🎉 Service Completed!",
        "Great job! The appointment has been marked as completed.",
        [{ text: "Awesome!", style: "default" }]
      );
    } catch (error: any) {
      console.error("Error completing service:", error);
      Alert.alert(
        "❌ Error",
        error.message || "Failed to complete service. Please try again.",
        [{ text: "OK", style: "cancel" }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !refreshing) {
    return <Loader fullscreen message="Loading work log..." />;
  }

  // Show empty state if employee is not assigned to any salon
  if (!loading && salons.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
        <View style={[styles.emptyStateContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.emptyStateIconContainer, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary }]}>
            <MaterialIcons 
              name="business-center" 
              size={64} 
              color={isDark ? theme.colors.gray600 : theme.colors.textSecondary} 
            />
          </View>
          <Text style={[styles.emptyStateTitle, { color: textColor }]}>
            No Salon Assignment
          </Text>
          <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
            You are not currently assigned to any salon. {'\n'}
            Please contact your salon owner or administrator to get assigned.
          </Text>
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation?.navigate("Profile")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="person" size={20} color="#FFFFFF" />
            <Text style={styles.emptyStateButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleTaskPress = (task: ServiceTask) => {
    if (task.type === "sale" && task.saleId) {
      navigation?.navigate("SaleDetail", { saleId: task.saleId });
    } else {
      navigation?.navigate("AppointmentDetail", {
        appointmentId: task.id,
        appointment: task.appointment,
      });
    }
  };

  const renderTaskCard = (task: ServiceTask) => {
    const isCompleted =
      task.status === AppointmentStatus.COMPLETED ||
      task.status === "sale_completed";
    const isInProgress = task.status === AppointmentStatus.IN_PROGRESS;
    const isPending =
      task.status === AppointmentStatus.PENDING ||
      task.status === AppointmentStatus.BOOKED ||
      task.status === AppointmentStatus.CONFIRMED;

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskCard, 
          isCompleted && styles.taskCardCompleted,
          { backgroundColor: cardColor, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }
        ]}
        onPress={() => handleTaskPress(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <View style={styles.taskTitleContainer}>
              <Text style={[styles.taskTitle, { color: textColor }]} numberOfLines={1}>
                {task.serviceName}
              </Text>
              <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        task.type === "appointment" 
                          ? (isDark ? theme.colors.infoDark + '40' : "#E3F2FD") 
                          : (isDark ? theme.colors.warningDark + '40' : "#FFF3E0"),
                    },
                  ]}
                >
                  <MaterialIcons
                    name={task.type === "appointment" ? "event" : "receipt"}
                    size={10}
                    color={task.type === "appointment" 
                      ? (isDark ? theme.colors.info : "#1565C0") 
                      : (isDark ? theme.colors.warning : "#E65100")}
                  />
                <Text
                  style={[
                    styles.typeBadgeText,
                    {
                      color:
                        task.type === "appointment" 
                          ? (isDark ? theme.colors.info : "#1565C0") 
                          : (isDark ? theme.colors.warning : "#E65100"),
                    },
                  ]}
                >
                  {task.type === "appointment" ? "Appointment" : "Sale"}
                </Text>
              </View>
            </View>
            <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCompleted
                      ? (isDark ? theme.colors.successDark + '40' : '#E8F5E9')
                      : isInProgress
                        ? (isDark ? theme.colors.infoDark + '40' : '#E3F2FD')
                        : (isDark ? theme.colors.warningDark + '40' : '#FFF3E0'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isCompleted
                        ? (isDark ? theme.colors.success : '#1B5E20')
                        : isInProgress
                          ? (isDark ? theme.colors.info : '#1565C0')
                          : (isDark ? theme.colors.warning : '#E65100'),
                    },
                  ]}
                >
                {isCompleted
                  ? "Done"
                  : isInProgress
                    ? "In Progress"
                    : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.customerRow}>
          <MaterialIcons name="person" size={14} color={theme.colors.primary} />
          <Text style={[styles.customerName, { color: textColor }]}>{task.customerName}</Text>
        </View>

        <View style={styles.taskDetails}>
          <View style={styles.taskDetailItem}>
            <MaterialIcons
              name="access-time"
              size={13}
              color={subTextColor}
            />
            <Text style={[styles.taskDetailText, { color: subTextColor }]}>
              {task.type === "sale"
                ? formatTime(task.scheduledStart)
                : `${formatTime(task.scheduledStart)} - ${formatTime(task.scheduledEnd)}`}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.taskPrice, { color: theme.colors.primary }]}>
              {formatCurrency(task.serviceAmount)}
            </Text>
            {task.commissionAmount && task.commissionAmount > 0 && (
              <Text style={[styles.commissionText, { color: subTextColor }]}>
                +{formatCurrency(task.commissionAmount)} commission
              </Text>
            )}
          </View>
        </View>

        {/* Start Service button - Only visible for salon owners, not employees */}
        {task.type === "appointment" && isPending && user?.role?.toLowerCase() === 'salon_owner' && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
              actionLoading === task.id && styles.actionButtonLoading,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (actionLoading !== task.id) {
                handleStartService(task.id);
              }
            }}
            activeOpacity={0.8}
            disabled={actionLoading === task.id}
          >
            {actionLoading === task.id ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>Starting...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Start Service</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {task.type === "appointment" && isInProgress && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.success },
              actionLoading === task.id && styles.actionButtonLoading,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (actionLoading !== task.id) {
                handleCompleteService(task.id);
              }
            }}
            activeOpacity={0.8}
            disabled={actionLoading === task.id}
          >
            {actionLoading === task.id ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>Completing...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Complete Service</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderTimelineEntry = (entry: any, index: number) => {
    const isLast = index === workLogDay!.entries.length - 1;
    const isAppointment = entry.type === "appointment";
    const isAttendance = entry.type === "attendance";

    let dotColor = theme.colors.primary;
    if (isAppointment) {
      if (entry.status === "completed") {
        dotColor = theme.colors.success;
      } else if (entry.status === "in_progress") {
        dotColor = theme.colors.secondary;
      } else {
        dotColor = theme.colors.warning;
      }
    } else if (isAttendance) {
      dotColor = theme.colors.info;
    }

    return (
      <View key={entry.id} style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor, borderColor: isDark ? theme.colors.gray900 : "#FFFFFF" }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }]} />}
        </View>
        <View style={styles.timelineContent}>
          <Text style={[styles.timeText, { color: subTextColor }]}>{formatTime(entry.timestamp)}</Text>
          <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: cardColor, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }]}
            onPress={() => {
              if (entry.appointment) {
                navigation?.navigate("AppointmentDetail", {
                  appointmentId: entry.appointment.id,
                  appointment: entry.appointment,
                });
              }
            }}
            disabled={!entry.appointment}
          >
            <View style={styles.entryHeader}>
              <Text style={[styles.entryTitle, { color: textColor }]}>{entry.title}</Text>
              {entry.duration && (
                <View style={[styles.durationBadge, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.backgroundSecondary }]}>
                  <Text style={styles.durationText}>
                    {formatDuration(entry.duration)}
                  </Text>
                </View>
              )}
            </View>
            {entry.description && (
              <Text style={[styles.entryDescription, { color: subTextColor }]}>{entry.description}</Text>
            )}
            {entry.earnings && entry.earnings > 0 && (
              <View style={styles.earningsContainer}>
                <MaterialIcons
                  name="attach-money"
                  size={16}
                  color={theme.colors.success}
                />
                <Text style={styles.earningsText}>
                  {formatCurrency(entry.earnings)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render salon picker modal
  const renderSalonPicker = () => {
    const dynamicStyles = {
      pickerModal: {
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      },
      text: {
        color: isDark ? '#FFFFFF' : '#000000',
      },
      textSecondary: {
        color: isDark ? '#8E8E93' : '#6D6D70',
      },
    };

    return (
      <Modal
        visible={showSalonPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSalonPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSalonPicker(false)}
        >
          <View style={[styles.modalContent, dynamicStyles.pickerModal]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Select Workplace</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {salons.map(salon => (
                <TouchableOpacity
                  key={salon.id}
                  style={[
                    styles.salonOption,
                    selectedSalon?.id === salon.id && { backgroundColor: theme.colors.primary + '10' }
                  ]}
                  onPress={() => handleSalonSelect(salon)}
                >
                  <View style={styles.salonOptionInfo}>
                    <Text style={[styles.salonOptionName, dynamicStyles.text]}>{salon.name}</Text>
                    <Text style={[styles.salonOptionAddress, dynamicStyles.textSecondary]}>{salon.city || 'Location'}</Text>
                  </View>
                  {selectedSalon?.id === salon.id && (
                    <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowSalonPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
        {/* Header with Week Navigation */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: navBtnColor }]}
            onPress={() => setSelectedDate(getPreviousWeek(selectedDate))}
          >
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textColor }]}>My Work</Text>
            <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
              {getMonthName(selectedDate)} {selectedDate.getFullYear()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: navBtnColor }]}
            onPress={() => setSelectedDate(getNextWeek(selectedDate))}
          >
            <MaterialIcons name="chevron-right" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* View Mode Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tab, 
              viewMode === "tasks" && styles.tabActive,
              viewMode === "tasks" && { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.background }
            ]}
            onPress={() => setViewMode("tasks")}
          >
            <MaterialIcons
              name="task-alt"
              size={20}
              color={
                viewMode === "tasks"
                  ? theme.colors.primary
                  : subTextColor
              }
            />
            <Text
              style={[
                styles.tabText,
                viewMode === "tasks" && styles.tabTextActive,
                { color: viewMode === "tasks" ? theme.colors.primary : subTextColor }
              ]}
            >
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab, 
              viewMode === "worklog" && styles.tabActive,
              viewMode === "worklog" && { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.background }
            ]}
            onPress={() => setViewMode("worklog")}
          >
            <MaterialIcons
              name="history"
              size={20}
              color={
                viewMode === "worklog"
                  ? theme.colors.primary
                  : subTextColor
              }
            />
            <Text
              style={[
                styles.tabText,
                viewMode === "worklog" && styles.tabTextActive,
                { color: viewMode === "worklog" ? theme.colors.primary : subTextColor }
              ]}
            >
              Work Log
            </Text>
          </TouchableOpacity>
        </View>

      <ScrollView
        style={{ flex: 1 }}
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
        {/* Salon Selector */}
        {salons.length > 0 && (
          <TouchableOpacity 
            style={[
              styles.salonCard, 
              { 
                backgroundColor: cardColor,
                borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
                shadowColor: isDark ? '#000000' : '#000000',
              }
            ]}
            onPress={() => salons.length > 1 && setShowSalonPicker(true)}
            disabled={salons.length <= 1}
            activeOpacity={0.7}
          >
            <View style={[styles.salonIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesome5 name="store" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.salonInfo}>
              <Text style={[styles.salonLabel, { color: subTextColor }]}>Current Workplace</Text>
              <Text style={[styles.salonName, { color: textColor }]} numberOfLines={1}>
                {selectedSalon?.name || 'Select Salon'}
              </Text>
              {selectedSalon?.city && (
                <Text style={[styles.salonAddress, { color: subTextColor }]} numberOfLines={1}>
                  {selectedSalon.city}
                </Text>
              )}
            </View>
            {salons.length > 1 && (
              <MaterialIcons name="keyboard-arrow-down" size={24} color={subTextColor} />
            )}
          </TouchableOpacity>
        )}

        {/* Calendar Strip */}
        <CalendarStrip
          days={calendarDays}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* Statistics */}
        {viewMode === "tasks" ? (
          <View style={styles.statsContainer}>
            <StatCard
              label="Pending"
              value={taskStats.pending.toString()}
              icon="schedule"
              color={theme.colors.warning}
            />
            <StatCard
              label="Active"
              value={taskStats.inProgress.toString()}
              icon="play-circle-filled"
              color={theme.colors.secondary}
            />
            <StatCard
              label="Done"
              value={taskStats.completed.toString()}
              icon="check-circle"
              color={theme.colors.success}
            />
            <StatCard
              label="Earned"
              value={formatCompactCurrency(taskStats.totalEarnings)}
              icon="attach-money"
              color={theme.colors.primary}
            />
          </View>
        ) : (
          workLogDay && (
            <View style={styles.statsContainer}>
              {workLogStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </View>
          )
        )}

        {/* Clock In/Out Status (Work Log only) */}
        {viewMode === "worklog" && workLogDay && workLogDay.clockIn && (
          <View style={[styles.clockStatusCard, { backgroundColor: cardColor }]}>
            <View style={styles.clockStatusRow}>
              <View style={styles.clockStatusItem}>
                <MaterialIcons
                  name="login"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={[styles.clockStatusLabel, { color: subTextColor }]}>Clocked In</Text>
                <Text style={[styles.clockStatusTime, { color: textColor }]}>
                  {formatTime(workLogDay.clockIn)}
                </Text>
              </View>
              {workLogDay.clockOut ? (
                <View style={styles.clockStatusItem}>
                  <MaterialIcons
                    name="logout"
                    size={20}
                    color={theme.colors.error}
                  />
                  <Text style={[styles.clockStatusLabel, { color: subTextColor }]}>Clock Out</Text>
                  <Text style={[styles.clockStatusTime, { color: textColor }]}>
                    {formatTime(workLogDay.clockOut)}
                  </Text>
                </View>
              ) : (
                <View style={styles.clockStatusItem}>
                  <View style={styles.workingIndicator} />
                  <Text style={[styles.clockStatusLabel, { color: subTextColor }]}>Status</Text>
                  <Text
                    style={[
                      styles.clockStatusTime,
                      { color: theme.colors.warning },
                    ]}
                  >
                    Working...
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Filter Tabs (Tasks only) */}
        {viewMode === "tasks" && (
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {[
                {
                  id: "all" as TaskFilter,
                  label: "All",
                  count: taskStats.total,
                },
                {
                  id: "pending" as TaskFilter,
                  label: "Pending",
                  count: taskStats.pending,
                },
                {
                  id: "in_progress" as TaskFilter,
                  label: "Active",
                  count: taskStats.inProgress,
                },
                {
                  id: "completed" as TaskFilter,
                  label: "Done",
                  count: taskStats.completed,
                },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterButton,
                    taskFilter === option.id && styles.filterButtonActive,
                  ]}
                  onPress={() => setTaskFilter(option.id)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      taskFilter === option.id && styles.filterButtonTextActive,
                      { color: taskFilter === option.id ? "#FFFFFF" : textColor }
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      styles.filterCount,
                      taskFilter === option.id && styles.filterCountActive,
                      { 
                        backgroundColor: taskFilter === option.id 
                          ? "rgba(255,255,255,0.3)" 
                          : (isDark ? theme.colors.gray700 : theme.colors.gray200)
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        taskFilter === option.id &&
                          styles.filterCountTextActive,
                        { color: taskFilter === option.id ? "#FFFFFF" : subTextColor }
                      ]}
                    >
                      {option.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>Loading...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={theme.colors.error}
            />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {viewMode === "tasks" ? (
              <View style={styles.contentContainer}>
                {sortedTasks.length === 0 ? (
                  <EmptyState
                    icon="task-alt"
                    title="No tasks found"
                    subtitle={`You don't have any ${taskFilter === "all" ? "" : taskFilter.replace("_", " ")} tasks for ${formatDateDisplay(selectedDate)}`}
                  />
                ) : (
                  sortedTasks.map(renderTaskCard)
                )}
              </View>
            ) : (
              <View style={styles.contentContainer}>
                {workLogDay && workLogDay.entries.length > 0 ? (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: textColor }]}>Timeline</Text>
                      <Text style={[styles.sectionStats, { color: subTextColor }]}>
                        {workLogDay.entries.length}{" "}
                        {workLogDay.entries.length === 1 ? "Entry" : "Entries"}
                      </Text>
                    </View>
                    <View style={styles.timelineList}>
                      {workLogDay.entries.map(renderTimelineEntry)}
                    </View>
                  </>
                ) : (
                  <EmptyState
                    icon="work-outline"
                    title="No Work Log"
                    subtitle={
                      workLogDay?.status === "not_worked"
                        ? "You didn't work on this day."
                        : "No activities recorded for this day."
                    }
                  />
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      {renderSalonPicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  clockStatusCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clockStatusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  clockStatusItem: {
    alignItems: "center",
    gap: 8,
  },
  clockStatusLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  clockStatusTime: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  workingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.warning,
  },
  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "transparent",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "600",
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  taskCardCompleted: {
    opacity: 0.85,
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.text,
  },
  taskDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  taskDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskDetailText: {
    fontSize: 12,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  taskPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  commissionText: {
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonLoading: {
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionStats: {
    fontSize: 13,
  },
  timelineList: {
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 0,
    minHeight: 100,
  },
  timelineLeft: {
    alignItems: "center",
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 6,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  entryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  entryDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  earningsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  earningsText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.success,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  // Empty State styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  // Salon Card
  salonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md + 2,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  salonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  salonInfo: {
    flex: 1,
  },
  salonLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  salonAddress: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: "80%",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  salonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  salonOptionInfo: {
    flex: 1,
  },
  salonOptionName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  salonOptionAddress: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  modalCancelButton: {
    marginTop: theme.spacing.md,
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  modalCancelText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
});

export default UnifiedWorkLogScreen;
