'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Calendar, Clock, Scissors, Building2, Plus, X, MapPin, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

interface Appointment {
  id: string;
  customerId?: string;
  serviceId?: string;
  salonId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  customer?: {
    id?: string;
    fullName: string;
    phone: string;
  };
  service?: {
    id?: string;
    name: string;
    price?: number;
    duration?: number;
  };
  salon?: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export default function MyAppointmentsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER]}>
      <MyAppointmentsContent />
    </ProtectedRoute>
  );
}

function MyAppointmentsContent() {
  const router = useRouter();
  const { user: authUser } = useAuthStore();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const queryClient = useQueryClient();

  // Get customer record
  const { data: customer } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${authUser?.id}`);
      return response.data;
    },
    enabled: !!authUser?.id,
  });

  // Get customer appointments
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['customer-appointments', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const response = await api.get(`/appointments/customer/${customer.id}`);
      return response.data || [];
    },
    enabled: !!customer?.id,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      booked: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-light/60 dark:text-text-dark/60">Loading appointments...</p>
        </div>
      </div>
    );
  }

  const upcomingAppointments = appointments?.filter(
    (apt) => new Date(apt.scheduledStart) >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed'
  ) || [];
  const pastAppointments = appointments?.filter(
    (apt) => new Date(apt.scheduledStart) < new Date() || apt.status === 'cancelled' || apt.status === 'completed'
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">My Appointments</h1>
          <p className="text-text-light/60 dark:text-text-dark/60">View and manage your appointments</p>
        </div>
        <Button
          onClick={() => router.push('/salons/browse')}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Book New Appointment
        </Button>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">Upcoming</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} getStatusColor={getStatusColor} />
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">Past Appointments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} getStatusColor={getStatusColor} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!appointments || appointments.length === 0) && (
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">No Appointments Yet</h3>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Start by browsing salons and booking your first appointment
          </p>
          <Button
            onClick={() => router.push('/salons/browse')}
            variant="primary"
            className="flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Browse Salons
          </Button>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, getStatusColor }: { appointment: Appointment; getStatusColor: (status: string) => string }) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">
              {format(new Date(appointment.scheduledStart), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm text-text-light/80 dark:text-text-dark/80">
              {format(new Date(appointment.scheduledStart), 'h:mm a')} - {format(new Date(appointment.scheduledEnd), 'h:mm a')}
            </span>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
          {appointment.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {appointment.service && (
        <div className="flex items-center gap-2 mb-3">
          <Scissors className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
          <span className="text-sm font-medium text-text-light dark:text-text-dark">{appointment.service.name}</span>
          {appointment.service.price && (
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">
              - RWF {appointment.service.price.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {appointment.salon && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
            <span className="text-sm font-medium text-text-light dark:text-text-dark">{appointment.salon.name}</span>
          </div>
          {appointment.salon.address && (
            <div className="flex items-center gap-2 text-sm text-text-light/60 dark:text-text-dark/60">
              <MapPin className="w-4 h-4" />
              <span>{appointment.salon.address}</span>
            </div>
          )}
          {appointment.salon.phone && (
            <div className="flex items-center gap-2 text-sm text-text-light/60 dark:text-text-dark/60">
              <Phone className="w-4 h-4" />
              <span>{appointment.salon.phone}</span>
            </div>
          )}
        </div>
      )}

      {appointment.notes && (
        <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
          <p className="text-sm text-text-light/80 dark:text-text-dark/80">{appointment.notes}</p>
        </div>
      )}
    </div>
  );
}

