'use client';

import { TimeSlot } from '@/lib/availability';
import { Loader2, Clock, AlertCircle } from 'lucide-react';
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
  // Filter out past time slots for today
  const filteredSlots = useMemo(() => {
    if (!selectedDate) return slots;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

    // Not today - return all slots as-is
    if (today !== selectedDateStr) return slots;

    // Today - filter out past slots
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return slots.map((slot) => {
      const [hours, mins] = slot.startTime.split(':').map(Number);
      const slotMinutes = hours * 60 + mins;

      // If slot is in the past (or current), mark as unavailable
      if (slotMinutes <= currentMinutes) {
        return { ...slot, available: false, reason: 'Past time slot' };
      }
      return slot;
    });
  }, [slots, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex flex-col items-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
          <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading time slots...</p>
        </div>
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="w-8 h-8 text-text-light/30 dark:text-text-dark/30 mb-2" />
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Select a date to see available time slots</p>
      </div>
    );
  }

  const availableSlots = filteredSlots.filter((slot) => slot.available);
  const unavailableSlots = filteredSlots.filter((slot) => !slot.available);

  if (filteredSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle className="w-8 h-8 text-warning mb-2" />
        <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">No time slots available</p>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">The employee doesn't work on this day</p>
      </div>
    );
  }

  const formatTime = (time: string): string => {
    try {
      // Time is in HH:mm format, create a date to format it
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getReasonLabel = (reason?: string): string => {
    switch (reason) {
      case 'Past time slot':
        return 'Past';
      case 'Break time':
        return 'Break';
      case 'Already booked':
        return 'Booked';
      case 'Buffer time required':
        return 'Buffer';
      default:
        return reason || 'Unavailable';
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header with date */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
          {format(selectedDate, 'EEEE, MMMM d')}
        </h4>
        <span className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
          {availableSlots.length} slots available
        </span>
      </div>

      {/* Available slots */}
      {availableSlots.length > 0 && (
        <div>
          <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
            Available ({serviceDuration} min appointments)
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableSlots.map((slot) => {
              const isSelected =
                selectedSlot?.startTime === slot.startTime &&
                selectedSlot?.endTime === slot.endTime;

              return (
                <button
                  key={slot.startTime}
                  onClick={() => onSlotSelect(slot)}
                  className={`
                    px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-800 shadow-md'
                        : 'bg-success/10 dark:bg-success/20 text-success dark:text-success border border-success/30 dark:border-success/40 hover:bg-success/20 dark:hover:bg-success/30'
                    }
                  `}
                >
                  {formatTime(slot.startTime)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unavailable slots (collapsed by default) */}
      {unavailableSlots.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark transition-colors">
            Show unavailable times ({unavailableSlots.length})
          </summary>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
            {unavailableSlots.map((slot) => (
              <div
                key={slot.startTime}
                className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm bg-gray-100 dark:bg-gray-800 text-text-light/40 dark:text-text-dark/40 cursor-not-allowed"
                title={slot.reason}
              >
                <span className="line-through">{formatTime(slot.startTime)}</span>
                <span className="block text-[10px] md:text-xs opacity-75">
                  {getReasonLabel(slot.reason)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Selected slot summary */}
      {selectedSlot && (
        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-xl p-3 md:p-4 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base text-text-light dark:text-text-dark">
              Selected Time
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-text-light/80 dark:text-text-dark/80">
            {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
          </p>
          {selectedSlot.price && (
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
              Price: RWF {selectedSlot.price.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
