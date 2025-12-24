/**
 * Shared Date Utility Functions
 * Used across UnifiedWorkLogScreen and other date-related components
 */

/**
 * Get today's date at midnight
 */
export const getToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Get yesterday's date at midnight
 */
export const getYesterday = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Format date to YYYY-MM-DD string
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format time to 12-hour format
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date for display (Today, Yesterday, or formatted date)
 */
export const formatDateDisplay = (date: Date): string => {
  const today = getToday();
  const yesterday = getYesterday();

  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};

/**
 * Format date in full format
 */
export const formatDateFull = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Get day abbreviation (SUN, MON, etc.)
 */
export const getDayAbbrev = (date: Date): string => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[date.getDay()];
};

/**
 * Get month name (Jan, Feb, etc.)
 */
export const getMonthName = (date: Date): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[date.getMonth()];
};

/**
 * Calculate duration in minutes between two dates
 */
export const calculateDuration = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
};

/**
 * Format duration from minutes to readable string
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
};

/**
 * Filter items by date range
 */
export const filterByDateRange = <
  T extends { scheduledStart?: string; createdAt?: string },
>(
  items: T[],
  startDate: Date,
  endDate: Date
): T[] => {
  return items.filter((item) => {
    const itemDate = new Date(item.scheduledStart || item.createdAt || "");
    return itemDate >= startDate && itemDate <= endDate;
  });
};

/**
 * Generate calendar days (7 days: 3 before, today, 3 after)
 */
export interface CalendarDay {
  day: string;
  date: number;
  fullDate: Date;
  dateString: string;
}

export const generateCalendarDays = (): CalendarDay[] => {
  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    days.push({
      day: getDayAbbrev(date),
      date: date.getDate(),
      fullDate: date,
      dateString: formatDate(date),
    });
  }

  return days;
};
