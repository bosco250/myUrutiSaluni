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
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

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

  // Availability data for selected employee (or first employee if 'any')
  const firstEmployeeId = employees.length > 0 ? employees[0].id : null;
  const queryEmployeeId = selectedEmployeeId === 'any' ? firstEmployeeId : selectedEmployeeId;

  const {
    data: availability = [],
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['customer-availability', queryEmployeeId, service.id],
    queryFn: async () => {
      if (!queryEmployeeId) {
        // If no employees, return all days as available
        const days: DayAvailability[] = [];
        for (let i = 0; i < 30; i++) {
          const d = addDays(new Date(), i);
          days.push({
            date: format(d, 'yyyy-MM-dd'),
            status: 'available' as const,
            totalSlots: 18,
            availableSlots: 18,
          });
        }
        return days;
      }
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      return getEmployeeAvailability(
        queryEmployeeId,
        startDate,
        endDate,
        service.id,
        service.durationMinutes
      );
    },
    enabled: isOpen && !!selectedEmployeeId && currentStep === 'datetime',
  });

  // Time slots for selected date
  const {
    data: timeSlotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['customer-slots', queryEmployeeId, selectedDate, service.id],
    queryFn: async () => {
      if (!selectedDate) return { slots: [], meta: { totalSlots: 0, availableSlots: 0 } };

      // If no employee available or 'any' selected with no employees, generate default slots
      if (!queryEmployeeId) {
        const slots = [];
        for (let hour = 9; hour < 18; hour++) {
          for (let min = 0; min < 60; min += 30) {
            const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            const endHour = min + service.durationMinutes >= 60 ? hour + 1 : hour;
            const endMin = (min + service.durationMinutes) % 60;
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
            slots.push({ startTime, endTime, available: true });
          }
        }
        return { slots, meta: { totalSlots: slots.length, availableSlots: slots.length } };
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return getTimeSlots(queryEmployeeId, dateStr, service.id, service.durationMinutes);
    },
    enabled: isOpen && !!selectedEmployeeId && !!selectedDate,
  });

  // Create appointment mutation
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

  // Get selected employee for display
  const selectedEmployee = employees.find((e: any) => e.id === selectedEmployeeId);

  // Calculate step index
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Navigation
  const canGoBack = currentStepIndex > 0;
  const canGoNext = () => {
    switch (currentStep) {
      case 'employee':
        return !!selectedEmployeeId;
      case 'datetime':
        return !!selectedDate && !!selectedSlot;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const goBack = () => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.key);
    }
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

  // Handle final booking
  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !selectedEmployeeId) {
      setError('Please complete all booking details');
      return;
    }

    setError('');

    // Build scheduled start/end times
    const [startHour, startMinute] = selectedSlot.startTime.split(':').map(Number);
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(startHour, startMinute, 0, 0);

    const [endHour, endMinute] = selectedSlot.endTime.split(':').map(Number);
    const scheduledEnd = new Date(selectedDate);
    scheduledEnd.setHours(endHour, endMinute, 0, 0);

    // Validate booking first (skip if 'any' employee selected)
    if (selectedEmployeeId !== 'any' && queryEmployeeId) {
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

    // Create the appointment (don't include salonEmployeeId if 'any' preference)
    const appointmentData: any = {
      salonId: salon.id,
      serviceId: service.id,
      customerId: customerId || undefined,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      status: 'pending',
      notes: notes || undefined,
    };

    // Only add salonEmployeeId if a specific employee was selected
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
          <div className="space-y-4 md:space-y-6 animate-fadeIn">
            <div className="text-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">
                Choose Your Stylist
              </h3>
              <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-2">
                Select who you'd like to perform your {service.name}
              </p>
            </div>

            {employeesLoading ? (
              <div className="flex justify-center py-8 md:py-12">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-primary mb-3" />
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                    Loading stylists...
                  </p>
                </div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6 md:py-8 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
                <User className="w-10 h-10 md:w-12 md:h-12 text-text-light/30 dark:text-text-dark/30 mx-auto mb-3" />
                <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
                  No specific stylists available.
                </p>
                <Button onClick={() => setSelectedEmployeeId('any')} variant="secondary" size="md">
                  Book with any available stylist
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {/* No Preference Option */}
                <button
                  onClick={() => setSelectedEmployeeId('any')}
                  className={`relative p-3 md:p-4 rounded-xl border-2 text-left transition-all group ${
                    selectedEmployeeId === 'any'
                      ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-1 ring-primary/20'
                      : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-sm bg-surface-light dark:bg-surface-dark'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm md:text-base text-text-light dark:text-text-dark">
                        No Preference
                      </p>
                      <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                        Maximize availability with any stylist
                      </p>
                    </div>
                    {selectedEmployeeId === 'any' && (
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 opacity-100 transition-all flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Employee List */}
                {employees.map((employee: any) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className={`relative p-3 md:p-4 rounded-xl border-2 text-left transition-all group ${
                      selectedEmployeeId === employee.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-1 ring-primary/20'
                        : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-sm bg-surface-light dark:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                        {(employee.user?.fullName || 'S')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm md:text-base text-text-light dark:text-text-dark truncate">
                          {employee.user?.fullName || employee.roleTitle || 'Stylist'}
                        </p>
                        {employee.roleTitle && (
                          <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                            {employee.roleTitle}
                          </p>
                        )}
                      </div>
                      {selectedEmployeeId === employee.id && (
                        <div className="w-5 h-5 md:w-6 md:h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
          <div className="space-y-4 md:space-y-6 animate-fadeIn h-full flex flex-col">
            <div className="text-center mb-0 md:mb-4">
              <h3 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">
                Select Date & Time
              </h3>
              <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                Showing availability for{' '}
                {selectedEmployeeId === 'any'
                  ? 'any stylist'
                  : employees.find((e: any) => e.id === selectedEmployeeId)?.user?.fullName}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6 h-full min-h-[300px] md:min-h-[400px]">
              {/* Calendar Column */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 md:p-4 border border-border-light dark:border-border-dark">
                <h4 className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark mb-3 md:mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  Select Date
                </h4>
                <AvailabilityCalendar
                  availability={availability}
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  isLoading={availabilityLoading}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 30)}
                />
              </div>

              {/* Time Slots Column */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 md:p-4 border border-border-light dark:border-border-dark flex flex-col">
                <h4 className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark mb-3 md:mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  Available Times
                </h4>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {slotsLoading && selectedDate ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-light/40 dark:text-text-dark/40">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin mb-2 text-primary/50" />
                      <p className="text-xs md:text-sm">Checking availability...</p>
                    </div>
                  ) : !selectedDate ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-light/40 dark:text-text-dark/40 p-6 md:p-8 text-center border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                      <Calendar className="w-8 h-8 md:w-10 md:h-10 mb-3 opacity-20" />
                      <p className="text-xs md:text-sm">
                        Select a date from the calendar to view available times
                      </p>
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
          <div className="space-y-4 md:space-y-6 animate-fadeIn">
            <div className="text-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">
                Review Booking
              </h3>
              <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                Almost done! Please review your appointment details.
              </p>
            </div>

            {/* Booking Summary Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
              <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 font-medium mb-1">
                      Service
                    </p>
                    <h3 className="font-bold text-xl md:text-2xl text-text-light dark:text-text-dark">
                      {service.name}
                    </h3>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Scissors className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                    Date & Time
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-6 md:ml-7">
                    <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                      {selectedSlot && formatTime(selectedSlot.startTime)} -{' '}
                      {selectedSlot && formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                    Stylist
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
                      {selectedEmployeeId === 'any'
                        ? 'Any Available Stylist'
                        : selectedEmployee?.user?.fullName ||
                          selectedEmployee?.roleTitle ||
                          'Selected Stylist'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                    Duration
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
                      {service.durationMinutes} minutes
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                    Price
                  </p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="font-bold text-base md:text-lg text-primary">
                      RWF {service.basePrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                Notes for the Salon (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                placeholder="Allergies, specific preferences, or anything else we should know..."
              />
            </div>

            {/* Alternative suggestions if validation failed */}
            {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
              <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/40 rounded-xl p-3 md:p-4 animate-in slide-in-from-top-2">
                <p className="text-warning dark:text-warning font-medium mb-2 flex items-center gap-2 text-xs md:text-sm">
                  <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Selected slot unavailable. Alternative times:
                </p>
                <div className="flex flex-wrap gap-2">
                  {validationResult.suggestions.map((slot: TimeSlot) => (
                    <button
                      key={slot.startTime}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setValidationResult(null);
                        setError('');
                      }}
                      className="px-2.5 md:px-3 py-1 md:py-1.5 bg-surface-light dark:bg-surface-dark text-warning dark:text-warning rounded-lg text-xs md:text-sm font-medium border border-warning/30 dark:border-warning/40 hover:border-warning/50 transition"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark relative z-10">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-text-light dark:text-text-dark">
              {salon.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>

          {/* Stepper with Flex Layout for Perfect Alignment */}
          <div className="w-full px-2 md:px-4">
            <div className="flex items-center justify-between relative">
              {STEPS.map((step, index) => {
                const isActive = step.key === currentStep;
                const isCompleted = index < currentStepIndex;
                const Icon = step.icon;
                const isLast = index === STEPS.length - 1;

                return (
                  <div key={step.key} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`
                                      w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 
                                      ${
                                        isActive
                                          ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                                          : isCompleted
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-text-light/40 dark:text-text-dark/40'
                                      }
                                  `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-5 md:-bottom-6 text-[10px] md:text-xs font-semibold whitespace-nowrap hidden sm:block ${
                          isActive || isCompleted
                            ? 'text-text-light dark:text-text-dark'
                            : 'text-text-light/40 dark:text-text-dark/40'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>

                    {!isLast && (
                      <div className="flex-1 h-1 mx-1 md:mx-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full bg-primary transition-all duration-500 ease-out ${
                            isCompleted ? 'w-full' : 'w-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-surface-light dark:bg-surface-dark">
          {error && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-danger/10 dark:bg-danger/20 border border-danger/30 dark:border-danger/40 rounded-xl flex items-start gap-2 md:gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs md:text-sm font-semibold text-danger mb-1">Error</h4>
                <p className="text-xs md:text-sm text-danger/80 dark:text-danger/80">{error}</p>
              </div>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between gap-3 md:gap-4">
          {currentStep !== 'employee' ? (
            <Button
              variant="outline"
              onClick={goBack}
              size="sm"
              className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark"
            >
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Back
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
              className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark"
            >
              Cancel
            </Button>
          )}

          {currentStep === 'confirm' ? (
            <Button
              variant="primary"
              onClick={handleConfirmBooking}
              disabled={createAppointmentMutation.isPending}
              size="md"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Booking
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canGoNext()}
              size="md"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
