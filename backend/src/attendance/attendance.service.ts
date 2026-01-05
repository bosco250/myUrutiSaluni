import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  AttendanceLog,
  AttendanceType,
} from './entities/attendance-log.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceLog)
    private attendanceLogsRepository: Repository<AttendanceLog>,
  ) {}

  async create(logData: Partial<AttendanceLog>): Promise<AttendanceLog> {
    const log = this.attendanceLogsRepository.create(logData);
    return this.attendanceLogsRepository.save(log);
  }

  async findByEmployee(
    employeeId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AttendanceLog[]> {
    const where: any = { salonEmployeeId: employeeId };

    if (startDate && endDate) {
      where.recordedAt = Between(new Date(startDate), new Date(endDate));
    }

    return this.attendanceLogsRepository.find({
      where,
      order: { recordedAt: 'DESC' },
      relations: ['salonEmployee', 'salonEmployee.user'],
    });
  }

  /**
   * Get current attendance status (if employee is clocked in)
   * Returns the most recent CLOCK_IN log that doesn't have a matching CLOCK_OUT
   */
  async getCurrentAttendance(
    employeeId: string,
  ): Promise<AttendanceLog | null> {
    // Get all logs for this employee, ordered by date desc
    const allLogs = await this.attendanceLogsRepository.find({
      where: { salonEmployeeId: employeeId },
      order: { recordedAt: 'DESC' },
      relations: ['salonEmployee', 'salonEmployee.user'],
    });

    if (allLogs.length === 0) {
      return null;
    }

    // Find the most recent CLOCK_IN
    const lastClockIn = allLogs.find(
      (log) => log.type === AttendanceType.CLOCK_IN,
    );

    if (!lastClockIn) {
      return null;
    }

    // Check if there's a CLOCK_OUT after this CLOCK_IN
    const clockInTime = new Date(lastClockIn.recordedAt).getTime();
    const hasClockOut = allLogs.some(
      (log) =>
        log.type === AttendanceType.CLOCK_OUT &&
        new Date(log.recordedAt).getTime() > clockInTime,
    );

    // If there's no clock out after the clock in, employee is currently clocked in
    return hasClockOut ? null : lastClockIn;
  }
}
