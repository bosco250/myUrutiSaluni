'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Edit,
  Eye,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO, isAfter, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useState, useMemo } from 'react';
import { exportToCSV, formatDateForExport } from '@/lib/export-utils';
import CalendarBookingModal from '@/components/appointments/CalendarBookingModal';

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
  serviceAmount?: number;
  metadata?: {
    preferredEmployeeId?: string;
    preferredEmployeeName?: string;
    [key: string]: unknown;
  };
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
  };
  salonEmployee?: {
    id: string;
    user?: {
      fullName: string;
    };
    roleTitle?: string;
    commissionRate?: number;
  };
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <AppointmentsContent />
    </ProtectedRoute>
  );
}

function AppointmentsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('upcoming');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Check if user can edit appointments (salon owners, employees, and admins)
  const canEdit =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ASSOCIATION_ADMIN ||
    user?.role === UserRole.SALON_OWNER ||
    user?.role === UserRole.SALON_EMPLOYEE;

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const response = await api.patch(`/appointments/${appointmentId}`, { status });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  // Get employee records for current user (if they are an employee)
  const { data: employeeRecords = [] } = useQuery({
    queryKey: ['my-employee-records', user?.id],
    queryFn: async () => {
      if (user?.role !== 'salon_employee' && user?.role !== 'SALON_EMPLOYEE') {
        return [];
      }
      try {
        // Get all salons user owns (which includes salons they work for as employee)
        const salonsResponse = await api.get('/salons');
        const allSalons = (salonsResponse.data?.data || salonsResponse.data || []) as Array<{ id: string }>;
        const salonIds = allSalons.map((s) => s.id);

        // Get employee records for each salon
        const records = [];
        for (const salonId of salonIds) {
          try {
            const empResponse = await api.get(`/salons/${salonId}/employees`);
            const employeesList = (empResponse.data?.data || empResponse.data || []) as Array<{
              id: string;
              userId: string;
            }>;
            const myEmployee = employeesList.find((emp) => emp.userId === user?.id);
            if (myEmployee) {
              records.push(myEmployee);
            }
          } catch (error) {
            // Skip if can't access employees for this salon
            continue;
          }
        }
        return records;
      } catch (error) {
        return [];
      }
    },
    enabled: !!user && (user.role === 'salon_employee' || user.role === 'SALON_EMPLOYEE'),
  });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return (response.data?.data || response.data || []) as Appointment[];
    },
  });

  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return (response.data || []) as Array<{ id: string; name: string }>;
      } catch (error) {
        return [];
      }
    },
  });

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return appointments.filter((appointment) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          appointment.customer?.fullName?.toLowerCase().includes(query) ||
          appointment.service?.name?.toLowerCase().includes(query) ||
          appointment.salon?.name?.toLowerCase().includes(query) ||
          appointment.customer?.phone?.includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false;
      }

      // Salon filter
      if (salonFilter !== 'all' && appointment.salonId !== salonFilter) {
        return false;
      }

      // Date filter - improved logic
      if (dateFilter !== 'all') {
        const appointmentDate = parseISO(appointment.scheduledStart);
        
        if (dateFilter === 'today') {
          // Today: only show appointments that haven't started yet OR all for today
          if (!isToday(appointmentDate)) return false;
        } else if (dateFilter === 'tomorrow') {
          if (!isTomorrow(appointmentDate)) return false;
        } else if (dateFilter === 'this_week') {
          if (!isWithinInterval(appointmentDate, { start: weekStart, end: weekEnd })) return false;
        } else if (dateFilter === 'upcoming') {
          // Upcoming: only appointments that haven't started yet
          if (!isAfter(appointmentDate, now)) return false;
        } else if (dateFilter === 'past') {
          if (isAfter(appointmentDate, now)) return false;
        }
      }

      return true;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter, salonFilter]);

  // Group appointments by date with proper sorting
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    
    // First, sort all filtered appointments by time
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
      const dateA = parseISO(a.scheduledStart);
      const dateB = parseISO(b.scheduledStart);
      // Sort ascending (earliest first) for upcoming, descending for past
      if (dateFilter === 'past') {
        return dateB.getTime() - dateA.getTime(); // Most recent first
      }
      return dateA.getTime() - dateB.getTime(); // Soonest first
    });
    
    // Group by date
    sortedAppointments.forEach((appointment) => {
      const date = format(parseISO(appointment.scheduledStart), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
    });
    
    return groups;
  }, [filteredAppointments, dateFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = appointments.filter((apt) => isToday(parseISO(apt.scheduledStart)));
    const upcoming = appointments.filter((apt) => !isPast(parseISO(apt.scheduledStart)));
    const completed = appointments.filter((apt) => apt.status === 'completed');
    const confirmed = appointments.filter((apt) => apt.status === 'confirmed');

    return {
      total: appointments.length,
      today: today.length,
      upcoming: upcoming.length,
      completed: completed.length,
      confirmed: confirmed.length,
    };
  }, [appointments]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      pending: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
      },
      booked: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
      },
      confirmed: {
        bg: 'bg-green-500/10',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-500/20',
      },
      in_progress: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-500/20',
      },
      completed: {
        bg: 'bg-gray-500/10',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-500/20',
      },
      cancelled: {
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-500/20',
      },
      no_show: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-500/20',
      },
    };
    return colors[status] || colors.booked;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      booked: 'Booked',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    };
    return labels[status] || status;
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'EEEE, MMM d, h:mm a');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Appointments</h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
            Manage and track customer bookings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              const exportData = filteredAppointments.map((apt) => ({
                Date: formatDateForExport(apt.scheduledStart, 'yyyy-MM-dd'),
                Time: `${format(parseISO(apt.scheduledStart), 'HH:mm')} - ${format(parseISO(apt.scheduledEnd), 'HH:mm')}`,
                Customer: apt.customer?.fullName || 'Walk-in',
                Phone: apt.customer?.phone || 'N/A',
                Service: apt.service?.name || 'N/A',
                Salon: apt.salon?.name || 'N/A',
                Status: apt.status,
                Notes: apt.notes || '',
              }));
              exportToCSV(exportData, { filename: 'appointments' });
            }}
            variant="secondary"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button
            onClick={() => router.push('/appointments/calendar')}
            variant="secondary"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </Button>
          <Button
            onClick={() => setShowNewBookingModal(true)}
            variant="primary"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-0.5">
                {stats.total}
              </p>
            </div>
            <div className="p-2 bg-background-light dark:bg-background-dark rounded-lg">
              <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 dark:border-primary/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide">
                Today
              </p>
              <p className="text-xl font-bold text-primary mt-0.5">{stats.today}</p>
            </div>
            <div className="p-2 bg-gradient-to-br from-primary to-blue-500 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide">
                Upcoming
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.upcoming}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide">
                Completed
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-0.5">
                {stats.completed}
              </p>
            </div>
            <div className="p-2 bg-background-light dark:bg-background-dark rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide">
                Confirmed
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.confirmed}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this_week">This Week</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>

          {/* Salon Filter */}
          <select
            value={salonFilter}
            onChange={(e) => setSalonFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Salons</option>
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {Object.keys(groupedAppointments).length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
            <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
              No appointments found
            </h3>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-4">
              {searchQuery ||
              statusFilter !== 'all' ||
              dateFilter !== 'all' ||
              salonFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first appointment'}
            </p>
            {!searchQuery &&
              statusFilter === 'all' &&
              dateFilter === 'all' &&
              salonFilter === 'all' && (
                <Button
                  onClick={() => setShowNewBookingModal(true)}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2 mx-auto h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Appointment
                </Button>
              )}
          </div>
        ) : (
          Object.entries(groupedAppointments)
            .sort((a, b) => dateFilter === 'past' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
            .map(([date, dateAppointments]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border-light dark:bg-border-dark" />
                  <h2 className="text-sm font-semibold text-text-light dark:text-text-dark px-2">
                    {isToday(parseISO(date))
                      ? 'Today'
                      : isTomorrow(parseISO(date))
                        ? 'Tomorrow'
                        : format(parseISO(date), 'EEE, MMM d')}
                  </h2>
                  <span className="text-[10px] text-text-light/50 dark:text-text-dark/50 bg-background-light dark:bg-background-dark px-1.5 py-0.5 rounded">
                    {dateAppointments.length}
                  </span>
                  <div className="h-px flex-1 bg-border-light dark:bg-border-dark" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dateAppointments.map((appointment) => {
                    const statusColors = getStatusColor(appointment.status);
                    // Check if current user (employee) is the preferred employee for this appointment
                    const isMyAppointment = employeeRecords.some(
                      (emp: { id: string }) => emp.id === appointment.metadata?.preferredEmployeeId
                    );
                    const preferredEmployeeName = appointment.metadata?.preferredEmployeeName;

                    return (
                      <div
                        key={appointment.id}
                        className={`bg-surface-light dark:bg-surface-dark border rounded-xl p-4 hover:shadow-md transition-all group ${
                          isMyAppointment
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                      >
                        {/* Header with Service & Status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isMyAppointment
                                  ? 'bg-gradient-to-br from-primary to-primary/80'
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                              }`}
                            >
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                                {appointment.service?.name || 'Service'}
                              </p>
                              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                                {format(parseISO(appointment.scheduledStart), 'h:mm a')} - {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors.bg} ${statusColors.text}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 mb-3">
                          {appointment.customer && (
                            <div className="flex items-center gap-2 text-xs">
                              <User className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                              <span className="text-text-light dark:text-text-dark truncate">
                                {appointment.customer.fullName}
                              </span>
                              {isMyAppointment && (
                                <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  Assigned
                                </span>
                              )}
                            </div>
                          )}
                          {appointment.salon && (
                            <div className="flex items-center gap-2 text-xs">
                              <Building2 className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                              <span className="text-text-light/60 dark:text-text-dark/60 truncate">
                                {appointment.salon.name}
                              </span>
                            </div>
                          )}
                          {preferredEmployeeName && !isMyAppointment && (
                            <div className="flex items-center gap-2 text-xs">
                              <User className="w-3 h-3 text-primary/60" />
                              <span className="text-text-light/80 dark:text-text-dark/80">
                                {preferredEmployeeName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark">
                          {canEdit && appointment.status === 'pending' && (
                            <Button
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  appointmentId: appointment.id,
                                  status: 'booked',
                                })
                              }
                              variant="primary"
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              className="flex-1 h-7 text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Confirm
                            </Button>
                          )}
                          {canEdit &&
                            ['pending', 'booked', 'confirmed'].includes(appointment.status) && (
                              <Button
                                onClick={() => {
                                  if (
                                    confirm('Are you sure you want to cancel this appointment?')
                                  ) {
                                    updateStatusMutation.mutate({
                                      appointmentId: appointment.id,
                                      status: 'cancelled',
                                    });
                                  }
                                }}
                                variant="secondary"
                                size="sm"
                                className="text-danger hover:bg-danger/10 h-7 px-2"
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          <Button
                            onClick={() => router.push(`/appointments/${appointment.id}`)}
                            variant="secondary"
                            size="sm"
                            className={`h-7 text-xs ${
                              canEdit && appointment.status === 'pending' ? 'px-2' : 'flex-1'
                            }`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {canEdit && (
                            <Button
                              onClick={() => {
                                setEditingAppointment(appointment);
                                setShowModal(true);
                              }}
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* New Booking Modal (Calendar-based) */}
      <CalendarBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          setShowNewBookingModal(false);
        }}
      />

      {/* Edit Modal (Form-based) */}
      {showModal && (
        <AppointmentModal
          appointment={editingAppointment}
          onClose={() => {
            setShowModal(false);
            setEditingAppointment(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setShowModal(false);
            setEditingAppointment(null);
          }}
        />
      )}
    </div>
  );
}

function AppointmentModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment?: Appointment | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    customerId: appointment?.customerId || appointment?.customer?.id || '',
    serviceId: appointment?.serviceId || appointment?.service?.id || '',
    salonId: appointment?.salonId || appointment?.salon?.id || '',
    salonEmployeeId:
      appointment?.salonEmployeeId || appointment?.metadata?.preferredEmployeeId || '',
    scheduledStart: appointment
      ? format(new Date(appointment.scheduledStart), "yyyy-MM-dd'T'HH:mm")
      : '',
    scheduledEnd: appointment
      ? format(new Date(appointment.scheduledEnd), "yyyy-MM-dd'T'HH:mm")
      : '',
    status: appointment?.status || 'pending',
    notes: appointment?.notes || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return (response.data?.data || response.data || []) as Array<{ id: string; fullName: string; phone: string }>;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return (response.data?.data || response.data || []) as Array<{ id: string; name: string; basePrice: number }>;
    },
  });

  const { data: salons } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return (response.data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Fetch employees for selected salon
  const { data: employees = [] } = useQuery({
    queryKey: ['salon-employees', formData.salonId],
    queryFn: async () => {
      if (!formData.salonId) return [];
      try {
        const response = await api.get(`/salons/${formData.salonId}/employees`);
        return (response.data || []) as Array<{ id: string; user?: { fullName: string }; roleTitle?: string; isActive?: boolean; commissionRate: number }>;
      } catch (error) {
        return [];
      }
    },
    enabled: !!formData.salonId,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (appointment) {
        return api.patch(`/appointments/${appointment.id}`, data);
      } else {
        return api.post('/appointments', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to save appointment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
              {appointment ? 'Edit Appointment' : 'Create New Appointment'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition"
            >
              <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-danger/10 border border-danger/20 rounded-lg">
              <div className="flex items-center gap-2 text-danger">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-select" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Customer
                </label>
                <select
                  id="customer-select"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select customer (optional)</option>
                  {customers?.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="service-select" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Service
                </label>
                <select
                  id="service-select"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select service (optional)</option>
                  {services?.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}{' '}
                      {service.basePrice ? `- RWF ${service.basePrice.toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="salon-select" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Salon <span className="text-danger">*</span>
              </label>
              <select
                id="salon-select"
                required
                value={formData.salonId}
                onChange={(e) =>
                  setFormData({ ...formData, salonId: e.target.value, salonEmployeeId: '' })
                }
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select salon</option>
                {salons?.map((salon) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.salonId && (
              <div>
                <label htmlFor="employee-select" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Assign Employee (for commission tracking)
                </label>
                <select
                  id="employee-select"
                  value={formData.salonEmployeeId}
                  onChange={(e) => setFormData({ ...formData, salonEmployeeId: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">No employee assigned (optional)</option>
                  {employees
                    ?.filter((emp) => emp.isActive !== false)
                    ?.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.user?.fullName || employee.roleTitle || 'Unknown'}
                        {employee.roleTitle ? ` - ${employee.roleTitle}` : ''}
                        {employee.commissionRate > 0
                          ? ` (${employee.commissionRate}% commission)`
                          : ''}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60">
                  {formData.salonEmployeeId
                    ? 'Commission will be created automatically when appointment is marked as completed'
                    : 'Assign an employee to track commissions for this appointment'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Start Time <span className="text-danger">*</span>
                </label>
                <input
                  id="start-time"
                  type="datetime-local"
                  required
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  End Time <span className="text-danger">*</span>
                </label>
                <input
                  id="end-time"
                  type="datetime-local"
                  required
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-select" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="status-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes-area" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Notes
              </label>
              <textarea
                id="notes-area"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border-light dark:border-border-dark">
              <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : appointment ? (
                  'Update Appointment'
                ) : (
                  'Create Appointment'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
