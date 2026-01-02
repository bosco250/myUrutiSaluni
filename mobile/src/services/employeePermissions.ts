import { api } from './api';
import { EmployeePermission } from '../constants/employeePermissions';

export interface EmployeePermissionData {
  id: string;
  salonEmployeeId: string;
  salonId: string;
  permissionCode: EmployeePermission;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  isActive: boolean;
  metadata: Record<string, any>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrantPermissionsRequest {
  permissions: EmployeePermission[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface RevokePermissionsRequest {
  permissions: EmployeePermission[];
  reason?: string;
}

export interface EmployeeWithPermissions {
  id: string;
  userId: string;
  salonId: string;
  roleTitle: string | null;
  skills: string[];
  isActive: boolean;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  permissions: {
    code: EmployeePermission;
    grantedAt: string;
    grantedBy: string;
    notes: string | null;
  }[];
}

export interface AvailablePermission {
  code: EmployeePermission;
  description: string;
}

class EmployeePermissionsService {
  /**
   * Grant permissions to an employee
   */
  async grantPermissions(
    salonId: string,
    employeeId: string,
    request: GrantPermissionsRequest,
  ): Promise<EmployeePermissionData[]> {
    const response = await api.post<{ permissions: EmployeePermissionData[] }>(
      `/salons/${salonId}/employees/${employeeId}/permissions`,
      request,
      { requireAuth: true },
    );
    return response.permissions;
  }

  /**
   * Revoke permissions from an employee
   */
  async revokePermissions(
    salonId: string,
    employeeId: string,
    request: RevokePermissionsRequest,
  ): Promise<void> {
    if (!request.permissions || request.permissions.length === 0) {
      throw new Error('At least one permission must be specified');
    }

    try {
      await api.delete(
        `/salons/${salonId}/employees/${employeeId}/permissions`,
        { data: request, requireAuth: true },
      );
    } catch (error: any) {
      console.error('Error revoking permissions:', error);
      // Re-throw with more context
      if (error?.message) {
        throw error;
      }
      throw new Error('Failed to revoke permissions. Please try again.');
    }
  }

  /**
   * Get all permissions for an employee (active and inactive)
   */
  async getEmployeePermissions(
    salonId: string,
    employeeId: string,
  ): Promise<EmployeePermissionData[]> {
    const response = await api.get<{
      employeeId: string;
      salonId: string;
      permissions: EmployeePermissionData[];
    }>(`/salons/${salonId}/employees/${employeeId}/permissions`, {
      requireAuth: true,
    });
    return response.permissions;
  }

  /**
   * Get all employees with their permissions for a salon
   */
  async getEmployeesWithPermissions(
    salonId: string,
  ): Promise<EmployeeWithPermissions[]> {
    // Ensure salonId is trimmed and valid
    const cleanSalonId = salonId?.trim();
    if (!cleanSalonId) {
      throw new Error('Salon ID is required');
    }
    
    const response = await api.get<{
      salonId: string;
      employees: EmployeeWithPermissions[];
    }>(`/salons/${cleanSalonId}/employees/permissions`, {
      requireAuth: true,
    });
    return response.employees || [];
  }

  /**
   * Get list of available permissions
   */
  async getAvailablePermissions(
    salonId: string,
  ): Promise<AvailablePermission[]> {
    // Backend route: /salons/:salonId/employees/permissions/available
    // Ensure salonId is trimmed and valid
    const cleanSalonId = salonId?.trim();
    if (!cleanSalonId) {
      throw new Error('Salon ID is required');
    }
    
    const response = await api.get<{
      permissions: AvailablePermission[];
    }>(`/salons/${cleanSalonId}/employees/permissions/available`, {
      requireAuth: true,
    });
    return response.permissions || [];
  }
}

export const employeePermissionsService = new EmployeePermissionsService();

