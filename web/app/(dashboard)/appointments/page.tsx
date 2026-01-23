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
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { exportToCSV, formatDateForExport } from '@/lib/export-utils';
import CalendarBookingModal from '@/components/appointments/CalendarBookingModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

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
  };
}

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
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Check if user can edit appointments (salon owners, employees, and admins)
  const canEdit =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ASSOCIATION_ADMIN ||
    user?.role === UserRole.SALON_OWNER ||
    user?.role === UserRole.SALON_EMPLOYEE;



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
    return appointments.filter((appointment) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          appointment.customer?.fullName.toLowerCase().includes(query) ||
          appointment.service?.name.toLowerCase().includes(query) ||
          appointment.salon?.name.toLowerCase().includes(query) ||
          appointment.customer?.phone.includes(query);
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

      // Date filter
      if (dateFilter !== 'all') {
        const appointmentDate = parseISO(appointment.scheduledStart);
        if (dateFilter === 'today' && !isToday(appointmentDate)) return false;
        if (dateFilter === 'tomorrow' && !isTomorrow(appointmentDate)) return false;
        if (dateFilter === 'upcoming' && isPast(appointmentDate)) return false;
        if (dateFilter === 'past' && !isPast(appointmentDate)) return false;
      }

      return true;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter, salonFilter]);

  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((appointment) => {
      const date = format(parseISO(appointment.scheduledStart), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
    });
    return groups;
  }, [filteredAppointments]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Appointments</h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Manage and track customer appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => router.push('/appointments/calendar')}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Calendar View
            </Button>
            <Button
              onClick={() => setShowNewBookingModal(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Total
                </p>
                <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
                <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Today
                </p>
                <p className="text-2xl font-black text-primary mt-1">{stats.today}</p>
              </div>
              <div className="p-2 bg-gradient-to-br from-primary to-primary-dark rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Upcoming
                </p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.upcoming}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/20 dark:border-gray-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Completed
                </p>
                <p className="text-2xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.completed}
                </p>
              </div>
              <div className="p-2 bg-background-secondary dark:bg-background-dark rounded-lg border border-border-light/50">
                <CheckCircle2 className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Confirmed
                </p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.confirmed}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments..."
                className="w-full pl-9 pr-4 h-10 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-text-light/40 dark:placeholder:text-text-dark/40"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 h-10 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Status</option>
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
              className="w-full px-3 h-10 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>

            {/* Salon Filter */}
            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="w-full px-3 h-10 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      </div>

      {/* Appointments List */}
      <div className="space-y-6">
        {Object.keys(groupedAppointments).length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
              No appointments found
            </h3>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-4">
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
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Appointment
                </Button>
              )}
          </div>
        ) : (
          Object.entries(groupedAppointments)
            .sort((a, b) => b[0].localeCompare(a[0])) // Sort descending (newest dates first)
            .map(([date, dateAppointments]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1 bg-border-light dark:bg-border-dark" />
                  <h2 className="text-lg font-semibold text-text-light dark:text-text-dark px-3">
                    {isToday(parseISO(date))
                      ? 'Today'
                      : isTomorrow(parseISO(date))
                        ? 'Tomorrow'
                        : format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </h2>
                  <div className="h-px flex-1 bg-border-light dark:bg-border-dark" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dateAppointments
                    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())
                    .map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        employeeRecords={employeeRecords}
                        canEdit={canEdit}
                        router={router}
                        setEditingAppointment={setEditingAppointment}
                        setShowModal={setShowModal}
                      />
                    ))}
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

// Independent Appointment Card Component
function AppointmentCard({
  appointment,
  employeeRecords,
  canEdit,
  router,
  setEditingAppointment,
  setShowModal,
}: {
  appointment: Appointment;
  employeeRecords: any[];
  canEdit: boolean;
  router: any;
  setEditingAppointment: (appt: Appointment) => void;
  setShowModal: (show: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    variant: 'danger' | 'warning' | 'primary';
    confirmLabel: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    variant: 'primary',
    confirmLabel: 'Confirm',
  });

  // Local mutation for independent loading state
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const response = await api.patch(`/appointments/${appointmentId}`, { status });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated successfully');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update appointment');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleStatusUpdate = (status: string, confirmMessage: string, variant: 'primary' | 'danger' = 'primary', confirmLabel = 'Confirm') => {
    setConfirmationModal({
      isOpen: true,
      title: 'Update Status',
      message: confirmMessage,
      variant,
      confirmLabel,
      action: () => updateStatusMutation.mutate({ appointmentId: appointment.id, status }),
    });
  };

  const statusColors = getStatusColor(appointment.status);
  const isMyAppointment = employeeRecords.some(
    (emp: { id: string }) => emp.id === appointment.metadata?.preferredEmployeeId
  );
  const preferredEmployeeName = appointment.metadata?.preferredEmployeeName;

  return (
    <>
      <div
        className={`group bg-surface-light dark:bg-surface-dark border rounded-xl p-4 hover:shadow-lg hover:border-primary/50 transition-all ${
          isMyAppointment
            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
            : 'border-border-light dark:border-border-dark'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isMyAppointment
                  ? 'bg-gradient-to-br from-primary to-primary/80'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
              }`}
            >
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-light dark:text-text-dark text-sm line-clamp-1">
                  {appointment.service?.name || 'Service'}
                </h3>
                {isMyAppointment && (
                  <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-semibold rounded border border-primary/30 uppercase tracking-wide">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-text-light/60 dark:text-text-dark/60" />
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                  {formatAppointmentDate(appointment.scheduledStart)}
                  {' - '}
                  {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
          >
            {getStatusLabel(appointment.status)}
          </div>
        </div>

        <div className="space-y-2 mb-4 pl-[3.25rem]">
          {appointment.customer && (
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
              <span className="text-text-light/80 dark:text-text-dark/80 font-medium truncate">
                {appointment.customer.fullName}
              </span>
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
              <span className="text-text-light/60 dark:text-text-dark/60">
                with {preferredEmployeeName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark overflow-x-auto no-scrollbar">
          {canEdit && appointment.status === 'pending' && (
            <Button
              onClick={() => handleStatusUpdate('booked', 'Are you sure you want to accept this appointment?', 'primary', 'Accept')}
              variant="primary"
              size="sm"
              className="flex-1 h-8 text-xs justify-center gap-1.5"
              disabled={updateStatusMutation.isPending}
              loading={updateStatusMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept
            </Button>
          )}

          {canEdit && ['pending', 'booked', 'confirmed'].includes(appointment.status) && (
            <Button
              onClick={() => handleStatusUpdate('cancelled', 'Are you sure you want to cancel this appointment?', 'danger', 'Cancel Appointment')}
              variant="secondary"
              size="sm"
              className={`h-8 text-xs justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 ${
                appointment.status === 'pending' ? 'px-2' : 'px-3 gap-1.5 flex-none'
              }`}
              disabled={updateStatusMutation.isPending}
              title="Cancel Appointment"
            >
              <XCircle className="w-4 h-4" />
              {appointment.status !== 'pending' && <span>Cancel</span>}
            </Button>
          )}

          <Button
            onClick={() => router.push(`/appointments/${appointment.id}`)}
            variant="secondary"
            size="sm"
            className="h-8 text-xs justify-center gap-1.5 flex-1"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
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
              className="h-8 text-xs justify-center bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-text-light/60 dark:text-text-dark/60 px-2"
              title="Edit Appointment"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.action}
        title={confirmationModal.title}
        message={confirmationModal.message}
        variant={confirmationModal.variant}
        confirmLabel={confirmationModal.confirmLabel}
        isProcessing={updateStatusMutation.isPending}
      />
    </>
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
