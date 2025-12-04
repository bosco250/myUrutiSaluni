'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { 
  Building2, MapPin, Phone, Mail, Clock, Scissors, DollarSign, 
  Calendar, ArrowLeft, CheckCircle, X, Loader2 
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { format } from 'date-fns';

interface Salon {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in minutes
  isActive: boolean;
  salonId: string;
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
      return response.data;
    },
    enabled: !!salonId,
  });

  // Get salon services
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      const response = await api.get(`/services?salonId=${salonId}`);
      return response.data || [];
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

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: { serviceId: string; scheduledStart: string; scheduledEnd: string; notes?: string }) => {
      return api.post('/appointments', {
        salonId,
        customerId: customer?.id,
        serviceId: data.serviceId,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        status: 'booked',
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      setShowBookingModal(false);
      setSelectedService(null);
      alert('Appointment booked successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to book appointment');
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
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">Salon Not Found</h3>
          <Button onClick={() => router.push('/salons/browse')} variant="primary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  const activeServices = services?.filter(s => s.isActive) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back Button */}
      <Button
        onClick={() => router.push('/salons/browse')}
        variant="ghost"
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Salons
      </Button>

      {/* Salon Header */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-4">{salon.name}</h1>
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
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">Available Services</h2>
        
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
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">No Services Available</h3>
            <p className="text-text-light/60 dark:text-text-dark/60">This salon hasn't added any services yet.</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <BookingModal
          service={selectedService}
          salon={salon}
          customer={customer}
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
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">{service.name}</h3>
          {service.description && (
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">{service.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm text-text-light/80 dark:text-text-dark/80">{service.duration} min</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm font-bold text-text-light dark:text-text-dark">
              RWF {service.price.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <Button onClick={onBook} variant="primary" className="w-full flex items-center justify-center gap-2">
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
  onClose,
  onBook,
  isLoading,
}: {
  service: Service;
  salon: Salon;
  customer: any;
  onClose: () => void;
  onBook: (data: { serviceId: string; scheduledStart: string; scheduledEnd: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Please select date and time');
      return;
    }

    const scheduledStart = new Date(`${selectedDate}T${selectedTime}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + service.duration * 60000);

    onBook({
      serviceId: service.id,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      notes: notes || undefined,
    });
  };

  // Generate time slots (9 AM to 6 PM, 30-minute intervals)
  const timeSlots = [];
  for (let hour = 9; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Book Appointment</h2>
          <button
            onClick={onClose}
            className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">{service.name}</h3>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">{salon.name}</p>
          <div className="flex items-center gap-4 text-sm text-text-light/80 dark:text-text-dark/80">
            <span>Duration: {service.duration} min</span>
            <span>Price: RWF {service.price.toLocaleString()}</span>
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
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              required
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Select Time
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select time</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
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
            <Button type="button" onClick={onClose} variant="ghost" className="flex-1">
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

