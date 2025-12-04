import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalonsService } from './salons.service';
import { MembershipsService } from '../memberships/memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salons')
export class SalonsController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Create a new salon' })
  async create(@Body() createSalonDto: CreateSalonDto, @CurrentUser() user: any) {
    // Salon owners can only create salons for themselves
    if (user.role === UserRole.SALON_OWNER && createSalonDto.ownerId !== user.id) {
      throw new ForbiddenException('You can only create salons for yourself');
    }

    // Check membership status for salon owners (admins can bypass)
    if (user.role === UserRole.SALON_OWNER) {
      const membershipStatus = await this.membershipsService.checkMembershipStatus(user.id);
      if (!membershipStatus.isMember) {
        throw new BadRequestException(
          'You must be an approved member of the association to create salons. Please apply for membership first.'
        );
      }
    }

    return this.salonsService.create(createSalonDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get all salons' })
  async findAll(@CurrentUser() user: any) {
    // Customers can see all active salons (public browsing)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      return this.salonsService.findAll(); // Return all salons for customers to browse
    }
    // Salon owners and employees can only see their own salon(s)
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      return this.salonsService.findByOwnerId(user.id);
    }
    // Admins and district leaders can see all salons
    return this.salonsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get a salon by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const salon = await this.salonsService.findOne(id);
    
    // Customers can view any salon (public browsing)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      return salon; // Allow customers to view salon details
    }
    
    // Salon owners and employees can only access their own salon
    if (
      (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) &&
      salon.ownerId !== user.id
    ) {
      throw new ForbiddenException('You can only access your own salon');
    }
    
    return salon;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Update a salon' })
  async update(
    @Param('id') id: string,
    @Body() updateSalonDto: UpdateSalonDto,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(id);
    
    // Salon owners can only update their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException('You can only update your own salon');
    }
    
    return this.salonsService.update(id, updateSalonDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Delete a salon' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const salon = await this.salonsService.findOne(id);
    
    // Salon owners can only delete their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException('You can only delete your own salon');
    }
    
    return this.salonsService.remove(id);
  }

  @Get(':id/employees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get salon employees' })
  async getEmployees(@Param('id') id: string, @CurrentUser() user: any) {
    try {
      const salon = await this.salonsService.findOne(id);
      
      // Salon owners and employees can only see employees of their own salon
      if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
        // Check if user owns the salon
        const ownsSalon = salon.ownerId === user.id;
        
        // If not owner, check if user is an employee of this salon
        if (!ownsSalon) {
          const isEmployee = await this.salonsService.isUserEmployeeOfSalon(user.id, id);
          if (!isEmployee) {
            throw new ForbiddenException('You can only access employees of your own salon');
          }
        }
      }
      
      return await this.salonsService.getSalonEmployees(id);
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      // Log unexpected errors
      console.error('Error fetching salon employees:', error);
      throw new BadRequestException('Failed to fetch salon employees');
    }
  }

  @Post(':id/employees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Add an employee to a salon' })
  async addEmployee(
    @Param('id') salonId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);
    
    // Salon owners can only add employees to their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException('You can only add employees to your own salon');
    }
    
    // Ensure the salonId in the DTO matches the URL parameter
    createEmployeeDto.salonId = salonId;
    
    // Convert hireDate string to Date if provided
    const employeeData: any = { ...createEmployeeDto };
    if (employeeData.hireDate) {
      employeeData.hireDate = new Date(employeeData.hireDate);
    }
    
    return this.salonsService.addEmployee(employeeData);
  }

  @Patch(':id/employees/:employeeId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Update an employee' })
  async updateEmployee(
    @Param('id') salonId: string,
    @Param('employeeId') employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);
    
    // Salon owners can only update employees of their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException('You can only update employees of your own salon');
    }
    
    // Convert hireDate string to Date if provided
    const employeeData: any = { ...updateEmployeeDto };
    if (employeeData.hireDate) {
      employeeData.hireDate = new Date(employeeData.hireDate);
    }
    
    return this.salonsService.updateEmployee(employeeId, employeeData);
  }

  @Delete(':id/employees/:employeeId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Remove an employee from a salon' })
  async removeEmployee(
    @Param('id') salonId: string,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);
    
    // Salon owners can only remove employees from their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException('You can only remove employees from your own salon');
    }
    
    return this.salonsService.removeEmployee(employeeId);
  }
}

