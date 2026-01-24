import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { EmployeePermissionsService } from '../services/employee-permissions.service';
import { GrantEmployeePermissionDto } from '../dto/grant-employee-permission.dto';
import { RevokeEmployeePermissionDto } from '../dto/revoke-employee-permission.dto';
import { EmployeePermissionResponseDto } from '../dto/employee-permission-response.dto';
import { SalonsService } from '../salons.service';
import {
  EmployeePermission,
  getPermissionDescription,
} from '../../common/enums/employee-permission.enum';

@ApiTags('Employee Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salons/:salonId/employees/:employeeId/permissions')
export class EmployeePermissionsController {
  constructor(
    private readonly permissionsService: EmployeePermissionsService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Grant permissions to an employee' })
  @ApiParam({ name: 'salonId', description: 'Salon ID' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 201,
    description: 'Permissions granted successfully',
    type: [EmployeePermissionResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only salon owner can grant permissions',
  })
  @ApiResponse({ status: 404, description: 'Employee or salon not found' })
  async grantPermissions(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: GrantEmployeePermissionDto,
    @CurrentUser() user: any,
  ) {
    // Verify salon ownership (service will also check)
    await this.verifySalonOwnership(salonId, user.id);

    const permissions = await this.permissionsService.grantPermissions(
      salonId,
      employeeId,
      dto,
      user.id,
    );

    return {
      message: 'Permissions granted successfully',
      permissions,
    };
  }

  @Delete()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Revoke permissions from an employee' })
  @ApiParam({ name: 'salonId', description: 'Salon ID' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Permissions revoked successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only salon owner can revoke permissions',
  })
  @ApiResponse({ status: 404, description: 'Employee or salon not found' })
  async revokePermissions(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: RevokeEmployeePermissionDto,
    @CurrentUser() user: any,
  ) {
    await this.verifySalonOwnership(salonId, user.id);

    await this.permissionsService.revokePermissions(
      salonId,
      employeeId,
      dto,
      user.id,
    );

    return {
      message: 'Permissions revoked successfully',
    };
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all permissions for an employee' })
  @ApiParam({ name: 'salonId', description: 'Salon ID' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee permissions retrieved successfully',
    type: [EmployeePermissionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getEmployeePermissions(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: any,
  ) {
    // Owner can view any employee's permissions
    // Employee can only view their own permissions
    if (user.role === UserRole.SALON_EMPLOYEE) {
      const employee = await this.permissionsService.getEmployeeRecordByUserId(
        user.id,
        salonId,
      );
      if (!employee || employee.id !== employeeId) {
        throw new ForbiddenException('You can only view your own permissions');
      }
    }

    const permissions = await this.permissionsService.getEmployeePermissions(
      employeeId,
      salonId,
    );

    return {
      employeeId,
      salonId,
      permissions,
    };
  }

  private async verifySalonOwnership(salonId: string, userId: string) {
    const salon = await this.salonsService.findOne(salonId);
    if (salon.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only manage permissions for your own salon',
      );
    }
  }
}

/**
 * Additional controller for salon-level permission management
 */
@ApiTags('Employee Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salons/:salonId/employees/permissions')
export class SalonEmployeePermissionsController {
  constructor(
    private readonly permissionsService: EmployeePermissionsService,
    private readonly salonsService: SalonsService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get all employees with their permissions' })
  @ApiParam({ name: 'salonId', description: 'Salon ID' })
  @ApiResponse({
    status: 200,
    description: 'Employees with permissions retrieved successfully',
  })
  async getEmployeesWithPermissions(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    await this.verifySalonOwnership(salonId, user.id);

    const employees =
      await this.permissionsService.getEmployeesWithPermissions(salonId);

    return {
      salonId,
      employees,
    };
  }

  @Get('me')
  @Roles(UserRole.SALON_EMPLOYEE, UserRole.SALON_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get permissions for the current user in this salon',
  })
  @ApiParam({ name: 'salonId', description: 'Salon ID' })
  async getMyPermissions(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    // If owner, return all permissions (conceptually) or handle specially
    // But for now, primarily for employees
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SUPER_ADMIN
    ) {
      // Owners have all permissions implicitly, but frontend might expect a list.
      // We'll return a special flag or all permission enums.
      return {
        salonId,
        permissions: Object.values(EmployeePermission),
        isOwner: true,
      };
    }

    const employee = await this.permissionsService.getEmployeeRecordByUserId(
      user.id,
      salonId,
    );

    if (!employee) {
      throw new ForbiddenException('You are not an employee of this salon');
    }

    const permissions = await this.permissionsService.getEmployeePermissions(
      employee.id,
      salonId,
    );

    return {
      salonId,
      employeeId: employee.id,
      permissions,
      isOwner: false,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get list of available permissions' })
  @ApiResponse({
    status: 200,
    description: 'Available permissions retrieved successfully',
  })
  async getAvailablePermissions() {
    // Return all available permission codes with descriptions
    const permissions = Object.values(EmployeePermission).map((code) => ({
      code,
      description: getPermissionDescription(code),
    }));

    return {
      permissions,
    };
  }

  private async verifySalonOwnership(salonId: string, userId: string) {
    const salon = await this.salonsService.findOne(salonId);
    if (salon.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only manage permissions for your own salon',
      );
    }
  }
}
