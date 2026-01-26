'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  getEmployeeAvailability,
  getTimeSlots,
  validateBooking,
  DayAvailability,
  TimeSlot,
} from '@/lib/availability';
import AvailabilityCalendar from './AvailabilityCalendar';
import TimeSlotPicker from './TimeSlotPicker';
import Button from '@/components/ui/Button';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  User,
  Scissors,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/lib/permissions';

interface DayHours {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface CustomerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  salon: {
    id: string;
    name: string;
    address?: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice: number;
  };
  customerId?: string;
}

type BookingStep = 'employee' | 'datetime' | 'confirm';

const STEPS: { key: BookingStep; label: string; icon: any; description: string }[] = [
  { key: 'employee', label: 'Stylist', icon: User, description: 'Choose your pro' },
  { key: 'datetime', label: 'Date & Time', icon: Calendar, description: 'Select availability' },
  { key: 'confirm', label: 'Review', icon: CheckCircle2, description: 'Confirm booking' },
];

export default function CustomerBookingModal({
  isOpen,
  onClose,
  onSuccess,
  salon,
  service,
  customerId,
}: CustomerBookingModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State
  const [currentStep, setCurrentStep] = useState<BookingStep>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('employee');
      setSelectedEmployeeId('');
      setSelectedDate(null);
      setSelectedSlot(null);
      setNotes('');
      setError('');
      setValidationResult(null);
    }
  }, [isOpen]);

  // Get salon details including operating hours
  const { data: salonData } = useQuery({
    queryKey: ['salon-details-booking', salon.id],
    queryFn: async () => {
      const response = await api.get(`/salons/${salon.id}?browse=true`);
      return response.data?.data || response.data;
    },
    enabled: isOpen && !!salon.id,
  });

  // Parse operating hours from salon data (matching salon detail page logic)
  const parseOperatingHours = (): WorkingHours | null => {
    console.log('[BookingModal] Parsing hours from:', {
      salonProp: salon,
      salonDataFromApi: salonData,
      salonSettings: salonData?.settings,
    });
    
    // Check direct salon properties first (from salon object prop - may exist at runtime)
    const salonAny = salon as any;
    if (salonAny?.operatingHours) {
      console.log('[BookingModal] Found salon.operatingHours:', salonAny.operatingHours);
      return salonAny.operatingHours as WorkingHours;
    }
    if (salonAny?.businessHours) {
      console.log('[BookingModal] Found salon.businessHours:', salonAny.businessHours);
      return salonAny.businessHours as WorkingHours;
    }
    
    // Check salonData from API call
    if (salonData?.operatingHours) {
      console.log('[BookingModal] Found salonData.operatingHours:', salonData.operatingHours);
      return salonData.operatingHours as WorkingHours;
    }
    if (salonData?.businessHours) {
      console.log('[BookingModal] Found salonData.businessHours:', salonData.businessHours);
      return salonData.businessHours as WorkingHours;
    }
    
    // Check settings.workingHours (used by mobile app during salon creation)
    if (salonData?.settings?.workingHours) {
      try {
        const hours = salonData.settings.workingHours;
        console.log('[BookingModal] Found settings.workingHours:', hours);
        if (typeof hours === 'string') {
          return JSON.parse(hours) as WorkingHours;
        }
        return hours as WorkingHours;
      } catch {
        // Fall through
      }
    }
    
    // Check settings.operatingHours as final fallback
    if (salonData?.settings?.operatingHours) {
      try {
        const hours = salonData.settings.operatingHours;
        console.log('[BookingModal] Found settings.operatingHours:', hours);
        if (typeof hours === 'string') {
          return JSON.parse(hours) as WorkingHours;
        }
        return hours as WorkingHours;
      } catch {
        return null;
      }
    }
    
    console.log('[BookingModal] No working hours found!');
    return null;
  };

  const operatingHours = parseOperatingHours();
  console.log('[BookingModal] Final operatingHours:', operatingHours);

  const getDayName = (date: Date): keyof WorkingHours => {
    const day = date.getDay();
    const dayMap: { [key: number]: keyof WorkingHours } = {
      0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
      4: 'thursday', 5: 'friday', 6: 'saturday',
    };
    return dayMap[day];
  };

  // Get salon employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['salon-employees-booking', salon.id],
    queryFn: async () => {
      const response = await api.get(`/salons/${salon.id}/employees?browse=true`);
      const employeesData = response.data?.data || response.data || [];
      return Array.isArray(employeesData)
        ? employeesData.filter((emp: any) => emp.isActive !== false)
        : [];
    },
    enabled: isOpen && !!salon.id,
  });

  const isAnyEmployee = selectedEmployeeId === 'any';
  const queryEmployeeId = isAnyEmployee ? null : selectedEmployeeId;

  const {
    data: availability = [],
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['customer-availability', queryEmployeeId, service.id, operatingHours, isAnyEmployee],
    queryFn: async () => {
      if (isAnyEmployee || !queryEmployeeId) {
        // For "any employee" mode, fetch availability from backend for each employee
        // and aggregate - a day is available if ANY employee is available
        if (employees.length > 0) {
          const startDate = format(new Date(), 'yyyy-MM-dd');
          const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
          
          // Fetch availability for first employee to get date range structure
          const firstEmpAvailability = await getEmployeeAvailability(
            employees[0].id, 
            startDate, 
            endDate, 
            service.id, 
            service.durationMinutes
          );
          
          // Create a map for aggregation
          const dateMap = new Map<string, DayAvailability>();
          firstEmpAvailability.forEach(day => {
            dateMap.set(day.date, { ...day });
          });
          
          // Fetch for other employees and aggregate (available if ANY employee is available)
          for (let i = 1; i < Math.min(employees.length, 5); i++) { // Limit to first 5 employees for performance
            try {
              const empAvailability = await getEmployeeAvailability(
                employees[i].id,
                startDate,
                endDate,
                service.id,
                service.durationMinutes
              );
              
              empAvailability.forEach(day => {
                const existing = dateMap.get(day.date);
                if (existing) {
                  // If any employee has slots, the day is available
                  if (day.availableSlots > 0) {
                    existing.availableSlots = Math.max(existing.availableSlots, day.availableSlots);
                    existing.totalSlots = Math.max(existing.totalSlots, day.totalSlots);
                    if (existing.status === 'unavailable' || existing.status === 'fully_booked') {
                      existing.status = day.status;
                    }
                  }
                }
              });
            } catch (err) {
              console.error(`Failed to fetch availability for employee ${employees[i].id}:`, err);
            }
          }
          
          return Array.from(dateMap.values());
        }
        
        // No employees - use operating hours from salon or show as unavailable
        const days: DayAvailability[] = [];
        for (let i = 0; i < 30; i++) {
          const d = addDays(new Date(), i);
          const dayName = getDayName(d);
          const dayHours = operatingHours?.[dayName];

          if (dayHours?.isOpen) {
            // Handle different field name formats (matching salon page logic)
            const dh = dayHours as any;
            const openTime = dh.open || dh.openTime || dh.startTime;
            const closeTime = dh.close || dh.closeTime || dh.endTime;
            
            if (openTime && closeTime) {
              const [startHour, startMin] = openTime.split(':').map(Number);
              const [endHour, endMin] = closeTime.split(':').map(Number);
              const startMinutes = startHour * 60 + (startMin || 0);
              const endMinutes = endHour * 60 + (endMin || 0);
              const slotCount = Math.floor((endMinutes - startMinutes) / 30);

              days.push({
                date: format(d, 'yyyy-MM-dd'),
                status: 'available' as const,
                totalSlots: slotCount,
                availableSlots: slotCount,
              });
            } else {
              days.push({
                date: format(d, 'yyyy-MM-dd'),
                status: 'unavailable' as const,
                totalSlots: 0,
                availableSlots: 0,
              });
            }
          } else {
            days.push({
              date: format(d, 'yyyy-MM-dd'),
              status: 'unavailable' as const,
              totalSlots: 0,
              availableSlots: 0,
            });
          }
        }
        return days;
      }
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      return getEmployeeAvailability(queryEmployeeId, startDate, endDate, service.id, service.durationMinutes);
    },
    enabled: isOpen && !!selectedEmployeeId && currentStep === 'datetime',
  });

  const {
    data: timeSlotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['customer-slots', queryEmployeeId, selectedDate, service.id, salon.id, isAnyEmployee, employees.length],
    queryFn: async () => {
      if (!selectedDate) return { slots: [], meta: { totalSlots: 0, availableSlots: 0 } };

      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const now = new Date();
      const nowDateStr = format(now, 'yyyy-MM-dd');
      const isToday = nowDateStr === selectedDateStr;
      const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

      // For "any employee" mode, aggregate availability from all salon employees
      if (isAnyEmployee || !queryEmployeeId) {
        // If we have employees, check their combined availability
        if (employees.length > 0) {
          const allBookedSlots = new Set<string>();
          const allAvailableSlots = new Set<string>();
          
          // Query each employee's availability
          for (const emp of employees) {
            try {
              const response = await api.get(`/appointments/employee/${emp.id}/slots?date=${selectedDateStr}&duration=${service.durationMinutes}`);
              const data = response.data || {};
              
              // Add available slots
              (data.availableSlots || []).forEach((slot: string) => allAvailableSlots.add(slot));
              // Track booked slots
              (data.bookedSlots || []).forEach((slot: string) => allBookedSlots.add(slot));
            } catch (err) {
              console.error(`Failed to fetch slots for employee ${emp.id}:`, err);
            }
          }
          
          // Build final slots list - a slot is available if ANY employee has it available
          const slots: TimeSlot[] = [];
          const allSlots = [...Array.from(allAvailableSlots), ...Array.from(allBookedSlots)];
          const uniqueSlots = Array.from(new Set(allSlots)).sort();
          
          uniqueSlots.forEach((startTime) => {
            const [hour, min] = startTime.split(':').map(Number);
            const slotMinutes = hour * 60 + min;
            const endMinutes = slotMinutes + service.durationMinutes;
            const endHour = Math.floor(endMinutes / 60);
            const endMin = endMinutes % 60;
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
            
            const isPastSlot = isToday && slotMinutes <= currentMinutesOfDay;
            const isAvailableWithAnyEmployee = allAvailableSlots.has(startTime);
            
            let available = true;
            let reason: string | undefined;
            
            if (isPastSlot) {
              available = false;
              reason = 'Past time slot';
            } else if (!isAvailableWithAnyEmployee) {
              available = false;
              reason = 'Already booked';
            }
            
            slots.push({ startTime, endTime, available, reason });
          });
          
          const availableSlotsCount = slots.filter(s => s.available).length;
          return { slots, meta: { totalSlots: slots.length, availableSlots: availableSlotsCount } };
        }
        
        // Fallback to operating hours if no employees
        const slots: TimeSlot[] = [];
        if (operatingHours && selectedDate) {
          const dayName = getDayName(selectedDate);
          const dayHours = operatingHours[dayName];

          if (dayHours?.isOpen) {
            // Handle different field name formats (matching salon page logic)
            const dh = dayHours as any;
            const openTime = dh.open || dh.openTime || dh.startTime;
            const closeTime = dh.close || dh.closeTime || dh.endTime;
            
            if (openTime && closeTime) {
              const [startHour, startMin] = openTime.split(':').map(Number);
              const [endHour, endMin] = closeTime.split(':').map(Number);
              const startMinutes = startHour * 60 + (startMin || 0);
              const endMinutes = endHour * 60 + (endMin || 0);

              for (let currentMinutes = startMinutes; currentMinutes + service.durationMinutes <= endMinutes; currentMinutes += 30) {
                const slotHour = Math.floor(currentMinutes / 60);
                const slotMin = currentMinutes % 60;
                const startTime = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

                const endMinutesForSlot = currentMinutes + service.durationMinutes;
                const endSlotHour = Math.floor(endMinutesForSlot / 60);
                const endSlotMin = endMinutesForSlot % 60;
                const endTime = `${endSlotHour.toString().padStart(2, '0')}:${endSlotMin.toString().padStart(2, '0')}`;

                if (endMinutesForSlot <= endMinutes) {
                  const isPastSlot = isToday && currentMinutes <= currentMinutesOfDay;
                  slots.push({ startTime, endTime, available: !isPastSlot, reason: isPastSlot ? 'Past time slot' : undefined });
                }
              }
            }
          }
        }
        
        const availableSlots = slots.filter((slot) => slot.available).length;
        return { slots, meta: { totalSlots: slots.length, availableSlots } };
      }

      // For specific employee - use the backend API
      try {
        const response = await api.get(`/appointments/employee/${queryEmployeeId}/slots?date=${selectedDateStr}&duration=${service.durationMinutes}`);
        const data = response.data || {};
        
        const bookedSlotsSet = new Set<string>(data.bookedSlots || []);
        const availableSlotsArr: string[] = data.availableSlots || [];
        
        // Combine all slots
        const allSlots = Array.from(new Set([...availableSlotsArr, ...Array.from(bookedSlotsSet)])).sort();
        
        const slots: TimeSlot[] = allSlots.map((startTime) => {
          const [hour, min] = startTime.split(':').map(Number);
          const slotMinutes = hour * 60 + min;
          const endMinutes = slotMinutes + service.durationMinutes;
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          const isPastSlot = isToday && slotMinutes <= currentMinutesOfDay;
          const isBooked = bookedSlotsSet.has(startTime);
          
          let available = true;
          let reason: string | undefined;
          
          if (isPastSlot) {
            available = false;
            reason = 'Past time slot';
          } else if (isBooked) {
            available = false;
            reason = 'Already booked';
          }
          
          return { startTime, endTime, available, reason };
        });
        
        const availableSlotsCount = slots.filter(s => s.available).length;
        return { slots, meta: { totalSlots: slots.length, availableSlots: availableSlotsCount } };
      } catch (err) {
        console.error('Failed to fetch employee slots:', err);
        return { slots: [], meta: { totalSlots: 0, availableSlots: 0 } };
      }
    },
    enabled: isOpen && !!selectedEmployeeId && !!selectedDate,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/appointments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create appointment');
    },
  });

  const selectedEmployee = employees.find((e: any) => e.id === selectedEmployeeId);
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const canGoBack = currentStepIndex > 0;

  const canGoNext = () => {
    switch (currentStep) {
      case 'employee': return !!selectedEmployeeId;
      case 'datetime': return !!selectedDate && !!selectedSlot;
      case 'confirm': return true;
      default: return false;
    }
  };

  const goBack = () => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) setCurrentStep(prevStep.key);
  };

  const goNext = () => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.key);
      if (currentStep === 'employee') {
        setSelectedDate(null);
        setSelectedSlot(null);
      }
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !selectedEmployeeId) {
      setError('Please complete all booking details');
      return;
    }

    setError('');

    const [startHour, startMinute] = selectedSlot.startTime.split(':').map(Number);
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(startHour, startMinute, 0, 0);

    const [endHour, endMinute] = selectedSlot.endTime.split(':').map(Number);
    const scheduledEnd = new Date(selectedDate);
    scheduledEnd.setHours(endHour, endMinute, 0, 0);

    if (!isAnyEmployee && queryEmployeeId) {
      try {
        const validation = await validateBooking({
          employeeId: queryEmployeeId,
          serviceId: service.id,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
        });

        setValidationResult(validation);

        if (!validation.valid) {
          setError(validation.reason || 'This time slot is no longer available');
          refetchAvailability();
          refetchSlots();
          return;
        }
      } catch (err: any) {
        setError('Failed to validate booking. Please try again.');
        return;
      }
    }

    const appointmentData: any = {
      salonId: salon.id,
      serviceId: service.id,
      customerId: customerId || undefined,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      status: 'pending',
      notes: notes || undefined,
    };

    // If user is staff (salon owner/employee) and no customerId is provided, they're booking for themselves
    if (
      !customerId &&
      user &&
      (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE)
    ) {
      appointmentData.bookForSelf = true;
    }

    if (selectedEmployeeId !== 'any') {
      appointmentData.salonEmployeeId = selectedEmployeeId;
    }

    createAppointmentMutation.mutate(appointmentData);
  };

  if (!isOpen) return null;

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return format(d, 'h:mm a');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'employee':
        return (
          <div className="space-y-3 animate-fadeIn">
            <div className="text-center mb-3">
              <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">Choose Your Stylist</h3>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">Select who you'd like to perform your {service.name}</p>
            </div>

            {employeesLoading ? (
              <div className="flex justify-center py-6">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading stylists...</p>
                </div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
                <User className="w-8 h-8 text-text-light/30 dark:text-text-dark/30 mx-auto mb-2" />
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-3">No specific stylists available.</p>
                <Button onClick={() => setSelectedEmployeeId('any')} variant="secondary" size="sm">Book with any available stylist</Button>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[45vh] overflow-y-auto pr-1">
                {/* No Preference Option */}
                <button
                  onClick={() => setSelectedEmployeeId('any')}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all group ${
                    selectedEmployeeId === 'any'
                      ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-sm'
                      : 'border-border-light dark:border-border-dark hover:border-primary/30 bg-surface-light dark:bg-surface-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-light dark:text-text-dark">No Preference</p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60">Maximize availability with any stylist</p>
                    </div>
                    {selectedEmployeeId === 'any' && (
                      <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Employee List */}
                {employees.map((employee: any) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all group ${
                      selectedEmployeeId === employee.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-sm'
                        : 'border-border-light dark:border-border-dark hover:border-primary/30 bg-surface-light dark:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {(employee.user?.fullName || 'S')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-text-light dark:text-text-dark truncate">
                          {employee.user?.fullName || employee.roleTitle || 'Stylist'}
                        </p>
                        {employee.roleTitle && (
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">{employee.roleTitle}</p>
                        )}
                      </div>
                      {selectedEmployeeId === employee.id && (
                        <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-3 animate-fadeIn h-full flex flex-col">
            <div className="text-center mb-2">
              <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">Select Date & Time</h3>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                Showing availability for {selectedEmployeeId === 'any' ? 'any stylist' : employees.find((e: any) => e.id === selectedEmployeeId)?.user?.fullName}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3 h-full min-h-[280px]">
              {/* Calendar Column */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 border border-border-light dark:border-border-dark">
                <h4 className="font-semibold text-xs text-text-light dark:text-text-dark mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Select Date
                </h4>
                <AvailabilityCalendar
                  availability={availability}
                  selectedDate={selectedDate}
                  onDateSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                  isLoading={availabilityLoading}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 30)}
                />
              </div>

              {/* Time Slots Column */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 border border-border-light dark:border-border-dark flex flex-col">
                <h4 className="font-semibold text-xs text-text-light dark:text-text-dark mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Available Times
                </h4>
                <div className="flex-1 overflow-y-auto pr-1">
                  {slotsLoading && selectedDate ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-light/40 dark:text-text-dark/40">
                      <Loader2 className="w-5 h-5 animate-spin mb-1 text-primary/50" />
                      <p className="text-xs">Checking availability...</p>
                    </div>
                  ) : !selectedDate ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-light/40 dark:text-text-dark/40 p-4 text-center border-2 border-dashed border-border-light dark:border-border-dark rounded-lg">
                      <Calendar className="w-6 h-6 mb-2 opacity-20" />
                      <p className="text-xs">Select a date to view available times</p>
                    </div>
                  ) : (
                    <TimeSlotPicker
                      slots={timeSlotsData?.slots || []}
                      selectedSlot={selectedSlot}
                      onSlotSelect={setSelectedSlot}
                      isLoading={slotsLoading}
                      selectedDate={selectedDate}
                      serviceDuration={service.durationMinutes}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-3 animate-fadeIn">
            <div className="text-center mb-3">
              <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">Review Booking</h3>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">Almost done! Please review your appointment details.</p>
            </div>

            {/* Booking Summary Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-3 border-b border-border-light dark:border-border-dark">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 font-medium mb-0.5">Service</p>
                    <h3 className="font-semibold text-base text-text-light dark:text-text-dark">{service.name}</h3>
                  </div>
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <Scissors className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>

              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Date & Time</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium text-xs text-text-light dark:text-text-dark">
                      {selectedDate && format(selectedDate, 'EEE, MMM d')}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-light/60 dark:text-text-dark/60 ml-5">
                    {selectedSlot && formatTime(selectedSlot.startTime)} - {selectedSlot && formatTime(selectedSlot.endTime)}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Stylist</p>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium text-xs text-text-light dark:text-text-dark">
                      {selectedEmployeeId === 'any' ? 'Any Available' : selectedEmployee?.user?.fullName || selectedEmployee?.roleTitle || 'Selected'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Duration</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium text-xs text-text-light dark:text-text-dark">{service.durationMinutes} min</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mb-0.5">Price</p>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm text-primary">RWF {service.basePrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1.5">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
                placeholder="Allergies, preferences, or anything else..."
              />
            </div>

            {/* Alternative suggestions */}
            {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 animate-in slide-in-from-top-2">
                <p className="text-warning font-medium mb-1.5 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Selected slot unavailable. Alternative times:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {validationResult.suggestions.map((slot: TimeSlot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => { setSelectedSlot(slot); setValidationResult(null); setError(''); }}
                      className="px-2 py-1 bg-surface-light dark:bg-surface-dark text-warning rounded text-xs font-medium border border-warning/30 hover:border-warning/50 transition"
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-3">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">{salon.name}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
              <X className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const isActive = step.key === currentStep;
              const isCompleted = index < currentStepIndex;
              const Icon = step.icon;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.key} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      isActive
                        ? 'bg-primary text-white ring-2 ring-primary/20'
                        : isCompleted
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-text-light/40 dark:text-text-dark/40'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    </div>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-0.5 mx-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className={`h-full bg-primary transition-all ${isCompleted ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {error && (
            <div className="mb-3 p-2 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-danger mb-0.5">Error</h4>
                <p className="text-xs text-danger/80">{error}</p>
              </div>
            </div>
          )}
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          {currentStep !== 'employee' ? (
            <Button variant="outline" onClick={goBack} size="sm" className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose} size="sm" className="text-xs">Cancel</Button>
          )}

          {currentStep === 'confirm' ? (
            <Button
              variant="primary"
              onClick={handleConfirmBooking}
              disabled={createAppointmentMutation.isPending}
              size="sm"
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Booking
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canGoNext()}
              size="sm"
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
