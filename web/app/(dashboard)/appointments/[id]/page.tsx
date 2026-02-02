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
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';

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
    ownerId?: string;
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
    onSuccess: () => {
      toast.success('Reminder sent successfully!');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast.error('Failed to send reminder. Please try again.');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await api.patch(`/appointments/${appointmentId}`, { status });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment status updated');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted successfully');
      router.push('/appointments');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete appointment');
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleAction = (
    action: () => void,
    title: string,
    message: string,
    variant: 'danger' | 'warning' | 'primary' = 'primary',
    confirmLabel = 'Confirm'
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      action,
      variant,
      confirmLabel,
    });
  };

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

  // Permission Logic
  const isOwnerOfSalon = user?.id === appointment?.salon?.ownerId;
  const isSuperUser = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ASSOCIATION_ADMIN;
  const isCustomer = appointment?.customer?.email === user?.email || appointment?.customer?.phone === user?.phone || user?.role === UserRole.CUSTOMER;
  
  const canManage = isSuperUser || (
      (user?.role === UserRole.SALON_OWNER && isOwnerOfSalon) ||
      (user?.role === UserRole.SALON_EMPLOYEE && !isCustomer)
  );
  
  const canCancel = canManage || (isCustomer && ['pending', 'booked'].includes(appointment?.status || ''));

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
    <div className="min-h-screen bg-transparent py-4 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-surface-light dark:bg-surface-dark rounded-[2rem] overflow-hidden relative border border-border-light dark:border-border-dark shadow-sm transition-all duration-700">
        
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-br from-primary/5 via-transparent to-transparent -z-10 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10">
          
          {/* TOP BAR - Centralized Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
            <button
              onClick={() => router.push('/appointments')}
              className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-text-light/50 dark:text-text-dark/40 hover:text-primary transition-all group pt-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Appointments
            </button>

            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
              {/* Primary Lifecycle Status Actions */}
              {((canManage && !['completed', 'cancelled'].includes(appointment.status)) ||
                (canCancel && !isPast && !['completed', 'cancelled'].includes(appointment.status))) && (
                <div className="flex flex-wrap gap-2 mr-2 pr-2 border-r border-border-light dark:border-border-dark">
                  {canManage && appointment.status === 'pending' && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => updateStatusMutation.mutate('booked'),
                          'Confirm Booking',
                          'Are you sure you want to confirm this booking?',
                          'primary',
                          'Confirm'
                        )
                      }
                      className="h-9 px-4 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all"
                    >
                      Authorize
                    </button>
                  )}
                  {canManage && ['booked', 'confirmed'].includes(appointment.status) && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => updateStatusMutation.mutate('in_progress'),
                          'Start Service',
                          'Are you sure you want to start the service?',
                          'primary',
                          'Start'
                        )
                      }
                      className="h-9 px-4 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all"
                    >
                      Engage
                    </button>
                  )}
                  {canManage && appointment.status === 'in_progress' && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => updateStatusMutation.mutate('completed'),
                          'Mark Complete',
                          'Are you sure you want to mark this appointment as completed?',
                          'primary',
                          'Complete'
                        )
                      }
                      className="h-9 px-4 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all"
                    >
                      Finalize
                    </button>
                  )}
                  {canManage && appointment.status === 'no_show' && (
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus) {
                            handleAction(
                              () => updateStatusMutation.mutate(newStatus),
                              'Change Status',
                              `Are you sure you want to change the status from NO_SHOW to ${newStatus.toUpperCase().replace('_', ' ')}?`,
                              'primary',
                              'Change Status'
                            );
                            e.target.value = ''; // Reset dropdown
                          }
                        }}
                        className="h-9 px-3 pr-8 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                        defaultValue=""
                      >
                        <option value="" disabled>Change Status</option>
                        <option value="booked">Booked</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                  {canCancel && ['pending', 'booked', 'confirmed'].includes(appointment.status) && (
                    <button
                      onClick={() =>
                        handleAction(
                          () => updateStatusMutation.mutate('cancelled'),
                          'Cancel Appointment',
                          'Are you sure you want to cancel this appointment?',
                          'danger',
                          'Cancel'
                        )
                      }
                      className="h-9 px-4 rounded-lg bg-surface-light dark:bg-surface-dark text-error text-[9px] font-black uppercase tracking-widest border border-error/20 hover:bg-error/5 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Utility Actions */}
              {canManage && appointment.customer && !['cancelled', 'completed'].includes(appointment.status) && (
                <button
                  onClick={() =>
                    handleAction(
                      () => sendReminderMutation.mutate(),
                      'Send Reminder',
                      'Are you sure you want to send a reminder to the customer?',
                      'primary',
                      'Send Reminder'
                    )
                  }
                  disabled={sendReminderMutation.isPending}
                  className="p-2.5 rounded-lg bg-background-light dark:bg-background-dark hover:bg-black/5 dark:hover:bg-white/5 border border-border-light dark:border-border-dark group"
                  title="Send Reminder"
                >
                  <Bell className="w-4 h-4 text-primary" />
                </button>
              )}


            </div>
          </div>

          {/* HERO - Ultra Compact */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <h1 className="text-4xl sm:text-5xl font-black text-text-light dark:text-text-dark tracking-tight leading-tight">
                {appointment.service?.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-[0.1em] ${statusConfig.bg} ${statusConfig.text} border border-current/10`}>
                  {statusConfig.label}
                </span>
                <span className="text-[8px] font-mono font-bold text-text-light/30 dark:text-text-dark/30 flex items-center gap-1.5">
                  <Hash className="w-2.5 h-2.5" /> {appointment.id.split('-')[0].toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Date</p>
                  <p className="text-base font-bold text-text-light dark:text-text-dark">{format(new Date(appointment.scheduledStart), 'EEEE, MMM do')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Time & Duration</p>
                  <p className="text-base font-bold text-text-light dark:text-text-dark">
                    {formatTime(appointment.scheduledStart)}
                    <span className="text-text-light/30 dark:text-text-dark/20 mx-2">•</span>
                    {duration}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT - Tight */}
          <div className="space-y-12">
            <div>
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-light/40 dark:text-text-dark/40 mb-4">Service Description</h3>
              <p className="text-base md:text-lg text-text-light/70 dark:text-text-dark/70 font-medium leading-relaxed max-w-2xl">
                {appointment.service?.description || "High-quality professional service tailored to your personal needs."}
              </p>

              {appointment.notes && (
                <div className="mt-8 relative p-6 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 border-l-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Special Instructions</h4>
                  <p className="text-sm font-medium text-text-light/80 dark:text-text-dark/90 italic leading-relaxed">
                    &ldquo;{appointment.notes}&rdquo;
                  </p>
                </div>
              )}

              {appointment.status === 'no_show' && (appointment as any).metadata?.autoMarkedNoShow && (
                <div className="mt-8 relative p-6 rounded-2xl bg-warning/5 dark:bg-warning/10 border border-warning/20 border-l-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-warning mb-2">Automatic Status Update</h4>
                  <p className="text-sm font-medium text-text-light/80 dark:text-text-dark/90 leading-relaxed">
                    This appointment was automatically marked as NO_SHOW because the customer did not attend and the appointment ended more than 3 hours ago.
                  </p>
                  {(appointment as any).metadata?.previousStatus && (
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                      Previous status: <span className="font-semibold">{(appointment as any).metadata.previousStatus}</span>
                    </p>
                  )}
                  {canManage && (
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                      If this was a mistake, you can update the status using the button above.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER - Grid Columns */}
          <div className="mt-16 pt-10 border-t border-border-light dark:border-border-dark">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
              {appointment.customer && (
                <div>
                  <span className="text-[8px] font-black text-text-light/30 dark:text-text-dark/30 uppercase tracking-[0.2em] block mb-4">Customer</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-sm shadow-sm">
                      {appointment.customer.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-text-light dark:text-text-dark truncate tracking-tight">{appointment.customer.fullName}</h4>
                      <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 truncate">{appointment.customer.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {appointment.salonEmployee && (
                <div>
                  <span className="text-[8px] font-black text-text-light/30 dark:text-text-dark/30 uppercase tracking-[0.2em] block mb-4">Stylist</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center text-secondary border border-secondary/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-text-light dark:text-text-dark truncate tracking-tight">{appointment.salonEmployee.user?.fullName || 'Assigned'}</h4>
                      <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 truncate">{appointment.salonEmployee.roleTitle || 'Pro Specialist'}</p>
                    </div>
                  </div>
                </div>
              )}

              {appointment.salon && (
                <div>
                  <span className="text-[8px] font-black text-text-light/30 dark:text-text-dark/30 uppercase tracking-[0.2em] block mb-4">Location</span>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background-light dark:bg-background-dark flex items-center justify-center text-text-light/40 dark:text-text-dark/40 border border-border-light dark:border-border-dark">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-text-light dark:text-text-dark truncate tracking-tight">{appointment.salon.name}</h4>
                      <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 truncate">Active Salon</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-right sm:text-left">
                <span className="text-[8px] font-black text-text-light/30 dark:text-text-dark/30 uppercase tracking-[0.2em] block mb-4">Price</span>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-text-light dark:text-text-dark tracking-tighter">
                    {Number(appointment.serviceAmount || appointment.service?.basePrice || 0).toLocaleString()}
                  </span>
                  <span className="text-[9px] font-black text-text-light/40 dark:text-text-dark/40 uppercase">RWF</span>
                </div>
              </div>
            </div>
          </div>

          {/* META - Super compact */}
          <div className="mt-12 pt-6 border-t border-border-light dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-text-light/30 dark:text-text-dark/30">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
              Status: System Online
            </span>
            <div className="flex gap-6">
              <span>Last Updated: {format(new Date(appointment.updatedAt), 'MMM dd, HH:mm')}</span>
              <span>Booking ID: #{appointment.id.split('-')[0].toUpperCase()}</span>
            </div>
          </div>
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
        isProcessing={
          updateStatusMutation.isPending ||
          deleteMutation.isPending ||
          sendReminderMutation.isPending
        }
      />
    </div>
  );
}
