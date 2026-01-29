'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole, canViewAllSalons } from '@/lib/permissions';
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
    queryKey: ['salons', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        const salonsData = response.data?.data || response.data || [];
        const allSalons = Array.isArray(salonsData) ? salonsData : [];

        // If user can view all salons (Admin/District Leader), return all
        if (canViewAllSalons(user?.role)) {
          return allSalons;
        }

        // Otherwise, filter to only salons owned by the user
        return allSalons.filter((s: any) => 
          s.ownerId === user?.id || s.owner?.id === user?.id
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-5 h-5 animate-spin text-text-light/40 dark:text-text-dark/40 mx-auto mb-3" />
            <p className="text-sm text-text-light/50 dark:text-text-dark/50">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-text-light dark:text-text-dark">Appointments</h1>
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-0.5">
            Manage and track customer appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button
            onClick={() => router.push('/appointments/calendar')}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5 text-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </Button>
          <Button
            onClick={() => setShowNewBookingModal(true)}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats Grid - Compacted & Flat */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {/* Total */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Total</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.total}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                All appointments
             </span>
          </div>
        </div>

        {/* Today */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-amber-600 dark:text-amber-400">Today</p>
            <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.today}</p>
          <div className="flex items-center gap-1 mt-1">
             {stats.today > 0 ? (
               <span className="text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                 Action required
               </span>
             ) : (
                <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                   No appointments today
                </span>
             )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-purple-600 dark:text-purple-400">Upcoming</p>
            <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.upcoming}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Scheduled future
             </span>
          </div>
        </div>

        {/* Confirmed */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 dark:text-indigo-400">Confirmed</p>
            <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-md group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.confirmed}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Ready to serve
             </span>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Completed</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.completed}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Successfully done
             </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search appointments..."
            className="w-full pl-8 pr-3 h-9 text-xs bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-text-light/40 dark:placeholder:text-text-dark/40"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-2.5 h-9 text-xs bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All Status</option>
          <option value="booked">Booked</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full px-2.5 h-9 text-xs bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>

        <select
          value={salonFilter}
          onChange={(e) => setSalonFilter(e.target.value)}
          className="w-full px-2.5 h-9 text-xs bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All Salons</option>
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>
              {salon.name}
            </option>
          ))}
        </select>
      </div>

      {/* Appointments List */}
      <div className="space-y-5">
        {Object.keys(groupedAppointments).length === 0 ? (
          <div className="border border-border-light dark:border-border-dark border-dashed rounded-lg py-16 text-center">
            <Calendar className="w-8 h-8 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
              No appointments found
            </p>
            <p className="text-xs text-text-light/40 dark:text-text-dark/40 mb-4">
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
                  className="flex items-center gap-1.5 mx-auto text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Appointment
                </Button>
              )}
          </div>
        ) : (
          Object.entries(groupedAppointments)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, dateAppointments]) => (
              <div key={date}>
                {/* Date Group Header */}
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xs font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide whitespace-nowrap">
                    {isToday(parseISO(date))
                      ? 'Today'
                      : isTomorrow(parseISO(date))
                        ? 'Tomorrow'
                        : format(parseISO(date), 'EEEE, MMM d, yyyy')}
                  </h2>
                  <div className="h-px flex-1 bg-border-light dark:bg-border-dark" />
                  <span className="text-[10px] text-text-light/40 dark:text-text-dark/40 tabular-nums">
                    {dateAppointments.length} appt{dateAppointments.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Appointment Rows */}
                <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                  {dateAppointments
                    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())
                    .map((appointment) => (
                      <AppointmentRow
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

// Appointment Row Component (replaces card grid with scannable rows)
function AppointmentRow({
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
        className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-background-light dark:hover:bg-background-dark ${
          isMyAppointment ? 'bg-primary/[0.03] dark:bg-primary/[0.06]' : ''
        }`}
      >
        {/* Time column */}
        <div className="w-[100px] flex-shrink-0">
          <p className="text-xs font-medium text-text-light dark:text-text-dark tabular-nums leading-tight">
            {format(parseISO(appointment.scheduledStart), 'h:mm a')}
          </p>
          <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 tabular-nums leading-tight mt-0.5">
            {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
          </p>
        </div>

        {/* Service + Customer column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-text-light dark:text-text-dark truncate">
              {appointment.service?.name || 'Service'}
            </p>
            {isMyAppointment && (
              <span className="px-1 py-px bg-primary/10 text-primary text-[9px] font-semibold rounded uppercase tracking-wide flex-shrink-0">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {appointment.customer && (
              <span className="text-[11px] text-text-light/60 dark:text-text-dark/60 truncate">
                {appointment.customer.fullName}
              </span>
            )}
            {appointment.customer && appointment.salon && (
              <span className="text-text-light/20 dark:text-text-dark/20 text-[10px]">/</span>
            )}
            {appointment.salon && (
              <span className="text-[11px] text-text-light/40 dark:text-text-dark/40 truncate">
                {appointment.salon.name}
              </span>
            )}
          </div>
        </div>

        {/* Employee (if applicable) */}
        {preferredEmployeeName && !isMyAppointment && (
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            <User className="w-3 h-3 text-text-light/30 dark:text-text-dark/30" />
            <span className="text-[11px] text-text-light/50 dark:text-text-dark/50">
              {preferredEmployeeName}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div
          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border flex-shrink-0 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
        >
          {getStatusLabel(appointment.status)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && appointment.status === 'pending' && (
            <Button
              onClick={() => handleStatusUpdate('booked', 'Are you sure you want to accept this appointment?', 'primary', 'Accept')}
              variant="primary"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1"
              disabled={updateStatusMutation.isPending}
              loading={updateStatusMutation.isPending}
            >
              <CheckCircle2 className="w-3 h-3" />
              Accept
            </Button>
          )}

          {canEdit && ['pending', 'booked', 'confirmed'].includes(appointment.status) && (
            <button
              onClick={() => handleStatusUpdate('cancelled', 'Are you sure you want to cancel this appointment?', 'danger', 'Cancel Appointment')}
              className="p-1.5 rounded-md text-text-light/40 dark:text-text-dark/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
              disabled={updateStatusMutation.isPending}
              title="Cancel Appointment"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => router.push(`/appointments/${appointment.id}`)}
            className="p-1.5 rounded-md text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>


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
  const toast = useToast();
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
      toast.success(appointment ? 'Appointment updated successfully' : 'Appointment created successfully');
      onSuccess();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const message = err.response?.data?.message || 'Failed to save appointment';
      setError(message);
      toast.error(message);
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light dark:border-border-dark">
          <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">
            {appointment ? 'Edit Appointment' : 'Create New Appointment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-background-light dark:hover:bg-background-dark transition-colors"
          >
            <X className="w-4 h-4 text-text-light/50 dark:text-text-dark/50" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 px-3 py-2 bg-danger/10 border border-danger/20 rounded-md">
              <div className="flex items-center gap-2 text-danger text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="customer-select" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                  Customer
                </label>
                <select
                  id="customer-select"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                <label htmlFor="service-select" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                  Service
                </label>
                <select
                  id="service-select"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
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
              <label htmlFor="salon-select" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                Salon <span className="text-danger">*</span>
              </label>
              <select
                id="salon-select"
                required
                value={formData.salonId}
                onChange={(e) =>
                  setFormData({ ...formData, salonId: e.target.value, salonEmployeeId: '' })
                }
                className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                <label htmlFor="employee-select" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                  Assign Employee
                </label>
                <select
                  id="employee-select"
                  value={formData.salonEmployeeId}
                  onChange={(e) => setFormData({ ...formData, salonEmployeeId: e.target.value })}
                  className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                <p className="mt-1 text-[10px] text-text-light/40 dark:text-text-dark/40">
                  {formData.salonEmployeeId
                    ? 'Commission will be created automatically when appointment is marked as completed'
                    : 'Assign an employee to track commissions for this appointment'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-time" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                  Start Time <span className="text-danger">*</span>
                </label>
                <input
                  id="start-time"
                  type="datetime-local"
                  required
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              <div>
                <label htmlFor="end-time" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                  End Time <span className="text-danger">*</span>
                </label>
                <input
                  id="end-time"
                  type="datetime-local"
                  required
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-select" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="status-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 h-9 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40"
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
              <label htmlFor="notes-area" className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1">
                Notes
              </label>
              <textarea
                id="notes-area"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-2 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-border-light dark:border-border-dark">
              <Button type="button" onClick={onClose} variant="secondary" size="sm" className="flex-1 text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="flex-1 text-xs" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
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
