import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
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
import { SalonCustomerService } from '../customers/salon-customer.service';
import { CustomerCommunicationService } from '../customers/customer-communication.service';
import { RewardsConfigService } from '../customers/rewards-config.service';
import { Response } from 'express';
import { RequirePermission } from '../auth/decorators/require-employee-permission.decorator';
import { EmployeePermission } from '../common/enums/employee-permission.enum';

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salons')
export class SalonsController {
  private readonly logger = new Logger(SalonsController.name);

  constructor(
    private readonly salonsService: SalonsService,
    private readonly membershipsService: MembershipsService,
    private readonly salonCustomerService: SalonCustomerService,
    private readonly communicationService: CustomerCommunicationService,
    private readonly rewardsConfigService: RewardsConfigService,
  ) {}

  /**
   * Helper method to check if user has access to a salon
   */
  private async checkSalonAccess(salonId: string, user: any): Promise<void> {
    const salon = await this.salonsService.findOne(salonId);

    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      if (salon.ownerId !== user.id) {
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          salonId,
        );
        if (!isEmployee) {
          throw new ForbiddenException(
            'You can only access resources for your own salon',
          );
        }
      }
    }
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Create a new salon' })
  async create(
    @Body() createSalonDto: CreateSalonDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners can only create salons for themselves
    if (
      user.role === UserRole.SALON_OWNER &&
      createSalonDto.ownerId !== user.id
    ) {
      throw new ForbiddenException('You can only create salons for yourself');
    }

    // Check membership status for salon owners (admins can bypass)
    if (user.role === UserRole.SALON_OWNER) {
      const membershipStatus =
        await this.membershipsService.checkMembershipStatus(user.id);
      if (!membershipStatus.isMember) {
        throw new BadRequestException(
          'You must be an approved member of the association to create salons. Please apply for membership first.',
        );
      }
    }

    return this.salonsService.create(createSalonDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get all salons' })
  async findAll(
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    const isBrowseMode = browse === 'true';

    // Customers can see all active salons (public browsing)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      return this.salonsService.findAll(); // Return all salons for customers to browse
    }

    // Salon employees can browse all salons when in browse mode
    if (user.role === UserRole.SALON_EMPLOYEE && isBrowseMode) {
      return this.salonsService.findAll(); // Return all salons for employees to browse
    }

    // Salon owners and employees (in management mode) can only see their own salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      return this.salonsService.findSalonsForUser(user.id);
    }

    // Admins and district leaders can see all salons
    return this.salonsService.findAll();
  }

  // ==================== Specific Routes (MUST come before :id route) ====================

  @Get('employees/by-user/:userId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all employee records for a user by user ID' })
  async getEmployeeRecordsByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    // Users can only view their own employee records unless they're admin
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.ASSOCIATION_ADMIN &&
      user.role !== UserRole.DISTRICT_LEADER &&
      user.id !== userId
    ) {
      throw new ForbiddenException(
        'You can only view your own employee records',
      );
    }

    const employees = await this.salonsService.findAllEmployeesByUserId(userId);
    return employees || [];
  }

  @Get(':id/employees/me')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get current user employee record for a salon' })
  async getMyEmployeeRecord(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user has access to this salon (owner or employee)
    await this.checkSalonAccess(salonId, user);

    // Find employee record
    const employee = await this.salonsService.findEmployeeByUserId(
      user.id,
      salonId,
    );

    if (!employee) {
      // If owner but not employee record, return null or appropriate response
      // Owners might not be in employees table
      if (user.role === UserRole.SALON_OWNER) {
        return null;
      }
      throw new NotFoundException('Employee record not found for this salon');
    }

    return employee;
  }

  @Get(':id/employees')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get salon employees' })
  async getEmployees(
    @Param('id') id: string,
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const salon = await this.salonsService.findOne(id);
      const isBrowseMode = browse === 'true';

      // Customers can view employees for booking purposes (public browsing)
      if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
        // Return only active employees for customers
        const allEmployees = await this.salonsService.getSalonEmployees(id);
        return allEmployees.filter((emp: any) => emp.isActive !== false);
      }

      // Salon employees can view employees of any salon when browsing (similar to customers)
      if (user.role === UserRole.SALON_EMPLOYEE && isBrowseMode) {
        const allEmployees = await this.salonsService.getSalonEmployees(id);
        return allEmployees.filter((emp: any) => emp.isActive !== false);
      }

      // Salon owners and employees (in management mode) can only see employees of their own salon
      if (
        user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE
      ) {
        // Check if user owns the salon
        const ownsSalon = salon.ownerId === user.id;

        // If not owner, check if user is an employee of this salon
        if (!ownsSalon) {
          const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
            user.id,
            id,
          );
          if (!isEmployee) {
            throw new ForbiddenException(
              'You can only access employees of your own salon',
            );
          }
        }
      }

      return await this.salonsService.getSalonEmployees(id);
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      // Log unexpected errors
      this.logger.error(
        `Error fetching salon employees for salon ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch salon employees');
    }
  }

  // ==================== Customer Management Endpoints ====================
  // Note: More specific routes must come before generic routes

  @Post(':id/customers/sync')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary: 'Sync salon-customer records from existing sales and appointments',
  })
  async syncSalonCustomers(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.syncFromExistingData(salonId);
  }

  @Post(':id/customers/recalculate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary:
      'Recalculate customer statistics from sales and appointments for accurate data',
  })
  async recalculateCustomerData(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.recalculateCustomerData(salonId);
  }

  @Get(':id/customers/analytics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get customer analytics for a salon' })
  async getSalonCustomerAnalytics(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.getSalonCustomerAnalytics(salonId);
  }

  @Get(':id/customers/export')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Export salon customers to CSV' })
  async exportCustomers(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    const csvContent =
      await this.salonCustomerService.exportCustomersToCSV(salonId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=salon-customers-${salonId}-${Date.now()}.csv`,
    );
    res.send(csvContent);
  }

  // Specific customer routes MUST come before generic :id/customers route
  @Get(':id/customers/:customerId/timeline')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary:
      'Get customer activity timeline for a specific customer at a salon',
  })
  async getCustomerTimeline(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.getCustomerActivityTimeline(
      salonId,
      customerId,
    );
  }

  @Get(':id/customers/:customerId/communications')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get communication history for a customer' })
  async getCustomerCommunications(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.communicationService.findByCustomer(salonId, customerId);
  }

  @Get(':id/customers/:customerId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get a specific customer for a salon' })
  async getSalonCustomer(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    const salonCustomer =
      await this.salonCustomerService.findBySalonAndCustomer(
        salonId,
        customerId,
      );
    if (!salonCustomer) {
      throw new NotFoundException('Customer not found for this salon');
    }
    return salonCustomer;
  }

  @Get(':id/customers')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary: 'Get all customers for a salon with filtering and pagination',
  })
  async getSalonCustomers(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('minVisits') minVisits?: string,
    @Query('minSpent') minSpent?: string,
    @Query('daysSinceLastVisit') daysSinceLastVisit?: string,
    @Query('sortBy')
    sortBy?: 'lastVisit' | 'totalSpent' | 'visitCount' | 'name',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.checkSalonAccess(salonId, user);
    const tagsArray = tags ? tags.split(',') : undefined;

    return this.salonCustomerService.findBySalonId(salonId, {
      search,
      tags: tagsArray,
      minVisits: minVisits ? parseInt(minVisits, 10) : undefined,
      minSpent: minSpent ? parseFloat(minSpent) : undefined,
      daysSinceLastVisit: daysSinceLastVisit
        ? parseInt(daysSinceLastVisit, 10)
        : undefined,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/customers/:customerId/tags')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Add tags to a customer' })
  async addCustomerTags(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() body: { tags: string[] },
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.addTags(salonId, customerId, body.tags);
  }

  @Delete(':id/customers/:customerId/tags')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Remove tags from a customer' })
  async removeCustomerTags(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() body: { tags: string[] },
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.salonCustomerService.removeTags(salonId, customerId, body.tags);
  }

  // ==================== Rewards Configuration ====================

  @Get(':id/rewards-config')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get rewards configuration for a salon' })
  async getRewardsConfig(
    @Param('id', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.rewardsConfigService.getOrCreate(salonId);
  }

  @Patch(':id/rewards-config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Update rewards configuration for a salon' })
  async updateRewardsConfig(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Body()
    updateData: {
      pointsPerCurrencyUnit?: number;
      redemptionRate?: number;
      minRedemptionPoints?: number;
      pointsExpirationDays?: number | null;
      vipThresholdPoints?: number;
    },
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.rewardsConfigService.update(salonId, updateData);
  }

  @Patch(':id/customers/:customerId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary:
      'Update salon-specific customer data (tags, notes, preferences, etc.)',
  })
  async updateSalonCustomer(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body()
    updateData: {
      tags?: string[];
      notes?: string;
      preferences?: Record<string, any>;
      birthday?: string;
      anniversaryDate?: string;
      followUpDate?: string;
      communicationPreferences?: Record<string, any>;
    },
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    const processedData: any = { ...updateData };
    if (processedData.birthday) {
      processedData.birthday = new Date(processedData.birthday);
    }
    if (processedData.anniversaryDate) {
      processedData.anniversaryDate = new Date(processedData.anniversaryDate);
    }
    if (processedData.followUpDate) {
      processedData.followUpDate = new Date(processedData.followUpDate);
    }
    return this.salonCustomerService.update(salonId, customerId, processedData);
  }

  @Post(':id/customers/:customerId/communications')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Record a communication with a customer' })
  async createCommunication(
    @Param('id', ParseUUIDPipe) salonId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body()
    body: {
      type: 'sms' | 'email' | 'phone' | 'in_app';
      purpose: string;
      subject: string;
      message?: string;
      recipient?: string;
    },
    @CurrentUser() user: any,
  ) {
    await this.checkSalonAccess(salonId, user);
    return this.communicationService.create({
      salonId,
      customerId,
      sentById: user.id,
      type: body.type as any,
      purpose: body.purpose as any,
      subject: body.subject,
      message: body.message,
      recipient: body.recipient,
    });
  }

  // ==================== Generic Routes (MUST come after specific routes) ====================

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get a salon by ID' })
  async findOne(
    @Param('id') id: string,
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(id);
    const isBrowseMode = browse === 'true';
    const userRole = user.role?.toLowerCase();

    // Customers can view any salon (public browsing)
    if (userRole === UserRole.CUSTOMER || userRole === 'customer') {
      return salon; // Allow customers to view salon details
    }

    // Salon employees can view any salon when browsing (similar to customers)
    if (
      (userRole === UserRole.SALON_EMPLOYEE || userRole === 'salon_employee') &&
      isBrowseMode
    ) {
      return salon; // Allow employees to browse other salons
    }

    // Salon owners and employees (in management mode) can only access their own salon
    if (
      (userRole === UserRole.SALON_OWNER ||
        userRole === 'salon_owner' ||
        userRole === UserRole.SALON_EMPLOYEE ||
        userRole === 'salon_employee') &&
      salon.ownerId !== user.id
    ) {
      // For employees, also check if they work at this salon
      if (
        userRole === UserRole.SALON_EMPLOYEE ||
        userRole === 'salon_employee'
      ) {
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          id,
        );
        if (isEmployee) {
          return salon; // Allow employees to access their own salon details
        }
      }
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

  @Post(':id/employees')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequirePermission(EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES)
  @ApiOperation({ summary: 'Add an employee to a salon' })
  async addEmployee(
    @Param('id') salonId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);

    // Salon owners can only add employees to their own salon
    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException(
        'You can only add employees to your own salon',
      );
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
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequirePermission(EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES)
  @ApiOperation({ summary: 'Update an employee' })
  async updateEmployee(
    @Param('id') salonId: string,
    @Param('employeeId') employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);

    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException(
        'You can only update employees of your own salon',
      );
    }

    // Convert hireDate string to Date if provided
    const employeeData: any = { ...updateEmployeeDto };
    if (employeeData.hireDate) {
      employeeData.hireDate = new Date(employeeData.hireDate);
    }

    return this.salonsService.updateEmployee(employeeId, employeeData);
  }

  @Delete(':id/employees/:employeeId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequirePermission(EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES)
  @ApiOperation({ summary: 'Remove an employee from a salon' })
  async removeEmployee(
    @Param('id') salonId: string,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: any,
  ) {
    const salon = await this.salonsService.findOne(salonId);

    if (user.role === UserRole.SALON_OWNER && salon.ownerId !== user.id) {
      throw new ForbiddenException(
        'You can only remove employees from your own salon',
      );
    }

    return this.salonsService.removeEmployee(employeeId);
  }
}
