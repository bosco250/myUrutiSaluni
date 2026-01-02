import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { EmployeePermissionGuard } from '../guards/employee-permission.guard';

export const PERMISSION_KEY = 'employeePermission';
export const PERMISSIONS_KEY = 'employeePermissions';
export const PERMISSION_MODE_KEY = 'permissionMode';

/**
 * Decorator to require a specific employee permission
 *
 * Usage:
 * @RequireEmployeePermission(EmployeePermission.MANAGE_APPOINTMENTS)
 * @Post()
 * createAppointment() { ... }
 */
export const RequireEmployeePermission = (permission: EmployeePermission) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Full decorator that applies all guards automatically
 *
 * Usage:
 * @RequirePermission(EmployeePermission.MANAGE_APPOINTMENTS)
 * @Post()
 * createAppointment() { ... }
 */
export const RequirePermission = (permission: EmployeePermission) => {
  return applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard),
  );
};

/**
 * Decorator for requiring ANY of multiple permissions
 * User needs at least one of the listed permissions
 *
 * Usage:
 * @RequireAnyPermission(
 *   EmployeePermission.MANAGE_APPOINTMENTS,
 *   EmployeePermission.VIEW_ALL_APPOINTMENTS
 * )
 * @Get()
 * getAppointments() { ... }
 */
export const RequireAnyPermission = (...permissions: EmployeePermission[]) => {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_MODE_KEY, 'any'),
    UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard),
  );
};

/**
 * Decorator for requiring ALL of multiple permissions
 * User needs every listed permission
 *
 * Usage:
 * @RequireAllPermissions(
 *   EmployeePermission.MANAGE_APPOINTMENTS,
 *   EmployeePermission.PROCESS_PAYMENTS
 * )
 * @Post()
 * createPaidAppointment() { ... }
 */
export const RequireAllPermissions = (...permissions: EmployeePermission[]) => {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_MODE_KEY, 'all'),
    UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard),
  );
};

/**
 * Decorator to mark an endpoint as requiring employee role but no specific permission
 * Useful for endpoints that any employee can access
 *
 * Usage:
 * @RequireEmployeeRole()
 * @Get('my-profile')
 * getMyProfile() { ... }
 */
export const RequireEmployeeRole = () => {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard),
  );
};
