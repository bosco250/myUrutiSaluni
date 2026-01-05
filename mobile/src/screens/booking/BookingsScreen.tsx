import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { Loader } from "../../components/common";
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

  // Calendar state
  const [currentWeek, setCurrentWeek] = useState(new Date());
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
            } catch {
              setLoading(false);
            }
          }, 500);
        }
      } catch {
        setLoading(false);
      }
    };

    fetchCustomerId();
  }, [user?.id]);

  // Fetch appointments when customer ID is available
  const fetchAppointments = useCallback(async () => {
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

      // Sort by creation time (newest first), then by scheduledStart date
      const sorted = data.sort((a, b) => {
        // Primary sort: creation time (newest first - descending)
        // Handle both camelCase (createdAt) and snake_case (created_at) from API
        const createdA = new Date(
          (a as any).created_at || a.createdAt || a.updatedAt || 0
        );
        const createdB = new Date(
          (b as any).created_at || b.createdAt || b.updatedAt || 0
        );
        const createdDiff = createdB.getTime() - createdA.getTime();

        // If creation times are different, sort by creation time
        if (createdDiff !== 0) {
          return createdDiff;
        }

        // Secondary sort: scheduledStart time (newest first - descending)
        const dateA = new Date(a.scheduledStart);
        const dateB = new Date(b.scheduledStart);
        return dateB.getTime() - dateA.getTime();
      });
      setAppointments(sorted);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      fetchAppointments();
    }
  }, [customerId, fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

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

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString("en-US", { weekday: "short" });
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

    // Normalize date to local date (year, month, day only)
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();

    return appointments.filter((apt) => {
      // Normalize appointment date to local date (year, month, day only)
      const aptDate = new Date(apt.scheduledStart);
      const aptYear = aptDate.getFullYear();
      const aptMonth = aptDate.getMonth();
      const aptDay = aptDate.getDate();

      // Compare dates in local timezone
      return (
        aptYear === dateYear && aptMonth === dateMonth && aptDay === dateDay
      );
    }).length;
  };

  // Filter appointments based on selected filter and selected date
  const filteredAppointments = useMemo(() => {
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
      // Normalize selected date to local date (year, month, day only)
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      filtered = filtered.filter((apt) => {
        // Normalize appointment date to local date (year, month, day only)
        const aptDate = new Date(apt.scheduledStart);
        const aptYear = aptDate.getFullYear();
        const aptMonth = aptDate.getMonth();
        const aptDay = aptDate.getDate();

        // Compare dates in local timezone
        return (
          aptYear === selectedYear &&
          aptMonth === selectedMonth &&
          aptDay === selectedDay
        );
      });
    }

    // Sort by creation time (newest first), then by scheduledStart date
    return filtered.sort((a, b) => {
      // Primary sort: creation time (newest first - descending)
      // Handle both camelCase (createdAt) and snake_case (created_at) from API
      const createdA = new Date(
        (a as any).created_at || a.createdAt || a.updatedAt || 0
      );
      const createdB = new Date(
        (b as any).created_at || b.createdAt || b.updatedAt || 0
      );
      const createdDiff = createdB.getTime() - createdA.getTime();

      // If creation times are different, sort by creation time
      if (createdDiff !== 0) {
        return createdDiff;
      }

      // Secondary sort: scheduledStart time (newest first - descending)
      const dateA = new Date(a.scheduledStart);
      const dateB = new Date(b.scheduledStart);
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

  const weekDays = getWeekDays(currentWeek);
  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    {
      id: "all",
      label: "All",
      count: appointments.length,
    },
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
  ];

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
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
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
          <MaterialIcons name="add" size={16} color={theme.colors.white} />
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
        {/* Compact Week Calendar */}
        <View style={[styles.calendarContainer, dynamicStyles.card]}>
          <View style={styles.weekDaysContainer}>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={handlePreviousWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-left"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {weekDays.map((date, index) => {
              const count = getAppointmentsForDate(date);
              const dateIsToday = isToday(date);
              const dateIsSelected = isSelected(date);
              const isPastDate = isPast(date);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekDay,
                    dateIsSelected && styles.weekDaySelected,
                    dateIsToday && !dateIsSelected && styles.weekDayToday,
                  ]}
                  onPress={() => handleDateSelect(date)}
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
                        (count > 1 && dateIsSelected) && { backgroundColor: theme.colors.white }
                      ]}
                    >
                      {count > 1 && (
                        <Text
                          style={[
                            styles.weekAppointmentDotText,
                            dateIsSelected && styles.weekAppointmentDotTextSelected,
                          ]}
                        >
                          {count}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={handleNextWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          
          {/* Month/Year Label below or above? Above looks better for context */}
          <View style={{ marginTop: theme.spacing.sm, alignItems: 'center' }}>
            <Text style={[styles.monthText, dynamicStyles.text, { fontSize: 13, opacity: 0.7 }]}>
              {currentWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
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

          {filteredAppointments.length === 0 ? (
            <View style={[styles.emptyCard, dynamicStyles.card]}>
              <View style={[styles.appointmentIconContainer, { width: 64, height: 64, borderRadius: 32, marginBottom: theme.spacing.md }]}>
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
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
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
                  size={16}
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
                  style={[
                    styles.appointmentCard, 
                    dynamicStyles.card,
                    { borderLeftColor: appointmentsService.getStatusColor(appointment.status) }
                  ]}
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
                        size={18}
                        color={appointmentsService.getStatusColor(
                          appointment.status
                        )}
                      />
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text
                        style={[styles.appointmentService, dynamicStyles.text, { fontSize: 16 }]}
                      >
                        {appointment.service?.name || "Service"}
                      </Text>
                      <Text
                        style={[
                          styles.appointmentSalon,
                          dynamicStyles.textSecondary,
                          { marginTop: 1 }
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
                        name="event"
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.appointmentDateTime,
                          dynamicStyles.text,
                          { fontWeight: '600' }
                        ]}
                      >
                        {formatDateLabel(appointment.scheduledStart)} at {formatTime(appointment.scheduledStart)}
                      </Text>
                    </View>

                    {((appointment as any).created_at ||
                      appointment.createdAt) && (
                      <View style={styles.appointmentTime}>
                        <MaterialIcons
                          name="add-circle-outline"
                          size={14}
                          color={dynamicStyles.textSecondary.color}
                        />
                        <Text
                          style={[
                            styles.appointmentDateTime,
                            dynamicStyles.textSecondary,
                          ]}
                        >
                          Created:{" "}
                          {formatDateLabel(
                            (appointment as any).created_at ||
                              appointment.createdAt
                          )}{" "}
                          {formatTime(
                            (appointment as any).created_at ||
                              appointment.createdAt
                          )}
                        </Text>
                      </View>
                    )}

                    {appointment.salonEmployee?.user?.fullName && (
                      <View style={styles.appointmentEmployee}>
                        <MaterialIcons
                          name="face"
                          size={14}
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
                          name="payments"
                          size={14}
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.appointmentPriceText,
                            { color: theme.colors.primary },
                          ]}
                        >
                          RWF {Number(appointment.serviceAmount).toLocaleString()}
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
    </SafeAreaView>
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
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  newBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    gap: theme.spacing.xs,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  newBookingButtonText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    fontSize: 14,
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
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
  },
  filterTabs: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm - 2,
    borderRadius: 25,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 12,
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
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderRadius: 20,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary + "50",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  monthButton: {
    padding: theme.spacing.xs / 2,
  },
  monthText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  daysOfWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.xs / 2,
  },
  dayOfWeek: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    width: 36,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    borderRadius: 12,
    marginHorizontal: 2,
    position: "relative",
  },
  weekDayToday: {
    backgroundColor: theme.colors.primary + "15",
  },
  weekDaySelected: {
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  weekDayNameSelected: {
    color: theme.colors.white,
    opacity: 1,
  },
  weekDayNameToday: {
    color: theme.colors.primary,
    opacity: 1,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  weekDayNumberSelected: {
    color: theme.colors.white,
  },
  weekDayNumberToday: {
    color: theme.colors.primary,
  },
  weekDayNumberPast: {
    opacity: 0.3,
  },
  weekAppointmentDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  weekAppointmentDotSelected: {
    backgroundColor: theme.colors.white,
  },
  weekAppointmentDotWithCount: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekAppointmentDotText: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
    textAlign: "center",
  },
  weekAppointmentDotTextSelected: {
    color: theme.colors.primary,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  appointmentCard: {
    borderRadius: 20,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  appointmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs / 2,
  },
  appointmentSalon: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3,
  },
  appointmentDetails: {
    gap: theme.spacing.xs / 2,
  },
  appointmentTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs / 2,
  },
  appointmentDateTime: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  appointmentEmployee: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  appointmentEmployeeText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  appointmentPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs / 2,
  },
  appointmentPriceText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  emptyCard: {
    borderRadius: 12,
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs / 2,
    marginBottom: theme.spacing.sm,
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    marginTop: theme.spacing.md,
  },
  exploreButtonText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
