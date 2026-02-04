import React, { useState, useEffect, useCallback } from "react";
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
import {
  exploreService,
  Service,
  Employee,
  Salon,
} from "../../services/explore";
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

type BookingStep = "service" | "employee" | "datetime" | "confirm";

// Dynamic steps based on context:
// - Skip service step if service is pre-selected
// - Skip employee step if employee is pre-selected (booking from favorites)
const getSteps = (hasService: boolean, hasEmployee: boolean): { key: BookingStep; label: string; icon: string }[] => {
  const steps: { key: BookingStep; label: string; icon: string }[] = [];
  if (!hasService) {
    steps.push({ key: "service", label: "Service", icon: "spa" });
  }
  if (!hasEmployee) {
    steps.push({ key: "employee", label: "Stylist", icon: "person" });
  }
  steps.push(
    { key: "datetime", label: "Date & Time", icon: "calendar-today" },
    { key: "confirm", label: "Review", icon: "check-circle" }
  );
  return steps;
};

export default function BookingFlowScreen({
  navigation,
  route,
}: BookingFlowScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  // Determine if we have a pre-selected service
  const hasPreSelectedService = !!(route?.params?.serviceId || route?.params?.service);
  
  // Determine if we have a pre-selected employee (booking from favorites)
  const hasPreSelectedEmployee = !!route?.params?.employeeId;
  
  // Dynamic steps based on what's pre-selected
  const STEPS = getSteps(hasPreSelectedService, hasPreSelectedEmployee);
  
  // Determine initial step based on what's pre-selected
  const getInitialStep = (): BookingStep => {
    if (!hasPreSelectedService) return "service";
    if (!hasPreSelectedEmployee) return "employee";
    return "datetime";
  };
  
  const [currentStep, setCurrentStep] = useState<BookingStep>(getInitialStep());
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
  
  // Services list for when booking from favorites (no service pre-selected)
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Booking state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    route?.params?.employeeId || ""
  );
  const [isAnyEmployee, setIsAnyEmployee] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Availability data
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [, setAvailabilityLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState<string>("");

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;

  // Fetch initial data
  const fetchEmployees = useCallback(async (salonId: string) => {
    try {
      setEmployeesLoading(true);
      const salonEmployees = await exploreService.getSalonEmployees(salonId);
      setEmployees(salonEmployees.filter((emp) => emp.isActive));
    } catch {
      setError("Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // Fetch services for the salon (used when booking from favorites)
  const fetchServices = useCallback(async (salonId: string) => {
    try {
      setServicesLoading(true);
      const salonServices = await exploreService.getServices(salonId);
      setServices(salonServices.filter((s: Service) => s.isActive !== false));
    } catch {
      setError("Failed to load services");
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
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
        const fetchedSalon = await exploreService.getSalonById(
          salonIdToUse,
          true
        );
        setSalon(fetchedSalon);

        // Parse operating hours from salon settings (stored during registration)
        // Check for both "operatingHours" (detailed format) and "openingHours" (simple format)
        let parsedHours = null;

        if (fetchedSalon.settings?.operatingHours) {
          try {
            // Operating hours can be stored as JSON string (possibly with escaped quotes) or already parsed object
            let hours;
            if (typeof fetchedSalon.settings.operatingHours === "string") {
              // Try parsing - handle both regular JSON and escaped JSON strings
              try {
                hours = JSON.parse(fetchedSalon.settings.operatingHours);
              } catch {
                // If first parse fails, try parsing again (in case of double-encoded JSON)
                try {
                  const unescaped =
                    fetchedSalon.settings.operatingHours.replace(/\\"/g, '"');
                  hours = JSON.parse(unescaped);
                } catch {
                  // If still fails, try direct parse of the string
                  hours = JSON.parse(fetchedSalon.settings.operatingHours);
                }
              }
            } else {
              hours = fetchedSalon.settings.operatingHours;
            }

            // Verify structure: should have lowercase day names (monday, tuesday, etc.)
            // Each day should have: { isOpen: boolean, startTime: string, endTime: string }
            if (hours && typeof hours === "object" && !Array.isArray(hours)) {
              // Validate that it has at least one day with the expected structure
              const firstDay = Object.keys(hours)[0];
              if (
                firstDay &&
                hours[firstDay] &&
                typeof hours[firstDay] === "object"
              ) {
                if (
                  hours[firstDay].hasOwnProperty("isOpen") &&
                  hours[firstDay].hasOwnProperty("startTime") &&
                  hours[firstDay].hasOwnProperty("endTime")
                ) {
                  parsedHours = hours;
                }
              }
            }
          } catch {
            // If parsing fails, try openingHours as fallback
          }
        }

        // Fallback: If operatingHours not found, check for openingHours (simple format like "08:00-20:00")
        if (!parsedHours && fetchedSalon.settings?.openingHours) {
          try {
            const openingHoursStr = fetchedSalon.settings.openingHours;
            // Parse format like "08:00-20:00"
            const match = openingHoursStr.match(
              /(\d{2}):(\d{2})-(\d{2}):(\d{2})/
            );
            if (match) {
              const startTime = `${match[1]}:${match[2]}`;
              const endTime = `${match[3]}:${match[4]}`;

              // Convert to day-by-day format (all days open with same hours)
              parsedHours = {
                monday: { isOpen: true, startTime, endTime },
                tuesday: { isOpen: true, startTime, endTime },
                wednesday: { isOpen: true, startTime, endTime },
                thursday: { isOpen: true, startTime, endTime },
                friday: { isOpen: true, startTime, endTime },
                saturday: { isOpen: true, startTime, endTime },
                sunday: { isOpen: true, startTime, endTime },
              };
            }
          } catch {
            // If parsing fails, operatingHours will remain null
          }
        }

        if (parsedHours) {
          setOperatingHours(parsedHours);
        }

        fetchEmployees(salonIdToUse);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load booking data");
      Alert.alert("Error", err.message || "Failed to load booking data");
    } finally {
      setLoading(false);
    }
  }, [service, serviceId, route?.params?.salonId, fetchEmployees]);

  const fetchCustomerId = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userId = String(user.id);
      const customer = await customersService.getCustomerByUserId(userId);
      if (customer && customer.id) {
        setCustomerId(customer.id);
      }
    } catch {
      // Customer might not exist yet, that's okay
    }
  }, [user?.id]);

  const fetchAvailability = useCallback(async () => {
    if (!service) return;

    try {
      setAvailabilityLoading(true);

      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);
      const startDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Determine target employees
      let targetEmployees: Employee[] = [];
      if (selectedEmployeeId && selectedEmployeeId !== "any") {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        if (emp) targetEmployees = [emp];
      } else if (isAnyEmployee) {
        targetEmployees = employees.filter(e => e.isActive);
      }

      // If no valid employees (and not checking just operating hours fallback), return empty
      // But wait! If isAnyEmployee, we SHOULD check employees.
      if (targetEmployees.length === 0) {
         setAvailability([]);
         return;
      }

      // Fetch availability for all target employees parallel
      const availPromises = targetEmployees.map(emp => 
        appointmentsService.getEmployeeAvailability(
            emp.id,
            startDateStr,
            endDateStr,
            service.id,
            service.durationMinutes
        ).catch(() => [])
      );

      const results = await Promise.all(availPromises);

      // Aggregate: Map<dateString, DayAvailability>
      const aggMap = new Map<string, DayAvailability>();

      // Initialize with dates if needed, or just let merging handle it (api returns sparse or full?)
      // Assume API returns full range.

      results.flat().forEach(day => {
          if (!day || !day.date) return;
          const existing = aggMap.get(day.date);

          if (!existing) {
              aggMap.set(day.date, { ...day });
          } else {
              // Merge Logic
              // Status priority: available > partially_booked > fully_booked > unavailable
              let newStatus = existing.status;
              if (day.status === 'available') newStatus = 'available';
              else if (day.status === 'partially_booked' && existing.status !== 'available') newStatus = 'partially_booked';
              else if (day.status === 'fully_booked' && existing.status === 'unavailable') newStatus = 'fully_booked';
              
              const newTotal = existing.totalSlots + day.totalSlots;
              const newAvailable = existing.availableSlots + day.availableSlots;
              
              aggMap.set(day.date, {
                  date: day.date,
                  status: newStatus,
                  totalSlots: newTotal,
                  availableSlots: newAvailable
              });
          }
      });

      setAvailability(Array.from(aggMap.values()).sort((a,b) => a.date.localeCompare(b.date)));

    } catch {
      setError("Failed to load availability");
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [service, isAnyEmployee, selectedEmployeeId, employees]);

  const fetchTimeSlots = useCallback(async () => {
    if (!selectedDate || !service) {
      return;
    }

    // Determine target employees: specific one or all active ones
    let targetEmployees: Employee[] = [];
    if (selectedEmployeeId && selectedEmployeeId !== "any") {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) targetEmployees = [emp];
    } else if (isAnyEmployee) {
      targetEmployees = employees.filter(e => e.isActive);
    }

    if (targetEmployees.length === 0) {
      setTimeSlots([]);
      return;
    }

    try {
      setTimeSlotsLoading(true);
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      const slotsPromises = targetEmployees.map(emp => 
        appointmentsService.getEmployeeTimeSlots(
          emp.id,
          dateStr,
          service.durationMinutes,
          service.id
        ).catch(() => []) 
      );

      const allResults = await Promise.all(slotsPromises);
      const aggregatedSlotsMap = new Map<string, TimeSlot>();

      allResults.flat().forEach(slot => {
         if (!slot || !slot.startTime) return;
         const key = slot.startTime;
         const existing = aggregatedSlotsMap.get(key);
         const isAvailable = slot.available === true;

         if (!existing) {
           aggregatedSlotsMap.set(key, { ...slot, available: isAvailable });
         } else if (!existing.available && isAvailable) {
             aggregatedSlotsMap.set(key, { ...slot, available: true, reason: undefined });
         }
      });

      const validSlots = Array.from(aggregatedSlotsMap.values())
        .sort((a, b) => {
          const timeA = a.startTime.split(":").map(Number);
          const timeB = b.startTime.split(":").map(Number);
          const minutesA = timeA[0] * 60 + timeA[1];
          const minutesB = timeB[0] * 60 + timeB[1];
          return minutesA - minutesB;
        });

      setTimeSlots(validSlots);
    } catch {
      setError("Failed to load time slots. Please try again.");
      setTimeSlots([]);
    } finally {
      setTimeSlotsLoading(false);
    }
  }, [selectedDate, selectedEmployeeId, isAnyEmployee, service, employees]);



  useEffect(() => {
    if (serviceId) {
      // Normal flow - service is pre-selected
      fetchInitialData();
    } else if (route?.params?.salonId) {
      // Booking from favorites - need to load salon, services, and employees
      const loadDataForFavorites = async () => {
        try {
          setLoading(true);
          setError("");
          
          const salonId = route.params!.salonId!;
          
          // Fetch salon details
          const fetchedSalon = await exploreService.getSalonById(salonId, true);
          setSalon(fetchedSalon);
          
          // Parse operating hours
          let parsedHours = null;
          if (fetchedSalon.settings?.operatingHours) {
            try {
              let hours;
              if (typeof fetchedSalon.settings.operatingHours === "string") {
                hours = JSON.parse(fetchedSalon.settings.operatingHours);
              } else {
                hours = fetchedSalon.settings.operatingHours;
              }
              if (hours && typeof hours === "object" && !Array.isArray(hours)) {
                parsedHours = hours;
              }
            } catch {
              // Parsing failed
            }
          }
          if (parsedHours) {
            setOperatingHours(parsedHours);
          }
          
          // Fetch services for this salon
          await fetchServices(salonId);
          
          // Fetch employees for this salon
          await fetchEmployees(salonId);
        } catch (err: any) {
          setError(err.message || "Failed to load booking data");
          Alert.alert("Error", err.message || "Failed to load booking data");
        } finally {
          setLoading(false);
        }
      };
      
      loadDataForFavorites();
    } else {
      // No service or salon provided - show error
      setLoading(false);
      setError("No service or salon selected for booking");
    }
  }, [serviceId, route?.params?.salonId, route?.params, fetchInitialData, fetchServices, fetchEmployees]);

  useEffect(() => {
    if (user?.id) {
      fetchCustomerId();
    }
  }, [user?.id, fetchCustomerId]);

  useEffect(() => {
    // Only fetch if we have a valid employee ID (not "any") and we're on the datetime step
    if (
      selectedEmployeeId &&
      selectedEmployeeId !== "any" &&
      service &&
      currentStep === "datetime"
    ) {
      fetchAvailability();
    } else if (
      isAnyEmployee &&
      service &&
      currentStep === "datetime"
    ) {
      fetchAvailability();
    }
  }, [selectedEmployeeId, isAnyEmployee, service, currentStep, fetchAvailability]);

  useEffect(() => {
    if (selectedDate && service) {
      if (isAnyEmployee || (selectedEmployeeId && selectedEmployeeId !== "any")) {
        // Fetch time slots (aggregating if Any, specific if ID)
        fetchTimeSlots();
      } else {
        // No valid employee selected
        setTimeSlots([]);
      }
    } else {
      setTimeSlots([]);
    }
  }, [
    selectedDate,
    selectedEmployeeId,
    isAnyEmployee,
    service,
    fetchTimeSlots,
  ]);

  const handleEmployeeSelect = (employeeId: string) => {
    if (employeeId === "any") {
      setIsAnyEmployee(true);
      setSelectedEmployeeId("any");
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailability([]);
      setTimeSlots([]);
    } else {
      setIsAnyEmployee(false);
      setSelectedEmployeeId(employeeId);
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setError(""); // Clear errors when selecting a new date
    // Time slots will be automatically fetched via useEffect
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    // Only allow selection of explicitly available slots
    if (slot.available === true) {
      setSelectedSlot(slot);
      setError(""); // Clear any previous errors
    } else {
      setError(slot.reason || "This time slot is not available");
      // Don't set selected slot if unavailable
      setSelectedSlot(null);
    }
  };

  const handleNext = () => {
    if (currentStep === "service") {
      if (!service) {
        setError("Please select a service");
        return;
      }
      // Skip employee step if employee is pre-selected (from favorites)
      if (hasPreSelectedEmployee) {
        setCurrentStep("datetime");
      } else {
        setCurrentStep("employee");
      }
      setError("");
    } else if (currentStep === "employee") {
      if (!selectedEmployeeId && !isAnyEmployee) {
        setError("Please select a stylist or choose 'Any Available'");
        return;
      }
      setCurrentStep("datetime");
      setError("");
    } else if (currentStep === "datetime") {
      if (!selectedDate) {
        setError("Please select a date");
        return;
      }
      // If "Any Available" is selected, require manual time selection
      if (isAnyEmployee && !selectedSlot) {
        setError("Please select a time");
        return;
      }
      // If specific employee is selected, require time slot
      if (!isAnyEmployee && !selectedSlot) {
        setError("Please select a time slot");
        return;
      }
      // Double-check that selected slot is actually available
      if (selectedSlot && selectedSlot.available !== true) {
        setError("The selected time slot is no longer available. Please select another time.");
        setSelectedSlot(null);
        // Refresh slots
        if (selectedDate && selectedEmployeeId && selectedEmployeeId !== "any") {
          fetchTimeSlots();
        }
        return;
      }
      setCurrentStep("confirm");
      setError("");
    }
  };

  const handleBack = () => {
    if (currentStep === "employee" && !hasPreSelectedService) {
      setCurrentStep("service");
      setError("");
    } else if (currentStep === "datetime") {
      // Go back to employee step only if employee wasn't pre-selected
      if (hasPreSelectedEmployee) {
        // Skip employee step, go to service if no pre-selected service
        if (!hasPreSelectedService) {
          setCurrentStep("service");
        } else {
          // Can't go back further, already at first step for this flow
          navigation?.goBack();
        }
      } else {
        setCurrentStep("employee");
      }
      setError("");
    } else if (currentStep === "confirm") {
      setCurrentStep("datetime");
      setError("");
    }
  };


  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !service || !salon) {
      setError("Please complete all booking details");
      return;
    }
    // Employee is optional - only required if not "Any Available"
    if (!isAnyEmployee && !selectedEmployeeId) {
      setError("Please select a stylist or choose 'Any Available'");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Build scheduled start/end times from time slot
      const [startHour, startMinute] = selectedSlot.startTime
        .split(":")
        .map(Number);
      const scheduledStart = new Date(selectedDate);
      scheduledStart.setHours(startHour, startMinute, 0, 0);

      // Calculate end time from start time + duration
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(
        scheduledEnd.getMinutes() + (service.durationMinutes || 30)
      );

      // Validate booking first - ALWAYS validate to prevent double bookings
      // For "Any Available", we still validate but don't specify employee
      if (selectedEmployeeId && selectedEmployeeId !== "any") {
        try {
          const validation = await appointmentsService.validateBooking({
            employeeId: selectedEmployeeId,
            serviceId: service.id,
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
          });

          if (!validation.valid) {
            setError(
              validation.reason ||
                "This time slot is no longer available. Please select another time."
            );
            // Refresh availability and time slots to get latest status
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split("T")[0];
              try {
                const slots = await appointmentsService.getEmployeeTimeSlots(
                  selectedEmployeeId,
                  dateStr,
                  service.durationMinutes,
                  service.id
                );
                // Process and set slots
                const processedSlots = Array.isArray(slots) ? slots : [];
                const validSlots = processedSlots
                  .filter((slot) => slot && slot.startTime && slot.endTime)
                  .sort((a, b) => {
                    const timeA = a.startTime.split(":").map(Number);
                    const timeB = b.startTime.split(":").map(Number);
                    const minutesA = timeA[0] * 60 + timeA[1];
                    const minutesB = timeB[0] * 60 + timeB[1];
                    return minutesA - minutesB;
                  });
                setTimeSlots(validSlots);
                // Clear selected slot if it's now unavailable
                if (selectedSlot && !validSlots.find(
                  (s) => s.startTime === selectedSlot.startTime && s.available !== false
                )) {
                  setSelectedSlot(null);
                }
              } catch {
                // Ignore refresh errors
              }
            }
            setSubmitting(false);
            return;
          }
        } catch (validationError: any) {
          setError(
            validationError.message ||
              "Failed to validate booking. Please try again."
          );
          setSubmitting(false);
          return;
        }
      } else if (isAnyEmployee) {
        // For "Any Available", we can't validate specific employee, but backend will handle assignment
        // Still check if the slot itself is valid (not in past, etc.)
        const now = new Date();
        if (scheduledStart < now) {
          setError("Cannot book appointments in the past");
          setSubmitting(false);
          return;
        }
      }

      // Create or Update appointment
      const appointmentData: any = {
        salonId: salon.id,
        serviceId: service.id,
        customerId: customerId || undefined,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        status: route?.params?.reschedule ? undefined : ("pending" as const),
        notes: notes.trim() || undefined,
      };

      // Only include salonEmployeeId if a specific employee was selected
      if (!isAnyEmployee && selectedEmployeeId && selectedEmployeeId !== "any") {
        appointmentData.salonEmployeeId = selectedEmployeeId;
      }

      let appointment;
      if (route?.params?.reschedule && route?.params?.appointmentId) {
        appointment = await appointmentsService.updateAppointment(
          route.params.appointmentId,
          appointmentData
        );
      } else {
        appointment = await appointmentsService.createAppointment(appointmentData);
      }

      Alert.alert(
        "Success",
        route?.params?.reschedule
          ? "Appointment rescheduled successfully!"
          : "Appointment booked successfully!",
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
      // Check if error is about availability
      if (
        error.message?.includes("not available") ||
        error.message?.includes("conflict") ||
        error.message?.includes("already booked")
      ) {
        setError(
          "This time slot is no longer available. Please select another time."
        );
        // Refresh time slots
        if (selectedDate && selectedEmployeeId && selectedEmployeeId !== "any") {
          const dateStr = selectedDate.toISOString().split("T")[0];
          try {
            const slots = await appointmentsService.getEmployeeTimeSlots(
              selectedEmployeeId,
              dateStr,
              service.durationMinutes,
              service.id
            );
            setTimeSlots(slots);
          } catch {
            // Ignore refresh errors
          }
        }
      } else {
        setError(error.message || "Failed to create appointment");
      }
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
    // If "Any Available" is selected, check operating hours
    if (isAnyEmployee && operatingHours) {
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayIndex = date.getDay();
      const dayName = dayNames[dayIndex];
      const dayHours = operatingHours[dayName];

      // Salon must be open on this day
      if (!dayHours || !dayHours.isOpen) {
        return false;
      }

      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      return checkDate >= today;
    }

    // For specific employee, use availability data from backend
    // CRITICAL: Use local date format, NOT toISOString() which converts to UTC
    // toISOString() causes timezone issues (e.g., Dec 29 in UTC+2 becomes Dec 28 in UTC)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
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
    
    // Create dates at START of day (00:00:00) in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Compare timestamps (both normalized to midnight)
    return checkDate.getTime() < today.getTime();
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
      backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.background,
    },
    header: {
      backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.textInverse : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray500 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.backgroundSecondary,
      borderColor: isDark ? theme.colors.gray800 : "transparent",
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      color: isDark ? theme.colors.textInverse : theme.colors.text,
      borderColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    },
    dot: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    button: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    border: {
      borderColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    },
    icon: {
      color: isDark ? theme.colors.textInverse : theme.colors.text,
    }
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

  // Only show "Service not found" if we're past the service selection step
  // or if we came with a serviceId that didn't load
  if (!service && hasPreSelectedService) {
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={dynamicStyles.container.backgroundColor} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {currentStep === 'service' ? 'Select Service' : 
           currentStep === 'employee' ? 'Select Stylist' :
           currentStep === 'datetime' ? 'Date & Time' : 
           route?.params?.reschedule ? 'Reschedule Appointment' : 'Review Booking'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Modern Progress Dots */}
      <View style={styles.progressContainer}>
        {STEPS.map((step, index) => (
          <View key={step.key} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                dynamicStyles.dot,
                currentStepIndex === index && styles.progressDotActive,
                currentStepIndex > index && styles.progressDotCompleted,
              ]}
            >
              {currentStepIndex > index ? (
                <MaterialIcons name="check" size={18} color={theme.colors.white} />
              ) : (
                <Text style={{ 
                  color: currentStepIndex === index ? theme.colors.white : dynamicStyles.textSecondary.color, 
                  fontSize: 14, 
                  fontWeight: 'bold',
                  fontFamily: theme.fonts.bold
                }}>
                  {index + 1}
                </Text>
              )}
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
                  currentStepIndex > index && styles.progressLineCompleted,
                  currentStepIndex === index && styles.progressLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={24}
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
        {/* Step: Service Selection */}
        {currentStep === "service" && (
          <View style={styles.stepContent}>
            {hasPreSelectedEmployee && selectedEmployee && (
              <View style={[styles.selectedStylistBanner]}>
                <View style={styles.selectedStylistContent}>
                  <View style={styles.selectedStylistAvatar}>
                    <Text style={styles.selectedStylistInitials}>
                      {selectedEmployee.user?.fullName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.selectedStylistInfo}>
                    <Text style={styles.selectedStylistLabel}>Booking with</Text>
                    <Text style={[styles.selectedStylistName, dynamicStyles.text]}>
                      {selectedEmployee.user?.fullName}
                    </Text>
                    {salon && (
                      <Text style={[styles.selectedStylistSalon, dynamicStyles.textSecondary]}>at {salon.name}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.stepTitle, dynamicStyles.text]}>Which service?</Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>Choose a service to continue</Text>

            {servicesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : services.length === 0 ? (
              <View style={[styles.emptyCard, dynamicStyles.card, dynamicStyles.border]}>
                <MaterialIcons name="spa" size={48} color={dynamicStyles.textSecondary.color} />
                <Text style={[styles.emptyText, dynamicStyles.text]}>No services found</Text>
                <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>This salon hasn't listed any services yet.</Text>
              </View>
            ) : (
              <View style={styles.employeesList}>
                {services.map((svc) => {
                  const isSelected = service?.id === svc.id;
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[
                        styles.employeeCard,
                        dynamicStyles.card,
                        dynamicStyles.border,
                        isSelected && styles.employeeCardSelected,
                      ]}
                      onPress={() => setService(svc)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.employeeInfo}>
                        <View style={[styles.employeeAvatar, { 
                          backgroundColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray800 : theme.colors.white), 
                          borderColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight),
                          elevation: isSelected ? 4 : 0,
                          shadowColor: theme.colors.primary,
                          shadowOpacity: isSelected ? 0.3 : 0,
                          shadowRadius: 4,
                        }]}>
                          <MaterialIcons
                            name="spa"
                            size={22}
                            color={isSelected ? theme.colors.white : theme.colors.primary}
                          />
                        </View>
                        <View style={styles.employeeDetails}>
                          <Text style={[styles.employeeName, dynamicStyles.text, { fontSize: 15 }]}>{svc.name}</Text>
                          <Text style={[styles.employeeRole, dynamicStyles.textSecondary, { fontSize: 12 }]}>
                            {svc.durationMinutes} min • RWF {svc.basePrice.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight), justifyContent: 'center', alignItems: 'center' }}>
                        {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step: Employee Selection */}
        {currentStep === "employee" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>Choose a Pro</Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>Select a stylist or let us pick for you</Text>

            {employeesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : employees.length === 0 ? (
              <View style={[styles.emptyCard, dynamicStyles.card, dynamicStyles.border]}>
                <MaterialIcons name="person-off" size={48} color={dynamicStyles.textSecondary.color} />
                <Text style={[styles.emptyText, dynamicStyles.text]}>No stylists available</Text>
              </View>
            ) : (
              <View style={styles.employeesList}>
                {/* Any Available Option */}
                <TouchableOpacity
                  style={[
                    styles.employeeCard,
                    dynamicStyles.card,
                    dynamicStyles.border,
                    isAnyEmployee && styles.employeeCardSelected,
                  ]}
                  onPress={() => handleEmployeeSelect("any")}
                  activeOpacity={0.7}
                >
                  <View style={styles.employeeInfo}>
                    <View style={[styles.employeeAvatar, { 
                      backgroundColor: isAnyEmployee ? theme.colors.primary : (isDark ? theme.colors.gray800 : theme.colors.white), 
                      borderColor: isAnyEmployee ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight),
                      elevation: isAnyEmployee ? 4 : 0,
                      shadowColor: theme.colors.primary,
                      shadowOpacity: isAnyEmployee ? 0.3 : 0,
                      shadowRadius: 4,
                    }]}>
                      <MaterialIcons name="auto-awesome" size={22} color={isAnyEmployee ? theme.colors.white : theme.colors.primary} />
                    </View>
                    <View style={styles.employeeDetails}>
                      <Text style={[styles.employeeName, dynamicStyles.text, { fontSize: 15 }]}>Any Professional</Text>
                      <Text style={[styles.employeeRole, dynamicStyles.textSecondary, { fontSize: 12 }]}>Maximum availability</Text>
                    </View>
                  </View>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isAnyEmployee ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight), justifyContent: 'center', alignItems: 'center' }}>
                     {isAnyEmployee && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />}
                  </View>
                </TouchableOpacity>

                {employees.map((employee) => {
                  const isSelected = selectedEmployeeId === employee.id;
                  return (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.employeeCard,
                        dynamicStyles.card,
                        dynamicStyles.border,
                        isSelected && styles.employeeCardSelected,
                      ]}
                      onPress={() => handleEmployeeSelect(employee.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.employeeInfo}>
                        <View style={[styles.employeeAvatar, { 
                          borderColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight), 
                          backgroundColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray800 : theme.colors.white),
                          elevation: isSelected ? 4 : 0,
                          shadowColor: theme.colors.primary,
                          shadowOpacity: isSelected ? 0.3 : 0,
                          shadowRadius: 4,
                        }]}>
                           {/* Initials or Image if avail */}
                           <Text style={[styles.employeeInitials, { color: isSelected ? theme.colors.white : theme.colors.primary, fontSize: 16 }]}>
                             {employee.user?.fullName?.slice(0, 2).toUpperCase()}
                           </Text>
                        </View>
                        <View style={styles.employeeDetails}>
                          <Text style={[styles.employeeName, dynamicStyles.text, { fontSize: 15 }]}>{employee.user?.fullName}</Text>
                          <Text style={[styles.employeeRole, dynamicStyles.textSecondary, { fontSize: 12 }]}>{employee.roleTitle || 'Stylist'}</Text>
                        </View>
                      </View>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? theme.colors.primary : (isDark ? theme.colors.gray700 : theme.colors.borderLight), justifyContent: 'center', alignItems: 'center' }}>
                        {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step: Date & Time */}
        {currentStep === "datetime" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>When?</Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>Select a date and time slot</Text>

            <View style={[styles.calendarContainer, dynamicStyles.card, dynamicStyles.border]}>
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  style={[styles.monthButton, dynamicStyles.button]}
                >
                  <MaterialIcons name="chevron-left" size={24} color={dynamicStyles.text.color} />
                </TouchableOpacity>
                <Text style={[styles.monthText, dynamicStyles.text]}>
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </Text>
                <TouchableOpacity
                  onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  style={[styles.monthButton, dynamicStyles.button]}
                >
                  <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.text.color} />
                </TouchableOpacity>
              </View>

              <View style={[styles.daysOfWeek, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <Text key={day} style={[styles.dayOfWeek, dynamicStyles.textSecondary]}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {days.map((date, index) => {
                  if (!date) return <View key={`empty-${index}`} style={styles.calendarDay} />;
                  
                  const isSelected = isDateSelected(date);
                  const isAvailable = isDateAvailable(date);
                  const isPastDate = isPast(date);
                  const isDayAvailable = isAnyEmployee ? isDateAvailable(date) : isAvailable;

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
                          (!isDayAvailable || isPastDate) && styles.unavailableDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedDate && (
              <View style={styles.timeSlotsContainer}>
                <View style={styles.timeSlotsHeader}>
                  <Text style={[styles.timeSlotsTitle, dynamicStyles.text]}>Available Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                        // FIX: Use fetchTimeSlots for both cases
                        if (selectedDate) fetchTimeSlots();
                    }}
                    style={[styles.refreshButton, dynamicStyles.button]}
                    disabled={timeSlotsLoading}
                  >
                     {timeSlotsLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <MaterialIcons name="refresh" size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                </View>

                {timeSlots.length === 0 && !timeSlotsLoading ? (
                  <Text style={[styles.noSlotsText, { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.backgroundSecondary, color: dynamicStyles.textSecondary.color }]}>No slots available for this date.</Text>
                ) : (
                  <View style={styles.timeSlotsGrid}>
                    {timeSlots.map((slot, index) => {
                       const isSelected = selectedSlot?.startTime === slot.startTime;
                       const isAvailable = slot.available === true;
                       return (
                         <TouchableOpacity
                           key={`${slot.startTime}-${index}`}
                           style={[
                             styles.timeSlot,
                             dynamicStyles.card,
                             dynamicStyles.border,
                             isSelected && isAvailable && styles.timeSlotSelected,
                             !isAvailable && styles.timeSlotUnavailable
                           ]}
                           onPress={() => isAvailable && handleSlotSelect(slot)}
                           disabled={!isAvailable}
                         >
                           <Text style={[
                             styles.timeSlotText,
                             dynamicStyles.text,
                             isSelected && isAvailable && styles.timeSlotTextSelected,
                             !isAvailable && styles.timeSlotTextUnavailable
                           ]}>
                             {formatTime(slot.startTime)}
                           </Text>
                         </TouchableOpacity>
                       )
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step: Confirm */}
        {currentStep === "confirm" && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, dynamicStyles.text]}>Everything looks good?</Text>
            <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>Double check your booking details</Text>

            <View style={[styles.confirmCard, dynamicStyles.card, dynamicStyles.border]}>
               {/* Salon Section */}
               <View style={[styles.confirmRow, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
                 <MaterialIcons name="storefront" size={20} color={theme.colors.primary} />
                 <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>Salon</Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>{salon?.name}</Text>
                    {salon?.address && (
                      <Text style={styles.confirmSubValue}>{salon.address}</Text>
                    )}
                 </View>
               </View>

               <View style={[styles.confirmRow, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
                 <MaterialIcons name="spa" size={20} color={theme.colors.primary} />
                 <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>Service</Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>{service?.name}</Text>
                    {service?.durationMinutes && (
                      <Text style={styles.confirmSubValue}>{service.durationMinutes} minutes</Text>
                    )}
                 </View>
               </View>

               <View style={[styles.confirmRow, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
                 <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                 <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>Professional</Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>
                      {isAnyEmployee ? "Any Available Stylist" : selectedEmployee?.user?.fullName}
                    </Text>
                    {!isAnyEmployee && selectedEmployee?.roleTitle && (
                      <Text style={styles.confirmSubValue}>{selectedEmployee.roleTitle}</Text>
                    )}
                 </View>
               </View>

               <View style={[styles.confirmRow, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
                 <MaterialIcons name="event" size={20} color={theme.colors.primary} />
                 <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>Date & Time</Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text]}>
                       {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={styles.confirmSubValue}>
                      Starting at {selectedSlot ? formatTime(selectedSlot.startTime) : ''}
                    </Text>
                 </View>
               </View>

               <View style={styles.confirmRow}>
                 <MaterialIcons name="payments" size={20} color={theme.colors.primary} />
                 <View style={styles.confirmRowContent}>
                    <Text style={[styles.confirmLabel, dynamicStyles.textSecondary]}>Total Amount</Text>
                    <Text style={[styles.confirmValue, dynamicStyles.text, { fontSize: 20, color: theme.colors.primary }]}>
                      RWF {service?.basePrice?.toLocaleString()}
                    </Text>
                 </View>
               </View>

               <View style={styles.notesContainer}>
                 <Text style={[styles.notesLabel, dynamicStyles.textSecondary]}>Special Instructions (optional)</Text>
                 <TextInput
                   style={[styles.notesInput, dynamicStyles.input]}
                   placeholder="Anything you'd like your pro to know?"
                   placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.textSecondary}
                   value={notes}
                   onChangeText={setNotes}
                   multiline
                 />
               </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.navigationContainer, dynamicStyles.header, { borderTopColor: isDark ? theme.colors.gray800 : theme.colors.borderLight }]}>
         {currentStep !== 'service' && !hasPreSelectedService && (
             <TouchableOpacity style={[styles.navButton, styles.backButtonLabel, dynamicStyles.button, dynamicStyles.border]} onPress={handleBack}>
               <Text style={[styles.backButtonText, dynamicStyles.text]}>Back</Text>
             </TouchableOpacity>
         )}
         
         <TouchableOpacity
           style={[styles.navButton, currentStep === 'confirm' ? styles.confirmButton : styles.nextButton]}
           onPress={currentStep === 'confirm' ? handleConfirmBooking : handleNext}
           disabled={loading || submitting}
         >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={currentStep === 'confirm' ? styles.confirmButtonText : styles.nextButtonText}>
                {currentStep === 'confirm' 
                  ? (route?.params?.reschedule ? 'Confirm Rescheduling' : 'Confirm Booking') 
                  : 'Continue'}
              </Text>
            )}
         </TouchableOpacity>
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
    fontFamily: theme.fonts.medium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: (StatusBar.currentHeight || 0) + theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    zIndex: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginLeft: -theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: theme.fonts.bold,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary + "50",
    marginHorizontal: theme.spacing.lg,
    borderRadius: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  progressDotCompleted: {
    backgroundColor: theme.colors.success,
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  progressLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  stepLabelHidden: {
    display: 'none', 
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + "15",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  employeesList: {
    gap: theme.spacing.md,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: theme.colors.backgroundSecondary,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "05",
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.1,
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  employeeInitials: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    fontFamily: theme.fonts.bold,
  },
  employeeRole: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    opacity: 0.7,
  },
  calendarContainer: {
    padding: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  monthButton: {
    padding: theme.spacing.xs,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  daysOfWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: theme.spacing.xs,
  },
  dayOfWeek: {
    fontSize: 13,
    fontWeight: "600",
    width: 40,
    textAlign: "center",
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  calendarDay: {
    width: "14.28%", 
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
  },
  availableDay: {
    backgroundColor: theme.colors.primary + "15",
  },
  dayText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  selectedDayText: {
    color: theme.colors.white,
    fontWeight: "bold",
  },
  unavailableDayText: {
    color: theme.colors.textSecondary,
    opacity: 0.3,
  },
  timeSlotsContainer: {
    marginTop: theme.spacing.xs,
  },
  timeSlotsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  timeSlotsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  timeSlotsSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  refreshButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.backgroundSecondary,
    minWidth: '28%',
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unavailableIcon: {
    marginLeft: 2,
    opacity: 0.7,
  },
  timeSlotSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
    elevation: 2,
  },
  timeSlotUnavailable: {
    opacity: 0.5,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  timeSlotTextSelected: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  timeSlotTextUnavailable: {
    color: theme.colors.textSecondary,
    textDecorationLine: "line-through",
  },
  timeSlotReason: { // Hidden mostly
    display: 'none',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: theme.spacing.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  confirmCard: {
    padding: theme.spacing.lg,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  confirmRowContent: {
    flex: 1,
  },
  confirmLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    lineHeight: 22,
  },
  confirmSubValue: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  notesContainer: {
    marginTop: theme.spacing.sm,
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
    borderRadius: 12,
    padding: theme.spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.background,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: "center",
    borderRadius: 16,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    color: theme.colors.textSecondary,
    maxWidth: '80%',
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    elevation: 20,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: theme.spacing.sm,
    elevation: 2,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonLabel: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    elevation: 0,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
  },
  confirmButton: {
    backgroundColor: theme.colors.success,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  nextButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  confirmButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  selectedStylistBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: 16,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + "10",
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
  },
  selectedStylistContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flex: 1,
  },
  selectedStylistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  selectedStylistInitials: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  selectedStylistInfo: {
    flex: 1,
  },
  selectedStylistLabel: {
    fontSize: 11,
    marginBottom: 2,
    fontFamily: theme.fonts.bold,
    textTransform: "uppercase",
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  selectedStylistName: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: 1,
    color: theme.colors.text,
  },
  selectedStylistSalon: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
});
