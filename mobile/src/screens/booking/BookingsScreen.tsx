import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import BottomNavigation from "../../components/common/BottomNavigation";
import {
  appointmentsService,
  Appointment,
  AppointmentStatus,
} from "../../services/appointments";
import { customersService } from "../../services/customers";
import { useAuth } from "../../context";

interface BookingsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type FilterTab = "all" | "upcoming" | "confirmed" | "completed" | "cancelled";

export default function BookingsScreen({ navigation }: BookingsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "favorites" | "profile"
  >("bookings");

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>("all");

  // Fetch customer ID from user ID
  useEffect(() => {
    const fetchCustomerId = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const userId = String(user.id);
        const customer = await customersService.getCustomerByUserId(userId);

        if (customer && customer.id) {
          setCustomerId(customer.id);
        } else {
          setTimeout(async () => {
            try {
              const retryCustomer =
                await customersService.getCustomerByUserId(userId);
              if (retryCustomer && retryCustomer.id) {
                setCustomerId(retryCustomer.id);
              } else {
                setLoading(false);
              }
            } catch (retryError) {
              setLoading(false);
            }
          }, 500);
        }
      } catch (error: any) {
        setLoading(false);
      }
    };

    fetchCustomerId();
  }, [user?.id]);

  // Fetch appointments when customer ID is available
  useEffect(() => {
    if (customerId) {
      fetchAppointments();
    }
  }, [customerId]);

  const fetchAppointments = async () => {
    if (!customerId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data =
        await appointmentsService.getCustomerAppointments(customerId);

      if (!data || !Array.isArray(data)) {
        setAppointments([]);
        return;
      }

      // Sort by scheduledStart date - future appointments first, then past
      // Within each group, newest (most recent) come first
      const now = new Date();
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.scheduledStart);
        const dateB = new Date(b.scheduledStart);
        const isAFuture = dateA >= now;
        const isBFuture = dateB >= now;

        // Future appointments come first
        if (isAFuture && !isBFuture) return -1;
        if (!isAFuture && isBFuture) return 1;

        // If both future or both past, sort by time (newest first - descending)
        return dateB.getTime() - dateA.getTime();
      });
      setAppointments(sorted);
    } catch (error: any) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleTabPress = (
    tab: "home" | "bookings" | "explore" | "favorites" | "profile"
  ) => {
    setActiveTab(tab);
    if (tab !== "bookings") {
      const screenName =
        tab === "home" ? "Home" : tab.charAt(0).toUpperCase() + tab.slice(1);
      navigation?.navigate(screenName as any);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isPast = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Get appointments count for a specific date
  const getAppointmentsForDate = (date: Date | null) => {
    if (!date) return 0;
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledStart).toISOString().split("T")[0];
      return aptDate === dateStr;
    }).length;
  };

  // Filter appointments based on selected filter and selected date
  const filteredAppointments = useMemo(() => {
    const now = new Date();

    let filtered: Appointment[] = [];

    switch (selectedFilter) {
      case "upcoming":
        // Upcoming = PENDING, BOOKED, and CONFIRMED appointments
        filtered = appointments.filter(
          (apt) =>
            apt.status === AppointmentStatus.PENDING ||
            apt.status === AppointmentStatus.BOOKED ||
            apt.status === AppointmentStatus.CONFIRMED
        );
        break;
      case "confirmed":
        // Confirmed = CONFIRMED and BOOKED appointments
        filtered = appointments.filter(
          (apt) =>
            apt.status === AppointmentStatus.CONFIRMED ||
            apt.status === AppointmentStatus.BOOKED
        );
        break;
      case "completed":
        filtered = appointments.filter(
          (apt) => apt.status === AppointmentStatus.COMPLETED
        );
        break;
      case "cancelled":
        filtered = appointments.filter(
          (apt) =>
            apt.status === AppointmentStatus.CANCELLED ||
            apt.status === AppointmentStatus.NO_SHOW
        );
        break;
      case "all":
      default:
        filtered = appointments;
        break;
    }

    // Filter by selected date only if a date is explicitly selected (not null)
    if (selectedDate !== null) {
      const selectedDateStr = selectedDate.toISOString().split("T")[0];
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.scheduledStart)
          .toISOString()
          .split("T")[0];
        return aptDate === selectedDateStr;
      });
    }

    // Sort by time - future appointments first, then past
    // Within each group, newest (most recent) come first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.scheduledStart);
      const dateB = new Date(b.scheduledStart);
      const isAFuture = dateA >= now;
      const isBFuture = dateB >= now;

      // Future appointments come first
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // If both future or both past, sort by time (newest first - descending)
      return dateB.getTime() - dateA.getTime();
    });
  }, [appointments, selectedFilter, selectedDate]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1 && diffDays <= 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "check-circle";
      case AppointmentStatus.PENDING:
        return "schedule";
      case AppointmentStatus.BOOKED:
        return "event";
      case AppointmentStatus.IN_PROGRESS:
        return "play-circle";
      case AppointmentStatus.COMPLETED:
        return "check-circle";
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        return "cancel";
      default:
        return "event";
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
  };

  const days = getDaysInMonth(currentDate);
  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    {
      id: "upcoming",
      label: "Upcoming",
      count: appointments.filter(
        (apt) =>
          apt.status === AppointmentStatus.PENDING ||
          apt.status === AppointmentStatus.BOOKED ||
          apt.status === AppointmentStatus.CONFIRMED
      ).length,
    },
    {
      id: "confirmed",
      label: "Confirmed",
      count: appointments.filter(
        (apt) =>
          apt.status === AppointmentStatus.CONFIRMED ||
          apt.status === AppointmentStatus.BOOKED
      ).length,
    },
    {
      id: "completed",
      label: "Completed",
      count: appointments.filter(
        (apt) => apt.status === AppointmentStatus.COMPLETED
      ).length,
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: appointments.filter(
        (apt) =>
          apt.status === AppointmentStatus.CANCELLED ||
          apt.status === AppointmentStatus.NO_SHOW
      ).length,
    },
    {
      id: "all",
      label: "All",
      count: appointments.length,
    },
  ];

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header - Fixed */}
      <View style={[styles.header, dynamicStyles.container]}>
        <View>
          <Text style={[styles.title, dynamicStyles.text]}>Bookings</Text>
          <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
            Manage your appointments
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBookingButton}
          onPress={() => navigation?.navigate("Explore")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.newBookingButtonText}>New Booking</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs - Fixed at top */}
      <View style={[styles.filterContainer, dynamicStyles.container]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                selectedFilter === tab.id && styles.filterTabActive,
                selectedFilter === tab.id && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setSelectedFilter(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  !selectedFilter || selectedFilter !== tab.id
                    ? dynamicStyles.textSecondary
                    : styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    selectedFilter === tab.id && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      selectedFilter === tab.id && styles.filterBadgeTextActive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar */}
        <View style={[styles.calendarContainer, dynamicStyles.card]}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={handlePreviousMonth}
              style={styles.monthButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={dynamicStyles.text.color}
              />
            </TouchableOpacity>
            <Text style={[styles.monthText, dynamicStyles.text]}>
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.monthButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={dynamicStyles.text.color}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.daysOfWeek}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <Text key={day} style={[styles.dayOfWeek, dynamicStyles.text]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((date, index) => {
              if (!date) {
                return (
                  <View key={`empty-${index}`} style={styles.calendarDay} />
                );
              }

              const isSelectedDate = isSelected(date);
              const isTodayDate = isToday(date);
              const isPastDate = isPast(date);
              const appointmentCount = getAppointmentsForDate(date);
              const hasAppointments = appointmentCount > 0;

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    styles.calendarDay,
                    isSelectedDate && styles.selectedDay,
                    isTodayDate && !isSelectedDate && styles.todayDay,
                  ]}
                  onPress={() => !isPastDate && handleDateSelect(date)}
                  disabled={isPastDate}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      dynamicStyles.text,
                      isSelectedDate && styles.selectedDayText,
                      isPastDate && styles.pastDayText,
                      isTodayDate && !isSelectedDate && styles.todayDayText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {hasAppointments && !isPastDate && (
                    <View
                      style={[
                        styles.appointmentDot,
                        isSelectedDate && styles.appointmentDotSelected,
                      ]}
                    >
                      {appointmentCount > 1 && (
                        <Text
                          style={[
                            styles.appointmentDotText,
                            isSelectedDate && styles.appointmentDotTextSelected,
                          ]}
                        >
                          {appointmentCount > 9 ? "9+" : appointmentCount}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              {selectedFilter === "all"
                ? "All Appointments"
                : `${filterTabs.find((t) => t.id === selectedFilter)?.label} Appointments`}
            </Text>
            <Text style={[styles.sectionCount, dynamicStyles.textSecondary]}>
              {filteredAppointments.length} appointment
              {filteredAppointments.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={[styles.emptyCard, dynamicStyles.card]}>
              <MaterialIcons
                name={
                  selectedDate !== null
                    ? "event-busy"
                    : selectedFilter === "completed"
                      ? "check-circle-outline"
                      : selectedFilter === "cancelled"
                        ? "cancel"
                        : "event-busy"
                }
                size={64}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, dynamicStyles.text]}>
                {selectedDate !== null
                  ? `No appointments on ${selectedDate.toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}`
                  : selectedFilter === "completed"
                    ? "No completed appointments yet"
                    : selectedFilter === "cancelled"
                      ? "No cancelled appointments"
                      : selectedFilter === "upcoming"
                        ? "No upcoming appointments"
                        : selectedFilter === "confirmed"
                          ? "No confirmed appointments"
                          : "No appointments found"}
              </Text>
              <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
                {selectedDate !== null
                  ? "Try selecting a different date or create a new booking"
                  : "Create a new booking to get started"}
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation?.navigate("Explore")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={20}
                  color={theme.colors.white}
                />
                <Text style={styles.exploreButtonText}>New Booking</Text>
              </TouchableOpacity>
              {selectedDate !== null && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setSelectedDate(null)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.clearDateButtonText, dynamicStyles.text]}
                  >
                    Clear Date Filter
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {filteredAppointments.map((appointment) => (
                <TouchableOpacity
                  key={appointment.id}
                  style={[styles.appointmentCard, dynamicStyles.card]}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation?.navigate("AppointmentDetail", {
                      appointmentId: appointment.id,
                      appointment,
                    })
                  }
                >
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentIconContainer}>
                      <MaterialIcons
                        name={getStatusIcon(appointment.status) as any}
                        size={24}
                        color={appointmentsService.getStatusColor(
                          appointment.status
                        )}
                      />
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text
                        style={[styles.appointmentService, dynamicStyles.text]}
                      >
                        {appointment.service?.name || "Service"}
                      </Text>
                      <Text
                        style={[
                          styles.appointmentSalon,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        {appointment.salon?.name || "Salon"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            appointmentsService.getStatusColor(
                              appointment.status
                            ) + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: appointmentsService.getStatusColor(
                              appointment.status
                            ),
                          },
                        ]}
                      >
                        {appointment.status
                          .replace("_", " ")
                          .toUpperCase()
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0) + word.slice(1).toLowerCase()
                          )
                          .join(" ")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.appointmentDetails}>
                    <View style={styles.appointmentTime}>
                      <MaterialIcons
                        name="access-time"
                        size={16}
                        color={dynamicStyles.textSecondary.color}
                      />
                      <Text
                        style={[
                          styles.appointmentDateTime,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        {formatDateLabel(appointment.scheduledStart)}{" "}
                        {formatTime(appointment.scheduledStart)}
                      </Text>
                    </View>

                    {appointment.salonEmployee?.user?.fullName && (
                      <View style={styles.appointmentEmployee}>
                        <MaterialIcons
                          name="person"
                          size={16}
                          color={dynamicStyles.textSecondary.color}
                        />
                        <Text
                          style={[
                            styles.appointmentEmployeeText,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          {appointment.salonEmployee.user.fullName}
                        </Text>
                      </View>
                    )}

                    {appointment.serviceAmount && (
                      <View style={styles.appointmentPrice}>
                        <MaterialIcons
                          name="attach-money"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.appointmentPriceText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          ${Number(appointment.serviceAmount).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  newBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    gap: theme.spacing.xs,
  },
  newBookingButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  headerBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  filterContainer: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
  },
  filterTabs: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  filterTabActive: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  filterTabTextActive: {
    color: theme.colors.white,
  },
  filterBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterBadgeActive: {
    backgroundColor: theme.colors.white,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: theme.colors.primary,
  },
  calendarContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  monthButton: {
    padding: theme.spacing.xs,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  daysOfWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.sm,
  },
  dayOfWeek: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    width: 40,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  todayDay: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  selectedDayText: {
    color: theme.colors.white,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  todayDayText: {
    color: theme.colors.primary,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  pastDayText: {
    opacity: 0.3,
  },
  appointmentDot: {
    position: "absolute",
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  appointmentDotSelected: {
    backgroundColor: theme.colors.white,
  },
  appointmentDotText: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
    position: "absolute",
    bottom: -2,
    right: -4,
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    textAlign: "center",
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  appointmentDotTextSelected: {
    backgroundColor: theme.colors.white,
    color: theme.colors.primary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  appointmentCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  appointmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs / 2,
  },
  appointmentSalon: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.5,
  },
  appointmentDetails: {
    gap: theme.spacing.xs,
  },
  appointmentTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  appointmentDateTime: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  appointmentEmployee: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  appointmentEmployeeText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  appointmentPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  appointmentPriceText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  emptyCard: {
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  clearDateButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  clearDateButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    textAlign: "center",
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    marginTop: theme.spacing.lg,
  },
  exploreButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
