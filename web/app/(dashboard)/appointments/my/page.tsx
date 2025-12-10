'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  CalendarDays,
  User,
} from 'lucide-react';
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
  salonEmployeeId?: string;
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
    basePrice?: number;
    durationMinutes?: number;
  };
  salon?: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  salonEmployee?: {
    id?: string;
    roleTitle?: string;
    user?: {
      fullName?: string;
    };
  };
}

type TabFilter = 'upcoming' | 'past' | 'all';

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
  const [selectedTab, setSelectedTab] = useState<TabFilter>('upcoming');

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



  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-warning/10', text: 'text-warning', icon: Clock, label: 'Pending' },
      booked: { bg: 'bg-primary/10', text: 'text-primary', icon: Calendar, label: 'Booked' },
      confirmed: { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2, label: 'Confirmed' },
      in_progress: { bg: 'bg-primary/10', text: 'text-primary', icon: Sparkles, label: 'In Progress' },
      completed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-text-light/60 dark:text-text-dark/60', icon: CheckCircle2, label: 'Completed' },
      cancelled: { bg: 'bg-danger/10', text: 'text-danger', icon: XCircle, label: 'Cancelled' },
      no_show: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertCircle, label: 'No Show' },
    };
    return configs[status] || configs.pending;
  };

  // Filter appointments based on selected tab
  const filteredAppointments = appointments?.filter((apt) => {
    const startDate = new Date(apt.scheduledStart);
    const isUpcoming = startDate >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed';
    
    if (selectedTab === 'upcoming') return isUpcoming;
    if (selectedTab === 'past') return !isUpcoming;
    return true;
  }).sort((a, b) => {
    // Sort upcoming by date ascending, past by date descending
    const dateA = new Date(a.scheduledStart).getTime();
    const dateB = new Date(b.scheduledStart).getTime();
    return selectedTab === 'past' ? dateB - dateA : dateA - dateB;
  }) || [];

  const upcomingCount = appointments?.filter(
    (apt) => new Date(apt.scheduledStart) >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed'
  ).length || 0;

  const pastCount = appointments ? appointments.length - upcomingCount : 0;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            My Appointments
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-2">
            Manage and track all your bookings
          </p>
        </div>
        <Button
          onClick={() => router.push('/salons/browse')}
          variant="primary"
          size="md"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Book New
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl w-fit border border-border-light dark:border-border-dark">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { key: 'past', label: 'Past', count: pastCount },
          { key: 'all', label: 'All', count: appointments?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as TabFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedTab === tab.key
                ? 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark shadow-sm'
                : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              selectedTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-200 dark:bg-gray-700 text-text-light/40 dark:text-text-dark/40'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          {filteredAppointments.map((appointment) => {
            const statusConfig = getStatusConfig(appointment.status);
            const StatusIcon = statusConfig.icon;
            const startDate = new Date(appointment.scheduledStart);
            const isUpcoming = startDate >= new Date() && appointment.status !== 'cancelled' && appointment.status !== 'completed';

            return (
              <button
                key={appointment.id}
                onClick={() => router.push(`/appointments/${appointment.id}`)}
                className={`w-full text-left bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 md:p-6 hover:shadow-md hover:border-primary/30 transition-all group ${
                  isUpcoming ? 'ring-2 ring-primary/10' : ''
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Date Badge */}
                  <div className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center ${
                    isUpcoming 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-text-light/60 dark:text-text-dark/60'
                  }`}>
                    <span className="text-xl md:text-2xl font-bold">{format(startDate, 'd')}</span>
                    <span className="text-[10px] uppercase">{format(startDate, 'MMM')}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                          {appointment.service?.name || 'Appointment'}
                        </h3>
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-0.5">
                          {appointment.salon?.name}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 text-sm text-text-light/80 dark:text-text-dark/80">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {format(startDate, 'h:mm a')}
                      </span>
                      {appointment.salonEmployee?.user?.fullName && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {appointment.salonEmployee.user.fullName}
                        </span>
                      )}
                      {appointment.service?.basePrice && (
                        <span className="flex items-center gap-1.5 font-medium text-text-light dark:text-text-dark">
                          RWF {Number(appointment.service.basePrice).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 md:py-16 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 mx-auto mb-4 md:mb-6 flex items-center justify-center">
            <Calendar className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            {selectedTab === 'upcoming' ? 'No Upcoming Appointments' : 
             selectedTab === 'past' ? 'No Past Appointments' : 'No Appointments Yet'}
          </h3>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6 max-w-md mx-auto">
            {selectedTab === 'upcoming' 
              ? 'Ready for a fresh look? Browse our partner salons and book your next appointment!'
              : 'Start by browsing salons and booking your first appointment'}
          </p>
          <Button
            onClick={() => router.push('/salons/browse')}
            variant="primary"
            size="md"
            className="flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Find a Salon
          </Button>
        </div>
      )}


    </div>
  );
}


