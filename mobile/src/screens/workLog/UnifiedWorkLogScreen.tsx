import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useEmployeeId } from "../../hooks/useEmployeeId";
import { useAppointmentsForDate } from "../../hooks/useAppointmentsForDate";
import { workLogService, WorkLogDay } from "../../services/workLog";
import { staffService } from "../../services/staff";
import { salesService, Sale } from "../../services/sales";
import { Appointment, AppointmentStatus } from "../../services/appointments";
import {
  formatDateDisplay,
  formatTime,
  formatDuration,
  formatDate,
  generateCalendarDays,
  CalendarDay,
  getMonthName,
} from "../../utils/dateHelpers";
import { formatCurrency } from "../../utils/formatting";
import { CalendarStrip } from "../../components/common/CalendarStrip";
import { StatCard } from "../../components/common/StatCard";
import { EmptyState } from "../../components/common/EmptyState";

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
  const employeeId = useEmployeeId();
  const [viewMode, setViewMode] = useState<ViewMode>("tasks");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

  // Work Log State
  const [workLogDay, setWorkLogDay] = useState<WorkLogDay | null>(null);

  // Tasks State
  const [tasks, setTasks] = useState<ServiceTask[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use shared hook for appointments
  const { appointments, refetch: refetchAppointments } =
    useAppointmentsForDate(selectedDate);

  // Initialize calendar days
  useEffect(() => {
    setCalendarDays(generateCalendarDays());
  }, []);

  // Define fetchTasks and fetchSales before fetchData so they can be used in dependencies
  const fetchTasks = useCallback(async () => {
    // Appointments are already fetched by useAppointmentsForDate hook
    // Just transform them to tasks
    const appointmentTasks: ServiceTask[] = appointments.map((apt) => ({
      id: apt.id,
      type: "appointment",
      serviceName: apt.service?.name || "Service",
      customerName: apt.customer?.user?.fullName || "Customer",
      scheduledStart: apt.scheduledStart,
      scheduledEnd: apt.scheduledEnd,
      status: apt.status,
      serviceAmount: apt.serviceAmount || 0,
      appointment: apt,
    }));

    setTasks(appointmentTasks);
  }, [appointments]);

  const fetchSales = useCallback(async () => {
    try {
      const periodStart = new Date(selectedDate);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(selectedDate);
      periodEnd.setHours(23, 59, 59, 999);

      const startDateStr = formatDate(periodStart);
      const endDateStr = formatDate(periodEnd);

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
            (sum, c) => sum + c.amount,
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
            serviceAmount: sale.totalAmount,
            saleId: sale.id,
            commissionAmount: totalCommission,
          };
        });

      setTasks((prev) => [...prev, ...saleTasks]);
    } catch (error) {
      console.log("Could not fetch sales:", error);
    }
  }, [selectedDate, employeeId]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
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
        await Promise.all([fetchTasks(), fetchSales()]);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, selectedDate, viewMode, fetchTasks, fetchSales]);

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
  }, [employeeId, selectedDate, viewMode, fetchData]);

  useEffect(() => {
    if (viewMode === "tasks" && appointments.length > 0) {
      fetchTasks();
    }
  }, [appointments, viewMode, fetchTasks]);

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
      .reduce((sum, t) => sum + (t.commissionAmount || t.serviceAmount), 0);

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
        value: formatCurrency(workLogDay.earnings),
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
      await staffService.startAppointment(taskId);
      await refetchAppointments();
      await fetchData();
    } catch (error) {
      console.error("Error starting service:", error);
    }
  };

  const handleCompleteService = async (taskId: string) => {
    try {
      await staffService.completeAppointment(taskId);
      await refetchAppointments();
      await fetchData();
    } catch (error) {
      console.error("Error completing service:", error);
    }
  };

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
        style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
        onPress={() => handleTaskPress(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.serviceName}
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor:
                      task.type === "appointment" ? "#E3F2FD" : "#FFF3E0",
                  },
                ]}
              >
                <MaterialIcons
                  name={task.type === "appointment" ? "event" : "receipt"}
                  size={10}
                  color={task.type === "appointment" ? "#1565C0" : "#E65100"}
                />
                <Text
                  style={[
                    styles.typeBadgeText,
                    {
                      color:
                        task.type === "appointment" ? "#1565C0" : "#E65100",
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
                    ? "#E8F5E9"
                    : isInProgress
                      ? "#E3F2FD"
                      : "#FFF3E0",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isCompleted
                      ? "#1B5E20"
                      : isInProgress
                        ? "#1565C0"
                        : "#E65100",
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
          <Text style={styles.customerName}>{task.customerName}</Text>
        </View>

        <View style={styles.taskDetails}>
          <View style={styles.taskDetailItem}>
            <MaterialIcons
              name="access-time"
              size={13}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.taskDetailText}>
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
              <Text style={styles.commissionText}>
                +{formatCurrency(task.commissionAmount)} commission
              </Text>
            )}
          </View>
        </View>

        {task.type === "appointment" && isPending && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleStartService(task.id);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Start Service</Text>
          </TouchableOpacity>
        )}

        {task.type === "appointment" && isInProgress && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.success },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleCompleteService(task.id);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Complete Service</Text>
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
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timeText}>{formatTime(entry.timestamp)}</Text>
          <TouchableOpacity
            style={styles.entryCard}
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
              <Text style={styles.entryTitle}>{entry.title}</Text>
              {entry.duration && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {formatDuration(entry.duration)}
                  </Text>
                </View>
              )}
            </View>
            {entry.description && (
              <Text style={styles.entryDescription}>{entry.description}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Work</Text>
            <Text style={styles.headerSubtitle}>
              {getMonthName(selectedDate)} {selectedDate.getFullYear()}
            </Text>
          </View>
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === "tasks" && styles.tabActive]}
            onPress={() => setViewMode("tasks")}
          >
            <MaterialIcons
              name="task-alt"
              size={20}
              color={
                viewMode === "tasks"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                viewMode === "tasks" && styles.tabTextActive,
              ]}
            >
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === "worklog" && styles.tabActive]}
            onPress={() => setViewMode("worklog")}
          >
            <MaterialIcons
              name="history"
              size={20}
              color={
                viewMode === "worklog"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                viewMode === "worklog" && styles.tabTextActive,
              ]}
            >
              Work Log
            </Text>
          </TouchableOpacity>
        </View>

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
              value={formatCurrency(taskStats.totalEarnings)}
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
          <View style={styles.clockStatusCard}>
            <View style={styles.clockStatusRow}>
              <View style={styles.clockStatusItem}>
                <MaterialIcons
                  name="login"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.clockStatusLabel}>Clock In</Text>
                <Text style={styles.clockStatusTime}>
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
                  <Text style={styles.clockStatusLabel}>Clock Out</Text>
                  <Text style={styles.clockStatusTime}>
                    {formatTime(workLogDay.clockOut)}
                  </Text>
                </View>
              ) : (
                <View style={styles.clockStatusItem}>
                  <View style={styles.workingIndicator} />
                  <Text style={styles.clockStatusLabel}>Status</Text>
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
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      styles.filterCount,
                      taskFilter === option.id && styles.filterCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        taskFilter === option.id &&
                          styles.filterCountTextActive,
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
            <Text style={styles.loadingText}>Loading...</Text>
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
            <Text style={styles.errorText}>{error}</Text>
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
                      <Text style={styles.sectionTitle}>Timeline</Text>
                      <Text style={styles.sectionStats}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    backgroundColor: theme.colors.gray200,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionStats: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.borderLight,
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
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.error,
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
});

export default UnifiedWorkLogScreen;
