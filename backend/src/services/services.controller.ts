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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeePermissionGuard } from '../auth/guards/employee-permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequireEmployeePermission } from '../auth/decorators/require-employee-permission.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SalonsService } from '../salons/salons.service';
import { EmployeePermissionsService } from '../salons/services/employee-permissions.service';
import { EmployeePermission } from '../common/enums/employee-permission.enum';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard)
@Controller('services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly salonsService: SalonsService,
    private readonly employeePermissionsService: EmployeePermissionsService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequireEmployeePermission(EmployeePermission.MANAGE_SERVICES)
  @ApiOperation({ summary: 'Create a new service' })
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only create services for their salon
    if (
      (user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE) &&
      createServiceDto.salonId
    ) {
      const salon = await this.salonsService.findOne(createServiceDto.salonId);

      // Salon owners can always create
      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only create services for your own salon',
          );
        }
      } else if (user.role === UserRole.SALON_EMPLOYEE) {
        // Employees need MANAGE_SERVICES permission
        const employee =
          await this.employeePermissionsService.getEmployeeRecordByUserId(
            user.id,
            createServiceDto.salonId,
          );
        if (employee) {
          const hasPermission =
            await this.employeePermissionsService.hasPermission(
              employee.id,
              createServiceDto.salonId,
              EmployeePermission.MANAGE_SERVICES,
            );
          if (!hasPermission) {
            throw new ForbiddenException(
              'You do not have permission to manage services. Please contact your salon owner.',
            );
          }
        } else {
          throw new ForbiddenException(
            'You can only create services for salons you work at',
          );
        }
      }
    }
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all services (Public)' })
  async findAll(
    @Query('salonId') salonId: string | undefined,
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    const isBrowseMode = browse === 'true';
    const userRole = user?.role?.toLowerCase();
    const isAdmin =
      userRole === 'super_admin' || userRole === 'association_admin';

    // For public / browse requests: if a salonId is given, verify the salon is active.
    // Non-active salons are invisible to the public — return empty rather than leak data.
    // Owner and employees of the salon can always see their own services regardless of status.
    if (salonId && !isAdmin) {
      const salon = await this.salonsService.findOne(salonId);
      if (salon.status !== 'active') {
        const isOwner = salon.ownerId === user?.id;
        const isEmployee = user ? await this.salonsService.isUserEmployeeOfSalon(user.id, salonId) : false;
        if (!isOwner && !isEmployee) {
          return [];
        }
      }
    }

    if (!user) {
      return this.servicesService.findAll(salonId);
    }

    // Customers can see services for active salons only (guard above already checked)
    if (userRole === UserRole.CUSTOMER || userRole === 'customer') {
      return this.servicesService.findAll(salonId);
    }

    // Salon owners can browse all services when in browse mode (for booking themselves)
    if (user.role === UserRole.SALON_OWNER && isBrowseMode) {
      return this.servicesService.findAll(salonId);
    }

    // Salon employees can browse all services when in browse mode
    if (user.role === UserRole.SALON_EMPLOYEE && isBrowseMode) {
      return this.servicesService.findAll(salonId);
    }

    // Salon owners and employees (in management mode) can only see services for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      // Get salons owned by user
      const ownedSalons = await this.salonsService.findByOwnerId(user.id);
      const ownedSalonIds = ownedSalons.map((s) => s.id);

      // Get salons where user works as employee
      const employeeRecords = await this.salonsService.findAllEmployeesByUserId(
        user.id,
      );
      const employeeSalonIds = employeeRecords.map((emp) => emp.salonId);

      // Combine both lists
      const accessibleSalonIds = [
        ...new Set([...ownedSalonIds, ...employeeSalonIds]),
      ];

      if (salonId && !accessibleSalonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access services for salons you own or work at',
        );
      }
      return this.servicesService.findBySalonIds(accessibleSalonIds);
    }
    // Admins and district leaders can see all or filter by salonId
    return this.servicesService.findAll(salonId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a service by ID (Public)' })
  async findOne(
    @Param('id') id: string,
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    const service = await this.servicesService.findOne(id);
    if (!user) {
      return service;
    }

    const isBrowseMode = browse === 'true';

    // Customers can view any service (public browsing)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      return service;
    }

    // Employees can view any service when browsing
    if (user.role === UserRole.SALON_EMPLOYEE && isBrowseMode) {
      return service;
    }

    // Salon owners and employees (in management mode) can only access services for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(service.salonId);

      // Salon owners can access services for their own salons
      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only access services for your own salon',
          );
        }
      }
      // Employees can access services for salons they work at
      else if (user.role === UserRole.SALON_EMPLOYEE) {
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          service.salonId,
        );
        if (!isEmployee) {
          throw new ForbiddenException(
            'You can only access services for salons you work at',
          );
        }
      }
    }

    return service;
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequireEmployeePermission(EmployeePermission.MANAGE_SERVICES)
  @ApiOperation({ summary: 'Update a service' })
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUser() user: any,
  ) {
    const service = await this.servicesService.findOne(id);

    // Salon owners and employees can only update services for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(service.salonId);

      // Salon owners can update services for their own salons
      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only update services for your own salon',
          );
        }
      }
      // Employees need MANAGE_SERVICES permission
      else if (user.role === UserRole.SALON_EMPLOYEE) {
        const employee =
          await this.employeePermissionsService.getEmployeeRecordByUserId(
            user.id,
            service.salonId,
          );
        if (employee) {
          const hasPermission =
            await this.employeePermissionsService.hasPermission(
              employee.id,
              service.salonId,
              EmployeePermission.MANAGE_SERVICES,
            );
          if (!hasPermission) {
            throw new ForbiddenException(
              'You do not have permission to manage services. Please contact your salon owner.',
            );
          }
        } else {
          throw new ForbiddenException(
            'You can only update services for salons you work at',
          );
        }
      }
    }

    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Delete a service' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const service = await this.servicesService.findOne(id);

    // Salon owners can only delete services for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(service.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only delete services for your own salon',
        );
      }
    }

    return this.servicesService.remove(id);
  }
}
