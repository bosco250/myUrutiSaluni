'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DayAvailability } from '@/lib/availability';

interface AvailabilityCalendarProps {
  availability: DayAvailability[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  isLoading?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

const STATUS_COLORS = {
  available: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
  },
  partially_booked: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  fully_booked: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  unavailable: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-400 dark:text-gray-500',
    dot: 'bg-gray-400',
  },
};

export default function AvailabilityCalendar({
  availability,
  selectedDate,
  onDateSelect,
  isLoading = false,
  minDate,
  maxDate,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build availability map for quick lookup
  const availabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    if (Array.isArray(availability)) {
      availability.forEach((day) => {
        map.set(day.date, day);
      });
    }
    return map;
  }, [availability]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Days from previous month to fill the first week
  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  const getDayStatus = (date: Date): DayAvailability['status'] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availabilityMap.get(dateKey);
    return dayData?.status || 'unavailable';
  };

  const getDayAvailability = (date: Date): DayAvailability | undefined => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return availabilityMap.get(dateKey);
  };

  const isDateDisabled = (date: Date): boolean => {
    // Past dates are disabled
    if (isBefore(date, startOfDay(new Date()))) return true;

    // Check min/max bounds
    if (minDate && isBefore(date, startOfDay(minDate))) return true;
    if (maxDate && isBefore(startOfDay(maxDate), date)) return true;

    // Fully booked or unavailable dates are disabled
    const status = getDayStatus(date);
    return status === 'fully_booked' || status === 'unavailable';
  };

  const renderDay = (date: Date, isCurrentMonth: boolean) => {
    const status = getDayStatus(date);
    const colors = STATUS_COLORS[status];
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    const disabled = isDateDisabled(date) || !isCurrentMonth;
    const dayData = getDayAvailability(date);

    return (
      <button
        key={date.toISOString()}
        onClick={() => !disabled && onDateSelect(date)}
        disabled={disabled}
        className={`
          relative aspect-square p-0.5 md:p-1 rounded-lg transition-all
          ${!isCurrentMonth ? 'opacity-30' : ''}
          ${disabled && isCurrentMonth ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${
            isSelected
              ? 'ring-2 ring-primary ring-offset-1 md:ring-offset-2 dark:ring-offset-gray-900'
              : ''
          }
          ${!disabled && !isSelected ? 'hover:scale-105 hover:shadow-md' : ''}
        `}
        title={
          dayData ? `${dayData.availableSlots} of ${dayData.totalSlots} slots available` : status
        }
      >
        <div
          className={`
            h-full w-full rounded-md flex flex-col items-center justify-center
            border-2 transition-colors
            ${colors.bg} ${colors.border}
            ${isSelected ? 'border-primary' : ''}
          `}
        >
          <span
            className={`
              text-xs md:text-sm font-medium
              ${isCurrentDay ? 'font-bold' : ''}
              ${colors.text}
              ${isSelected ? 'text-primary' : ''}
            `}
          >
            {format(date, 'd')}
          </span>

          {/* Availability indicator dot */}
          {isCurrentMonth && status !== 'unavailable' && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${colors.dot}`} />
              {dayData && dayData.availableSlots > 0 && (
                <span className="text-[8px] md:text-[10px] text-text-light/60 dark:text-text-dark/60">
                  {dayData.availableSlots}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-3 md:p-4 relative">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-text-light/60 dark:text-text-dark/60" />
        </button>

        <h3 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>

        <button
          onClick={() => navigateMonth('next')}
          className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-text-light/60 dark:text-text-dark/60" />
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-surface-light/50 dark:bg-surface-dark/50 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-primary mb-2" />
            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
              Loading...
            </p>
          </div>
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-1.5 md:p-2 text-center text-[10px] md:text-xs font-medium text-text-light/60 dark:text-text-dark/60"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Days from previous month */}
        {daysBeforeMonth.map((date) => renderDay(date, false))}

        {/* Current month days */}
        {daysInMonth.map((date) => renderDay(date, true))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border-light dark:border-border-dark">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${colors.dot}`} />
            <span className="text-[10px] md:text-xs text-text-light/60 dark:text-text-dark/60 capitalize">
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
