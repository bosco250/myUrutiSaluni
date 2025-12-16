import { api } from './api';

/**
 * Salon Staff Service
 * Handles operations for salon employees (clock in/out, schedule, attendance)
 */

export interface AttendanceLog {
  id: string;
  employeeId: string;
  salonId: string;
  clockIn: string;
  clockOut?: string;
  source: 'mobile_app' | 'ussd' | 'web';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSchedule {
  id: string;
  employeeId: string;
  salonId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface EmployeeStats {
  totalAppointmentsToday: number;
  completedAppointments: number;
  earningsToday: number;
  hoursWorked: number;
  customerRating: number;
}

export interface ClockStatus {
  isClockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHoursToday: number;
}

export interface TodayStats {
  appointmentsCount: number;
  completedCount: number;
  upcomingCount: number;
  earnings: number;
  customerCount: number;
}

export interface ScheduleItem {
  id: string;
  serviceName: string;
  customerName: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
}

class StaffService {
  /**
   * Clock in for work
   */
  async clockIn(employeeId: string): Promise<AttendanceLog> {
    const response = await api.post<AttendanceLog>('/attendance/clock-in', {
      employeeId,
      source: 'mobile_app',
    });
    return response;
  }

  /**
   * Clock out from work
   */
  async clockOut(employeeId: string, attendanceId: string): Promise<AttendanceLog> {
    const response = await api.post<AttendanceLog>(`/attendance/${attendanceId}/clock-out`, {
      employeeId,
    });
    return response;
  }

  /**
   * Get current attendance status (if clocked in)
   */
  async getCurrentAttendance(employeeId: string): Promise<AttendanceLog | null> {
    try {
      const response = await api.get<AttendanceLog>(`/attendance/current/${employeeId}`);
      return response;
    } catch (error: any) {
      // If no active attendance, return null
      if (error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get attendance history for an employee
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceLog[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get<AttendanceLog[]>(
      `/attendance/employee/${employeeId}?${params.toString()}`
    );
    return response;
  }

  /**
   * Get employee's schedule
   */
  async getSchedule(employeeId: string): Promise<EmployeeSchedule[]> {
    const response = await api.get<EmployeeSchedule[]>(`/salon-employees/${employeeId}/schedule`);
    return response;
  }

  /**
   * Get employee's performance statistics
   */
  async getStats(employeeId: string): Promise<EmployeeStats> {
    const response = await api.get<EmployeeStats>(`/salon-employees/${employeeId}/stats`);
    return response;
  }

  /**
   * Get employee appointments for a specific date
   */
  async getAppointmentsByDate(employeeId: string, date: string): Promise<any[]> {
    const response = await api.get<any[]>(
      `/appointments/employee/${employeeId}?date=${date}`
    );
    return response;
  }

  /**
   * Get employee by user ID
   */
  async getEmployeeByUserId(userId: string): Promise<any> {
    const response = await api.get<any>(`/salon-employees/user/${userId}`);
    return response;
  }

  /**
   * Mark appointment as started
   */
  async startAppointment(appointmentId: string): Promise<any> {
    const response = await api.patch<any>(`/appointments/${appointmentId}/start`, {});
    return response;
  }

  /**
   * Mark appointment as completed
   */
  async completeAppointment(
    appointmentId: string,
    notes?: string,
    products?: Array<{ id: string; quantity: number }>
  ): Promise<any> {
    const response = await api.patch<any>(`/appointments/${appointmentId}/complete`, {
      notes,
      products,
    });
    return response;
  }
}

export const staffService = new StaffService();
