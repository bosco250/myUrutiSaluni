'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Plus, GripVertical } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  addMinutes,
  differenceInMinutes,
} from 'date-fns';
import { useState, useMemo } from 'react';

interface Appointment {
  id: string;
  customerId?: string;
  serviceId?: string;
  salonId?: string;
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
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  booked: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  confirmed: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  in_progress: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  completed: {
    bg: 'bg-text-light/10 dark:bg-text-dark/10',
    text: 'text-text-light/60 dark:text-text-dark/60',
    border: 'border-border-light dark:border-border-dark',
  },
  cancelled: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/20' },
  no_show: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
};

export default function CalendarViewPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <CalendarViewContent />
    </ProtectedRoute>
  );
}

function CalendarViewContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ appointment: Appointment; date: Date } | null>(
    null
  );

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return (response.data?.data || response.data || []) as Appointment[];
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: { id: string; scheduledStart: string; scheduledEnd: string }) => {
      const response = await api.patch(`/appointments/${data.id}`, {
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
      });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });

  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduledStart);
      return isSameDay(aptDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  const appointmentsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((apt) => {
      const dateKey = format(parseISO(apt.scheduledStart), 'yyyy-MM-dd');
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  const getAppointmentsForDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduledStart);
      return format(aptDate, 'yyyy-MM-dd') === dateKey;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-4">
              Loading calendar...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            Calendar View
          </h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            Schedule and manage bookings visually
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => router.push('/appointments')}
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-none"
          >
            List View
          </Button>
          <Button
            onClick={() => router.push('/appointments?action=create')}
            variant="primary"
            size="md"
            className="flex-1 sm:flex-none flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Main */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex bg-background-secondary dark:bg-background-dark rounded-lg p-1 border border-border-light/50">
                <Button
                  onClick={() => navigateMonth('prev')}
                  variant="secondary"
                  size="sm"
                  className="w-7 h-7 p-0 rounded-md bg-transparent border-0 hover:bg-surface-light dark:hover:bg-surface-dark"
                >
                  <ChevronLeft className="w-4 h-4 text-text-light/60" />
                </Button>
                <Button
                  onClick={() => navigateMonth('next')}
                  variant="secondary"
                  size="sm"
                  className="w-7 h-7 p-0 rounded-md bg-transparent border-0 hover:bg-surface-light dark:hover:bg-surface-dark"
                >
                  <ChevronRight className="w-4 h-4 text-text-light/60" />
                </Button>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-background-secondary dark:bg-background-dark border-0 px-3"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border-light/50 dark:bg-border-dark/50 rounded-lg overflow-hidden border border-border-light/50 dark:border-border-dark/50">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="bg-background-secondary/30 dark:bg-background-dark/30 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-text-light/40 dark:text-text-dark/40"
              >
                {day}
              </div>
            ))}

            {/* Days from previous month */}
            {daysBeforeMonth.map((date) => (
              <div
                key={date.toISOString()}
                className="bg-background-light/30 dark:bg-background-dark/30 aspect-square p-1 opacity-30"
              >
                <div className="h-full flex items-start justify-end">
                  <span className="text-[10px] font-bold">{format(date, 'd')}</span>
                </div>
              </div>
            ))}

            {/* Current month days */}
            {daysInMonth.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayAppointments = getAppointmentsForDay(date);
              const appointmentCount = appointmentsByDate[dateKey] || 0;
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isCurrentDay = isToday(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isDragOver = dragOverDate && isSameDay(date, dragOverDate);

              return (
                <div
                  key={date.toISOString()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (!isDragOver) setDragOverDate(date);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!draggedAppointment) return;
                    const appointmentId = e.dataTransfer.getData('appointmentId');
                    if (!appointmentId || appointmentId !== draggedAppointment.id) return;
                    if (isSameDay(parseISO(draggedAppointment.scheduledStart), date)) {
                      setDragOverDate(null);
                      return;
                    }
                    setPendingDrop({ appointment: draggedAppointment, date });
                    setShowTimePicker(true);
                    setDragOverDate(null);
                  }}
                  className={`bg-surface-light dark:bg-surface-dark aspect-square p-0.5 transition-all relative ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedDate(date);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${format(date, 'MMMM d, yyyy')}`}
                >
                  <div
                    className={`h-full w-full rounded-lg flex flex-col p-1.5 border-2 transition-all duration-200 ${
                      isDragOver
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                        : isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : isCurrentDay
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-transparent hover:bg-background-secondary/50 dark:hover:bg-background-dark/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-[11px] font-bold ${
                          isCurrentDay
                            ? 'text-primary'
                            : isSelected
                              ? 'text-primary'
                              : 'text-text-light dark:text-text-dark'
                        }`}
                      >
                        {format(date, 'd')}
                      </span>
                      {isCurrentDay && <div className="w-1 h-1 rounded-full bg-primary" />}
                    </div>

                    {appointmentCount > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-auto overflow-hidden">
                        {dayAppointments.slice(0, 3).map((apt) => {
                          const colors = statusColors[apt.status] || statusColors.booked;
                          return (
                            <div
                              key={apt.id}
                              className={`w-full h-0.5 rounded-full ${colors.bg.replace('10', '500').replace('dark:', '')} opacity-60`}
                            />
                          );
                        })}
                        {appointmentCount > 3 && (
                          <div className="w-full text-[7px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase text-right leading-none mt-0.5">
                            +{appointmentCount - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-border-light/50 dark:border-border-dark/50">
            <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest mr-1">
              Key:
            </p>
            {Object.entries(statusColors).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border shadow-sm`}
                />
                <span className="text-[9px] font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">
                  {status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Date Side Panel */}
        <div className="space-y-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm sticky top-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border-light dark:border-border-dark">
              <div className="w-8 h-8 rounded-lg bg-background-secondary dark:bg-background-dark flex items-center justify-center text-primary shadow-sm">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select Date'}
                </h3>
                <p className="text-[10px] font-semibold text-text-light/40 uppercase tracking-widest">
                  {selectedDateAppointments.length} Bookings
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {selectedDate ? (
                <>
                  {selectedDateAppointments.length === 0 ? (
                    <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border-light dark:border-border-dark">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-text-light/10 dark:text-text-dark/10" />
                      <p className="text-xs font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest">
                        No bookings
                      </p>
                    </div>
                  ) : (
                    selectedDateAppointments.map((appointment) => {
                      const colors = statusColors[appointment.status] || statusColors.booked;
                      const isDragging = draggedAppointment?.id === appointment.id;

                      return (
                        <div
                          key={appointment.id}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedAppointment(appointment);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('appointmentId', appointment.id);
                          }}
                          onDragEnd={() => setDraggedAppointment(null)}
                          className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                            isDragging ? 'opacity-50 grayscale' : colors.border + ' ' + colors.bg
                          } hover:border-primary/30`}
                          onClick={() =>
                            !isDragging && router.push(`/appointments/${appointment.id}`)
                          }
                          onKeyDown={(e) => {
                            if (!isDragging && (e.key === 'Enter' || e.key === ' ')) {
                              router.push(`/appointments/${appointment.id}`);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex-shrink-0 mt-0.5 opacity-20 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-3.5 h-3.5 text-text-light dark:text-text-dark" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <h4 className="text-xs font-bold text-text-light dark:text-text-dark tracking-tight truncate group-hover:text-primary transition-colors">
                                  {appointment.service?.name || 'Service'}
                                </h4>
                                <span
                                  className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border border-transparent ${colors.bg} ${colors.text}`}
                                >
                                  {appointment.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">
                                  <Clock className="w-3 h-3 text-primary" />
                                  {format(parseISO(appointment.scheduledStart), 'h:mm a')} -{' '}
                                  {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
                                </div>
                                {appointment.customer && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-light dark:text-text-dark">
                                    <User className="w-3 h-3 text-primary" />
                                    {appointment.customer.fullName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-text-light/10 dark:text-text-dark/10" />
                  <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest">
                    Select a date
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Picker Modal */}
      {showTimePicker && pendingDrop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                Reschedule Booking
              </h3>
              <p className="text-xs text-text-light/60 mt-1">
                Select new time for {format(pendingDrop.date, 'MMM d, yyyy')}
              </p>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  '08:00',
                  '09:00',
                  '10:00',
                  '11:00',
                  '12:00',
                  '13:00',
                  '14:00',
                  '15:00',
                  '16:00',
                  '17:00',
                  '18:00',
                  '19:00',
                ].map((time) => (
                  <Button
                    key={time}
                    variant="secondary"
                    size="sm"
                    className="h-9 rounded-lg font-bold text-[10px]"
                    onClick={() => {
                      const originalStart = parseISO(pendingDrop.appointment.scheduledStart);
                      const originalEnd = parseISO(pendingDrop.appointment.scheduledEnd);
                      const duration = differenceInMinutes(originalEnd, originalStart);
                      const [hours, minutes] = time.split(':').map(Number);
                      const newStart = new Date(pendingDrop.date);
                      newStart.setHours(hours, minutes, 0, 0);
                      const newEnd = addMinutes(newStart, duration);

                      updateAppointmentMutation.mutate({
                        id: pendingDrop.appointment.id,
                        scheduledStart: newStart.toISOString(),
                        scheduledEnd: newEnd.toISOString(),
                      });
                      setShowTimePicker(false);
                      setPendingDrop(null);
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-background-secondary/50 border-t border-border-light dark:border-border-dark flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowTimePicker(false);
                  setPendingDrop(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
