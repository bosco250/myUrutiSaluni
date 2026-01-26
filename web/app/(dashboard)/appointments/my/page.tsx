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
  Building2,
  CalendarCheck,
  History,
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
    <ProtectedRoute
      requiredRoles={[
        UserRole.CUSTOMER,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
        UserRole.SUPER_ADMIN,
      ]}
    >
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
      return (response.data || []) as Appointment[];
    },
    enabled: !!customer?.id,
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> =
      {
        pending: { bg: 'bg-warning/10', text: 'text-warning', icon: Clock, label: 'Pending' },
        booked: { bg: 'bg-primary/10', text: 'text-primary', icon: Calendar, label: 'Booked' },
        confirmed: {
          bg: 'bg-success/10',
          text: 'text-success',
          icon: CheckCircle2,
          label: 'Confirmed',
        },
        in_progress: {
          bg: 'bg-primary/10',
          text: 'text-primary',
          icon: Sparkles,
          label: 'In Progress',
        },
        completed: {
          bg: 'bg-background-secondary dark:bg-background-dark',
          text: 'text-text-light/60 dark:text-text-dark/60',
          icon: CheckCircle2,
          label: 'Completed',
        },
        cancelled: { bg: 'bg-error/10', text: 'text-error', icon: XCircle, label: 'Cancelled' },
        no_show: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertCircle, label: 'No Show' },
      };
    return configs[status] || configs.pending;
  };

  // Filter appointments based on selected tab
  const filteredAppointments =
    appointments
      ?.filter((apt) => {
        const startDate = new Date(apt.scheduledStart);
        const isUpcoming =
          startDate >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed';

        if (selectedTab === 'upcoming') return isUpcoming;
        if (selectedTab === 'past') return !isUpcoming;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStart).getTime();
        const dateB = new Date(b.scheduledStart).getTime();
        return selectedTab === 'past' ? dateB - dateA : dateA - dateB;
      }) || [];

  const upcomingCount =
    appointments?.filter(
      (apt) =>
        new Date(apt.scheduledStart) >= new Date() &&
        apt.status !== 'cancelled' &&
        apt.status !== 'completed'
    ).length || 0;

  const completedCount = appointments?.filter((apt) => apt.status === 'completed').length || 0;
  const pastCount = appointments ? appointments.length - upcomingCount : 0;

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-4">
              Loading your appointments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            My Personal Bookings
          </h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            Appointments you booked for yourself at other salons
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Upcoming Card */}
        <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Upcoming
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {upcomingCount}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Past Card */}
        <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Past
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {pastCount}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <History className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Completed
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {completedCount}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Total Card */}
        <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {appointments?.length || 0}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-background-secondary dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark w-fit">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount, icon: CalendarCheck },
          { key: 'past', label: 'Past', count: pastCount, icon: History },
          { key: 'all', label: 'All', count: appointments?.length || 0, icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as TabFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              selectedTab === tab.key
                ? 'bg-surface-light dark:bg-background-dark text-primary shadow-sm'
                : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                selectedTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-border-light dark:bg-border-dark text-text-light/40 dark:text-text-dark/40'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length > 0 ? (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const statusConfig = getStatusConfig(appointment.status);
            const StatusIcon = statusConfig.icon;
            const startDate = new Date(appointment.scheduledStart);
            const isUpcoming =
              startDate >= new Date() &&
              appointment.status !== 'cancelled' &&
              appointment.status !== 'completed';

            return (
              <div
                key={appointment.id}
                onClick={() => router.push(`/appointments/${appointment.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/appointments/${appointment.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`block p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer ${
                  isUpcoming ? 'ring-1 ring-primary/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Date Badge */}
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                      isUpcoming
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md'
                        : 'bg-background-secondary dark:bg-surface-dark text-text-light/60 dark:text-text-dark/60'
                    }`}
                  >
                    <span className="text-xl font-bold leading-none">{format(startDate, 'd')}</span>
                    <span className="text-[10px] uppercase tracking-wide font-semibold">
                      {format(startDate, 'MMM')}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-text-light dark:text-text-dark group-hover:text-primary transition-colors">
                          {appointment.service?.name || 'Appointment'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Building2 className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">
                            {appointment.salon?.name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-text-light/80 dark:text-text-dark/80">
                        <Clock className="w-3 h-3" />
                        {format(startDate, 'h:mm a')}
                      </span>
                      {appointment.salonEmployee?.user?.fullName && (
                        <span className="flex items-center gap-1.5 text-xs text-text-light/80 dark:text-text-dark/80">
                          <User className="w-3 h-3" />
                          {appointment.salonEmployee.user.fullName}
                        </span>
                      )}
                      {appointment.service?.basePrice && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          RWF {Number(appointment.service.basePrice).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-text-light/20 dark:text-text-dark/20 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
            {selectedTab === 'upcoming'
              ? 'No Upcoming Appointments'
              : selectedTab === 'past'
                ? 'No Past Appointments'
                : 'No Appointments Yet'}
          </h3>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4 max-w-md mx-auto">
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
