import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  employeePermissionsService,
  EmployeePermissionData,
  EmployeeWithPermissions,
  AvailablePermission,
} from '../services/employeePermissions';
import { EmployeePermission } from '../constants/employeePermissions';
import { salonService } from '../services/salon';

interface UseEmployeePermissionsOptions {
  salonId?: string;
  employeeId?: string;
  autoFetch?: boolean;
}

export const useEmployeePermissions = (options: UseEmployeePermissionsOptions = {}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { salonId, employeeId, autoFetch = false } = options;
  
  const [permissions, setPermissions] = useState<EmployeePermissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false); // Track session expiration to prevent retries

  /**
   * Check if employee has specific permission
   */
  const hasPermission = useCallback(
    (permissionCode: EmployeePermission): boolean => {
      if (!salonId || !employeeId) return false;
      
      return permissions.some(
        (p) =>
          p.permissionCode === permissionCode &&
          p.isActive === true &&
          p.salonId === salonId &&
          p.salonEmployeeId === employeeId,
      );
    },
    [permissions, salonId, employeeId],
  );

  /**
   * Get active permissions
   */
  const getActivePermissions = useCallback((): EmployeePermission[] => {
    return permissions
      .filter((p) => p.isActive && p.salonId === salonId && p.salonEmployeeId === employeeId)
      .map((p) => p.permissionCode);
  }, [permissions, salonId, employeeId]);

  /**
   * Fetch permissions for an employee
   */
  const fetchPermissions = useCallback(async () => {
    // Don't make API calls if user is not authenticated
    if (!isAuthenticated || !user) {
      return;
    }
    
    // Don't retry if session has expired
    if (sessionExpired) {
      return;
    }
    
    if (!salonId || !employeeId) {
      setError(new Error('Salon ID and Employee ID are required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await employeePermissionsService.getEmployeePermissions(
        salonId,
        employeeId,
      );
      setPermissions(data);
    } catch (err: any) {
      // Handle session expiration (401 error)
      if (err?.status === 401 || err?.isSessionExpired) {
        // Mark session as expired to prevent retries
        setSessionExpired(true);
        // Clear permissions and trigger logout
        setPermissions([]);
        setError(null); // Don't show error to user, logout will handle it
        // Logout will automatically redirect to login screen
        logout().catch((logoutError) => {
          console.error("Error during logout:", logoutError);
        });
        return; // Don't set error state, logout handles the redirect
      }
      
      setError(err instanceof Error ? err : new Error('Failed to fetch permissions'));
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, employeeId, sessionExpired, logout, isAuthenticated, user]);

  /**
   * Fetch permissions for current user (if they are an employee)
   */
  const fetchMyPermissions = useCallback(async () => {
    // Don't make API calls if user is not authenticated
    if (!isAuthenticated || !user) {
      console.log("🔒 User not authenticated, skipping fetchMyPermissions");
      return;
    }
    
    // Don't retry if session has expired
    if (sessionExpired) {
      return;
    }
    
    if (!user?.id || !salonId) {
      setError(new Error('User ID and Salon ID are required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get employee record for current user using the correct method
      const employee = await salonService.getCurrentEmployee(salonId);
      
      if (employee && String(employee.userId) === String(user.id)) {
        // User is an employee, fetch their permissions
        const data = await employeePermissionsService.getEmployeePermissions(
          salonId,
          employee.id,
        );
        setPermissions(data);
      } else {
        // User is not an employee for this salon (might be owner or not associated)
        setPermissions([]);
      }
    } catch (err: any) {
      // If 404, user is not an employee - that's okay, just set empty permissions
      if (err?.status === 404 || err?.response?.status === 404) {
        setPermissions([]);
        setError(null);
      } else {
        // Handle session expiration (401 error)
        if (err?.status === 401 || err?.isSessionExpired) {
          // Mark session as expired to prevent retries
          setSessionExpired(true);
          setPermissions([]);
          setError(null);
          // Logout will automatically redirect to login screen
          logout().catch((logoutError) => {
            console.error("Error during logout:", logoutError);
          });
          return;
        }
        
        setError(err instanceof Error ? err : new Error('Failed to fetch permissions'));
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [salonId, logout, sessionExpired, isAuthenticated, user]);

  // Reset sessionExpired flag when user changes (e.g., after login)
  useEffect(() => {
    if (user && sessionExpired) {
      setSessionExpired(false);
    }
  }, [user, sessionExpired]);

  // Clear permissions when user logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions([]);
      setError(null);
      setSessionExpired(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Only auto-fetch if user is authenticated
    if (autoFetch && isAuthenticated && user) {
      if (employeeId && salonId) {
        fetchPermissions();
      } else if (user?.role === 'salon_employee' && salonId) {
        fetchMyPermissions();
      }
    }
  }, [autoFetch, employeeId, salonId, user?.role, isAuthenticated, user, fetchPermissions, fetchMyPermissions]);

  return {
    permissions,
    activePermissions: getActivePermissions(),
    hasPermission,
    loading,
    error,
    fetchPermissions,
    fetchMyPermissions,
    refetch: employeeId ? fetchPermissions : fetchMyPermissions,
  };
};

/**
 * Hook for managing employee permissions (owner view)
 */
export const useEmployeePermissionsManagement = (salonId?: string) => {
  const [employees, setEmployees] = useState<EmployeeWithPermissions[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all employees with their permissions
   */
  const fetchEmployeesWithPermissions = useCallback(async () => {
    if (!salonId || !salonId.trim()) {
      setError(new Error('Salon ID is required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await employeePermissionsService.getEmployeesWithPermissions(salonId.trim());
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  /**
   * Fetch available permissions
   */
  const fetchAvailablePermissions = useCallback(async () => {
    if (!salonId || !salonId.trim()) {
      setError(new Error('Salon ID is required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await employeePermissionsService.getAvailablePermissions(salonId.trim());
      setAvailablePermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch available permissions'));
      setAvailablePermissions([]);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  /**
   * Grant permissions to an employee
   */
  const grantPermissions = useCallback(
    async (
      employeeId: string,
      permissions: EmployeePermission[],
      notes?: string,
    ) => {
      if (!salonId) {
        throw new Error('Salon ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        await employeePermissionsService.grantPermissions(salonId, employeeId, {
          permissions,
          notes,
        });
        // Refresh employees list
        await fetchEmployeesWithPermissions();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to grant permissions');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [salonId, fetchEmployeesWithPermissions],
  );

  /**
   * Revoke permissions from an employee
   */
  const revokePermissions = useCallback(
    async (employeeId: string, permissions: EmployeePermission[], reason?: string) => {
      if (!salonId) {
        throw new Error('Salon ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        await employeePermissionsService.revokePermissions(salonId, employeeId, {
          permissions,
          reason,
        });
        // Refresh employees list
        await fetchEmployeesWithPermissions();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to revoke permissions');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [salonId, fetchEmployeesWithPermissions],
  );

  return {
    employees,
    availablePermissions,
    loading,
    error,
    fetchEmployeesWithPermissions,
    fetchAvailablePermissions,
    grantPermissions,
    revokePermissions,
    refetch: fetchEmployeesWithPermissions,
  };
};

