'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Building2,
  ChevronRight,
} from 'lucide-react';
import { format, addDays, parseISO, addMinutes } from 'date-fns';

interface CalendarBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedSalonId?: string;
}

type BookingStep = 'salon' | 'service' | 'employee' | 'datetime' | 'confirm';

const STEPS: { key: BookingStep; label: string; icon: any }[] = [
  { key: 'salon', label: 'Salon', icon: Building2 },
  { key: 'service', label: 'Service', icon: Scissors },
  { key: 'employee', label: 'Stylist', icon: User },
  { key: 'datetime', label: 'Date & Time', icon: Calendar },
  { key: 'confirm', label: 'Confirm', icon: CheckCircle2 },
];

export default function CalendarBookingModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedSalonId,
}: CalendarBookingModalProps) {
  // State
  const [currentStep, setCurrentStep] = useState<BookingStep>('salon');
  const [selectedSalonId, setSelectedSalonId] = useState<string>(preselectedSalonId || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(preselectedSalonId ? 'service' : 'salon');
      setSelectedSalonId(preselectedSalonId || '');
      setSelectedServiceId('');
      setSelectedEmployeeId('');
      setSelectedDate(null);
      setSelectedSlot(null);
      setCustomerId('');
      setNotes('');
      setError('');
      setValidationResult(null);
    }
  }, [isOpen, preselectedSalonId]);

  // Queries
  const { data: salons = [], isLoading: salonsLoading } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
    enabled: isOpen,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', selectedSalonId],
    queryFn: async () => {
      const response = await api.get('/services', {
        params: { salonId: selectedSalonId },
      });
      return response.data?.data || response.data || [];
    },
    enabled: isOpen && !!selectedSalonId,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['salon-employees', selectedSalonId],
    queryFn: async () => {
      if (!selectedSalonId) return [];
      const response = await api.get(`/salons/${selectedSalonId}/employees`);
      return (response.data || []).filter((emp: any) => emp.isActive !== false);
    },
    enabled: isOpen && !!selectedSalonId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data?.data || response.data || [];
    },
    enabled: isOpen && currentStep === 'confirm',
  });

  // Get service duration
  const selectedService = services.find((s: any) => s.id === selectedServiceId);
  const serviceDuration = selectedService?.durationMinutes || 30;

  // Availability data for selected employee
  const {
    data: availability = [],
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['employee-availability', selectedEmployeeId, selectedServiceId],
    queryFn: async () => {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      return getEmployeeAvailability(
        selectedEmployeeId,
        startDate,
        endDate,
        selectedServiceId,
        serviceDuration
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
    queryKey: ['time-slots', selectedEmployeeId, selectedDate, selectedServiceId],
    queryFn: async () => {
      if (!selectedDate) return { slots: [], meta: { totalSlots: 0, availableSlots: 0 } };
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return getTimeSlots(selectedEmployeeId, dateStr, selectedServiceId, serviceDuration);
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
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create appointment');
    },
  });

  // Get selected entities for display
  const selectedSalon = salons.find((s: any) => s.id === selectedSalonId);
  const selectedEmployee = employees.find((e: any) => e.id === selectedEmployeeId);

  // Calculate step index
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Navigation
  const canGoBack = currentStepIndex > 0;
  const canGoNext = () => {
    switch (currentStep) {
      case 'salon':
        return !!selectedSalonId;
      case 'service':
        return !!selectedServiceId;
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

      // Reset downstream selections when going forward (if selection changed)
      if (currentStep === 'salon') {
        // Keep service selection if salon didn't change
      } else if (currentStep === 'service') {
        setSelectedDate(null);
        setSelectedSlot(null);
      } else if (currentStep === 'employee') {
        setSelectedDate(null);
        setSelectedSlot(null);
      }
    }
  };

  // Handle final booking
  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot || !selectedEmployeeId || !selectedSalonId) {
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

    // Validate booking first
    try {
      const validation = await validateBooking({
        employeeId: selectedEmployeeId,
        serviceId: selectedServiceId,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
      });

      setValidationResult(validation);

      if (!validation.valid) {
        setError(validation.reason || 'This time slot is no longer available');
        // Refresh availability data
        refetchAvailability();
        refetchSlots();
        return;
      }
    } catch (err: any) {
      setError('Failed to validate booking. Please try again.');
      return;
    }

    // Create the appointment
    createAppointmentMutation.mutate({
      salonId: selectedSalonId,
      serviceId: selectedServiceId,
      salonEmployeeId: selectedEmployeeId,
      customerId: customerId || undefined,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      status: 'booked',
      notes,
    });
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'salon':
        return (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
              Select a salon for your appointment
            </p>
            {salonsLoading ? (
              <div className="flex justify-center py-6 md:py-8">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                    Loading salons...
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-3">
                {salons.map((salon: any) => (
                  <button
                    key={salon.id}
                    onClick={() => setSelectedSalonId(salon.id)}
                    className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all ${
                      selectedSalonId === salon.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-1 ring-primary/20'
                        : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-sm bg-surface-light dark:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark truncate">
                          {salon.name}
                        </p>
                        {salon.address && (
                          <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                            {salon.address}
                          </p>
                        )}
                      </div>
                      {selectedSalonId === salon.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'service':
        return (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
              Choose a service for your appointment
            </p>
            {servicesLoading ? (
              <div className="flex justify-center py-6 md:py-8">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                    Loading services...
                  </p>
                </div>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-6 md:py-8 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
                <Scissors className="w-10 h-10 md:w-12 md:h-12 text-text-light/30 dark:text-text-dark/30 mx-auto mb-3" />
                <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                  No services available for this salon
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-3">
                {services.map((service: any) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all ${
                      selectedServiceId === service.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-1 ring-primary/20'
                        : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-sm bg-surface-light dark:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark truncate">
                          {service.name}
                        </p>
                        <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                          <span className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            {service.durationMinutes || 30} min
                          </span>
                          {service.basePrice && (
                            <span className="text-xs md:text-sm font-semibold text-primary">
                              RWF {Number(service.basePrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedServiceId === service.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'employee':
        return (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
              Select a stylist for your appointment
            </p>
            {employeesLoading ? (
              <div className="flex justify-center py-6 md:py-8">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                    Loading stylists...
                  </p>
                </div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6 md:py-8 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark">
                <User className="w-10 h-10 md:w-12 md:h-12 text-text-light/30 dark:text-text-dark/30 mx-auto mb-3" />
                <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                  No employees available for this salon
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-3">
                {employees.map((employee: any) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all ${
                      selectedEmployeeId === employee.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md ring-1 ring-primary/20'
                        : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-sm bg-surface-light dark:bg-surface-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-base md:text-lg flex-shrink-0">
                        {(employee.user?.fullName || 'E')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark truncate">
                          {employee.user?.fullName || employee.roleTitle || 'Employee'}
                        </p>
                        {employee.roleTitle && (
                          <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                            {employee.roleTitle}
                          </p>
                        )}
                      </div>
                      {selectedEmployeeId === employee.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
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
          <div className="space-y-4 md:space-y-6">
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Calendar */}
              <div>
                <h4 className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
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

              {/* Time slots */}
              <div>
                <h4 className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  Select Time
                </h4>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3 md:p-4 min-h-[300px] border border-border-light dark:border-border-dark">
                  <TimeSlotPicker
                    slots={timeSlotsData?.slots || []}
                    selectedSlot={selectedSlot}
                    onSlotSelect={setSelectedSlot}
                    isLoading={slotsLoading}
                    selectedDate={selectedDate}
                    serviceDuration={serviceDuration}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4 md:space-y-6">
            {/* Booking Summary */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 space-y-3 md:space-y-4 border border-border-light dark:border-border-dark">
              <h4 className="font-semibold text-base md:text-lg text-text-light dark:text-text-dark">
                Booking Summary
              </h4>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                    {selectedSalon?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <Scissors className="w-4 h-4 md:w-5 md:h-5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                    {selectedService?.name}
                    {selectedService?.basePrice && (
                      <span className="ml-2 text-primary font-semibold">
                        RWF {Number(selectedService.basePrice).toLocaleString()}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                    {selectedEmployee?.user?.fullName || selectedEmployee?.roleTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
                    {selectedSlot && (
                      <>
                        {(() => {
                          const [h, m] = selectedSlot.startTime.split(':').map(Number);
                          const d = new Date();
                          d.setHours(h, m);
                          return format(d, 'h:mm a');
                        })()}{' '}
                        -{' '}
                        {(() => {
                          const [h, m] = selectedSlot.endTime.split(':').map(Number);
                          const d = new Date();
                          d.setHours(h, m);
                          return format(d, 'h:mm a');
                        })()}
                      </>
                    )}
                    <span className="text-text-light/60 dark:text-text-dark/60 ml-2">
                      ({serviceDuration} min)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                Customer (Optional)
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 md:px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Walk-in customer</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 md:px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Add any special requests or notes..."
              />
            </div>

            {/* Alternative suggestions if validation failed */}
            {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
              <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/40 rounded-xl p-3 md:p-4">
                <p className="text-warning dark:text-warning font-medium mb-2 text-xs md:text-sm flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Alternative times available:
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
                      {slot.startTime}
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
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark">
              Book Appointment
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between px-2 md:px-4">
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
                      w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10
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
                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-danger/10 dark:bg-danger/20 border border-danger/30 dark:border-danger/40 rounded-xl flex items-start gap-2 md:gap-3">
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
        <div className="p-4 md:p-6 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-3 md:gap-4">
          <Button
            variant="outline"
            onClick={canGoBack ? goBack : onClose}
            size="sm"
            className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {canGoBack ? 'Back' : 'Cancel'}
          </Button>

          {currentStep === 'confirm' ? (
            <Button
              variant="primary"
              onClick={handleConfirmBooking}
              disabled={createAppointmentMutation.isPending}
              size="md"
              className="flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Confirm Booking
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!canGoNext()}
              size="md"
              className="flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
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
