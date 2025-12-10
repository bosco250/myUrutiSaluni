import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { SalonsService } from '../salons/salons.service';
import { CustomersService } from '../customers/customers.service';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly salonsService: SalonsService,
    private readonly customersService: CustomersService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    // Customers can only create appointments for themselves
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      // Get customer record for this user
      const customer = await this.customersService.findByUserId(
        user.id || user.userId,
      );
      if (!customer) {
        throw new ForbiddenException(
          'Customer record not found. Please contact support.',
        );
      }
      // Ensure customer is booking for themselves
      if (
        createAppointmentDto.customerId &&
        createAppointmentDto.customerId !== customer.id
      ) {
        throw new ForbiddenException(
          'You can only book appointments for yourself',
        );
      }
      // Auto-set customer ID
      createAppointmentDto.customerId = customer.id;
    }

    // Salon owners and employees can only create appointments for their salon
    if (
      (user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE) &&
      createAppointmentDto.salonId
    ) {
      const salon = await this.salonsService.findOne(
        createAppointmentDto.salonId,
      );
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create appointments for your own salon',
        );
      }
    }

    // Validate employee availability if preferredEmployeeId is provided
    const metadata = createAppointmentDto.metadata as any;
    const preferredEmployeeId = metadata?.preferredEmployeeId;

    if (preferredEmployeeId) {
      const scheduledStart = new Date(createAppointmentDto.scheduledStart);
      const scheduledEnd = new Date(createAppointmentDto.scheduledEnd);

      // Get employee details for error message
      const employee =
        await this.salonsService.findEmployeeById(preferredEmployeeId);
      const employeeName =
        employee?.user?.fullName || employee?.roleTitle || 'This employee';

      const isAvailable =
        await this.appointmentsService.checkEmployeeAvailability(
          preferredEmployeeId,
          scheduledStart,
          scheduledEnd,
        );

      if (!isAvailable) {
        throw new BadRequestException(
          `${employeeName} is not available at this time. Please select another time slot.`,
        );
      }
    }

    return this.appointmentsService.create({
      ...createAppointmentDto,
      createdById: user.id || user.userId,
    });
  }

  @Get('customer/:customerId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get appointments for a specific customer' })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    // Customers can only see their own appointments
    if (user.role === UserRole.CUSTOMER) {
      // Get customer by user ID
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException(
          'You can only access your own appointments',
        );
      }
    }

    return this.appointmentsService.findByCustomerId(customerId);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all appointments' })
  async findAll(
    @Query('salonId') salonId: string | undefined,
    @Query('myAppointments') myAppointments: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon employees can get their assigned appointments (where they are preferred employee)
    if (user.role === UserRole.SALON_EMPLOYEE && myAppointments === 'true') {
      // Find all employee records for this user (they might work for multiple salons)
      const allSalons = await this.salonsService.findByOwnerId(user.id);
      const allSalonIds = allSalons.map((s) => s.id);

      // Get all employee records for this user across all salons
      const employeeRecords = [];
      for (const salonId of allSalonIds) {
        const emp = await this.salonsService.findEmployeeByUserId(
          user.id,
          salonId,
        );
        if (emp) employeeRecords.push(emp);
      }

      if (employeeRecords.length === 0) {
        return []; // Return empty if not an employee
      }

      // Get appointments where any of these employees is the preferred employee
      const allPreferredAppointments = [];
      for (const emp of employeeRecords) {
        const appointments =
          await this.appointmentsService.findByPreferredEmployee(emp.id);
        allPreferredAppointments.push(...appointments);
      }

      // Deduplicate by appointment ID
      const uniqueAppointments = Array.from(
        new Map(allPreferredAppointments.map((apt) => [apt.id, apt])).values(),
      );

      return uniqueAppointments;
    }

    // Salon owners and employees can only see appointments for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access appointments for your own salon',
        );
      }
      // Filter by user's salon IDs
      const salonAppointments =
        await this.appointmentsService.findBySalonIds(salonIds);

      // If employee, also include appointments where they are preferred
      if (user.role === UserRole.SALON_EMPLOYEE) {
        // Get all employee records for this user
        const employeeRecords = [];
        for (const sid of salonIds) {
          const emp = await this.salonsService.findEmployeeByUserId(
            user.id,
            sid,
          );
          if (emp) employeeRecords.push(emp);
        }

        // Get appointments where any of these employees is preferred
        for (const emp of employeeRecords) {
          const preferredAppointments =
            await this.appointmentsService.findByPreferredEmployee(emp.id);
          // Merge and deduplicate
          const allAppointmentIds = new Set(salonAppointments.map((a) => a.id));
          preferredAppointments.forEach((apt) => {
            if (!allAppointmentIds.has(apt.id)) {
              salonAppointments.push(apt);
            }
          });
        }
      }

      return salonAppointments;
    }
    // Admins can see all or filter by salonId
    return this.appointmentsService.findAll(salonId);
  }

  @Get('employee/:employeeId/slots')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get available time slots for an employee on a specific date',
  })
  async getEmployeeAvailability(
    @Param('employeeId') employeeId: string,
    @Query('date') date: string,
    @Query('duration') duration: string = '30', // Duration in minutes, default 30
  ) {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    // Get all appointments for this employee on this date
    const appointments =
      await this.appointmentsService.getEmployeeAppointmentsForDate(
        employeeId,
        selectedDate,
      );

    // Generate all possible time slots (9 AM to 6 PM, 30-minute intervals)
    const allTimeSlots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allTimeSlots.push(time);
      }
    }

    const durationMinutes = parseInt(duration, 10) || 30;

    // Filter out booked time slots
    const bookedSlots = new Set<string>();
    appointments.forEach((apt) => {
      const aptStart = new Date(apt.scheduledStart);
      const aptEnd = new Date(apt.scheduledEnd);

      // Mark all 30-minute slots that overlap with this appointment as booked
      allTimeSlots.forEach((slot) => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slotHour, slotMinute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        // Check if this slot overlaps with the appointment
        if (slotStart < aptEnd && slotEnd > aptStart) {
          bookedSlots.add(slot);
        }
      });
    });

    // Return available slots
    const availableSlots = allTimeSlots.filter(
      (slot) => !bookedSlots.has(slot),
    );

    return {
      date: date,
      employeeId: employeeId,
      availableSlots: availableSlots,
      bookedSlots: Array.from(bookedSlots),
      appointments: appointments.map((apt) => ({
        id: apt.id,
        start: apt.scheduledStart,
        end: apt.scheduledEnd,
        status: apt.status,
      })),
    };
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get an appointment by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const appointment = await this.appointmentsService.findOne(id);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Customers can only access their own appointments
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || appointment.customerId !== customer.id) {
        throw new ForbiddenException(
          'You can only access your own appointments',
        );
      }
    }

    // Salon owners can only access appointments for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access appointments for your own salon',
        );
      }
    }

    // Salon employees can access appointments if:
    // 1. They are the preferred employee for this appointment, OR
    // 2. They work at the salon where the appointment is
    if (
      user.role === UserRole.SALON_EMPLOYEE ||
      user.role === 'salon_employee'
    ) {
      const salon = await this.salonsService.findOne(appointment.salonId);

      if (!salon) {
        throw new NotFoundException('Salon not found');
      }

      // Check if user owns the salon (salon owner can also be employee)
      const ownsSalon = salon.ownerId === user.id;

      if (ownsSalon) {
        // Salon owner can access all appointments for their salon
        return appointment;
      }

      // Check if user is an employee of this salon
      const isEmployeeOfSalon = await this.salonsService.isUserEmployeeOfSalon(
        user.id,
        appointment.salonId,
      );

      if (isEmployeeOfSalon) {
        // Employee of the salon can access all appointments for that salon
        return appointment;
      }

      // Check if user is the preferred employee
      // Handle metadata - it might be a string or object (TypeORM simple-json)
      let metadata = appointment.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (!metadata || typeof metadata !== 'object') {
        metadata = {};
      }

      let isPreferredEmployee = false;
      const preferredEmployeeId =
        metadata?.preferredEmployeeId || metadata?.preferred_employee_id;

      if (preferredEmployeeId) {
        // Direct check: Find the employee record by preferredEmployeeId and verify it belongs to this user
        try {
          const preferredEmployee =
            await this.salonsService.findEmployeeById(preferredEmployeeId);
          if (preferredEmployee) {
            // Check if this employee record belongs to the current user
            if (
              preferredEmployee.userId === user.id ||
              preferredEmployee.user?.id === user.id
            ) {
              isPreferredEmployee = true;
            }
          }
        } catch (error) {
          // Employee record not found or error - continue checking
        }
      }

      // Allow access if user is preferred employee
      if (!isPreferredEmployee) {
        throw new ForbiddenException(
          'You can only access appointments for your salon or appointments assigned to you',
        );
      }
    }

    return appointment;
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Update an appointment' })
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const appointment = await this.appointmentsService.findOne(id);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Prevent modifications to completed or cancelled appointments
    if (appointment.status === 'completed') {
      throw new ForbiddenException('Cannot modify a completed appointment');
    }
    if (
      appointment.status === 'cancelled' &&
      updateAppointmentDto.status !== 'cancelled'
    ) {
      throw new ForbiddenException(
        'Cannot modify a cancelled appointment. Please create a new appointment instead.',
      );
    }

    // Salon owners can only update appointments for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only update appointments for your own salon',
        );
      }
    }

    // Salon employees can update appointments if:
    // 1. They are the preferred employee for this appointment, OR
    // 2. They work at the salon where the appointment is
    if (
      user.role === UserRole.SALON_EMPLOYEE ||
      user.role === 'salon_employee'
    ) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      const ownsSalon = salon.ownerId === user.id;

      if (ownsSalon) {
        // Salon owner can update all appointments for their salon
        return this.appointmentsService.update(id, updateAppointmentDto);
      }

      const isEmployeeOfSalon = await this.salonsService.isUserEmployeeOfSalon(
        user.id,
        appointment.salonId,
      );

      let isPreferredEmployee = false;
      // Handle metadata parsing
      let metadata = appointment.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (!metadata || typeof metadata !== 'object') {
        metadata = {};
      }

      const preferredEmployeeId =
        metadata?.preferredEmployeeId || metadata?.preferred_employee_id;
      if (preferredEmployeeId) {
        try {
          const preferredEmployee =
            await this.salonsService.findEmployeeById(preferredEmployeeId);
          if (
            preferredEmployee &&
            (preferredEmployee.userId === user.id ||
              preferredEmployee.user?.id === user.id)
          ) {
            isPreferredEmployee = true;
          }
        } catch (error) {
          // Employee record not found, continue
        }
      }

      if (!isEmployeeOfSalon && !isPreferredEmployee) {
        throw new ForbiddenException(
          'You can only update appointments for your salon or appointments assigned to you',
        );
      }
    }

    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Delete an appointment' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const appointment = await this.appointmentsService.findOne(id);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Prevent deletion of completed appointments
    if (appointment.status === 'completed') {
      throw new ForbiddenException('Cannot delete a completed appointment');
    }

    // Salon owners can only delete appointments for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only delete appointments for your own salon',
        );
      }
    }

    // Salon employees can delete appointments if:
    // 1. They are the preferred employee for this appointment, OR
    // 2. They work at the salon where the appointment is
    if (
      user.role === UserRole.SALON_EMPLOYEE ||
      user.role === 'salon_employee'
    ) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      const ownsSalon = salon.ownerId === user.id;

      if (ownsSalon) {
        // Salon owner can delete all appointments for their salon
        return this.appointmentsService.remove(id);
      }

      const isEmployeeOfSalon = await this.salonsService.isUserEmployeeOfSalon(
        user.id,
        appointment.salonId,
      );

      let isPreferredEmployee = false;
      // Handle metadata parsing
      let metadata = appointment.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (!metadata || typeof metadata !== 'object') {
        metadata = {};
      }

      const preferredEmployeeId =
        metadata?.preferredEmployeeId || metadata?.preferred_employee_id;
      if (preferredEmployeeId) {
        try {
          const preferredEmployee =
            await this.salonsService.findEmployeeById(preferredEmployeeId);
          if (
            preferredEmployee &&
            (preferredEmployee.userId === user.id ||
              preferredEmployee.user?.id === user.id)
          ) {
            isPreferredEmployee = true;
          }
        } catch (error) {
          // Employee record not found, continue
        }
      }

      if (!isEmployeeOfSalon && !isPreferredEmployee) {
        throw new ForbiddenException(
          'You can only delete appointments for your salon or appointments assigned to you',
        );
      }
    }

    return this.appointmentsService.remove(id);
  }
}
