'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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

  const timeSlots: TimeSlot[] = data?.data || [];
  const meta = data?.meta;

  // Group time slots by time period
  const groupedSlots = useMemo(() => {
    const groups = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[]
    };

    timeSlots.forEach(slot => {
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
  }, [timeSlots]);

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
    if (slot.available) {
      onTimeSlotSelect({
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price
      });
    }
  };

  const getSlotStyles = (slot: TimeSlot) => {
    const baseClasses = 'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-center min-h-[80px] flex flex-col justify-center';
    
    if (!slot.available) {
      return `${baseClasses} border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 cursor-not-allowed opacity-60`;
    }
    
    if (isSlotSelected(slot)) {
      return `${baseClasses} border-primary bg-primary text-white shadow-lg transform scale-105`;
    }
    
    return `${baseClasses} border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-md`;
  };

  const renderTimeGroup = (title: string, slots: TimeSlot[], icon: React.ReactNode) => {
    if (slots.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
            {title}
          </h3>
          <span className="text-sm text-text-light/60 dark:text-text-dark/60">
            ({slots.filter(s => s.available).length} available)
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slots.map((slot, index) => (
            <div
              key={`${slot.startTime}-${index}`}
              onClick={() => handleSlotClick(slot)}
              className={getSlotStyles(slot)}
            >
              <div className={`font-semibold ${
                isSlotSelected(slot) 
                  ? 'text-white' 
                  : slot.available 
                  ? 'text-text-light dark:text-text-dark' 
                  : 'text-text-light/60 dark:text-text-dark/60'
              }`}>
                {formatTime(slot.startTime)}
              </div>
              <div className={`text-sm ${
                isSlotSelected(slot) 
                  ? 'text-white/80' 
                  : slot.available 
                  ? 'text-text-light/60 dark:text-text-dark/60' 
                  : 'text-text-light/40 dark:text-text-dark/40'
              }`}>
                {formatTime(slot.endTime)}
              </div>
              
              {slot.price && slot.available && (
                <div className={`text-xs mt-1 font-medium ${
                  isSlotSelected(slot) ? 'text-white' : 'text-primary'
                }`}>
                  RWF {slot.price.toLocaleString()}
                </div>
              )}
              
              {!slot.available && slot.reason && (
                <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {slot.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
          Unable to Load Time Slots
        </h3>
        <p className="text-text-light/60 dark:text-text-dark/60 mb-4">
          Please try again or contact support if the problem persists.
        </p>
        <Button onClick={handleRefresh} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark">
            Available Times
          </h2>
          <p className="text-text-light/60 dark:text-text-dark/60">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          variant="secondary"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-text-light/60 dark:text-text-dark/60">
            Loading time slots...
          </span>
        </div>
      )}

      {/* Time Slots */}
      {!isLoading && (
        <>
          {timeSlots.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                No Time Slots Available
              </h3>
              <p className="text-text-light/60 dark:text-text-dark/60">
                This employee is not available on the selected date.
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {meta?.availableSlots || 0}
                    </div>
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Available
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-text-light dark:text-text-dark">
                      {meta?.totalSlots || 0}
                    </div>
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Total Slots
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-text-light dark:text-text-dark">
                      {meta?.duration || 30}m
                    </div>
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Duration
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {meta?.totalSlots > 0 ? Math.round((meta.availableSlots / meta.totalSlots) * 100) : 0}%
                    </div>
                    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Available
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Groups */}
              {renderTimeGroup(
                'Morning',
                groupedSlots.morning,
                <Clock className="w-5 h-5 text-yellow-500" />
              )}
              
              {renderTimeGroup(
                'Afternoon',
                groupedSlots.afternoon,
                <Clock className="w-5 h-5 text-orange-500" />
              )}
              
              {renderTimeGroup(
                'Evening',
                groupedSlots.evening,
                <Clock className="w-5 h-5 text-purple-500" />
              )}

              {/* Selected Slot Info */}
              {selectedTimeSlot && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-text-light dark:text-text-dark">
                      Selected: {formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}
                    </span>
                  </div>
                  {selectedTimeSlot.price && (
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                      Price: RWF {selectedTimeSlot.price.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  💡 Booking Tips
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Time slots are updated in real-time</li>
                  <li>• Popular times fill up quickly - book early!</li>
                  <li>• Prices may vary by time of day</li>
                  <li>• You can change your selection before confirming</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}