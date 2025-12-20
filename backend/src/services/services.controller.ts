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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
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
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create services for your own salon',
        );
      }
    }
    return this.servicesService.create(createServiceDto);
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
  @ApiOperation({ summary: 'Get all services' })
  async findAll(
    @Query('salonId') salonId: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see services for their salon(s)
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
    // Customers and admins can see all or filter by salonId
    return this.servicesService.findAll(salonId);
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
  @ApiOperation({ summary: 'Get a service by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const service = await this.servicesService.findOne(id);

    // Salon owners and employees can only access services for their salon
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
      // Employees can update services for salons they work at
      else if (user.role === UserRole.SALON_EMPLOYEE) {
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          service.salonId,
        );
        if (!isEmployee) {
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
