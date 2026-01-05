import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EmployeePermission,
  getPermissionDescription,
} from '../../common/enums/employee-permission.enum';
import { UserRole } from '../../users/entities/user.entity';
import { EmployeePermissionsService } from '../../salons/services/employee-permissions.service';
import { SalonIdResolverService } from '../../common/services/salon-id-resolver.service';

/**
 * Structured error response for permission denials
 */
interface PermissionError {
  code: string;
  message: string;
  action?: string;
  permission?: string;
  permissionDescription?: string;
  salonId?: string;
  availableSalons?: { salonId: string; salonName: string }[];
}

/**
 * Guard that checks if an employee has a specific permission
 *
 * This guard works alongside RolesGuard to provide granular permission checking.
 * Owners and admins bypass permission checks (they have full access).
 * Employees must have the required permission granted by the salon owner.
 *
 * Features:
 * - Multi-source salonId resolution
 * - Actionable error messages
 * - Support for single and multiple permissions
 */
@Injectable()
export class EmployeePermissionGuard implements CanActivate {
  private readonly logger = new Logger(EmployeePermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: EmployeePermissionsService,
    private salonIdResolver: SalonIdResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permission(s) from decorator
    const requiredPermission = this.reflector.get<EmployeePermission>(
      'employeePermission',
      context.getHandler(),
    );
    const requiredPermissions = this.reflector.get<EmployeePermission[]>(
      'employeePermissions',
      context.getHandler(),
    );
    const permissionMode =
      this.reflector.get<'any' | 'all'>(
        'permissionMode',
        context.getHandler(),
      ) || 'any';

    // If no permission is required, allow access
    if (
      !requiredPermission &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        this.createError({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required to access this resource.',
          action: 'LOGIN',
        }),
      );
    }

    // Owners and admins always have access (bypass permission check)
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ASSOCIATION_ADMIN ||
      user.role === UserRole.SALON_OWNER
    ) {
      return true;
    }

    // For employees, perform full permission check
    if (user.role === UserRole.SALON_EMPLOYEE) {
      return this.checkEmployeePermission(
        request,
        user,
        requiredPermission,
        requiredPermissions,
        permissionMode,
      );
    }

    // Customers bypass employee permission checks - they have their own role-based access
    // The controller will handle customer-specific authorization (e.g., can only book for themselves)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      return true;
    }

    // For other roles, deny access
    const permissionToShow =
      requiredPermission || (requiredPermissions && requiredPermissions[0]);
    throw new ForbiddenException(
      this.createError({
        code: 'ACCESS_DENIED',
        message: `This action requires employee access with the "${this.formatPermissionName(permissionToShow)}" permission.`,
        permission: permissionToShow,
      }),
    );
  }

  /**
   * Check employee permission with full salonId resolution
   */
  private async checkEmployeePermission(
    request: any,
    user: any,
    requiredPermission: EmployeePermission | undefined,
    requiredPermissions: EmployeePermission[] | undefined,
    permissionMode: 'any' | 'all',
  ): Promise<boolean> {
    // Resolve salonId using fallback chain
    const resolution = await this.salonIdResolver.resolveSalonId(request, user);

    if (!resolution.salonId) {
      // Get available salons for the error message
      const employeeSalons = await this.salonIdResolver.getEmployeeSalons(
        user.id,
      );

      throw new ForbiddenException(
        this.createError({
          code: 'SALON_ID_REQUIRED',
          message:
            'Unable to determine salon context. Please select a salon or access this feature from within a salon.',
          action: 'SELECT_SALON',
          availableSalons: employeeSalons.map((e) => ({
            salonId: e.salonId,
            salonName: e.salon?.name || 'Unknown',
          })),
        }),
      );
    }

    const salonId = resolution.salonId;

    // Attach resolved salonId to request for downstream controllers
    request.resolvedSalonId = salonId;
    request.salonIdSource = resolution.source;

    // Get employee record
    const employee = await this.permissionsService.getEmployeeRecordByUserId(
      user.id,
      salonId,
    );

    if (!employee) {
      // Check if user is employee in other salons
      const otherSalons = await this.salonIdResolver.getEmployeeSalons(user.id);
      const otherSalonNames = otherSalons
        .filter((e) => e.salonId !== salonId)
        .map((e) => e.salon?.name || 'Unknown');

      let message = `You are not registered as an employee for this salon.`;
      if (otherSalonNames.length > 0) {
        message += ` You are registered at: ${otherSalonNames.join(', ')}.`;
      }

      throw new ForbiddenException(
        this.createError({
          code: 'EMPLOYEE_NOT_FOUND',
          message,
          action: 'CONTACT_OWNER',
          salonId,
          availableSalons: otherSalons.map((e) => ({
            salonId: e.salonId,
            salonName: e.salon?.name || 'Unknown',
          })),
        }),
      );
    }

    // Attach employee record to request
    request.employeeRecord = employee;

    // Check permission(s)
    const permissionsToCheck =
      requiredPermissions && requiredPermissions.length > 0
        ? requiredPermissions
        : requiredPermission
          ? [requiredPermission]
          : [];

    if (permissionsToCheck.length === 0) {
      return true;
    }

    // Check permissions based on mode
    let hasRequiredPermission = false;
    const missingPermissions: EmployeePermission[] = [];

    for (const permission of permissionsToCheck) {
      const hasPerm = await this.permissionsService.hasPermission(
        employee.id,
        salonId,
        permission,
      );

      if (hasPerm) {
        if (permissionMode === 'any') {
          hasRequiredPermission = true;
          break;
        }
      } else {
        missingPermissions.push(permission);
      }
    }

    if (permissionMode === 'all') {
      hasRequiredPermission = missingPermissions.length === 0;
    }

    if (!hasRequiredPermission) {
      const permissionToReport = missingPermissions[0] || permissionsToCheck[0];

      throw new ForbiddenException(
        this.createError({
          code: 'PERMISSION_DENIED',
          message: `You need the "${this.formatPermissionName(permissionToReport)}" permission to perform this action.`,
          permission: permissionToReport,
          permissionDescription: getPermissionDescription(permissionToReport),
          action: 'REQUEST_PERMISSION',
          salonId,
        }),
      );
    }

    this.logger.debug(
      `✅ Permission check passed for user ${user.id} - Permission: ${permissionsToCheck.join(', ')} in salon ${salonId}`,
    );

    return true;
  }

  /**
   * Create structured error object
   */
  private createError(error: PermissionError): PermissionError {
    return error;
  }

  /**
   * Format permission code to human-readable name
   */
  private formatPermissionName(
    permission: EmployeePermission | undefined,
  ): string {
    if (!permission) return 'Unknown';
    return permission
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
