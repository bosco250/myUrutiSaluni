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
} from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
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
  };
  salon?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
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
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER]}>
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

  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await api.get(`/appointments/${appointmentId}`);
      // Handle response wrapped by TransformInterceptor
      return response.data?.data || response.data;
    },
    enabled: !!appointmentId,
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

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/notifications/appointments/${appointmentId}/reminder`, {
        reminderHours: 24,
        channels: ['email', 'sms'],
      });
    },
    onSuccess: () => {
      alert('Reminder sent successfully!');
    },
    onError: () => {
      alert('Failed to send reminder. Please try again.');
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      booked: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
      confirmed: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20' },
      in_progress: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20' },
      completed: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20' },
      cancelled: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
      no_show: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
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

  const canEdit = user?.role === 'super_admin' || user?.role === 'association_admin' || 
                  user?.role === 'salon_owner' || user?.role === 'salon_employee';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading appointment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger mb-4">Failed to load appointment details.</p>
          <Button onClick={() => router.push('/appointments')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Appointments
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = getStatusColor(appointment.status);
  const isPast = new Date(appointment.scheduledStart) < new Date();
  const duration = appointment.service?.durationMinutes 
    ? `${appointment.service.durationMinutes} minutes`
    : 'N/A';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/appointments')}
            variant="secondary"
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Appointment Details</h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
              Appointment ID: <span className="font-mono">{appointment.id}</span>
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {appointment.customer && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button
                onClick={() => {
                  if (confirm('Send reminder to customer?')) {
                    sendReminderMutation.mutate();
                  }
                }}
                variant="secondary"
                disabled={sendReminderMutation.isPending}
              >
                {sendReminderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Send Reminder
              </Button>
            )}
            <Button
              onClick={() => router.push(`/appointments/${appointmentId}/edit`)}
              variant="secondary"
              disabled={appointment.status === 'completed'}
              title={appointment.status === 'completed' ? 'Cannot edit completed appointments' : 'Edit appointment'}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => {
                if (confirm('Are you sure you want to delete this appointment?')) {
                  deleteMutation.mutate();
                }
              }}
              variant="secondary"
              className="text-danger hover:bg-danger/10"
              disabled={deleteMutation.isPending || appointment.status === 'completed'}
              title={appointment.status === 'completed' ? 'Cannot delete completed appointments' : 'Delete appointment'}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Appointment Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-lg overflow-hidden">
        {/* Status Header */}
        <div className={`${statusColors.bg} ${statusColors.border} border-b p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                {appointment.service?.name || 'Service'}
              </h2>
              <div className="flex items-center gap-4 text-sm text-text-light/60 dark:text-text-dark/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(appointment.scheduledStart)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(appointment.scheduledStart)} - {formatTime(appointment.scheduledEnd)}</span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${statusColors.border} ${statusColors.bg}`}>
              <span className={`font-semibold ${statusColors.text}`}>
                {getStatusLabel(appointment.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Appointment Information */}
        <div className="p-6 space-y-6">
          {/* Customer & Salon Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointment.customer && (
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Customer</h3>
                </div>
                <p className="text-text-light dark:text-text-dark font-medium mb-1">
                  {appointment.customer.fullName}
                </p>
                <div className="space-y-1 text-sm text-text-light/60 dark:text-text-dark/60">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{appointment.customer.phone}</span>
                  </div>
                  {appointment.customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{appointment.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {appointment.salon && (
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Salon</h3>
                </div>
                <p className="text-text-light dark:text-text-dark font-medium mb-1">
                  {appointment.salon.name}
                </p>
                <div className="space-y-1 text-sm text-text-light/60 dark:text-text-dark/60">
                  {appointment.salon.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{appointment.salon.address}</span>
                    </div>
                  )}
                  {appointment.salon.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.salon.phone}</span>
                    </div>
                  )}
                  {appointment.salon.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{appointment.salon.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Service Details */}
          {appointment.service && (
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text-light dark:text-text-dark">Service Details</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Service Name</span>
                  <span className="text-text-light dark:text-text-dark font-medium">
                    {appointment.service.name}
                  </span>
                </div>
                {appointment.service.description && (
                  <div>
                    <span className="text-text-light/60 dark:text-text-dark/60">Description</span>
                    <p className="text-text-light dark:text-text-dark mt-1">
                      {appointment.service.description}
                    </p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Duration</span>
                  <span className="text-text-light dark:text-text-dark font-medium">{duration}</span>
                </div>
                {appointment.service.basePrice && (
                  <div className="flex justify-between">
                    <span className="text-text-light/60 dark:text-text-dark/60">Price</span>
                    <span className="text-text-light dark:text-text-dark font-semibold text-primary">
                      RWF {appointment.service.basePrice.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text-light dark:text-text-dark">Notes</h3>
              </div>
              <p className="text-text-light dark:text-text-dark">{appointment.notes}</p>
            </div>
          )}

          {/* Status Actions (for salon owners/employees) */}
          {canEdit && !isPast && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {appointment.status === 'booked' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate('confirmed')}
                    variant="secondary"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                {appointment.status === 'confirmed' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate('in_progress')}
                    variant="secondary"
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
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                {['booked', 'confirmed'].includes(appointment.status) && (
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this appointment?')) {
                        updateStatusMutation.mutate('cancelled');
                      }
                    }}
                    variant="secondary"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-border-light dark:border-border-dark pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-light/60 dark:text-text-dark/60">Created</span>
                <p className="text-text-light dark:text-text-dark">
                  {format(new Date(appointment.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              {appointment.createdBy && (
                <div>
                  <span className="text-text-light/60 dark:text-text-dark/60">Created By</span>
                  <p className="text-text-light dark:text-text-dark">
                    {appointment.createdBy.fullName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

