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
  Scissors,
  Plus,
  Edit,
  Eye,
  Search,
  Filter,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Phone,
  MapPin,
  X,
  Download,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { exportToCSV, formatDateForExport } from '@/lib/export-utils';

interface Appointment {
  id: string;
  customerId?: string;
  serviceId?: string;
  salonId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  metadata?: {
    preferredEmployeeId?: string;
    preferredEmployeeName?: string;
    [key: string]: any;
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
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <AppointmentsContent />
    </ProtectedRoute>
  );
}

function AppointmentsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const queryClient = useQueryClient();

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
        const allSalons = salonsResponse.data?.data || salonsResponse.data || [];
        const salonIds = allSalons.map((s: any) => s.id);
        
        // Get employee records for each salon
        const records = [];
        for (const salonId of salonIds) {
          try {
            const empResponse = await api.get(`/salons/${salonId}/employees`);
            const employees = empResponse.data?.data || empResponse.data || [];
            const myEmployee = employees.find((emp: any) => emp.userId === user?.id);
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
      return response.data?.data || response.data || [];
    },
  });

  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      booked: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
      confirmed: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
      in_progress: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/20' },
      completed: { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20' },
      cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
      no_show: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
    };
    return colors[status] || colors.booked;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Appointments</h1>
            <p className="text-text-light/60 dark:text-text-dark/60 mt-1">
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
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => router.push('/appointments/calendar')}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Calendar View
            </Button>
            <Button
              onClick={() => {
                setEditingAppointment(null);
                setShowModal(true);
              }}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Total</div>
            <div className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.total}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Today</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.today}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">Upcoming</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.upcoming}</div>
          </div>
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.completed}</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.confirmed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments..."
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Salons</option>
              {salons.map((salon: any) => (
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
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || salonFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first appointment'}
            </p>
            {(!searchQuery && statusFilter === 'all' && dateFilter === 'all' && salonFilter === 'all') && (
              <Button
                onClick={() => {
                  setEditingAppointment(null);
                  setShowModal(true);
                }}
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
            .sort((a, b) => a[0].localeCompare(b[0]))
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
                  {dateAppointments.map((appointment) => {
                    const statusColors = getStatusColor(appointment.status);
                    // Check if current user (employee) is the preferred employee for this appointment
                    const isMyAppointment = employeeRecords.some(
                      (emp: any) => emp.id === appointment.metadata?.preferredEmployeeId
                    );
                    const preferredEmployeeName = appointment.metadata?.preferredEmployeeName;
                    
                    return (
                      <div
                        key={appointment.id}
                        className={`bg-surface-light dark:bg-surface-dark border rounded-xl p-5 hover:shadow-lg transition-all group ${
                          isMyAppointment
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isMyAppointment
                                  ? 'bg-gradient-to-br from-primary to-primary/80'
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                              }`}>
                                <Calendar className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-text-light dark:text-text-dark truncate">
                                    {appointment.service?.name || 'Service'}
                                  </p>
                                  {isMyAppointment && (
                                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full border border-primary/30">
                                      Assigned to You
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                                  {formatAppointmentDate(appointment.scheduledStart)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${statusColors.border} ${statusColors.bg}`}>
                            <span className={statusColors.text}>{getStatusLabel(appointment.status)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {appointment.customer && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                              <span className="text-text-light dark:text-text-dark">
                                {appointment.customer.fullName}
                              </span>
                            </div>
                          )}
                          {appointment.salon && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                              <span className="text-text-light/60 dark:text-text-dark/60 truncate">
                                {appointment.salon.name}
                              </span>
                            </div>
                          )}
                          {preferredEmployeeName && !isMyAppointment && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-primary/60" />
                              <span className="text-text-light/80 dark:text-text-dark/80">
                                Preferred: {preferredEmployeeName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                            <span className="text-text-light/60 dark:text-text-dark/60">
                              {format(parseISO(appointment.scheduledStart), 'h:mm a')} -{' '}
                              {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-border-light dark:border-border-dark">
                          <Button
                            onClick={() => router.push(`/appointments/${appointment.id}`)}
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingAppointment(appointment);
                              setShowModal(true);
                            }}
                            variant="secondary"
                            size="sm"
                            className="px-3"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Modal */}
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
    scheduledStart: appointment
      ? format(new Date(appointment.scheduledStart), "yyyy-MM-dd'T'HH:mm")
      : '',
    scheduledEnd: appointment
      ? format(new Date(appointment.scheduledEnd), "yyyy-MM-dd'T'HH:mm")
      : '',
    status: appointment?.status || 'booked',
    notes: appointment?.notes || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data?.data || response.data || [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data?.data || response.data || [];
    },
  });

  const { data: salons } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
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
    onError: (err: any) => {
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
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Customer
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select customer (optional)</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Service
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select service (optional)</option>
                  {services?.map((service: any) => (
                    <option key={service.id} value={service.id}>
                      {service.name} {service.basePrice ? `- RWF ${service.basePrice.toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Salon <span className="text-danger">*</span>
              </label>
              <select
                required
                value={formData.salonId}
                onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select salon</option>
                {salons?.map((salon: any) => (
                  <option key={salon.id} value={salon.id}>
                    {salon.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  Start Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  End Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Status <span className="text-danger">*</span>
              </label>
              <select
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
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border-light dark:border-border-dark">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
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
