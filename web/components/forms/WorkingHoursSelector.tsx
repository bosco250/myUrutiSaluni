'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

export interface DayHours {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface WorkingHoursSelectorProps {
  value?: string | WorkingHours;
  onChange: (value: string) => void;
  error?: string;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const DEFAULT_HOURS: WorkingHours = {
  monday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  tuesday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  wednesday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  thursday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  friday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  saturday: { isOpen: true, startTime: '09:00', endTime: '18:00' },
  sunday: { isOpen: false, startTime: '09:00', endTime: '18:00' },
};

// Parse string format to WorkingHours object
const parseWorkingHours = (value: string | WorkingHours | undefined): WorkingHours => {
  if (!value) return DEFAULT_HOURS;
  
  if (typeof value === 'object') {
    return value as WorkingHours;
  }
  
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULT_HOURS, ...parsed };
    }
  } catch {
    // If it's a plain string like "Mon-Sat: 8AM-6PM", return defaults
    return DEFAULT_HOURS;
  }
  
  return DEFAULT_HOURS;
};

// Format WorkingHours to JSON string
const formatWorkingHours = (hours: WorkingHours): string => {
  return JSON.stringify(hours);
};

export default function WorkingHoursSelector({
  value,
  onChange,
  error,
}: WorkingHoursSelectorProps) {
  const [hours, setHours] = useState<WorkingHours>(() => parseWorkingHours(value));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const parsed = parseWorkingHours(value);
    setHours(parsed);
  }, [value]);

  const updateDay = (day: keyof WorkingHours, updates: Partial<DayHours>) => {
    const newHours = {
      ...hours,
      [day]: { ...hours[day], ...updates },
    };
    setHours(newHours);
    onChange(formatWorkingHours(newHours));
  };

  const toggleDay = (day: keyof WorkingHours) => {
    updateDay(day, { isOpen: !hours[day].isOpen });
  };

  const toggleExpand = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const applyToAll = (startTime: string, endTime: string) => {
    const newHours: WorkingHours = { ...hours };
    Object.keys(newHours).forEach((day) => {
      if (newHours[day as keyof WorkingHours].isOpen) {
        newHours[day as keyof WorkingHours] = {
          ...newHours[day as keyof WorkingHours],
          startTime,
          endTime,
        };
      }
    });
    setHours(newHours);
    onChange(formatWorkingHours(newHours));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
          <span className="text-xs text-text-light/60 dark:text-text-dark/60">
            Set your operating hours for each day
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const allOpen = Object.values(hours).every((h) => h.isOpen);
            Object.keys(hours).forEach((day) => {
              updateDay(day as keyof WorkingHours, { isOpen: !allOpen });
            });
          }}
          className="text-xs text-primary hover:underline font-medium"
        >
          {Object.values(hours).every((h) => h.isOpen) ? 'Close All' : 'Open All'}
        </button>
      </div>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const dayHours = hours[key];
          const isExpanded = expandedDays.has(key);

          return (
            <div
              key={key}
              className={`bg-background-light dark:bg-background-dark 
                          border ${
                            error
                              ? 'border-danger'
                              : 'border-border-light dark:border-border-dark'
                          } 
                          rounded-lg overflow-hidden transition-all`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={dayHours.isOpen}
                    onChange={() => toggleDay(key)}
                    className="w-4 h-4 rounded border-border-light dark:border-border-dark 
                               bg-background-light dark:bg-background-dark 
                               text-primary focus:ring-primary focus:ring-2 cursor-pointer"
                  />
                  <label
                    className={`text-sm font-medium cursor-pointer flex-1 ${
                      dayHours.isOpen
                        ? 'text-text-light dark:text-text-dark'
                        : 'text-text-light/50 dark:text-text-dark/50'
                    }`}
                  >
                    {label}
                  </label>
                </div>

                {dayHours.isOpen && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-text-light/80 dark:text-text-dark/80">
                      <span>{dayHours.startTime}</span>
                      <span>-</span>
                      <span>{dayHours.endTime}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(key)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition ml-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {dayHours.isOpen && isExpanded && (
                <div className="px-3 pb-3 pt-2 border-t border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Opening Time
                      </label>
                      <input
                        type="time"
                        value={dayHours.startTime}
                        onChange={(e) => updateDay(key, { startTime: e.target.value })}
                        className="w-full px-3 py-2 text-sm 
                                 bg-surface-light dark:bg-surface-dark
                                 border border-border-light dark:border-border-dark
                                 rounded-lg text-text-light dark:text-text-dark
                                 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-light/80 dark:text-text-dark/80 mb-1.5">
                        Closing Time
                      </label>
                      <input
                        type="time"
                        value={dayHours.endTime}
                        onChange={(e) => updateDay(key, { endTime: e.target.value })}
                        className="w-full px-3 py-2 text-sm 
                                 bg-surface-light dark:bg-surface-dark
                                 border border-border-light dark:border-border-dark
                                 rounded-lg text-text-light dark:text-text-dark
                                 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  {key === 'monday' && (
                    <button
                      type="button"
                      onClick={() => applyToAll(dayHours.startTime, dayHours.endTime)}
                      className="mt-3 text-xs text-primary hover:underline font-medium"
                    >
                      Apply these hours to all open days
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-danger text-xs mt-1.5">{error}</p>
      )}
    </div>
  );
}

