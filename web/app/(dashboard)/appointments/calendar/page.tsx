'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Building2,
  Phone,
  MapPin,
  GripVertical,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday, addMinutes, differenceInMinutes } from 'date-fns';
import { useState, useMemo, useRef } from 'react';

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
  booked: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  confirmed: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  in_progress: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  completed: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  no_show: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' },
};

export default function CalendarViewPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <CalendarViewContent />
    </ProtectedRoute>
  );
}

function CalendarViewContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ appointment: Appointment; date: Date } | null>(null);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return response.data?.data || response.data || [];
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduledStart);
      return isSameDay(aptDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  // Get appointments count for each day
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Appointment Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage appointments in calendar format</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/appointments')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            List View
          </button>
          <button
            onClick={() => router.push('/appointments?action=create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                {day}
              </div>
            ))}

            {/* Days from previous month */}
            {daysBeforeMonth.map((date) => (
              <div
                key={date.toISOString()}
                className="aspect-square p-1 text-gray-400 dark:text-gray-600"
              >
                <div className="h-full rounded-lg flex items-center justify-center">
                  <span className="text-sm">{format(date, 'd')}</span>
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

              const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (!isDragOver) {
                  setDragOverDate(date);
                }
              };

              const handleDragLeave = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverDate(null);
                }
              };

              const handleDrop = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!draggedAppointment) return;

                const appointmentId = e.dataTransfer.getData('appointmentId');
                if (!appointmentId || appointmentId !== draggedAppointment.id) return;

                // Check if date changed
                const originalStart = parseISO(draggedAppointment.scheduledStart);
                const isSameDate = isSameDay(originalStart, date);

                if (isSameDate) {
                  // Same date, no change needed
                  setDragOverDate(null);
                  return;
                }

                // Different date - show time picker or use original time
                setPendingDrop({ appointment: draggedAppointment, date });
                setShowTimePicker(true);
                setDragOverDate(null);
              };

              return (
                <div
                  key={date.toISOString()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`aspect-square p-1 transition ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <button
                    onClick={() => setSelectedDate(date)}
                    className="w-full h-full"
                  >
                    <div
                      className={`h-full rounded-lg flex flex-col items-center justify-center p-1 border-2 transition ${
                        isDragOver
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-300 dark:ring-green-700'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isCurrentDay
                          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isCurrentDay
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {format(date, 'd')}
                      </span>
                      {appointmentCount > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {dayAppointments.slice(0, 3).map((apt, idx) => {
                            const colors = statusColors[apt.status] || statusColors.booked;
                            return (
                              <div
                                key={apt.id}
                                className={`w-1.5 h-1.5 rounded-full ${colors.bg} ${colors.border} border`}
                                title={`${apt.customer?.fullName || 'Customer'}: ${apt.service?.name || 'Service'}`}
                              />
                            );
                          })}
                          {appointmentCount > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{appointmentCount - 3}</span>
                          )}
                        </div>
                      )}
                      {isDragOver && draggedAppointment && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                          Drop here
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {Object.entries(statusColors).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`} />
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Date Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h3>

          {selectedDate ? (
            <div className="space-y-3">
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">No appointments scheduled</p>
                  <button
                    onClick={() => router.push(`/appointments?action=create&date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                    className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Book appointment
                  </button>
                </div>
              ) : (
                selectedDateAppointments.map((appointment) => {
                  const colors = statusColors[appointment.status] || statusColors.booked;
                  const isDragging = draggedAppointment?.id === appointment.id;
                  const duration = differenceInMinutes(
                    parseISO(appointment.scheduledEnd),
                    parseISO(appointment.scheduledStart)
                  );

                  const handleDragStart = (e: React.DragEvent) => {
                    e.stopPropagation();
                    setDraggedAppointment(appointment);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('appointmentId', appointment.id);
                  };

                  const handleDragEnd = () => {
                    setDraggedAppointment(null);
                    setDragOverDate(null);
                    setDragOverTime(null);
                  };

                  return (
                    <div
                      key={appointment.id}
                      draggable
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      className={`p-4 rounded-lg border ${colors.border} ${colors.bg} cursor-move hover:shadow-md transition ${
                        isDragging ? 'opacity-50' : ''
                      }`}
                      onClick={(e) => {
                        if (!isDragging) {
                          router.push(`/appointments/${appointment.id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {appointment.service?.name || 'Service'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(appointment.scheduledStart), 'h:mm a')} -{' '}
                            {format(parseISO(appointment.scheduledEnd), 'h:mm a')}
                          </div>
                          {appointment.customer && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <User className="w-4 h-4" />
                              {appointment.customer.fullName}
                            </div>
                          )}
                          {appointment.salon && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <Building2 className="w-4 h-4" />
                              {appointment.salon.name}
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${colors.text} ${colors.bg}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {appointment.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Drag to reschedule • Duration: {duration} min
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Click on a date to view appointments</p>
            </div>
          )}
        </div>
      </div>

      {/* Time Picker Modal */}
      {showTimePicker && pendingDrop && (
        <TimePickerModal
          appointment={pendingDrop.appointment}
          targetDate={pendingDrop.date}
          onConfirm={(newTime) => {
            const originalStart = parseISO(pendingDrop.appointment.scheduledStart);
            const originalEnd = parseISO(pendingDrop.appointment.scheduledEnd);
            const duration = differenceInMinutes(originalEnd, originalStart);

            const [hours, minutes] = newTime.split(':').map(Number);
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
          onCancel={() => {
            setShowTimePicker(false);
            setPendingDrop(null);
          }}
        />
      )}
    </div>
  );
}

function TimePickerModal({
  appointment,
  targetDate,
  onConfirm,
  onCancel,
}: {
  appointment: Appointment;
  targetDate: Date;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}) {
  const originalStart = parseISO(appointment.scheduledStart);
  const defaultTime = format(originalStart, 'HH:mm');
  const [selectedTime, setSelectedTime] = useState(defaultTime);

  // Generate time slots (every 15 minutes from 8 AM to 8 PM)
  const timeSlots: string[] = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Reschedule Appointment</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {appointment.service?.name || 'Service'} on {format(targetDate, 'EEEE, MMMM d, yyyy')}
          </p>
          {appointment.customer && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customer: {appointment.customer.fullName}
            </p>
          )}
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select New Time
          </label>
          
          {/* Time Input */}
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-4"
          />

          {/* Quick Time Slots */}
          <div className="max-h-48 overflow-y-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Select:</p>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-2 text-sm rounded-lg border transition ${
                    selectedTime === time
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {format(parseISO(`2000-01-01T${time}:00`), 'h:mm a')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedTime)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}

