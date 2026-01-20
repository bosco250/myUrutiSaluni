'use client';

import { TimeSlot } from '@/lib/availability';
import { Loader2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
  selectedDate: Date | null;
  serviceDuration?: number;
}

export default function TimeSlotPicker({
  slots,
  selectedSlot,
  onSlotSelect,
  isLoading = false,
  selectedDate,
  serviceDuration = 30,
}: TimeSlotPickerProps) {
  // Only get available slots - completely filter out past and booked slots
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const isToday = today === selectedDateStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return slots.filter((slot) => {
      // Skip if already marked as unavailable
      if (!slot.available) return false;

      // For today, also filter out past slots
      if (isToday) {
        const [hours, mins] = slot.startTime.split(':').map(Number);
        const slotMinutes = hours * 60 + mins;
        // Add 15 min buffer - don't show slots that are about to start
        if (slotMinutes <= currentMinutes + 15) return false;
      }

      return true;
    });
  }, [slots, selectedDate]);

  // Group slots by time period for better organization
  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    availableSlots.forEach((slot) => {
      const [hours] = slot.startTime.split(':').map(Number);
      if (hours < 12) {
        morning.push(slot);
      } else if (hours < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
            Finding available times...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mb-3" />
        <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
          Select a date first
        </p>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-warning/5 rounded-xl border border-warning/20">
        <AlertCircle className="w-10 h-10 text-warning mb-3" />
        <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
          No available times
        </p>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60 px-4">
          All slots are booked for this date. Please try another day.
        </p>
      </div>
    );
  }

  const renderSlotGroup = (
    title: string,
    slots: TimeSlot[],
    icon: string
  ) => {
    if (slots.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-semibold text-text-light/70 dark:text-text-dark/70 uppercase tracking-wide">
            {title}
          </span>
          <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
            ({slots.length})
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {slots.map((slot) => {
            const isSelected =
              selectedSlot?.startTime === slot.startTime &&
              selectedSlot?.endTime === slot.endTime;

            return (
              <button
                key={slot.startTime}
                onClick={() => onSlotSelect(slot)}
                className={`
                  relative px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5'
                  }
                `}
              >
                {formatTime(slot.startTime)}
                {isSelected && (
                  <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-white bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-light/50 dark:border-border-dark/50">
        <div>
          <h4 className="font-semibold text-sm text-text-light dark:text-text-dark">
            {format(selectedDate, 'EEEE, MMM d')}
          </h4>
          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50">
            {serviceDuration} min service
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 rounded-full">
          <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-success">
            {availableSlots.length} available
          </span>
        </div>
      </div>

      {/* Time slot groups */}
      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
        {renderSlotGroup('Morning', groupedSlots.morning, '🌅')}
        {renderSlotGroup('Afternoon', groupedSlots.afternoon, '☀️')}
        {renderSlotGroup('Evening', groupedSlots.evening, '🌙')}
      </div>

      {/* Selected slot confirmation */}
      {selectedSlot && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mt-2 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-text-light dark:text-text-dark">
                {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
              </span>
            </div>
            <span className="text-xs text-primary font-medium">
              {serviceDuration} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
