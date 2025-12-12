import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { useAuth } from "../../context";
import { exploreService, Service, Employee, Salon } from "../../services/explore";
import {
  appointmentsService,
  TimeSlot,
  DayAvailability,
} from "../../services/appointments";
import { customersService } from "../../services/customers";

interface BookingFlowScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      serviceId: string;
      service?: Service;
      salonId?: string;
      employeeId?: string;
      reschedule?: boolean;
      appointmentId?: string;
    };
  };
}

type BookingStep = "employee" | "datetime" | "confirm";

const STEPS: { key: BookingStep; label: string; icon: string }[] = [
  { key: "employee", label: "Stylist", icon: "person" },
  { key: "datetime", label: "Date & Time", icon: "calendar-today" },
  { key: "confirm", label: "Review", icon: "check-circle" },
];

export default function BookingFlowScreen({
  navigation,
  route,
}: BookingFlowScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>("employee");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Service and Salon data
  const [service, setService] = useState<Service | null>(
    route?.params?.service || null
  );
  const [salon, setSalon] = useState<Salon | null>(null);
  const [operatingHours, setOperatingHours] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Booking state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    route?.params?.employeeId || ""
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Availability data
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState<string>("");

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;

  // Fetch initial data
  useEffect(() => {
    if (serviceId) {
      fetchInitialData();
    }
  }, [serviceId]);

  // Fetch customer ID
  useEffect(() => {
    if (user?.id) {
      fetchCustomerId();
    }
  }, [user?.id]);

  // Fetch availability when employee is selected
  useEffect(() => {
    if (selectedEmployeeId && service && currentStep === "datetime") {
      fetchAvailability();
    }
  }, [selectedEmployeeId, service, currentStep]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedEmployeeId && service) {
      fetchTimeSlots();
    }
  }, [selectedDate, selectedEmployeeId, service]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch service if not provided
      if (!service && serviceId) {
        const fetchedService = await exploreService.getServiceById(serviceId);
        setService(fetchedService);
      }

      // Fetch salon with full details including settings
      const salonIdToUse = service?.salonId || route?.params?.salonId;
      if (salonIdToUse) {
        const fetchedSalon = await exploreService.getSalonById(salonIdToUse, true);
        setSalon(fetchedSalon);
        
        // Parse operating hours from salon settings
        if (fetchedSalon.settings?.operatingHours) {
          try {
            const hours = typeof fetchedSalon.settings.operatingHours === 'string'
              ? JSON.parse(fetchedSalon.settings.operatingHours)
              : fetchedSalon.settings.operatingHours;
            setOperatingHours(hours);
          } catch (error) {
            // If parsing fails, operatingHours will remain null
          }
        }
        
        fetchEmployees(salonIdToUse);
      }
    } catch (error: any) {
      setError(error.message || "Failed to load booking data");
      Alert.alert("Error", error.message || "Failed to load booking data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerId = async () => {
    if (!user?.id) return;
    try {
      const userId = String(user.id);
      const customer = await customersService.getCustomerByUserId(userId);
      if (customer && customer.id) {
        setCustomerId(customer.id);
      }
    } catch (error: any) {
      // Customer might not exist yet, that's okay
    }
  };

  const fetchEmployees = async (salonId: string) => {
    try {
      setEmployeesLoading(true);
      const salonEmployees = await exploreService.getSalonEmployees(salonId);
      setEmployees(salonEmployees.filter((emp) => emp.isActive));
    } catch (error: any) {
      setError("Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedEmployeeId || !service) return;

    try {
      setAvailabilityLoading(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      const startDateStr = today.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      const availabilityData = await appointmentsService.getEmployeeAvailability(
        selectedEmployeeId,
        startDateStr,
        endDateStr,
        service.id,
        service.durationMinutes
      );
      setAvailability(availabilityData);
    } catch (error: any) {
      setError("Failed to load availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDate || !selectedEmployeeId || !service) return;

    try {
      setTimeSlotsLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      // Backend already uses salon operating hours when generating time slots
      // No need to filter client-side - trust the backend response
      const slots = await appointmentsService.getEmployeeTimeSlots(
        selectedEmployeeId,
        dateStr,
        service.durationMinutes,
        service.id
      );
      
      // Use slots directly from backend - they already respect operating hours
      setTimeSlots(slots);
    } catch (error: any) {
      setError("Failed to load time slots");
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  const handleNext = () => {
    if (currentStep === "employee") {
      if (!selectedEmployeeId) {
        setError("Please select a stylist");
        return;
      }
      setCurrentStep("datetime");
      setError("");
    } else if (currentStep === "datetime") {
      if (!selectedDate || !selectedSlot) {
        setError("Please select a date and time");
        return;
      }
      setCurrentStep("confirm");
      setError("");
    }
  };

  const handleBack = () => {
    if (currentStep === "datetime") {
      setCurrentStep("employee");
      setError("");
    } else if (currentStep === "confirm") {
      setCurrentStep("datetime");
      setError("");
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !selectedEmployeeId || !service || !salon) {
      setError("Please complete all booking details");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Build scheduled start/end times from database time slots
      const [startHour, startMinute] = selectedSlot.startTime
        .split(":")
        .map(Number);
      const scheduledStart = new Date(selectedDate);
      scheduledStart.setHours(startHour, startMinute, 0, 0);

      const [endHour, endMinute] = selectedSlot.endTime
        .split(":")
        .map(Number);
      const scheduledEnd = new Date(selectedDate);
      scheduledEnd.setHours(endHour, endMinute, 0, 0);

      // Create appointment
      const appointmentData = {
        salonId: salon.id,
        serviceId: service.id,
        customerId: customerId || undefined,
        salonEmployeeId: selectedEmployeeId,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        status: "pending" as const,
        notes: notes.trim() || undefined,
      };

      const appointment = await appointmentsService.createAppointment(appointmentData);

      Alert.alert(
        "Success",
        "Appointment booked successfully!",
        [
          {
            text: "View Booking",
            onPress: () => {
              navigation?.navigate("AppointmentDetail", {
                appointmentId: appointment.id,
                appointment,
              });
            },
          },
          {
            text: "OK",
            onPress: () => navigation?.goBack(),
          },
        ]
      );
    } catch (error: any) {
      setError(error.message || "Failed to create appointment");
      Alert.alert("Error", error.message || "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
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

  const isDateAvailable = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayAvailability = availability.find((a) => a.date === dateStr);
    return dayAvailability && dayAvailability.availableSlots > 0;
  };

  const isDateSelected = (date: Date | null) => {
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, dynamicStyles.text]}>
          Loading booking...
        </Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Service not found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const days = getDaysInMonth(currentMonth);
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.container]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Book {service.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress Steps */}
      <View style={[styles.progressContainer, dynamicStyles.card]}>
        {STEPS.map((step, index) => (
          <React.Fragment key={step.key}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  currentStepIndex >= index && styles.progressCircleActive,
                  currentStepIndex > index && styles.progressCircleCompleted,
                ]}
              >
                {currentStepIndex > index ? (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={theme.colors.white}
                  />
                ) : (
                  <MaterialIcons
                    name={step.icon as any}
                    size={20}
                    color={
                      currentStepIndex >= index
                        ? theme.colors.white
                        : dynamicStyles.textSecondary.color
                    }
                  />
                )}
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  currentStepIndex >= index
                    ? dynamicStyles.text
                    : dynamicStyles.textSecondary,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  currentStepIndex > index && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={20}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Employee Selection */}
        {currentStep === "employee" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>
              Select Your Stylist
            </Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
              Choose a preferred stylist or select "Any Available"
            </Text>

            {employeesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : employees.length === 0 ? (
              <View style={[styles.emptyCard, dynamicStyles.card]}>
                <MaterialIcons
                  name="person-off"
                  size={48}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.text]}>
                  No stylists available
                </Text>
              </View>
            ) : (
              <View style={styles.employeesList}>
                {employees.map((employee) => (
                  <TouchableOpacity
                    key={employee.id}
                    style={[
                      styles.employeeCard,
                      dynamicStyles.card,
                      selectedEmployeeId === employee.id &&
                        styles.employeeCardSelected,
                    ]}
                    onPress={() => handleEmployeeSelect(employee.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.employeeInfo}>
                      <View style={styles.employeeAvatar}>
                        <Text style={styles.employeeInitials}>
                          {employee.user?.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "?"}
                        </Text>
                      </View>
                      <View style={styles.employeeDetails}>
                        <Text style={[styles.employeeName, dynamicStyles.text]}>
                          {employee.user?.fullName || "Unknown"}
                        </Text>
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
                    </View>
                    {selectedEmployeeId === employee.id && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Date & Time Selection */}
        {currentStep === "datetime" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>
              Select Date & Time
            </Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
              Choose your preferred date and time slot
            </Text>

            {/* Calendar */}
            <View style={[styles.calendarContainer, dynamicStyles.card]}>
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  onPress={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  style={styles.monthButton}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={24}
                    color={dynamicStyles.text.color}
                  />
                </TouchableOpacity>
                <Text style={[styles.monthText, dynamicStyles.text]}>
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  style={styles.monthButton}
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
                  <Text
                    key={day}
                    style={[styles.dayOfWeek, dynamicStyles.text]}
                  >
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

                  const isSelected = isDateSelected(date);
                  const isAvailable = isDateAvailable(date);
                  const isPastDate = isPast(date);
                  
                  // Backend availability already considers salon operating hours
                  // So we can trust isDateAvailable which checks backend availability data
                  const isDayAvailable = isAvailable;

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.calendarDay,
                        isSelected && styles.selectedDay,
                        isDayAvailable && !isSelected && styles.availableDay,
                      ]}
                      onPress={() => !isPastDate && isDayAvailable && handleDateSelect(date)}
                      disabled={isPastDate || !isDayAvailable}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          dynamicStyles.text,
                          isSelected && styles.selectedDayText,
                          (!isDayAvailable || isPastDate) &&
                            styles.unavailableDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Slots */}
            {selectedDate && (
              <View style={styles.timeSlotsContainer}>
                <Text style={[styles.timeSlotsTitle, dynamicStyles.text]}>
                  Available Times
                </Text>
                {timeSlotsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  </View>
                ) : timeSlots.length === 0 ? (
                  <Text style={[styles.noSlotsText, dynamicStyles.textSecondary]}>
                    No available time slots for this date
                  </Text>
                ) : (
                  <View style={styles.timeSlotsGrid}>
                    {timeSlots
                      .filter((slot) => slot.available)
                      .map((slot, index) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime &&
                          selectedSlot?.endTime === slot.endTime;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timeSlot,
                              dynamicStyles.card,
                              isSelected && styles.timeSlotSelected,
                            ]}
                            onPress={() => handleSlotSelect(slot)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.timeSlotText,
                                dynamicStyles.text,
                                isSelected && styles.timeSlotTextSelected,
                              ]}
                            >
                              {formatTime(slot.startTime)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === "confirm" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>
              Review Your Booking
            </Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
              Please review your appointment details
            </Text>

            <View style={[styles.confirmCard, dynamicStyles.card]}>
              {/* Service */}
              <View style={styles.confirmRow}>
                <MaterialIcons
                  name="spa"
                  size={20}
                  color={theme.colors.primary}
                />
                <View style={styles.confirmRowContent}>
                  <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>
                    Service
                  </Text>
                  <Text style={[styles.confirmValue, dynamicStyles.text]}>
                    {service.name}
                  </Text>
                </View>
              </View>

              {/* Stylist */}
              {selectedEmployee && (
                <View style={styles.confirmRow}>
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>
                      Stylist
                    </Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>
                      {selectedEmployee.user?.fullName || "Unknown"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Date */}
              {selectedDate && (
                <View style={styles.confirmRow}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>
                      Date
                    </Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Time */}
              {selectedSlot && (
                <View style={styles.confirmRow}>
                  <MaterialIcons
                    name="access-time"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>
                      Scheduled Time
                    </Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>
                      {formatTime(selectedSlot.startTime)} -{" "}
                      {formatTime(selectedSlot.endTime)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Price */}
              <View style={styles.confirmRow}>
                <MaterialIcons
                  name="attach-money"
                  size={20}
                  color={theme.colors.primary}
                />
                <View style={styles.confirmRowContent}>
                  <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>
                    Price
                  </Text>
                  <Text style={[styles.confirmValue, dynamicStyles.text]}>
                    ${Number(service.basePrice).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.notesContainer}>
                <Text style={[styles.notesLabel, dynamicStyles.text]}>
                  Additional Notes (Optional)
                </Text>
                <TextInput
                  style={[styles.notesInput, dynamicStyles.card, dynamicStyles.text]}
                  placeholder="Any special requests or notes..."
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.navigationContainer, dynamicStyles.container]}>
        {currentStepIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={dynamicStyles.text.color}
            />
            <Text style={[styles.navButtonText, dynamicStyles.text]}>Back</Text>
          </TouchableOpacity>
        )}
        {currentStepIndex < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
            activeOpacity={0.7}
            disabled={
              (currentStep === "employee" && !selectedEmployeeId) ||
              (currentStep === "datetime" && (!selectedDate || !selectedSlot))
            }
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={theme.colors.white}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.confirmButton]}
            onPress={handleConfirmBooking}
            activeOpacity={0.7}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={theme.colors.white}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: 12,
    gap: theme.spacing.xs,
  },
  progressStep: {
    alignItems: "center",
    gap: theme.spacing.xs / 2,
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  progressCircleCompleted: {
    backgroundColor: theme.colors.success,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.xs,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.error + "10",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.fonts.regular,
  },
  employeesList: {
    gap: theme.spacing.md,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  employeeCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primaryLight + "10",
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  employeeInitials: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.medium,
  },
  employeeRole: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  calendarContainer: {
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
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
    width: 40,
    textAlign: "center",
    fontFamily: theme.fonts.medium,
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
  },
  availableDay: {
    backgroundColor: theme.colors.primaryLight + "20",
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
  unavailableDayText: {
    opacity: 0.3,
  },
  timeSlotsContainer: {
    marginTop: theme.spacing.md,
  },
  timeSlotsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    minWidth: 100,
    alignItems: "center",
  },
  timeSlotSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  timeSlotUnavailable: {
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  timeSlotTextSelected: {
    color: theme.colors.white,
  },
  timeSlotTextUnavailable: {
    textDecorationLine: "line-through",
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  confirmCard: {
    padding: theme.spacing.lg,
    borderRadius: 12,
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  confirmRowContent: {
    flex: 1,
  },
  confirmLabel: {
    fontSize: 12,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  notesContainer: {
    marginTop: theme.spacing.md,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 8,
    padding: theme.spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: "center",
    borderRadius: 12,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  backButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
  },
  confirmButton: {
    backgroundColor: theme.colors.success,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  nextButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
});

