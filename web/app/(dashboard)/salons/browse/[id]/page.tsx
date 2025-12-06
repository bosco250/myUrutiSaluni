'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Scissors,
  DollarSign,
  Calendar,
  ArrowLeft,
  CheckCircle,
  X,
  Loader2,
  User,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { format } from 'date-fns';
import SalonLocationMap from '@/components/maps/SalonLocationMap';

interface Salon {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  status?: string; // Backend uses 'status' field (default: 'active')
  isActive?: boolean; // Frontend compatibility
  latitude?: number;
  longitude?: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number; // Backend uses basePrice
  durationMinutes: number; // Backend uses durationMinutes
  isActive: boolean;
  salonId: string;
}

interface SalonEmployee {
  id: string;
  userId: string;
  salonId: string;
  roleTitle?: string;
  isActive?: boolean;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export default function SalonDetailsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER]}>
      <SalonDetailsContent />
    </ProtectedRoute>
  );
}

function SalonDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const { user: authUser } = useAuthStore();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const queryClient = useQueryClient();

  // Get salon details
  const { data: salon, isLoading: isLoadingSalon } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      // Handle different response structures: { data: {...} } or {...}
      const salonData = response.data?.data || response.data;
      return salonData;
    },
    enabled: !!salonId,
  });

  // Get salon services
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/services?salonId=${salonId}`);
        // Handle different response structures: { data: [...] } or [...]
        const servicesData = response.data?.data || response.data;
        const servicesArray = Array.isArray(servicesData) ? servicesData : [];
        return servicesArray;
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId,
  });

  // Get customer record
  const { data: customer } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${authUser?.id}`);
      return response.data;
    },
    enabled: !!authUser?.id,
  });

  // Get salon employees (for customer to select preferred employee)
  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError,
  } = useQuery<SalonEmployee[]>({
    queryKey: ['salon-employees-browse', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/employees`);
        // Handle different response structures: { data: [...] } or [...]
        const employeesData = response.data?.data || response.data;
        const employeesArray = Array.isArray(employeesData) ? employeesData : [];
        // Filter to only active employees and ensure they have user data
        return employeesArray.filter(
          (emp: SalonEmployee) => emp.isActive !== false && (emp.user || emp.roleTitle) // Must have at least name or role
        );
      } catch (error: any) {
        // Silently fail - employees are optional for booking
        return [];
      }
    },
    enabled: !!salonId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: {
      serviceId: string;
      scheduledStart: string;
      scheduledEnd: string;
      notes?: string;
      preferredEmployeeId?: string;
      preferredEmployeeName?: string;
    }) => {
      // Build metadata with employee preference
      const metadata: any = {};
      if (data.preferredEmployeeId) {
        metadata.preferredEmployeeId = data.preferredEmployeeId;
        metadata.preferredEmployeeName = data.preferredEmployeeName;
      }

      return api.post('/appointments', {
        salonId,
        customerId: customer?.id,
        serviceId: data.serviceId,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        status: 'pending',
        notes: data.notes,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-availability'] });
      setShowBookingModal(false);
      setSelectedService(null);
      alert('Appointment request submitted! It will be confirmed by the salon.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to book appointment';
      // Error message already includes employee name from backend
      alert(errorMessage);
    },
  });

  if (isLoadingSalon) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light/60 dark:text-text-dark/60">Loading salon details...</p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <X className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            Salon Not Found
          </h3>
          <Button onClick={() => router.push('/salons/browse')} variant="primary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  const activeServices = services?.filter((s) => s.isActive) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back Button */}
      <Button
        onClick={() => router.push('/salons/browse')}
        variant="outline"
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Salons
      </Button>

      {/* Salon Header */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-4">
              {salon.name}
            </h1>
            {salon.description && (
              <p className="text-text-light/80 dark:text-text-dark/80 mb-6">{salon.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salon.address && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              <span className="text-text-light/80 dark:text-text-dark/80">{salon.address}</span>
            </div>
          )}
          {salon.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              <span className="text-text-light/80 dark:text-text-dark/80">{salon.phone}</span>
            </div>
          )}
          {salon.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              <span className="text-text-light/80 dark:text-text-dark/80">{salon.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Services Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">
          Available Services
        </h2>

        {isLoadingServices ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-light/60 dark:text-text-dark/60">Loading services...</p>
          </div>
        ) : activeServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onBook={() => {
                  setSelectedService(service);
                  setShowBookingModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
            <Scissors className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
              No Services Available
            </h3>
            <p className="text-text-light/60 dark:text-text-dark/60">
              This salon hasn't added any services yet.
            </p>
          </div>
        )}
      </div>

      {/* Location Section */}
      {salon.latitude && salon.longitude && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">
            Location
          </h2>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <SalonLocationMap
              latitude={salon.latitude}
              longitude={salon.longitude}
              salonName={salon.name}
              address={salon.address}
              height="400px"
            />
            {salon.address && (
              <div className="mt-4 flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{salon.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <BookingModal
          service={selectedService}
          salon={salon}
          customer={customer}
          employees={employees}
          isLoadingEmployees={isLoadingEmployees}
          employeesError={employeesError}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          onBook={(data) => bookingMutation.mutate(data)}
          isLoading={bookingMutation.isPending}
        />
      )}
    </div>
  );
}

function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
              {service.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm text-text-light/80 dark:text-text-dark/80">
              {service.durationMinutes || 0} min
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm font-bold text-text-light dark:text-text-dark">
              RWF {service.basePrice ? Number(service.basePrice).toLocaleString() : '0'}
            </span>
          </div>
        </div>
      </div>

      <Button
        onClick={onBook}
        variant="primary"
        className="w-full flex items-center justify-center gap-2"
      >
        <Calendar className="w-4 h-4" />
        Book Appointment
      </Button>
    </div>
  );
}

function BookingModal({
  service,
  salon,
  customer,
  employees,
  isLoadingEmployees,
  employeesError,
  onClose,
  onBook,
  isLoading,
}: {
  service: Service;
  salon: Salon;
  customer: any;
  employees: SalonEmployee[];
  isLoadingEmployees?: boolean;
  employeesError?: any;
  onClose: () => void;
  onBook: (data: {
    serviceId: string;
    scheduledStart: string;
    scheduledEnd: string;
    notes?: string;
    preferredEmployeeId?: string;
    preferredEmployeeName?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [availabilityError, setAvailabilityError] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Please select date and time');
      return;
    }

    const scheduledStart = new Date(`${selectedDate}T${selectedTime}`);
    const durationMinutes = service.durationMinutes || 30; // Default to 30 minutes if not provided
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60000);

    // Get selected employee details
    let preferredEmployeeId: string | undefined;
    let preferredEmployeeName: string | undefined;
    let finalNotes = notes;

    if (selectedEmployee) {
      const selectedEmp = employees.find((emp) => emp.id === selectedEmployee);
      if (selectedEmp) {
        preferredEmployeeId = selectedEmp.id;
        preferredEmployeeName =
          selectedEmp.user?.fullName || selectedEmp.roleTitle || 'Selected employee';

        // Validate employee availability before booking
        if (selectedTime && !availableSlots.includes(selectedTime)) {
          setAvailabilityError(
            `${preferredEmployeeName} is not available at this time. Please select an available time slot.`
          );
          return;
        }

        // Also add to notes for visibility
        const employeeNote = `Preferred Employee: ${preferredEmployeeName}`;
        if (finalNotes) {
          finalNotes = `${employeeNote}\n\n${finalNotes}`;
        } else {
          finalNotes = employeeNote;
        }
      }
    }

    // Clear any previous errors
    setAvailabilityError('');

    onBook({
      serviceId: service.id,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      notes: finalNotes || undefined,
      preferredEmployeeId,
      preferredEmployeeName,
    });
  };

  // Handle time selection - check if selected time is available
  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedEmployee && selectedDate && !availableSlots.includes(time)) {
      const selectedEmp = employees.find((emp) => emp.id === selectedEmployee);
      const employeeName = selectedEmp?.user?.fullName || selectedEmp?.roleTitle || 'This employee';
      setAvailabilityError(
        `${employeeName} is not available at this time. Please select an available time slot.`
      );
    } else {
      setAvailabilityError('');
    }
  };

  // Generate all possible time slots (9 AM to 6 PM, 30-minute intervals)
  const allTimeSlots: string[] = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Fetch available time slots when date and employee are selected
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['employee-availability', selectedEmployee, selectedDate, service.durationMinutes],
    queryFn: async () => {
      if (!selectedEmployee || !selectedDate) {
        return null;
      }
      try {
        const response = await api.get(
          `/appointments/availability/${selectedEmployee}?date=${selectedDate}&duration=${service.durationMinutes || 30}`
        );
        return response.data;
      } catch (error) {
        // Silently fail - availability check is optional
        return null;
      }
    },
    enabled: !!selectedEmployee && !!selectedDate,
  });

  // Update available slots when availability data changes
  useEffect(() => {
    if (availabilityData?.availableSlots) {
      setAvailableSlots(availabilityData.availableSlots);
      // Clear selected time if it's no longer available
      if (selectedTime && !availabilityData.availableSlots.includes(selectedTime)) {
        setSelectedTime('');
        const selectedEmp = employees.find((emp) => emp.id === selectedEmployee);
        const employeeName =
          selectedEmp?.user?.fullName || selectedEmp?.roleTitle || 'This employee';
        setAvailabilityError(
          `${employeeName} is not available at the selected time. Please choose another time slot.`
        );
      } else {
        setAvailabilityError('');
      }
    } else if (selectedEmployee && selectedDate) {
      // If no availability data but employee and date selected, show all slots initially
      setAvailableSlots(allTimeSlots);
    } else {
      // If no employee selected, show all slots
      setAvailableSlots(allTimeSlots);
    }
  }, [availabilityData, selectedEmployee, selectedDate, selectedTime, employees, allTimeSlots]);

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  // Get time slots to display (filtered by availability if employee is selected)
  const timeSlots = selectedEmployee && selectedDate ? availableSlots : allTimeSlots;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
            Book Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
            {service.name}
          </h3>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">{salon.name}</p>
          <div className="flex items-center gap-4 text-sm text-text-light/80 dark:text-text-dark/80">
            <span>Duration: {service.durationMinutes || 0} min</span>
            <span>
              Price: RWF {service.basePrice ? Number(service.basePrice).toLocaleString() : '0'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                // Reset time selection when date changes
                setSelectedTime('');
                setAvailabilityError('');
              }}
              min={minDate}
              required
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Select Time
              {selectedEmployee && selectedDate && isLoadingAvailability && (
                <span className="ml-2 text-xs text-text-light/60 dark:text-text-dark/60">
                  (Loading availability...)
                </span>
              )}
            </label>
            <select
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              required
              disabled={isLoadingAvailability}
              className={`w-full px-4 py-2 bg-background-light dark:bg-background-dark border rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary ${
                availabilityError && selectedTime
                  ? 'border-danger'
                  : 'border-border-light dark:border-border-dark'
              } ${isLoadingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">Select time</option>
              {timeSlots.map((time) => {
                const isAvailable =
                  !selectedEmployee || !selectedDate || availableSlots.includes(time);
                return (
                  <option
                    key={time}
                    value={time}
                    disabled={!isAvailable}
                    className={isAvailable ? '' : 'text-text-light/40 dark:text-text-dark/40'}
                  >
                    {time} {!isAvailable && '(Booked)'}
                  </option>
                );
              })}
            </select>
            {availabilityError && <p className="mt-2 text-sm text-danger">{availabilityError}</p>}
            {selectedEmployee &&
              selectedDate &&
              availableSlots.length > 0 &&
              !isLoadingAvailability && (
                <p className="mt-2 text-xs text-text-light/60 dark:text-text-dark/60">
                  {availableSlots.length} available time slot
                  {availableSlots.length !== 1 ? 's' : ''} on this date
                </p>
              )}
            {selectedEmployee &&
              selectedDate &&
              availableSlots.length === 0 &&
              !isLoadingAvailability && (
                <p className="mt-2 text-sm text-warning">
                  No available time slots for this employee on this date. Please select another
                  date.
                </p>
              )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Choose Your Preferred Employee (Optional)
            </label>
            {isLoadingEmployees ? (
              <div className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-center">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Loading employees...
                </span>
              </div>
            ) : employees.length > 0 ? (
              <>
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    // Reset time selection when employee changes
                    setSelectedTime('');
                    setAvailabilityError('');
                  }}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No preference - Any available employee</option>
                  {employees.map((employee) => {
                    const displayName = employee.user?.fullName || employee.roleTitle || 'Employee';
                    const roleSuffix =
                      employee.roleTitle && employee.user?.fullName
                        ? ` - ${employee.roleTitle}`
                        : '';
                    return (
                      <option key={employee.id} value={employee.id}>
                        {displayName}
                        {roleSuffix}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1.5">
                  💡 Select your favorite stylist or leave blank for any available employee
                </p>
              </>
            ) : (
              <div className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light/60 dark:text-text-dark/60 text-sm">
                {employeesError
                  ? 'Unable to load employees. You can still book - the salon will assign a staff member.'
                  : 'No employees available for selection. The salon will assign an available staff member.'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Any special requests or notes..."
            />
          </div>

          {!customer && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Your customer profile will be created automatically when you book this appointment.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
