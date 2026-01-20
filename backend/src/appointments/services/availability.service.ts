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
import { Salon } from '../../salons/entities/salon.entity';

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

  // Day name mapping for operating hours (0=Sunday, 1=Monday, etc.)
  private readonly dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

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
    @InjectRepository(Salon)
    private salonsRepository: Repository<Salon>,
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

    // FALLBACK: If no employee working hours, use salon operating hours
    if (!workingHours) {
      workingHours = await this.getSalonOperatingHoursAsWorkingHours(
        employeeId,
        dayOfWeek,
      );
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

      // Check working hours - fallback to salon operating hours if none configured
      const dayOfWeek = scheduledStart.getDay();
      let workingHours = await this.workingHoursRepository.findOne({
        where: { employeeId, dayOfWeek, isActive: true },
      });

      // FALLBACK: If no employee working hours, use salon operating hours
      if (!workingHours) {
        workingHours = await this.getSalonOperatingHoursAsWorkingHours(
          employeeId,
          dayOfWeek,
        );
      }

      // Final fallback - if still no working hours, use default 9AM-6PM
      if (!workingHours) {
        this.logger.warn(
          `[validateBooking] No working hours found for employee ${employeeId} on day ${dayOfWeek}, using default 9:00-18:00`,
        );
        workingHours = this.getDefaultWorkingHours(employeeId, dayOfWeek);
      }

      // Helper to convert "HH:mm" or "H:mm" to minutes since midnight
      const timeToMinutes = (time: string): number => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + (m || 0);
      };

      // IMPORTANT: Working hours are stored in local Rwanda time (Africa/Kigali, UTC+2)
      // The scheduledStart/End are in UTC from the frontend's toISOString()
      // We need to convert to Rwanda local time for comparison
      // Rwanda is UTC+2, so we add 2 hours to UTC time
      const RWANDA_OFFSET_MINUTES = 2 * 60; // UTC+2

      // Get UTC hours and minutes, then add Rwanda offset
      const scheduledStartUTCMinutes =
        scheduledStart.getUTCHours() * 60 + scheduledStart.getUTCMinutes();
      const scheduledEndUTCMinutes =
        scheduledEnd.getUTCHours() * 60 + scheduledEnd.getUTCMinutes();

      // Convert to Rwanda local time
      const scheduledStartMinutes =
        (scheduledStartUTCMinutes + RWANDA_OFFSET_MINUTES) % (24 * 60);
      const scheduledEndMinutes =
        (scheduledEndUTCMinutes + RWANDA_OFFSET_MINUTES) % (24 * 60);

      const workStartMinutes = timeToMinutes(workingHours.startTime);
      const workEndMinutes = timeToMinutes(workingHours.endTime);

      this.logger.debug(
        `[validateBooking] Time check (Rwanda local): scheduled=${scheduledStartMinutes}-${scheduledEndMinutes} min, ` +
          `working=${workStartMinutes}-${workEndMinutes} min (${workingHours.startTime}-${workingHours.endTime})`,
      );

      if (
        scheduledStartMinutes < workStartMinutes ||
        scheduledEndMinutes > workEndMinutes
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
   * Get salon operating hours as employee working hours fallback
   */
  private async getSalonOperatingHoursAsWorkingHours(
    employeeId: string,
    dayOfWeek: number,
  ): Promise<EmployeeWorkingHours | null> {
    // Get employee to find salon
    const employee = await this.employeesRepository.findOne({
      where: { id: employeeId },
      relations: ['salon'],
    });

    if (!employee?.salonId) {
      return this.getDefaultWorkingHours(employeeId, dayOfWeek);
    }

    const salon = await this.salonsRepository.findOne({
      where: { id: employee.salonId },
    });

    if (!salon?.settings?.operatingHours) {
      return this.getDefaultWorkingHours(employeeId, dayOfWeek);
    }

    try {
      const operatingHours =
        typeof salon.settings.operatingHours === 'string'
          ? JSON.parse(salon.settings.operatingHours)
          : salon.settings.operatingHours;

      const dayName = this.dayNames[dayOfWeek];
      const dayHours = operatingHours[dayName];

      if (dayHours?.isOpen && dayHours.startTime && dayHours.endTime) {
        this.logger.debug(
          `Using salon operating hours for employee ${employeeId} on ${dayName}: ${dayHours.startTime}-${dayHours.endTime}`,
        );
        return {
          employeeId,
          dayOfWeek,
          startTime: dayHours.startTime,
          endTime: dayHours.endTime,
          breaks: dayHours.breaks || [],
          isActive: true,
        } as EmployeeWorkingHours;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse salon operating hours: ${error.message}`,
      );
    }

    return this.getDefaultWorkingHours(employeeId, dayOfWeek);
  }

  /**
   * Get default working hours (9:00 - 18:00)
   */
  private getDefaultWorkingHours(
    employeeId: string,
    dayOfWeek: number,
  ): EmployeeWorkingHours {
    this.logger.debug(
      `No working hours for employee ${employeeId} on day ${dayOfWeek}, using default 9:00-18:00`,
    );
    return {
      employeeId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [],
      isActive: true,
    } as EmployeeWorkingHours;
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
