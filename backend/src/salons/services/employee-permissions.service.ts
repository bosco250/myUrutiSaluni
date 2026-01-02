import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EmployeePermissionEntity } from '../entities/employee-permission.entity';
import { SalonEmployee } from '../entities/salon-employee.entity';
import { Salon } from '../entities/salon.entity';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';
import { GrantEmployeePermissionDto } from '../dto/grant-employee-permission.dto';
import { RevokeEmployeePermissionDto } from '../dto/revoke-employee-permission.dto';
import { NotificationOrchestratorService } from '../../notifications/services/notification-orchestrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../notifications/entities/notification.entity';
import { getPermissionDescription } from '../../common/enums/employee-permission.enum';
import { PermissionGateway } from '../gateways/permission.gateway';

@Injectable()
export class EmployeePermissionsService {
  private readonly logger = new Logger(EmployeePermissionsService.name);

  constructor(
    @InjectRepository(EmployeePermissionEntity)
    private permissionRepository: Repository<EmployeePermissionEntity>,
    @InjectRepository(SalonEmployee)
    private salonEmployeeRepository: Repository<SalonEmployee>,
    @InjectRepository(Salon)
    private salonRepository: Repository<Salon>,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
    @Optional()
    @Inject(forwardRef(() => PermissionGateway))
    private permissionGateway?: PermissionGateway,
  ) {}

  /**
   * Grant permissions to an employee
   */
  async grantPermissions(
    salonId: string,
    employeeId: string,
    dto: GrantEmployeePermissionDto,
    grantedBy: string,
  ): Promise<EmployeePermissionEntity[]> {
    // Validate employee exists and belongs to salon
    const employee = await this.salonEmployeeRepository.findOne({
      where: { id: employeeId, salonId },
      relations: ['salon'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found in this salon');
    }

    // Validate salon ownership
    const salon = await this.salonRepository.findOne({
      where: { id: salonId },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    if (salon.ownerId !== grantedBy) {
      throw new ForbiddenException(
        'Only salon owner can grant permissions to employees',
      );
    }

    // Validate permission codes
    this.validatePermissionCodes(dto.permissions);

    const grantedPermissions: EmployeePermissionEntity[] = [];

    for (const permissionCode of dto.permissions) {
      // Check if permission already exists and is active
      const existing = await this.permissionRepository.findOne({
        where: {
          salonEmployeeId: employeeId,
          salonId: salonId,
          permissionCode,
          isActive: true,
        },
      });

      if (existing) {
        // Permission already granted, skip
        continue;
      }

      // Revoke any inactive permission with same code (for re-granting)
      await this.permissionRepository.update(
        {
          salonEmployeeId: employeeId,
          salonId: salonId,
          permissionCode,
          isActive: false,
        },
        {
          revokedAt: new Date(),
          revokedBy: grantedBy,
        },
      );

      // Create new permission
      const permission = this.permissionRepository.create({
        salonEmployeeId: employeeId,
        salonId: salonId,
        permissionCode,
        grantedBy,
        grantedAt: new Date(),
        isActive: true,
        metadata: dto.metadata || {},
        notes: dto.notes || null,
      });

      const saved = await this.permissionRepository.save(permission);
      this.logger.log(
        `✅ Saved permission: ${permissionCode} for employee ${employeeId} in salon ${salonId}`,
      );
      grantedPermissions.push(saved);
    }

    this.logger.log(
      `📊 Total permissions granted: ${grantedPermissions.length} for employee ${employeeId} in salon ${salonId}`,
    );

    // Send notification to employee about granted permissions
    if (grantedPermissions.length > 0) {
      try {
        const employee = await this.salonEmployeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user', 'salon'],
        });

        if (employee?.user?.id) {
          const permissionNames = grantedPermissions.map((p) =>
            getPermissionDescription(p.permissionCode),
          );

          const permissionCodes = grantedPermissions.map(
            (p) => p.permissionCode,
          );

          this.logger.log(
            `Sending notification with permission codes: ${JSON.stringify(permissionCodes)}`,
          );

          // CRITICAL: Don't nest metadata! Pass custom fields directly in context
          // The orchestrator will extract them and put them in notification.metadata
          await this.notificationOrchestrator.notify(
            NotificationType.PERMISSION_GRANTED,
            {
              userId: employee.user.id,
              salonId: salonId,
              salonName: employee.salon?.name || 'Salon',
              permissions: permissionNames, // Human-readable for notification body
              // Custom fields that will be extracted by orchestrator
              employeeId: employeeId,
              grantedPermissions: permissionCodes, // ✅ Permission codes for navigation
              grantedBy: grantedBy,
            },
            {
              channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
              priority: 'high',
            },
          );

          this.logger.log(
            `Notification sent to employee ${employee.user.id} about ${grantedPermissions.length} granted permissions`,
          );

          // Emit real-time WebSocket event
          if (this.permissionGateway) {
            this.permissionGateway.notifyPermissionChange(employee.user.id, {
              type: 'granted',
              permissions: permissionCodes,
              salonId: salonId,
              salonName: employee.salon?.name,
              timestamp: new Date().toISOString(),
              grantedBy: grantedBy,
            });
          }
        }
      } catch (error) {
        // Don't fail the permission grant if notification fails
        this.logger.error(
          `Failed to send permission granted notification:`,
          error,
        );
      }
    }

    return grantedPermissions;
  }

  /**
   * Revoke permissions from an employee
   */
  async revokePermissions(
    salonId: string,
    employeeId: string,
    dto: RevokeEmployeePermissionDto,
    revokedBy: string,
  ): Promise<void> {
    // Validate employee exists and belongs to salon
    const employee = await this.salonEmployeeRepository.findOne({
      where: { id: employeeId, salonId },
      relations: ['salon'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found in this salon');
    }

    // Validate salon ownership
    const salon = await this.salonRepository.findOne({
      where: { id: salonId },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    if (salon.ownerId !== revokedBy) {
      throw new ForbiddenException(
        'Only salon owner can revoke permissions from employees',
      );
    }

    // Get permissions before revoking (for notification)
    const permissionsToRevoke = await this.permissionRepository.find({
      where: {
        salonEmployeeId: employeeId,
        salonId: salonId,
        permissionCode: In(dto.permissions),
        isActive: true,
      },
    });

    // Revoke permissions
    await this.permissionRepository.update(
      {
        salonEmployeeId: employeeId,
        salonId: salonId,
        permissionCode: In(dto.permissions),
        isActive: true,
      },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: revokedBy,
      },
    );

    // Send notification to employee about revoked permissions
    if (permissionsToRevoke.length > 0) {
      try {
        const employee = await this.salonEmployeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user', 'salon'],
        });

        if (employee?.user?.id) {
          const permissionNames = permissionsToRevoke.map((p) =>
            getPermissionDescription(p.permissionCode),
          );

          const permissionCodes = permissionsToRevoke.map(
            (p) => p.permissionCode,
          );

          await this.notificationOrchestrator.notify(
            NotificationType.PERMISSION_REVOKED,
            {
              userId: employee.user.id,
              salonId: salonId,
              salonName: employee.salon?.name || 'Salon',
              permissions: permissionNames,
              metadata: {
                employeeId: employeeId,
                revokedPermissions: permissionCodes,
                revokedBy: revokedBy,
              },
            },
            {
              channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
              priority: 'high',
            },
          );

          this.logger.log(
            `Notification sent to employee ${employee.user.id} about ${permissionsToRevoke.length} revoked permissions`,
          );

          // Emit real-time WebSocket event
          if (this.permissionGateway) {
            this.permissionGateway.notifyPermissionChange(employee.user.id, {
              type: 'revoked',
              permissions: permissionCodes,
              salonId: salonId,
              salonName: employee.salon?.name,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        // Don't fail the permission revoke if notification fails
        this.logger.error(
          `Failed to send permission revoked notification:`,
          error,
        );
      }
    }
  }

  /**
   * Get all permissions for an employee (active and inactive)
   */
  async getEmployeePermissions(
    employeeId: string,
    salonId: string,
  ): Promise<EmployeePermissionEntity[]> {
    this.logger.log(
      `🔍 Fetching permissions for employee: ${employeeId}, salon: ${salonId}`,
    );

    const permissions = await this.permissionRepository.find({
      where: {
        salonEmployeeId: employeeId,
        salonId: salonId,
      },
      relations: ['grantedByUser', 'revokedByUser'],
      order: { grantedAt: 'DESC' },
    });

    this.logger.log(
      `📊 Found ${permissions.length} permissions for employee ${employeeId} in salon ${salonId}`,
    );

    if (permissions.length === 0) {
      // Check if employee exists
      const employee = await this.salonEmployeeRepository.findOne({
        where: { id: employeeId, salonId },
      });

      if (!employee) {
        this.logger.warn(
          `⚠️ Employee ${employeeId} not found in salon ${salonId}`,
        );
      } else {
        this.logger.warn(
          `⚠️ No permissions found for employee ${employeeId} in salon ${salonId}. Employee exists but has no permissions.`,
        );

        // Check if there are any permissions for this employee in other salons
        const allPermissions = await this.permissionRepository.find({
          where: { salonEmployeeId: employeeId },
        });
        this.logger.log(
          `ℹ️ Employee has ${allPermissions.length} total permissions across all salons`,
        );
      }
    }

    return permissions;
  }

  /**
   * Get only active permissions for an employee
   */
  async getActiveEmployeePermissions(
    employeeId: string,
    salonId: string,
  ): Promise<EmployeePermissionEntity[]> {
    return this.permissionRepository.find({
      where: {
        salonEmployeeId: employeeId,
        salonId: salonId,
        isActive: true,
      },
      relations: ['grantedByUser'],
      order: { grantedAt: 'DESC' },
    });
  }

  /**
   * Check if employee has specific permission
   */
  async hasPermission(
    employeeId: string,
    salonId: string,
    permissionCode: EmployeePermission,
  ): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: {
        salonEmployeeId: employeeId,
        salonId: salonId,
        permissionCode,
        isActive: true,
      },
    });

    return !!permission;
  }

  /**
   * Get all employees with their permissions for a salon
   */
  async getEmployeesWithPermissions(salonId: string): Promise<any[]> {
    const employees = await this.salonEmployeeRepository.find({
      where: { salonId, isActive: true },
      relations: ['user'],
    });

    const employeesWithPermissions = await Promise.all(
      employees.map(async (employee) => {
        const permissions = await this.getActiveEmployeePermissions(
          employee.id,
          salonId,
        );
        return {
          ...employee,
          permissions: permissions.map((p) => ({
            code: p.permissionCode,
            grantedAt: p.grantedAt,
            grantedBy: p.grantedBy,
            notes: p.notes,
          })),
        };
      }),
    );

    return employeesWithPermissions;
  }

  /**
   * Get employee record by user ID and salon ID
   */
  async getEmployeeRecordByUserId(
    userId: string,
    salonId: string,
  ): Promise<SalonEmployee | null> {
    return this.salonEmployeeRepository.findOne({
      where: {
        userId: userId,
        salonId: salonId,
        isActive: true,
      },
    });
  }

  /**
   * Validate permission codes
   */
  private validatePermissionCodes(permissions: EmployeePermission[]): void {
    const validCodes = Object.values(EmployeePermission);
    const invalidCodes = permissions.filter((p) => !validCodes.includes(p));

    if (invalidCodes.length > 0) {
      throw new BadRequestException(
        `Invalid permission codes: ${invalidCodes.join(', ')}`,
      );
    }
  }

  /**
   * Get employee record with fallback logic
   * Returns the exact match plus all other employee records for context
   */
  async getEmployeeRecordByUserIdWithFallback(
    userId: string,
    salonId: string,
  ): Promise<{ employee: SalonEmployee | null; allRecords: SalonEmployee[] }> {
    // Try exact match first
    const exactMatch = await this.salonEmployeeRepository.findOne({
      where: { userId, salonId, isActive: true },
      relations: ['salon'],
    });

    if (exactMatch) {
      return { employee: exactMatch, allRecords: [exactMatch] };
    }

    // Get all employee records for this user
    const allRecords = await this.salonEmployeeRepository.find({
      where: { userId, isActive: true },
      relations: ['salon'],
    });

    return { employee: null, allRecords };
  }

  /**
   * Cleanup orphaned permissions (permissions without valid employee record)
   * Should be run periodically via a scheduled job
   */
  async cleanupOrphanedPermissions(): Promise<{
    cleaned: number;
    details: string[];
  }> {
    const details: string[] = [];

    // Find permissions where employee is inactive or doesn't exist
    const allPermissions = await this.permissionRepository.find({
      where: { isActive: true },
      relations: ['salonEmployee'],
    });

    let cleaned = 0;
    for (const permission of allPermissions) {
      let shouldRevoke = false;
      let reason = '';

      if (!permission.salonEmployee) {
        shouldRevoke = true;
        reason = 'Employee record deleted';
      } else if (!permission.salonEmployee.isActive) {
        shouldRevoke = true;
        reason = 'Employee deactivated';
      } else if (
        permission.salonEmployee.terminationDate &&
        permission.salonEmployee.terminationDate < new Date()
      ) {
        shouldRevoke = true;
        reason = 'Employee terminated';
      }

      if (shouldRevoke) {
        permission.isActive = false;
        permission.revokedAt = new Date();
        permission.notes = `Auto-revoked: ${reason}`;
        await this.permissionRepository.save(permission);

        details.push(
          `Revoked ${permission.permissionCode} for employee ${permission.salonEmployeeId}: ${reason}`,
        );
        cleaned++;
      }
    }

    this.logger.log(`🧹 Cleaned up ${cleaned} orphaned permissions`);
    return { cleaned, details };
  }

  /**
   * Validate employee before granting permissions
   * Returns validation result with actionable error messages
   */
  async validateEmployeeForPermissions(
    salonId: string,
    employeeId: string,
  ): Promise<{ valid: boolean; reason?: string; employee?: SalonEmployee }> {
    const employee = await this.salonEmployeeRepository.findOne({
      where: { id: employeeId, salonId },
      relations: ['user', 'salon'],
    });

    if (!employee) {
      return {
        valid: false,
        reason:
          'Employee not found in this salon. Verify the employee ID is correct.',
      };
    }

    if (!employee.isActive) {
      return {
        valid: false,
        reason:
          'Employee is deactivated. Reactivate the employee first before granting permissions.',
      };
    }

    if (employee.terminationDate && employee.terminationDate < new Date()) {
      return {
        valid: false,
        reason: `Employee was terminated on ${employee.terminationDate.toISOString().split('T')[0]}. Cannot grant permissions to terminated employees.`,
      };
    }

    if (!employee.userId) {
      return {
        valid: false,
        reason:
          'Employee has no associated user account. The employee must register an account first.',
      };
    }

    return { valid: true, employee };
  }

  /**
   * Get all permissions for a user across all salons
   * Useful for "What Can I Do?" screens
   */
  async getAllPermissionsForUser(
    userId: string,
  ): Promise<
    { salonId: string; salonName: string; permissions: EmployeePermission[] }[]
  > {
    // Get all employee records
    const employees = await this.salonEmployeeRepository.find({
      where: { userId, isActive: true },
      relations: ['salon'],
    });

    const result = await Promise.all(
      employees.map(async (employee) => {
        const permissions = await this.getActiveEmployeePermissions(
          employee.id,
          employee.salonId,
        );
        return {
          salonId: employee.salonId,
          salonName: employee.salon?.name || 'Unknown Salon',
          permissions: permissions.map((p) => p.permissionCode),
        };
      }),
    );

    return result;
  }

  /**
   * Check if employee has any of the given permissions
   */
  async hasAnyPermission(
    employeeId: string,
    salonId: string,
    permissionCodes: EmployeePermission[],
  ): Promise<boolean> {
    for (const code of permissionCodes) {
      const has = await this.hasPermission(employeeId, salonId, code);
      if (has) return true;
    }
    return false;
  }

  /**
   * Check if employee has all of the given permissions
   */
  async hasAllPermissions(
    employeeId: string,
    salonId: string,
    permissionCodes: EmployeePermission[],
  ): Promise<boolean> {
    for (const code of permissionCodes) {
      const has = await this.hasPermission(employeeId, salonId, code);
      if (!has) return false;
    }
    return true;
  }
}
