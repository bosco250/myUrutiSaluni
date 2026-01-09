'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ServiceSelector } from './ServiceSelector';
import { EmployeeSelector } from './EmployeeSelector';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { TimeSlotPicker } from './TimeSlotPicker';
import { BookingConfirmation } from './BookingConfirmation';
import { BookingSuccess } from './BookingSuccess';
import { ChevronLeft, X, Calendar, Check, Clock, User, Scissors } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  salonId: string;
}

export interface Employee {
  id: string;
  userId: string;
  roleTitle?: string;
  commissionRate?: number;
  isActive: boolean;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  specialties?: string[];
  rating?: number;
  nextAvailable?: string;
  todaySlots?: number;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
}

export interface BookingData {
  serviceId: string;
  employeeId: string;
  customerId?: string;
  salonId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string;
}

export interface BookingFlowProps {
  salonId?: string;
  serviceId?: string;
  employeeId?: string;
  customerId?: string;
  onClose?: () => void;
  onSuccess?: (appointmentId: string) => void;
}

type BookingStep = 'service' | 'employee' | 'calendar' | 'timeslot' | 'confirmation' | 'success';

const stepConfig = {
  service: { icon: Scissors, label: 'Service', short: 'Service' },
  employee: { icon: User, label: 'Stylist', short: 'Stylist' },
  calendar: { icon: Calendar, label: 'Date', short: 'Date' },
  timeslot: { icon: Clock, label: 'Time', short: 'Time' },
  confirmation: { icon: Check, label: 'Confirm', short: 'Confirm' },
};

export function BookingFlow({
  salonId,
  serviceId: initialServiceId,
  employeeId: initialEmployeeId,
  customerId: initialCustomerId,
  onClose,
  onSuccess,
}: BookingFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Booking state
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    startTime: string;
    endTime: string;
    price?: number;
  } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  // Load initial data if provided
  const { data: initialService } = useQuery({
    queryKey: ['service', initialServiceId],
    queryFn: async () => {
      if (!initialServiceId) return null;
      const response = await api.get(`/services/${initialServiceId}`);
      return response.data?.data || response.data;
    },
    enabled: !!initialServiceId,
  });

  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      if (initialEmployeeId) {
        setCurrentStep('calendar');
      } else {
        setCurrentStep('employee');
      }
    }
  }, [initialService, initialEmployeeId]);

  const { data: initialEmployee } = useQuery({
    queryKey: ['employee', initialEmployeeId],
    queryFn: async () => {
      if (!initialEmployeeId) return null;
      const response = await api.get(`/salons/${salonId}/employees`);
      const employees = response.data?.data || response.data || [];
      return employees.find((emp: Employee) => emp.id === initialEmployeeId);
    },
    enabled: !!initialEmployeeId && !!salonId,
  });

  useEffect(() => {
    if (initialEmployee) {
      setSelectedEmployee(initialEmployee);
      if (initialServiceId) {
        setCurrentStep('calendar');
      }
    }
  }, [initialEmployee, initialServiceId]);

  const { data: initialCustomer } = useQuery({
    queryKey: ['customer', initialCustomerId],
    queryFn: async () => {
      if (!initialCustomerId) return null;
      const response = await api.get(`/customers/${initialCustomerId}`);
      return response.data?.data || response.data;
    },
    enabled: !!initialCustomerId,
  });

  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
    }
  }, [initialCustomer]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const response = await api.post('/appointments', {
        ...bookingData,
        metadata: selectedEmployee
          ? {
              preferredEmployeeId: selectedEmployee.id,
              preferredEmployeeName: selectedEmployee.user?.fullName || selectedEmployee.roleTitle,
            }
          : undefined,
      });
      return response.data?.data || response.data;
    },
    onSuccess: (appointment) => {
      setCreatedAppointmentId(appointment.id);
      setCurrentStep('success');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (onSuccess) {
        onSuccess(appointment.id);
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to create appointment:', error);
    },
  });

  // Step navigation
  const goToNextStep = useCallback(() => {
    switch (currentStep) {
      case 'service':
        setCurrentStep('employee');
        break;
      case 'employee':
        setCurrentStep('calendar');
        break;
      case 'calendar':
        setCurrentStep('timeslot');
        break;
      case 'timeslot':
        setCurrentStep('confirmation');
        break;
      case 'confirmation':
        if (selectedService && selectedEmployee && selectedDate && selectedTimeSlot) {
          const bookingData: BookingData = {
            serviceId: selectedService.id,
            employeeId: selectedEmployee.id,
            customerId: selectedCustomer?.id,
            salonId: selectedService.salonId,
            scheduledStart: `${selectedDate.toISOString().split('T')[0]}T${selectedTimeSlot.startTime}:00`,
            scheduledEnd: `${selectedDate.toISOString().split('T')[0]}T${selectedTimeSlot.endTime}:00`,
            notes: notes.trim() || undefined,
          };
          createAppointmentMutation.mutate(bookingData);
        }
        break;
    }
  }, [
    currentStep,
    selectedService,
    selectedEmployee,
    selectedDate,
    selectedTimeSlot,
    selectedCustomer,
    notes,
    createAppointmentMutation,
  ]);

  const goToPreviousStep = useCallback(() => {
    switch (currentStep) {
      case 'employee':
        setCurrentStep('service');
        break;
      case 'calendar':
        setCurrentStep('employee');
        break;
      case 'timeslot':
        setCurrentStep('calendar');
        break;
      case 'confirmation':
        setCurrentStep('timeslot');
        break;
    }
  }, [currentStep]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'service':
        return !!selectedService;
      case 'employee':
        return !!selectedEmployee;
      case 'calendar':
        return !!selectedDate;
      case 'timeslot':
        return !!selectedTimeSlot;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedService, selectedEmployee, selectedDate, selectedTimeSlot]);

  const getStepNumber = () => {
    const steps = ['service', 'employee', 'calendar', 'timeslot', 'confirmation'];
    return steps.indexOf(currentStep) + 1;
  };

  const steps: Exclude<BookingStep, 'success'>[] = ['service', 'employee', 'calendar', 'timeslot', 'confirmation'];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" 
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {currentStep !== 'service' && currentStep !== 'success' && (
                  <button
                    onClick={goToPreviousStep}
                    className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                  </button>
                )}
                <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">
                  {selectedService?.name || 'New Appointment'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background-light dark:hover:bg-background-dark rounded transition"
              >
                <X className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>

            {/* Step Indicators */}
            {currentStep !== 'success' && (
              <div className="flex items-center gap-2">
                {steps.map((step, index) => {
                  const config = stepConfig[step];
                  const Icon = config.icon;
                  const isActive = step === currentStep;
                  const isCompleted = index < getStepNumber() - 1;
                  
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-white'
                          : isCompleted
                            ? 'bg-success/20 text-success'
                            : 'bg-background-light dark:bg-background-dark text-text-light/30 dark:text-text-dark/30'
                      }`}>
                        {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-px mx-1 ${
                          isCompleted ? 'bg-success' : 'bg-border-light dark:bg-border-dark'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {currentStep === 'service' && (
              <ServiceSelector
                salonId={salonId}
                selectedService={selectedService}
                onServiceSelect={setSelectedService}
              />
            )}

            {currentStep === 'employee' && selectedService && (
              <EmployeeSelector
                salonId={selectedService.salonId}
                serviceId={selectedService.id}
                selectedEmployee={selectedEmployee}
                onEmployeeSelect={setSelectedEmployee}
              />
            )}

            {currentStep === 'calendar' && selectedService && selectedEmployee && (
              <AvailabilityCalendar
                employeeId={selectedEmployee.id}
                serviceId={selectedService.id}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            )}

            {currentStep === 'timeslot' && selectedService && selectedEmployee && selectedDate && (
              <TimeSlotPicker
                employeeId={selectedEmployee.id}
                serviceId={selectedService.id}
                date={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onTimeSlotSelect={setSelectedTimeSlot}
              />
            )}

            {currentStep === 'confirmation' && (
              <BookingConfirmation
                service={selectedService}
                employee={selectedEmployee}
                date={selectedDate}
                timeSlot={selectedTimeSlot}
                customer={selectedCustomer}
                notes={notes}
                onCustomerChange={setSelectedCustomer}
                onNotesChange={setNotes}
                isLoading={createAppointmentMutation.isPending}
              />
            )}

            {currentStep === 'success' && createdAppointmentId && (
              <BookingSuccess
                appointmentId={createdAppointmentId}
                service={selectedService}
                employee={selectedEmployee}
                date={selectedDate}
                timeSlot={selectedTimeSlot}
                onClose={onClose}
                onViewAppointment={() => {
                  if (onClose) onClose();
                  router.push(`/appointments/${createdAppointmentId}`);
                }}
              />
            )}
          </div>

          {/* Footer */}
          {currentStep !== 'success' && (
            <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
              <div className="flex items-center justify-between gap-4">
                {/* Summary */}
                <div className="flex-1 min-w-0">
                  {selectedService && (
                    <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-3 h-3 text-primary" />
                      </div>
                      <span className="truncate font-medium text-text-light dark:text-text-dark">
                        {selectedService.name}
                      </span>
                      <span className="text-text-light/40 dark:text-text-dark/40">•</span>
                      <span>{selectedService.durationMinutes} min</span>
                      {selectedService.basePrice > 0 && (
                        <>
                          <span className="text-text-light/40 dark:text-text-dark/40">•</span>
                          <span className="font-semibold text-primary">
                            RWF {selectedService.basePrice.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {currentStep !== 'service' && (
                    <Button onClick={goToPreviousStep} variant="secondary" size="sm">
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={goToNextStep}
                    variant="primary"
                    size="sm"
                    disabled={!canProceed() || createAppointmentMutation.isPending}
                  >
                    {currentStep === 'confirmation'
                      ? createAppointmentMutation.isPending
                        ? 'Booking...'
                        : 'Confirm'
                      : 'Continue'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
