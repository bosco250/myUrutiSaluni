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
import { ServicePackagesService } from './service-packages.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Service Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-packages')
export class ServicePackagesController {
  constructor(
    private readonly servicePackagesService: ServicePackagesService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Create a new service package' })
  async create(
    @Body() createDto: CreateServicePackageDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only create packages for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      // Get salon from first service or require salonId in DTO
      if (createDto.serviceIds && createDto.serviceIds.length > 0) {
        // We'll need to get salonId from the service
        // For now, we'll add salonId to the DTO
      }
    }

    const salonId = createDto.salonId;

    // Verify salon ownership
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create packages for your own salon',
        );
      }
    }

    return this.servicePackagesService.create(salonId, createDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all service packages' })
  async findAll(@Query('salonId') salonId: string, @CurrentUser() user: any) {
    // Salon owners and employees can only see packages for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access packages for your own salon',
        );
      }
      // Return packages for all user's salons
      const allPackages = await Promise.all(
        salonIds.map((id) => this.servicePackagesService.findAll(id)),
      );
      return allPackages.flat();
    }

    return this.servicePackagesService.findAll(salonId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get a service package by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const packageEntity = await this.servicePackagesService.findOne(id);

    // Salon owners and employees can only see packages for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(packageEntity.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access packages for your own salon',
        );
      }
    }

    return packageEntity;
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Update a service package' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServicePackageDto,
    @CurrentUser() user: any,
  ) {
    const packageEntity = await this.servicePackagesService.findOne(id);

    // Salon owners and employees can only update packages for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(packageEntity.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only update packages for your own salon',
        );
      }
    }

    return this.servicePackagesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Delete a service package' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const packageEntity = await this.servicePackagesService.findOne(id);

    // Salon owners and employees can only delete packages for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(packageEntity.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only delete packages for your own salon',
        );
      }
    }

    await this.servicePackagesService.remove(id);
  }
}
