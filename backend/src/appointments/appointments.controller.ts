import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(@Body() createAppointmentDto: CreateAppointmentDto, @CurrentUser() user: any) {
    // Customers can only create appointments for themselves
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      // Get customer record for this user
      const customer = await this.customersService.findByUserId(user.id || user.userId);
      if (!customer) {
        throw new ForbiddenException('Customer record not found. Please contact support.');
      }
      // Ensure customer is booking for themselves
      if (createAppointmentDto.customerId && createAppointmentDto.customerId !== customer.id) {
        throw new ForbiddenException('You can only book appointments for yourself');
      }
      // Auto-set customer ID
      createAppointmentDto.customerId = customer.id;
    }
    
    // Salon owners and employees can only create appointments for their salon
    if (
      (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) &&
      createAppointmentDto.salonId
    ) {
      const salon = await this.salonsService.findOne(createAppointmentDto.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException('You can only create appointments for your own salon');
      }
    }
    return this.appointmentsService.create({
      ...createAppointmentDto,
      createdById: user.id || user.userId,
    });
  }

  @Get('customer/:customerId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: "Get appointments for a specific customer" })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    // Customers can only see their own appointments
    if (user.role === UserRole.CUSTOMER) {
      // Get customer by user ID
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only access your own appointments');
      }
    }
    
    return this.appointmentsService.findByCustomerId(customerId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get all appointments' })
  async findAll(@Query('salonId') salonId: string | undefined, @CurrentUser() user: any) {
    // Salon owners and employees can only see appointments for their salon(s)
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map(s => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException('You can only access appointments for your own salon');
      }
      // Filter by user's salon IDs
      return this.appointmentsService.findBySalonIds(salonIds);
    }
    // Admins can see all or filter by salonId
    return this.appointmentsService.findAll(salonId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
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
        throw new ForbiddenException('You can only access your own appointments');
      }
    }
    
    // Salon owners and employees can only access appointments for their salon
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException('You can only access appointments for your own salon');
      }
    }
    
    return appointment;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Update an appointment' })
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    const appointment = await this.appointmentsService.findOne(id);
    
    // Salon owners and employees can only update appointments for their salon
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException('You can only update appointments for your own salon');
      }
    }
    
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Delete an appointment' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const appointment = await this.appointmentsService.findOne(id);
    
    // Salon owners and employees can only delete appointments for their salon
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salon = await this.salonsService.findOne(appointment.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException('You can only delete appointments for your own salon');
      }
    }
    
    return this.appointmentsService.remove(id);
  }
}

