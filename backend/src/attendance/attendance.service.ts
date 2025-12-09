import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLog } from './entities/attendance-log.entity';

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

  async findByEmployee(employeeId: string): Promise<AttendanceLog[]> {
    return this.attendanceLogsRepository.find({
      where: { salonEmployeeId: employeeId },
      order: { recordedAt: 'DESC' },
    });
  }
}
