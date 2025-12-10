'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
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
  startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface DayAvailability {
  date: string;
  status: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
  totalSlots: number;
  availableSlots: number;
}

interface AvailabilityCalendarProps {
  employeeId: string;
  serviceId: string;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function AvailabilityCalendar({
  employeeId,
  serviceId,
  selectedDate,
  onDateSelect
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get availability data for the current month
  const { data: availability = [], isLoading, error } = useQuery({
    queryKey: ['employee-availability', employeeId, serviceId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      
      const response = await api.get(`/appointments/availability/${employeeId}`, {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          serviceId
        }
      });
      
      return response.data?.data || [];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });

  // Create availability map for quick lookup
  const availabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    availability.forEach((day: DayAvailability) => {
      map.set(day.date, day);
    });
    return map;
  }, [availability]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get days from previous month to fill the grid
  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (firstDayOfWeek - i));
    return date;
  });

  // Get days from next month to fill the grid
  const lastDayOfWeek = monthEnd.getDay();
  const daysAfterMonth = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + (i + 1));
    return date;
  });

  const allDays = [...daysBeforeMonth, ...daysInMonth, ...daysAfterMonth];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const getDateStatus = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availabilityMap.get(dateKey);
    
    // Check if date is in the past
    if (isBefore(date, startOfDay(new Date()))) {
      return 'past';
    }
    
    if (!dayData) {
      return 'unavailable';
    }
    
    return dayData.status;
  };

  const getDateStyles = (date: Date, isCurrentMonth: boolean) => {
    const status = getDateStatus(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    
    let baseClasses = 'w-full h-full rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 min-h-[60px] cursor-pointer';
    
    if (!isCurrentMonth) {
      baseClasses += ' opacity-30';
    }
    
    // Status-based styling
    switch (status) {
      case 'available':
        baseClasses += isSelected 
          ? ' border-primary bg-primary text-white shadow-lg' 
          : ' border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30';
        break;
      case 'partially_booked':
        baseClasses += isSelected 
          ? ' border-primary bg-primary text-white shadow-lg' 
          : ' border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
        break;
      case 'fully_booked':
        baseClasses += ' border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 cursor-not-allowed opacity-60';
        break;
      case 'unavailable':
      case 'past':
        baseClasses += ' border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 cursor-not-allowed opacity-40';
        break;
    }
    
    // Current day highlight
    if (isCurrentDay && !isSelected) {
      baseClasses += ' ring-2 ring-primary/30';
    }
    
    return baseClasses;
  };

  const getStatusIndicator = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availabilityMap.get(dateKey);
    
    if (!dayData || dayData.totalSlots === 0) return null;
    
    return (
      <div className="flex items-center gap-1 mt-1">
        {Array.from({ length: Math.min(dayData.totalSlots, 4) }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < dayData.availableSlots 
                ? 'bg-green-500' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
        {dayData.totalSlots > 4 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            +{dayData.totalSlots - 4}
          </span>
        )}
      </div>
    );
  };

  const canSelectDate = (date: Date) => {
    const status = getDateStatus(date);
    return status === 'available' || status === 'partially_booked';
  };

  const handleDateClick = (date: Date) => {
    if (canSelectDate(date)) {
      onDateSelect(date);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
          Unable to Load Calendar
        </h3>
        <p className="text-text-light/60 dark:text-text-dark/60">
          Please try again or contact support if the problem persists.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => navigateMonth('prev')}
          variant="secondary"
          size="sm"
          className="p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <Button
          onClick={() => navigateMonth('next')}
          variant="secondary"
          size="sm"
          className="p-2"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-text-light/60 dark:text-text-dark/60">
            Loading availability...
          </span>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && (
        <>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-text-light/60 dark:text-text-dark/60 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {allDays.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayData = availabilityMap.get(dateKey);
              
              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={getDateStyles(date, isCurrentMonth)}
                >
                  <span className={`text-sm font-medium ${
                    selectedDate && isSameDay(date, selectedDate)
                      ? 'text-white'
                      : isToday(date)
                      ? 'text-primary font-bold'
                      : 'text-text-light dark:text-text-dark'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  
                  {isCurrentMonth && getStatusIndicator(date)}
                  
                  {/* Available slots count */}
                  {isCurrentMonth && dayData && dayData.availableSlots > 0 && (
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                      {dayData.availableSlots} slot{dayData.availableSlots !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-background-light dark:bg-background-dark rounded-lg">
            <h4 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3">
              Availability Legend
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" />
                <span className="text-text-light/80 dark:text-text-dark/80">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20" />
                <span className="text-text-light/80 dark:text-text-dark/80">Partially Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20" />
                <span className="text-text-light/80 dark:text-text-dark/80">Fully Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20" />
                <span className="text-text-light/80 dark:text-text-dark/80">Unavailable</span>
              </div>
            </div>
          </div>

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-semibold text-text-light dark:text-text-dark">
                  Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              {availabilityMap.get(format(selectedDate, 'yyyy-MM-dd')) && (
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                  {availabilityMap.get(format(selectedDate, 'yyyy-MM-dd'))!.availableSlots} time slots available
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}