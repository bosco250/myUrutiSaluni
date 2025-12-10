import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import {
  AvailabilityService,
  DayAvailability,
  TimeSlot,
} from '../services/availability.service';
import { ValidateBookingDto } from '../dto/validate-booking.dto';
import { parseISO, isValid, addDays } from 'date-fns';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':employeeId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get employee availability overview for date range',
    description:
      'Returns availability status for each day in the specified range',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (YYYY-MM-DD), defaults to today',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (YYYY-MM-DD), defaults to 30 days from start',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Service ID to calculate duration-specific availability',
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    description: 'Service duration in minutes (overrides service duration)',
  })
  async getEmployeeAvailability(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('serviceId') serviceId?: string,
    @Query('duration') durationStr?: string,
  ): Promise<{ data: DayAvailability[] }> {
    // Parse and validate dates
    const startDate = startDateStr ? parseISO(startDateStr) : new Date();
    if (!isValid(startDate)) {
      throw new BadRequestException(
        'Invalid start date format. Use YYYY-MM-DD',
      );
    }

    const endDate = endDateStr ? parseISO(endDateStr) : addDays(startDate, 30);
    if (!isValid(endDate)) {
      throw new BadRequestException('Invalid end date format. Use YYYY-MM-DD');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Parse duration if provided
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;
    if (durationStr && (isNaN(duration!) || duration! <= 0)) {
      throw new BadRequestException('Duration must be a positive number');
    }

    const availability = await this.availabilityService.getEmployeeAvailability(
      {
        employeeId,
        startDate,
        endDate,
        serviceId,
        duration,
      },
    );

    return { data: availability };
  }

  @Get(':employeeId/slots')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get available time slots for specific date',
    description:
      'Returns detailed time slots with availability status for a specific date',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date to get slots for (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Service ID to get service-specific slots',
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    description: 'Service duration in minutes (overrides service duration)',
  })
  async getTimeSlots(
    @Param('employeeId') employeeId: string,
    @Query('date') dateStr: string,
    @Query('serviceId') serviceId?: string,
    @Query('duration') durationStr?: string,
  ): Promise<{
    data: TimeSlot[];
    meta: {
      date: string;
      employeeId: string;
      serviceId?: string;
      duration: number;
      totalSlots: number;
      availableSlots: number;
    };
  }> {
    if (!dateStr) {
      throw new BadRequestException('Date parameter is required');
    }

    const date = parseISO(dateStr);
    if (!isValid(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Parse duration if provided
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;
    if (durationStr && (isNaN(duration!) || duration! <= 0)) {
      throw new BadRequestException('Duration must be a positive number');
    }

    const timeSlots = await this.availabilityService.getTimeSlots(
      employeeId,
      date,
      serviceId,
      duration,
    );

    const availableSlots = timeSlots.filter((slot) => slot.available).length;

    return {
      data: timeSlots,
      meta: {
        date: dateStr,
        employeeId,
        serviceId,
        duration: duration || 30,
        totalSlots: timeSlots.length,
        availableSlots,
      },
    };
  }

  @Post('validate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Validate booking request',
    description:
      'Validates if a booking can be made at the specified time and provides alternatives if not',
  })
  async validateBooking(
    @Body() validateBookingDto: ValidateBookingDto,
  ): Promise<{
    valid: boolean;
    conflicts?: any[];
    suggestions?: TimeSlot[];
    reason?: string;
  }> {
    const {
      employeeId,
      serviceId,
      scheduledStart,
      scheduledEnd,
      excludeAppointmentId,
    } = validateBookingDto;

    // Parse and validate dates
    const startDate = parseISO(scheduledStart);
    const endDate = parseISO(scheduledEnd);

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End time must be after start time');
    }

    const result = await this.availabilityService.validateBooking(
      employeeId,
      serviceId,
      startDate,
      endDate,
      excludeAppointmentId,
    );

    return result;
  }

  @Get(':employeeId/next-available')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get next available slot for employee',
    description: 'Returns the next available time slot for the employee',
  })
  @ApiQuery({
    name: 'serviceId',
    required: false,
    description: 'Service ID to get service-specific availability',
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    description: 'Service duration in minutes',
  })
  async getNextAvailableSlot(
    @Param('employeeId') employeeId: string,
    @Query('serviceId') serviceId?: string,
    @Query('duration') durationStr?: string,
  ): Promise<{
    available: boolean;
    nextSlot?: {
      date: string;
      startTime: string;
      endTime: string;
      price?: number;
    };
    reason?: string;
  }> {
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;
    if (durationStr && (isNaN(duration!) || duration! <= 0)) {
      throw new BadRequestException('Duration must be a positive number');
    }

    // Search for next available slot in the next 30 days
    const startDate = new Date();
    const endDate = addDays(startDate, 30);

    const availability = await this.availabilityService.getEmployeeAvailability(
      {
        employeeId,
        startDate,
        endDate,
        serviceId,
        duration,
      },
    );

    // Find first day with available slots
    for (const day of availability) {
      if (day.availableSlots > 0) {
        // Get time slots for this day
        const timeSlots = await this.availabilityService.getTimeSlots(
          employeeId,
          parseISO(day.date),
          serviceId,
          duration,
        );

        // Find first available slot
        const firstAvailableSlot = timeSlots.find((slot) => slot.available);
        if (firstAvailableSlot) {
          return {
            available: true,
            nextSlot: {
              date: day.date,
              startTime: firstAvailableSlot.startTime,
              endTime: firstAvailableSlot.endTime,
              price: firstAvailableSlot.price,
            },
          };
        }
      }
    }

    return {
      available: false,
      reason: 'No available slots found in the next 30 days',
    };
  }

  @Get(':employeeId/summary')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get employee availability summary',
    description:
      'Returns a summary of employee availability for quick overview',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date to get summary for (defaults to today)',
  })
  async getAvailabilitySummary(
    @Param('employeeId') employeeId: string,
    @Query('date') dateStr?: string,
  ): Promise<{
    employeeId: string;
    date: string;
    isWorking: boolean;
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    utilizationRate: number;
    nextAvailable?: {
      date: string;
      time: string;
    };
  }> {
    const date = dateStr ? parseISO(dateStr) : new Date();
    if (!isValid(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Get availability for the specific date
    const [dayAvailability] =
      await this.availabilityService.getEmployeeAvailability({
        employeeId,
        startDate: date,
        endDate: date,
      });

    const isWorking = dayAvailability.status !== 'unavailable';
    const bookedSlots =
      dayAvailability.totalSlots - dayAvailability.availableSlots;
    const utilizationRate =
      dayAvailability.totalSlots > 0
        ? (bookedSlots / dayAvailability.totalSlots) * 100
        : 0;

    // Get next available slot if current date has no availability
    let nextAvailable: { date: string; time: string } | undefined;
    if (dayAvailability.availableSlots === 0) {
      const nextSlotResult = await this.getNextAvailableSlot(employeeId);
      if (nextSlotResult.available && nextSlotResult.nextSlot) {
        nextAvailable = {
          date: nextSlotResult.nextSlot.date,
          time: nextSlotResult.nextSlot.startTime,
        };
      }
    }

    return {
      employeeId,
      date: dayAvailability.date,
      isWorking,
      totalSlots: dayAvailability.totalSlots,
      availableSlots: dayAvailability.availableSlots,
      bookedSlots,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      nextAvailable,
    };
  }
}
