'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Clock, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
  price?: number;
}

interface TimeSlotPickerProps {
  employeeId: string;
  serviceId: string;
  date: Date;
  selectedTimeSlot: {
    startTime: string;
    endTime: string;
    price?: number;
  } | null;
  onTimeSlotSelect: (timeSlot: {
    startTime: string;
    endTime: string;
    price?: number;
  }) => void;
}

export function TimeSlotPicker({
  employeeId,
  serviceId,
  date,
  selectedTimeSlot,
  onTimeSlotSelect
}: TimeSlotPickerProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Get time slots for the selected date
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['time-slots', employeeId, serviceId, format(date, 'yyyy-MM-dd'), refreshKey],
    queryFn: async () => {
      const response = await api.get(`/appointments/availability/${employeeId}/slots`, {
        params: {
          date: format(date, 'yyyy-MM-dd'),
          serviceId
        }
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const allSlots: TimeSlot[] = data?.data || [];
  const meta = data?.meta;

  // Only show available slots - filter out past and booked
  const availableSlots = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const selectedDateStr = format(date, 'yyyy-MM-dd');
    const isToday = today === selectedDateStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return allSlots.filter(slot => {
      if (!slot.available) return false;
      
      // For today, also filter out slots that are about to start
      if (isToday) {
        const [hours, mins] = slot.startTime.split(':').map(Number);
        const slotMinutes = hours * 60 + mins;
        if (slotMinutes <= currentMinutes + 15) return false;
      }
      
      return true;
    });
  }, [allSlots, date]);

  // Group available slots by time period
  const groupedSlots = useMemo(() => {
    const groups = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[]
    };

    availableSlots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour < 12) {
        groups.morning.push(slot);
      } else if (hour < 17) {
        groups.afternoon.push(slot);
      } else {
        groups.evening.push(slot);
      }
    });

    return groups;
  }, [availableSlots]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isSlotSelected = (slot: TimeSlot) => {
    return selectedTimeSlot?.startTime === slot.startTime && 
           selectedTimeSlot?.endTime === slot.endTime;
  };

  const handleSlotClick = (slot: TimeSlot) => {
    onTimeSlotSelect({
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price
    });
  };

  const renderTimeGroup = (title: string, slots: TimeSlot[], emoji: string) => {
    if (slots.length === 0) return null;

    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{emoji}</span>
          <h3 className="text-sm font-semibold text-text-light/70 dark:text-text-dark/70 uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-xs text-text-light/50 dark:text-text-dark/50">
            ({slots.length})
          </span>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot, index) => (
            <button
              key={`${slot.startTime}-${index}`}
              onClick={() => handleSlotClick(slot)}
              className={`
                relative px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${isSlotSelected(slot)
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]'
                  : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5'
                }
              `}
            >
              {formatTime(slot.startTime)}
              {isSlotSelected(slot) && (
                <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h3 className="text-base font-semibold text-text-light dark:text-text-dark mb-2">
          Unable to Load Times
        </h3>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
          Please try again
        </p>
        <Button onClick={handleRefresh} variant="secondary" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light/50 dark:border-border-dark/50">
        <div>
          <h2 className="text-base font-semibold text-text-light dark:text-text-dark">
            {format(date, 'EEEE, MMM d')}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {availableSlots.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-success">
                {availableSlots.length} available
              </span>
            </div>
          )}
          
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
            disabled={isLoading}
            className="h-8 px-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-text-light/60 dark:text-text-dark/60">
            Finding available times...
          </span>
        </div>
      )}

      {/* Time Slots */}
      {!isLoading && (
        <>
          {availableSlots.length === 0 ? (
            <div className="text-center py-10 bg-warning/5 rounded-xl border border-warning/20">
              <Clock className="w-10 h-10 text-warning mx-auto mb-3" />
              <h3 className="text-base font-semibold text-text-light dark:text-text-dark mb-1">
                No Available Times
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                All slots are booked. Try another date.
              </p>
            </div>
          ) : (
            <div className="max-h-[350px] overflow-y-auto pr-1">
              {renderTimeGroup('Morning', groupedSlots.morning, '🌅')}
              {renderTimeGroup('Afternoon', groupedSlots.afternoon, '☀️')}
              {renderTimeGroup('Evening', groupedSlots.evening, '🌙')}
            </div>
          )}

          {/* Selected Slot Confirmation */}
          {selectedTimeSlot && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-text-light dark:text-text-dark">
                    {formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}
                  </span>
                </div>
                {selectedTimeSlot.price && (
                  <span className="text-sm font-medium text-primary">
                    RWF {selectedTimeSlot.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}