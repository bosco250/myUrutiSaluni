'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  Scissors,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Bell,
  CalendarCheck,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  salonEmployeeId?: string;
  serviceAmount?: number;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  service?: {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    durationMinutes: number;
    imageUrl?: string;
  };
  salon?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  salonEmployee?: {
    id: string;
    user?: {
      fullName: string;
    };
    roleTitle?: string;
    commissionRate?: number;
  };
  createdBy?: {
    id: string;
    fullName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AppointmentDetailPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
        UserRole.CUSTOMER,
      ]}
    >
      <AppointmentDetailContent />
    </ProtectedRoute>
  );
}

function AppointmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const appointmentId = params.id as string;

  const {
    data: appointment,
    isLoading,
    error,
  } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/appointments/${appointmentId}`);
      return (response.data?.data || response.data) as Appointment;
    },
    enabled: !!appointmentId,
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/notifications/appointments/${appointmentId}/reminder`, {
        reminderHours: 24,
        channels: ['email', 'sms'],
      });
    },
    onSuccess: () => alert('Reminder sent successfully!'),
    onError: () => alert('Failed to send reminder. Please try again.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await api.patch(`/appointments/${appointmentId}`, { status });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      router.push('/appointments');
    },
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
          icon: CalendarCheck,
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

  const formatTime = (dateString: string) => format(new Date(dateString), 'h:mm a');

  const canEdit =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ASSOCIATION_ADMIN ||
    user?.role === UserRole.SALON_OWNER ||
    user?.role === UserRole.SALON_EMPLOYEE;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          Loading appointment details...
        </p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
          <h3 className="text-lg font-bold text-error mb-2">Failed to load appointment</h3>
          <p className="text-sm text-error/80 mb-6">
            The appointment details could not be retrieved.
          </p>
          <Button
            onClick={() => router.push('/appointments')}
            variant="secondary"
            size="sm"
            className="bg-white/50 hover:bg-white/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;
  const isPast = new Date(appointment.scheduledStart) < new Date();
  const duration = appointment.service?.durationMinutes
    ? `${appointment.service.durationMinutes} mins`
    : 'N/A';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/appointments')}
            variant="secondary"
            size="sm"
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
              Appointment Details
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Hash className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
              <p className="text-xs font-mono text-text-light/60 dark:text-text-dark/60">
                {appointment.id}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {appointment.customer && !['cancelled', 'completed'].includes(appointment.status) && (
              <Button
                onClick={() => confirm('Send reminder?') && sendReminderMutation.mutate()}
                variant="outline"
                size="sm"
                disabled={sendReminderMutation.isPending}
                className="flex-1 sm:flex-none justify-center"
              >
                {sendReminderMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                )}
                Remind
              </Button>
            )}
            {!['completed'].includes(appointment.status) && (
              <Button
                onClick={() => router.push(`/appointments/${appointmentId}/edit`)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none justify-center"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {!['completed'].includes(appointment.status) && (
              <Button
                onClick={() => confirm('Delete appointment?') && deleteMutation.mutate()}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none justify-center text-error border-error/20 hover:bg-error/5"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Main Status Actions - Prominent */}
          {canEdit && !isPast && !['completed', 'cancelled'].includes(appointment.status) && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
                Update Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {appointment.status === 'pending' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate('booked')}
                    variant="primary"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Booking
                  </Button>
                )}
                {['booked', 'confirmed'].includes(appointment.status) && (
                  <Button
                    onClick={() => updateStatusMutation.mutate('in_progress')}
                    variant="primary"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                  >
                    Start Service
                  </Button>
                )}
                {appointment.status === 'in_progress' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate('completed')}
                    variant="primary"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Complete
                  </Button>
                )}
                {['pending', 'booked', 'confirmed'].includes(appointment.status) && (
                  <Button
                    onClick={() => confirm('Cancel?') && updateStatusMutation.mutate('cancelled')}
                    variant="secondary"
                    size="sm"
                    className="text-error hover:bg-error/10 border-error/20"
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel Appointment
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Service Info Card */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-primary" />
                    {appointment.service?.name || 'Service'}
                  </h2>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                    {appointment.service?.description || 'No description provided'}
                  </p>
                </div>
                {appointment.service?.basePrice && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      RWF {Number(appointment.service.basePrice).toLocaleString()}
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40">Base Price</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border-light dark:border-border-dark">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">Date</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {format(new Date(appointment.scheduledStart), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      Time & Duration
                    </p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {formatTime(appointment.scheduledStart)} • {duration}
                    </p>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-4 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-xs font-bold text-secondary">Notes</span>
                  </div>
                  <p className="text-sm text-text-light/80 dark:text-text-dark/80 italic">
                    &ldquo;{appointment.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Customer Card */}
          {appointment.customer && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-light/40 dark:text-text-dark/40 mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Customer
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {appointment.customer.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-text-light dark:text-text-dark">
                    {appointment.customer.fullName}
                  </p>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                    Registered Customer
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <a
                  href={`tel:${appointment.customer.phone}`}
                  className="flex items-center gap-3 text-sm text-text-light/80 dark:text-text-dark/80 hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                  {appointment.customer.phone}
                </a>
                {appointment.customer.email && (
                  <a
                    href={`mailto:${appointment.customer.email}`}
                    className="flex items-center gap-3 text-sm text-text-light/80 dark:text-text-dark/80 hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                    {appointment.customer.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Salon Card */}
          {appointment.salon && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-light/40 dark:text-text-dark/40 mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Salon
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-text-light dark:text-text-dark">
                    {appointment.salon.name}
                  </p>
                  <button
                    className="text-xs text-primary hover:underline font-medium hover:text-primary-dark transition-colors text-left"
                    onClick={() => router.push(`/salons/browse/${appointment.salon!.id}`)}
                  >
                    View Salon Profile
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {appointment.salon.phone && (
                  <div className="flex items-center gap-3 text-sm text-text-light/80 dark:text-text-dark/80">
                    <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                    {appointment.salon.phone}
                  </div>
                )}
                {appointment.salon.address && (
                  <div className="flex items-center gap-3 text-sm text-text-light/80 dark:text-text-dark/80">
                    <MapPin className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 flex-shrink-0" />
                    {appointment.salon.address}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Card */}
          {appointment.salonEmployee && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-light/40 dark:text-text-dark/40 mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Professional
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-text-light/60 dark:text-text-dark/60">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-light dark:text-text-dark">
                    {appointment.salonEmployee.user?.fullName || 'Unknown'}
                  </p>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                    {appointment.salonEmployee.roleTitle || 'Stylist'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="px-2">
            <p className="text-xs text-text-light/40 dark:text-text-dark/40 text-center">
              Created on {format(new Date(appointment.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
