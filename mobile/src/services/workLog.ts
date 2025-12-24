import { appointmentsService, Appointment, AppointmentStatus } from './appointments';
import { attendanceService, AttendanceLog, AttendanceType } from './attendance';
import { staffService } from './staff';

/**
 * Comprehensive Work Log Service
 * Aggregates data from multiple sources to provide a complete work log view
 */

export interface WorkLogEntry {
  id: string;
  type: 'appointment' | 'attendance' | 'break' | 'task' | 'sale';
  timestamp: string;
  endTime?: string;
  title: string;
  description?: string;
  status?: string;
  duration?: number; // in minutes
  earnings?: number;
  metadata?: Record<string, any>;
  // Type-specific data
  appointment?: Appointment;
  attendance?: AttendanceLog;
  sale?: any;
}

export interface WorkLogDay {
  date: string;
  dateLabel: string; // "Today", "Yesterday", "Mon, Jan 15"
  clockIn?: string;
  clockOut?: string;
  totalHours: number; // in hours
  totalMinutes: number; // in minutes
  appointments: Appointment[];
  completedAppointments: Appointment[];
  earnings: number;
  commission: number;
  breaks: WorkLogEntry[];
  tasks: WorkLogEntry[];
  entries: WorkLogEntry[]; // All entries in chronological order
  status: 'working' | 'completed' | 'not_worked';
}

export interface WorkLogSummary {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalDays: number;
  daysWorked: number;
  totalHours: number;
  totalAppointments: number;
  completedAppointments: number;
  totalEarnings: number;
  totalCommission: number;
  averageHoursPerDay: number;
  averageAppointmentsPerDay: number;
  averageEarningsPerDay: number;
  bestDay?: WorkLogDay;
  days: WorkLogDay[];
}

export interface WorkLogFilters {
  startDate?: string;
  endDate?: string;
  salonId?: string;
  includeAppointments?: boolean;
  includeBreaks?: boolean;
  includeTasks?: boolean;
}

class WorkLogService {
  /**
   * Get comprehensive work log for a specific date
   */
  async getWorkLogForDate(
    employeeId: string,
    date: string,
    filters?: WorkLogFilters
  ): Promise<WorkLogDay> {
    try {
      // Calculate date range first
      const dateObj = new Date(date);
      const dayStart = new Date(dateObj);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateObj);
      dayEnd.setHours(23, 59, 59, 999);

      // Fetch all data in parallel
      const [appointments, attendanceLogs, currentAttendance] = await Promise.all([
        // Get appointments for the date
        appointmentsService.getSalonAppointments({ 
          myAppointments: true 
        }).catch(() => []),
        
        // Get attendance logs for the date
        attendanceService.getAttendanceHistory(
          employeeId,
          dayStart.toISOString(),
          dayEnd.toISOString()
        ).catch(() => []),
        
        // Get current attendance status
        staffService.getCurrentAttendance(employeeId).catch(() => null),
      ]);

      const dayAppointments = appointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.scheduledStart);
        return aptDate >= dayStart && aptDate <= dayEnd;
      });

      // Filter attendance logs for the date
      const dayAttendanceLogs = attendanceLogs.filter((log: AttendanceLog) => {
        const logDate = new Date(log.recordedAt);
        return logDate >= dayStart && logDate <= dayEnd;
      });

      // Find clock in/out times
      const clockInLog = dayAttendanceLogs.find(
        (log) => log.type === AttendanceType.CLOCK_IN
      );
      const clockOutLog = dayAttendanceLogs.find(
        (log) => log.type === AttendanceType.CLOCK_OUT
      );

      // If currently clocked in and no clock out for today, use current attendance
      let clockIn = clockInLog?.recordedAt;
      let clockOut = clockOutLog?.recordedAt;

      if (currentAttendance && !clockOut && this.isToday(date)) {
        clockIn = currentAttendance.recordedAt;
        // Don't set clockOut if still working
      }

      // Calculate total hours
      let totalMinutes = 0;
      if (clockIn) {
        const endTime = clockOut || new Date().toISOString();
        const start = new Date(clockIn);
        const end = new Date(endTime);
        totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      }

      // Calculate earnings from completed appointments
      const completedAppointments = dayAppointments.filter(
        (apt) => apt.status === AppointmentStatus.COMPLETED
      );

      let earnings = 0;
      let commission = 0;

      // Calculate earnings from appointments (if serviceAmount is available)
      completedAppointments.forEach((apt) => {
        if (apt.serviceAmount) {
          earnings += apt.serviceAmount;
        }
      });

      // Build entries array
      const entries: WorkLogEntry[] = [];

      // Add attendance entries
      if (clockIn) {
        entries.push({
          id: `attendance-in-${date}`,
          type: 'attendance',
          timestamp: clockIn,
          title: 'Clock In',
          description: this.formatTime(clockIn),
          status: 'completed',
          attendance: clockInLog || undefined,
        });
      }

      // Add appointment entries
      dayAppointments.forEach((apt) => {
        entries.push({
          id: apt.id,
          type: 'appointment',
          timestamp: apt.scheduledStart,
          endTime: apt.scheduledEnd,
          title: apt.service?.name || 'Service',
          description: apt.customer?.user?.fullName || 'Customer',
          status: apt.status,
          duration: this.calculateDuration(apt.scheduledStart, apt.scheduledEnd),
          earnings: apt.serviceAmount,
          appointment: apt,
        });
      });

      // Add clock out entry
      if (clockOut) {
        entries.push({
          id: `attendance-out-${date}`,
          type: 'attendance',
          timestamp: clockOut,
          title: 'Clock Out',
          description: this.formatTime(clockOut),
          status: 'completed',
          attendance: clockOutLog || undefined,
        });
      }

      // Sort entries by timestamp
      entries.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Determine day status
      let status: 'working' | 'completed' | 'not_worked' = 'not_worked';
      if (clockIn && !clockOut && this.isToday(date)) {
        status = 'working';
      } else if (clockIn && clockOut) {
        status = 'completed';
      }

      return {
        date,
        dateLabel: this.getDateLabel(date),
        clockIn,
        clockOut,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        totalMinutes,
        appointments: dayAppointments,
        completedAppointments,
        earnings,
        commission,
        breaks: [],
        tasks: [],
        entries,
        status,
      };
    } catch (error) {
      console.error('Error fetching work log for date:', error);
      throw error;
    }
  }

  /**
   * Get work log summary for a period (day, week, month)
   */
  async getWorkLogSummary(
    employeeId: string,
    period: 'day' | 'week' | 'month',
    startDate?: string,
    endDate?: string
  ): Promise<WorkLogSummary> {
    try {
      const dates = this.getDateRange(period, startDate, endDate);
      const days: WorkLogDay[] = [];

      // Fetch work logs for all dates in parallel
      const workLogPromises = dates.map((date) =>
        this.getWorkLogForDate(employeeId, date).catch(() => null)
      );
      const workLogs = await Promise.all(workLogPromises);

      // Filter out null results and calculate totals
      let totalHours = 0;
      let totalAppointments = 0;
      let completedAppointments = 0;
      let totalEarnings = 0;
      let totalCommission = 0;
      let daysWorked = 0;
      let bestDay: WorkLogDay | undefined;

      workLogs.forEach((log) => {
        if (log) {
          days.push(log);
          if (log.status !== 'not_worked') {
            daysWorked++;
            totalHours += log.totalHours;
            totalAppointments += log.appointments.length;
            completedAppointments += log.completedAppointments.length;
            totalEarnings += log.earnings;
            totalCommission += log.commission;

            // Track best day (by earnings)
            if (!bestDay || log.earnings > bestDay.earnings) {
              bestDay = log;
            }
          }
        }
      });

      const totalDays = dates.length;
      const averageHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
      const averageAppointmentsPerDay = daysWorked > 0 ? totalAppointments / daysWorked : 0;
      const averageEarningsPerDay = daysWorked > 0 ? totalEarnings / daysWorked : 0;

      return {
        period,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        totalDays,
        daysWorked,
        totalHours: Math.round(totalHours * 10) / 10,
        totalAppointments,
        completedAppointments,
        totalEarnings,
        totalCommission,
        averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
        averageAppointmentsPerDay: Math.round(averageAppointmentsPerDay * 10) / 10,
        averageEarningsPerDay: Math.round(averageEarningsPerDay * 10) / 10,
        bestDay,
        days,
      };
    } catch (error) {
      console.error('Error fetching work log summary:', error);
      throw error;
    }
  }

  /**
   * Get date range for period
   */
  private getDateRange(
    period: 'day' | 'week' | 'month',
    startDate?: string,
    endDate?: string
  ): string[] {
    const dates: string[] = [];
    const today = new Date();

    if (startDate && endDate) {
      // Use provided date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const current = new Date(start);

      while (current <= end) {
        dates.push(this.formatDate(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Generate date range based on period
      let start: Date;
      let end: Date = new Date(today);

      switch (period) {
        case 'day':
          start = new Date(today);
          break;
        case 'week':
          start = new Date(today);
          start.setDate(today.getDate() - 6); // Last 7 days
          break;
        case 'month':
          start = new Date(today);
          start.setDate(today.getDate() - 29); // Last 30 days
          break;
        default:
          start = new Date(today);
      }

      const current = new Date(start);
      while (current <= end) {
        dates.push(this.formatDate(current));
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }

  /**
   * Check if date is today
   */
  private isToday(date: string): boolean {
    const today = new Date();
    const checkDate = new Date(date);
    return (
      today.getFullYear() === checkDate.getFullYear() &&
      today.getMonth() === checkDate.getMonth() &&
      today.getDate() === checkDate.getDate()
    );
  }

  /**
   * Get date label (Today, Yesterday, or formatted date)
   */
  private getDateLabel(date: string): string {
    const today = new Date();
    const checkDate = new Date(date);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isToday(date)) {
      return 'Today';
    } else if (
      yesterday.getFullYear() === checkDate.getFullYear() &&
      yesterday.getMonth() === checkDate.getMonth() &&
      yesterday.getDate() === checkDate.getDate()
    ) {
      return 'Yesterday';
    } else {
      return checkDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format time to 12-hour format
   */
  private formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Calculate duration in minutes
   */
  private calculateDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  }

  /**
   * Get work log statistics for a period
   */
  async getWorkLogStatistics(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalHours: number;
    totalDays: number;
    averageHoursPerDay: number;
    totalEarnings: number;
    totalAppointments: number;
    completionRate: number;
  }> {
    const summary = await this.getWorkLogSummary(
      employeeId,
      'month',
      startDate,
      endDate
    );

    const completionRate =
      summary.totalAppointments > 0
        ? (summary.completedAppointments / summary.totalAppointments) * 100
        : 0;

    return {
      totalHours: summary.totalHours,
      totalDays: summary.daysWorked,
      averageHoursPerDay: summary.averageHoursPerDay,
      totalEarnings: summary.totalEarnings,
      totalAppointments: summary.totalAppointments,
      completionRate: Math.round(completionRate * 10) / 10,
    };
  }
}

export const workLogService = new WorkLogService();

