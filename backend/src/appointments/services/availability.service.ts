import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  startOfDay,
  endOfDay,
  addMinutes,
  format,
  parseISO,
  isAfter,
  isBefore,
  addDays,
} from 'date-fns';
import { Appointment } from '../entities/appointment.entity';
import { EmployeeWorkingHours } from '../entities/employee-working-hours.entity';
import { EmployeeAvailabilityRules } from '../entities/employee-availability-rules.entity';
import { Service } from '../../services/entities/service.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
  price?: number;
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'partially_booked' | 'fully_booked' | 'unavailable';
  totalSlots: number;
  availableSlots: number;
  timeSlots?: TimeSlot[];
}

export interface AvailabilityQuery {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  serviceId?: string;
  duration?: number;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(EmployeeWorkingHours)
    private workingHoursRepository: Repository<EmployeeWorkingHours>,
    @InjectRepository(EmployeeAvailabilityRules)
    private availabilityRulesRepository: Repository<EmployeeAvailabilityRules>,
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
    @InjectRepository(SalonEmployee)
    private employeesRepository: Repository<SalonEmployee>,
  ) {}

  /**
   * Get availability overview for multiple days
   */
  async getEmployeeAvailability(
    query: AvailabilityQuery,
  ): Promise<DayAvailability[]> {
    const { employeeId, startDate, endDate, serviceId, duration } = query;

    // Get service details for duration
    let serviceDuration = duration || 30; // Default 30 minutes
    if (serviceId) {
      const service = await this.servicesRepository.findOne({
        where: { id: serviceId },
      });
      if (service?.durationMinutes) {
        serviceDuration = service.durationMinutes;
      }
    }

    // Get employee working hours
    const workingHours = await this.getEmployeeWorkingHours(employeeId);

    // Get availability rules
    const rules = await this.getEmployeeAvailabilityRules(employeeId);

    // Get existing appointments in date range
    const appointments = await this.getEmployeeAppointments(
      employeeId,
      startDate,
      endDate,
    );

    const availability: DayAvailability[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayAvailability = await this.calculateDayAvailability(
        currentDate,
        employeeId,
        serviceDuration,
        workingHours,
        rules,
        appointments,
      );

      availability.push(dayAvailability);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  }

  /**
   * Get detailed time slots for a specific date
   */
  async getTimeSlots(
    employeeId: string,
    date: Date,
    serviceId?: string,
    duration?: number,
  ): Promise<TimeSlot[]> {
    // Get service details
    let serviceDuration = duration || 30;
    let servicePrice: number | undefined;

    if (serviceId) {
      const service = await this.servicesRepository.findOne({
        where: { id: serviceId },
      });
      if (service) {
        serviceDuration = service.durationMinutes || 30;
        servicePrice = service.basePrice
          ? Number(service.basePrice)
          : undefined;
      }
    }

    // Get employee working hours for this day
    const dayOfWeek = date.getDay();
    let workingHours = await this.workingHoursRepository.findOne({
      where: { employeeId, dayOfWeek, isActive: true },
    });

    // DEFAULT: If no working hours configured, assume 9:00 - 18:00 (full availability)
    if (!workingHours) {
      this.logger.debug(
        `No working hours for employee ${employeeId} on day ${dayOfWeek}, using default 9:00-18:00`,
      );
      workingHours = {
        employeeId,
        dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
        breaks: [],
        isActive: true,
      } as EmployeeWorkingHours;
    }

    // Get availability rules (optional - if none, we skip rule checks)
    let rules: EmployeeAvailabilityRules | null = null;
    try {
      rules = await this.getEmployeeAvailabilityRules(employeeId);
    } catch (error) {
      this.logger.warn(
        `Could not fetch availability rules for employee ${employeeId}: ${error.message}`,
      );
    }

    // Check if date is in blackout dates
    if (rules?.blackoutDates?.includes(format(date, 'yyyy-MM-dd'))) {
      return [];
    }

    // Check advance booking limits
    if (rules?.advanceBookingDays) {
      const maxBookingDate = addDays(new Date(), rules.advanceBookingDays);
      if (isAfter(date, maxBookingDate)) {
        return [];
      }
    }

    // Check minimum lead time
    const now = new Date();
    const minLeadTime = rules?.minLeadTimeHours || 0; // Default to 0 hours - no minimum lead time
    const earliestBooking = addMinutes(now, minLeadTime * 60);

    // Get existing appointments for this date
    const appointments = await this.getEmployeeAppointments(
      employeeId,
      startOfDay(date),
      endOfDay(date),
    );

    // Generate time slots
    const slots: TimeSlot[] = [];
    const startTime = parseISO(
      `${format(date, 'yyyy-MM-dd')}T${workingHours.startTime}`,
    );
    const endTime = parseISO(
      `${format(date, 'yyyy-MM-dd')}T${workingHours.endTime}`,
    );

    let currentSlot = startTime;
    const slotInterval = 15; // 15-minute intervals

    while (isBefore(currentSlot, endTime)) {
      const slotEnd = addMinutes(currentSlot, serviceDuration);

      // Check if slot fits within working hours
      if (isAfter(slotEnd, endTime)) {
        break;
      }

      // Check if slot is in the past (with lead time)
      const isPastSlot = isBefore(currentSlot, earliestBooking);

      // Check if slot conflicts with breaks
      const isBreakTime = this.isSlotInBreak(
        currentSlot,
        slotEnd,
        workingHours.breaks,
      );

      // Check if slot conflicts with existing appointments
      const hasConflict = this.hasAppointmentConflict(
        currentSlot,
        slotEnd,
        appointments,
      );

      // Add buffer time if required
      const bufferMinutes = rules?.bufferMinutes || 0;
      const hasBufferConflict =
        bufferMinutes > 0 &&
        this.hasBufferConflict(
          currentSlot,
          slotEnd,
          appointments,
          bufferMinutes,
        );

      const available =
        !isPastSlot && !isBreakTime && !hasConflict && !hasBufferConflict;

      let reason: string | undefined;
      if (isPastSlot) reason = 'Past time slot';
      else if (isBreakTime) reason = 'Break time';
      else if (hasConflict) reason = 'Already booked';
      else if (hasBufferConflict) reason = 'Buffer time required';

      slots.push({
        startTime: format(currentSlot, 'HH:mm'),
        endTime: format(slotEnd, 'HH:mm'),
        available,
        reason,
        price: servicePrice,
      });

      currentSlot = addMinutes(currentSlot, slotInterval);
    }

    return slots;
  }

  /**
   * Validate a booking request
   */
  async validateBooking(
    employeeId: string,
    serviceId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    excludeAppointmentId?: string,
  ): Promise<{
    valid: boolean;
    conflicts?: Appointment[];
    suggestions?: TimeSlot[];
    reason?: string;
  }> {
    try {
      // Check if employee exists and is active
      const employee = await this.employeesRepository.findOne({
        where: { id: employeeId, isActive: true },
      });

      if (!employee) {
        return {
          valid: false,
          reason: 'Employee not found or inactive',
        };
      }

      // Check working hours - use default 9:00-18:00 if none configured
      const dayOfWeek = scheduledStart.getDay();
      let workingHours = await this.workingHoursRepository.findOne({
        where: { employeeId, dayOfWeek, isActive: true },
      });

      // DEFAULT: If no working hours configured, assume 9:00 - 18:00
      if (!workingHours) {
        this.logger.debug(
          `No working hours for employee ${employeeId} on day ${dayOfWeek}, using default 9:00-18:00`,
        );
        workingHours = {
          employeeId,
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
          breaks: [],
          isActive: true,
        } as EmployeeWorkingHours;
      }

      // Check if time is within working hours
      const startTime = format(scheduledStart, 'HH:mm');
      const endTime = format(scheduledEnd, 'HH:mm');

      if (
        startTime < workingHours.startTime ||
        endTime > workingHours.endTime
      ) {
        return {
          valid: false,
          reason: 'Time is outside working hours',
        };
      }

      // Check for conflicts with existing appointments
      const conflicts = await this.getConflictingAppointments(
        employeeId,
        scheduledStart,
        scheduledEnd,
        excludeAppointmentId,
      );

      if (conflicts.length > 0) {
        // Generate alternative suggestions
        const suggestions = await this.getTimeSlots(
          employeeId,
          scheduledStart,
          serviceId,
        );

        return {
          valid: false,
          conflicts,
          suggestions: suggestions.filter((slot) => slot.available).slice(0, 5),
          reason: 'Time slot is already booked',
        };
      }

      // Check availability rules
      const rules = await this.getEmployeeAvailabilityRules(employeeId);

      // Check blackout dates
      if (
        rules?.blackoutDates?.includes(format(scheduledStart, 'yyyy-MM-dd'))
      ) {
        return {
          valid: false,
          reason: 'Employee is unavailable on this date',
        };
      }

      // Check advance booking limits
      if (rules?.advanceBookingDays) {
        const maxBookingDate = addDays(new Date(), rules.advanceBookingDays);
        if (isAfter(scheduledStart, maxBookingDate)) {
          return {
            valid: false,
            reason: `Bookings can only be made ${rules.advanceBookingDays} days in advance`,
          };
        }
      }

      // Check minimum lead time
      const now = new Date();
      const minLeadTime = rules?.minLeadTimeHours || 0; // Default to 0 - no minimum lead time
      const earliestBooking = addMinutes(now, minLeadTime * 60);

      if (isBefore(scheduledStart, earliestBooking)) {
        return {
          valid: false,
          reason: `Bookings require at least ${minLeadTime} hour(s) advance notice`,
        };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(
        `Error validating booking: ${error.message}`,
        error.stack,
      );
      return {
        valid: false,
        reason: 'Unable to validate booking at this time',
      };
    }
  }

  /**
   * Get employee working hours
   */
  private async getEmployeeWorkingHours(
    employeeId: string,
  ): Promise<EmployeeWorkingHours[]> {
    return this.workingHoursRepository.find({
      where: { employeeId, isActive: true },
      order: { dayOfWeek: 'ASC' },
    });
  }

  /**
   * Get employee availability rules
   */
  private async getEmployeeAvailabilityRules(
    employeeId: string,
  ): Promise<EmployeeAvailabilityRules | null> {
    return this.availabilityRulesRepository.findOne({
      where: { employeeId },
    });
  }

  /**
   * Get employee appointments in date range
   * Checks both salonEmployeeId column and metadata.preferredEmployeeId
   */
  private async getEmployeeAppointments(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    // Check both salonEmployeeId and metadata.preferredEmployeeId since
    // appointments can be stored with employee ID in either location
    const isPostgres =
      this.appointmentsRepository.manager.connection.driver.options.type ===
      'postgres';

    let metadataCondition: string;
    if (isPostgres) {
      // PostgreSQL: Cast to JSONB, use ->> operator, and cast employeeId to text for comparison
      metadataCondition = `(appointment.metadata::jsonb)->>'preferredEmployeeId' = :employeeIdText`;
    } else {
      // SQLite: Use json_extract function
      metadataCondition = `json_extract(appointment.metadata, '$.preferredEmployeeId') = :employeeId`;
    }

    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where(
        `(appointment.salonEmployeeId = :employeeId OR ${metadataCondition})`,
        { employeeId, employeeIdText: employeeId },
      )
      .andWhere('appointment.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['cancelled', 'no_show'],
      })
      .andWhere('appointment.scheduledStart >= :startDate', { startDate })
      .andWhere('appointment.scheduledStart <= :endDate', { endDate })
      .orderBy('appointment.scheduledStart', 'ASC')
      .getMany();
  }

  /**
   * Calculate availability for a specific day
   */
  private async calculateDayAvailability(
    date: Date,
    employeeId: string,
    serviceDuration: number,
    workingHours: EmployeeWorkingHours[],
    rules: EmployeeAvailabilityRules | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _appointments: Appointment[],
  ): Promise<DayAvailability> {
    // Note: We don't check dayWorkingHours here anymore
    // getTimeSlots will apply default 9:00-18:00 if no working hours are configured

    // Check blackout dates
    if (rules?.blackoutDates?.includes(format(date, 'yyyy-MM-dd'))) {
      return {
        date: format(date, 'yyyy-MM-dd'),
        status: 'unavailable',
        totalSlots: 0,
        availableSlots: 0,
      };
    }

    // Get time slots for this day (this now applies default working hours if none configured)
    const timeSlots = await this.getTimeSlots(
      employeeId,
      date,
      undefined,
      serviceDuration,
    );
    const totalSlots = timeSlots.length;
    const availableSlots = timeSlots.filter((slot) => slot.available).length;

    let status: DayAvailability['status'];
    if (availableSlots === 0) {
      status = totalSlots > 0 ? 'fully_booked' : 'unavailable';
    } else if (availableSlots < totalSlots) {
      status = 'partially_booked';
    } else {
      status = 'available';
    }

    return {
      date: format(date, 'yyyy-MM-dd'),
      status,
      totalSlots,
      availableSlots,
    };
  }

  /**
   * Check if time slot is during a break
   */
  private isSlotInBreak(
    slotStart: Date,
    slotEnd: Date,
    breaks: Array<{ startTime: string; endTime: string }> | null,
  ): boolean {
    if (!breaks || breaks.length === 0) return false;

    const slotStartTime = format(slotStart, 'HH:mm');
    const slotEndTime = format(slotEnd, 'HH:mm');

    return breaks.some((breakTime) => {
      // Check if slot overlaps with break
      return (
        slotStartTime < breakTime.endTime && slotEndTime > breakTime.startTime
      );
    });
  }

  /**
   * Check if time slot conflicts with existing appointments
   */
  private hasAppointmentConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: Appointment[],
  ): boolean {
    return appointments.some((appointment) => {
      const aptStart = new Date(appointment.scheduledStart);
      const aptEnd = new Date(appointment.scheduledEnd);

      // Check for overlap: (slotStart < aptEnd) AND (slotEnd > aptStart)
      return slotStart < aptEnd && slotEnd > aptStart;
    });
  }

  /**
   * Check if time slot conflicts with buffer requirements
   */
  private hasBufferConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: Appointment[],
    bufferMinutes: number,
  ): boolean {
    return appointments.some((appointment) => {
      const aptStart = new Date(appointment.scheduledStart);
      const aptEnd = new Date(appointment.scheduledEnd);

      // Check if slot is within buffer time of existing appointment
      const slotStartWithBuffer = addMinutes(slotStart, -bufferMinutes);
      const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes);

      return slotStartWithBuffer < aptEnd && slotEndWithBuffer > aptStart;
    });
  }

  /**
   * Get conflicting appointments for a time slot
   * Checks both salonEmployeeId column and metadata.preferredEmployeeId
   */
  private async getConflictingAppointments(
    employeeId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    excludeAppointmentId?: string,
  ): Promise<Appointment[]> {
    // Check both salonEmployeeId and metadata.preferredEmployeeId
    const isPostgres =
      this.appointmentsRepository.manager.connection.driver.options.type ===
      'postgres';

    let metadataCondition: string;
    if (isPostgres) {
      metadataCondition = `(appointment.metadata::jsonb)->>'preferredEmployeeId' = :employeeIdText`;
    } else {
      metadataCondition = `json_extract(appointment.metadata, '$.preferredEmployeeId') = :employeeId`;
    }

    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where(
        `(appointment.salonEmployeeId = :employeeId OR ${metadataCondition})`,
        { employeeId, employeeIdText: employeeId },
      )
      .andWhere('appointment.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['cancelled', 'no_show'],
      })
      .andWhere('appointment.scheduledStart < :scheduledEnd', { scheduledEnd })
      .andWhere('appointment.scheduledEnd > :scheduledStart', {
        scheduledStart,
      });

    if (excludeAppointmentId) {
      query.andWhere('appointment.id != :excludeAppointmentId', {
        excludeAppointmentId,
      });
    }

    return query.getMany();
  }
}
