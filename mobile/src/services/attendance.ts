import { api } from './api';

export enum AttendanceType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
}

export interface AttendanceLog {
  id: string;
  salonEmployeeId: string;
  type: AttendanceType;
  recordedAt: string;
  source?: string;
  metadata?: Record<string, any>;
  salonEmployee?: {
    id: string;
    roleTitle?: string;
    user?: {
      fullName: string;
    }
  }
}

export interface CreateAttendanceDto {
  salonEmployeeId: string;
  type: AttendanceType;
  source?: string;
  metadata?: Record<string, any>;
}

class AttendanceService {
  /**
   * Record attendance (Clock In / Clock Out)
   */
  async recordAttendance(data: CreateAttendanceDto): Promise<AttendanceLog> {
    try {
      const response = await api.post<AttendanceLog>('/attendance', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attendance logs for an employee
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceLog[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const url = `/attendance/employee/${employeeId}${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<AttendanceLog[]>(url);
      return response || [];
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }
  }

  /**
   * Determine current status based on logs
   * Returns the type of the last log (CLOCK_IN or CLOCK_OUT)
   */
  getCurrentStatus(logs: AttendanceLog[]): AttendanceType | null {
    if (!logs || logs.length === 0) return null;
    
    // Sort logs by date desc to get latest
    const sorted = [...logs].sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    
    return sorted[0].type;
  }
  
  /**
   * Get today's logs
   */
  getTodayLogs(logs: AttendanceLog[]): AttendanceLog[] {
    const today = new Date().toDateString();
    return logs.filter(log => new Date(log.recordedAt).toDateString() === today);
  }
}

export const attendanceService = new AttendanceService();
