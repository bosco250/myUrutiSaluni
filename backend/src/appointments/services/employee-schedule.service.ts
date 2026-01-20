import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeWorkingHours } from '../entities/employee-working-hours.entity';
import { EmployeeAvailabilityRules } from '../entities/employee-availability-rules.entity';

export interface CreateWorkingHoursDto {
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breaks?: Array<{ startTime: string; endTime: string }>;
}

export interface UpdateAvailabilityRulesDto {
  employeeId: string;
  advanceBookingDays?: number;
  minLeadTimeHours?: number;
  maxBookingsPerDay?: number;
  bufferMinutes?: number;
  blackoutDates?: string[];
}

@Injectable()
export class EmployeeScheduleService {
  constructor(
    @InjectRepository(EmployeeWorkingHours)
    private workingHoursRepository: Repository<EmployeeWorkingHours>,
    @InjectRepository(EmployeeAvailabilityRules)
    private availabilityRulesRepository: Repository<EmployeeAvailabilityRules>,
  ) {}

  /**
   * Set working hours for an employee
   */
  async setWorkingHours(
    data: CreateWorkingHoursDto,
  ): Promise<EmployeeWorkingHours> {
    // Check if working hours already exist for this employee and day
    const existing = await this.workingHoursRepository.findOne({
      where: {
        employeeId: data.employeeId,
        dayOfWeek: data.dayOfWeek,
      },
    });

    if (existing) {
      // Update existing
      Object.assign(existing, data);
      return this.workingHoursRepository.save(existing);
    } else {
      // Create new
      const workingHours = this.workingHoursRepository.create(data);
      return this.workingHoursRepository.save(workingHours);
    }
  }

  /**
   * Get working hours for an employee
   */
  async getWorkingHours(employeeId: string): Promise<EmployeeWorkingHours[]> {
    return this.workingHoursRepository.find({
      where: { employeeId, isActive: true },
      order: { dayOfWeek: 'ASC' },
    });
  }

  /**
   * Set multiple working hours for an employee (full week)
   */
  async setWeeklySchedule(
    employeeId: string,
    schedule: Omit<CreateWorkingHoursDto, 'employeeId'>[],
  ): Promise<EmployeeWorkingHours[]> {
    const results: EmployeeWorkingHours[] = [];

    for (const daySchedule of schedule) {
      const workingHours = await this.setWorkingHours({
        employeeId,
        ...daySchedule,
      });
      results.push(workingHours);
    }

    return results;
  }

  /**
   * Remove working hours for a specific day
   */
  async removeWorkingHours(
    employeeId: string,
    dayOfWeek: number,
  ): Promise<void> {
    await this.workingHoursRepository.update(
      { employeeId, dayOfWeek },
      { isActive: false },
    );
  }

  /**
   * Set availability rules for an employee
   */
  async setAvailabilityRules(
    data: UpdateAvailabilityRulesDto,
  ): Promise<EmployeeAvailabilityRules> {
    // Check if rules already exist
    const existing = await this.availabilityRulesRepository.findOne({
      where: { employeeId: data.employeeId },
    });

    if (existing) {
      // Update existing
      Object.assign(existing, data);
      return this.availabilityRulesRepository.save(existing);
    } else {
      // Create new
      const rules = this.availabilityRulesRepository.create(data);
      return this.availabilityRulesRepository.save(rules);
    }
  }

  /**
   * Get availability rules for an employee
   */
  async getAvailabilityRules(
    employeeId: string,
  ): Promise<EmployeeAvailabilityRules | null> {
    return this.availabilityRulesRepository.findOne({
      where: { employeeId },
    });
  }

  /**
   * Add blackout dates for an employee
   */
  async addBlackoutDates(
    employeeId: string,
    dates: string[],
  ): Promise<EmployeeAvailabilityRules> {
    const rules = await this.getAvailabilityRules(employeeId);

    if (!rules) {
      // Create new rules with blackout dates
      return this.setAvailabilityRules({
        employeeId,
        blackoutDates: dates,
      });
    }

    // Add to existing blackout dates
    const existingDates = rules.blackoutDates || [];
    const newDates = [...existingDates, ...dates];
    const uniqueDates = [...new Set(newDates)]; // Remove duplicates

    rules.blackoutDates = uniqueDates;
    return this.availabilityRulesRepository.save(rules);
  }

  /**
   * Remove blackout dates for an employee
   */
  async removeBlackoutDates(
    employeeId: string,
    dates: string[],
  ): Promise<EmployeeAvailabilityRules> {
    const rules = await this.getAvailabilityRules(employeeId);

    if (!rules || !rules.blackoutDates) {
      throw new NotFoundException(
        'No availability rules or blackout dates found',
      );
    }

    // Remove specified dates
    rules.blackoutDates = rules.blackoutDates.filter(
      (date) => !dates.includes(date),
    );
    return this.availabilityRulesRepository.save(rules);
  }

  /**
   * Get complete schedule for an employee (working hours + rules)
   */
  async getCompleteSchedule(employeeId: string): Promise<{
    workingHours: EmployeeWorkingHours[];
    availabilityRules: EmployeeAvailabilityRules | null;
  }> {
    const [workingHours, availabilityRules] = await Promise.all([
      this.getWorkingHours(employeeId),
      this.getAvailabilityRules(employeeId),
    ]);

    return {
      workingHours,
      availabilityRules,
    };
  }

  /**
   * Set default availability rules for new employees
   */
  async setDefaultRules(
    employeeId: string,
  ): Promise<EmployeeAvailabilityRules> {
    return this.setAvailabilityRules({
      employeeId,
      advanceBookingDays: 30,
      minLeadTimeHours: 2,
      maxBookingsPerDay: 10,
      bufferMinutes: 15,
      blackoutDates: [],
    });
  }

  /**
   * Set standard working hours
   * NOTE: We return empty array to avoid creating static schedule entries.
   * This allows AvailabilityService to fall back to the dynamic Salon Operating Hours.
   */
  async setStandardWorkingHours(
    employeeId: string,
  ): Promise<EmployeeWorkingHours[]> {
    // Return empty to allow dynamic fallback to salon hours
    return [];
  }
}
