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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-3">
              Loading your appointments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-light dark:text-text-dark">
            My Bookings
          </h1>
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-0.5">
            Appointments you booked for yourself at other salons
          </p>
        </div>
        <Button
          onClick={() => router.push('/salons/browse')}
          variant="primary"
          size="sm"
          className="flex items-center gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Book New
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: 'Upcoming',
            value: upcomingCount,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-500',
            border: 'hover:border-amber-500/50',
            badge: upcomingCount > 0 ? { label: 'Action', class: 'text-amber-500 bg-amber-500/10' } : null,
          },
          {
            label: 'Past',
            value: pastCount,
            icon: History,
            gradient: 'from-blue-500 to-cyan-500',
            border: 'hover:border-blue-500/50',
          },
          {
            label: 'Completed',
            value: completedCount,
            icon: CheckCircle2,
            gradient: 'from-green-500 to-emerald-500',
            border: 'hover:border-emerald-500/50',
          },
          {
            label: 'Total',
            value: appointments?.length || 0,
            icon: CalendarDays,
            gradient: 'from-violet-500 to-purple-500',
            border: 'hover:border-violet-500/50',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 hover:shadow-lg transition-all ${stat.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 bg-gradient-to-br ${stat.gradient} rounded-lg`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-text-light/60 dark:text-text-dark/60">
                {stat.label}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-text-light dark:text-text-dark leading-none">
                {stat.value}
              </span>
              {stat.badge && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stat.badge.class}`}>
                  {stat.badge.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border-light dark:border-border-dark">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { key: 'past', label: 'Past', count: pastCount },
          { key: 'all', label: 'All', count: appointments?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as TabFilter)}
            className={`px-4 py-2 text-xs font-medium transition-colors relative ${
              selectedTab === tab.key
                ? 'text-primary'
                : 'text-text-light/50 dark:text-text-dark/50 hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              <span
                className={`px-1.5 py-px rounded text-[10px] font-medium ${
                  selectedTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-border-light dark:bg-border-dark text-text-light/40 dark:text-text-dark/40'
                }`}
              >
                {tab.count}
              </span>
            </span>
            {selectedTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length > 0 ? (
        <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
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
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-background-light dark:hover:bg-background-dark ${
                  isUpcoming ? 'bg-primary/[0.02] dark:bg-primary/[0.04]' : ''
                }`}
              >
                {/* Date cell */}
                <div className="w-10 flex-shrink-0 text-center">
                  <p className={`text-sm font-semibold leading-none ${
                    isUpcoming ? 'text-primary' : 'text-text-light/50 dark:text-text-dark/50'
                  }`}>
                    {format(startDate, 'd')}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-text-light/40 dark:text-text-dark/40 mt-0.5">
                    {format(startDate, 'MMM')}
                  </p>
                </div>

                {/* Divider */}
                <div className={`w-px h-8 flex-shrink-0 ${
                  isUpcoming ? 'bg-primary/20' : 'bg-border-light dark:bg-border-dark'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-text-light dark:text-text-dark truncate">
                      {appointment.service?.name || 'Appointment'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {appointment.salon && (
                      <span className="text-[11px] text-text-light/50 dark:text-text-dark/50 truncate">
                        {appointment.salon.name}
                      </span>
                    )}
                    {appointment.salonEmployee?.user?.fullName && (
                      <>
                        <span className="text-text-light/20 dark:text-text-dark/20 text-[10px]">/</span>
                        <span className="text-[11px] text-text-light/40 dark:text-text-dark/40 truncate">
                          {appointment.salonEmployee.user.fullName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="hidden sm:block flex-shrink-0">
                  <p className="text-[11px] text-text-light/50 dark:text-text-dark/50 tabular-nums">
                    {format(startDate, 'h:mm a')}
                  </p>
                </div>

                {/* Price */}
                {appointment.service?.basePrice && (
                  <div className="hidden md:block flex-shrink-0">
                    <p className="text-[11px] font-medium text-primary tabular-nums">
                      RWF {Number(appointment.service.basePrice).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Status */}
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${statusConfig.bg} ${statusConfig.text}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusConfig.label}
                </span>

                {/* Chevron */}
                <ChevronRight className="w-3.5 h-3.5 text-text-light/20 dark:text-text-dark/20 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="border border-border-light dark:border-border-dark border-dashed rounded-lg py-12 text-center">
          <Calendar className="w-8 h-8 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
            {selectedTab === 'upcoming'
              ? 'No Upcoming Appointments'
              : selectedTab === 'past'
                ? 'No Past Appointments'
                : 'No Appointments Yet'}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mb-4 max-w-sm mx-auto">
            {selectedTab === 'upcoming'
              ? 'Ready for a fresh look? Browse our partner salons and book your next appointment!'
              : 'Start by browsing salons and booking your first appointment'}
          </p>
          <Button
            onClick={() => router.push('/salons/browse')}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5 mx-auto text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Find a Salon
          </Button>
        </div>
      )}
    </div>
  );
}
