import { useMemo } from "react";
import { useEmployeePermissions } from "./useEmployeePermissions";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../constants/roles";
import { EmployeePermission } from "../constants/employeePermissions";
import { salonService } from "../services/salon";
import { useState, useEffect } from "react";

interface UseEmployeePermissionCheckOptions {
  salonId?: string;
  employeeId?: string;
  autoFetch?: boolean;
}

/**
 * Hook to check if current employee has specific permissions
 * Automatically fetches employee record if not provided
 */
export const useEmployeePermissionCheck = (
  options: UseEmployeePermissionCheckOptions = {}
) => {
  const { user, isAuthenticated } = useAuth();
  const { salonId, employeeId, autoFetch = true } = options;
  const [currentSalonId, setCurrentSalonId] = useState<string | undefined>(
    salonId
  );
  const [currentEmployeeId, setCurrentEmployeeId] = useState<
    string | undefined
  >(employeeId);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);

  // Auto-fetch salon and employee IDs if not provided
  useEffect(() => {
    const loadEmployeeData = async () => {
      // Don't make API calls if user is not authenticated
      if (!isAuthenticated || !user) {
        return;
      }

      // Only run if we don't have both IDs and haven't started loading
      if (
        user?.role === UserRole.SALON_EMPLOYEE &&
        (!currentSalonId || !currentEmployeeId) &&
        !isLoadingEmployee
      ) {
        setIsLoadingEmployee(true);
        try {
          // First, try the API endpoint to get all employee records for current user
          try {
            const employeeRecords =
              await salonService.getEmployeeRecordsByUserId(String(user.id));

            if (employeeRecords && employeeRecords.length > 0) {
              // CRITICAL: Check which employee record has permissions
              // An employee can have multiple records across different salons
              // We want to use the one that has permissions granted
              const { employeePermissionsService } = await import(
                "../services/employeePermissions"
              );

              // Filter to only active employees first
              const activeEmployees = employeeRecords.filter(
                (emp) => emp.isActive
              );

              // Check permissions for all employees in parallel (more efficient)
              const permissionChecks = await Promise.allSettled(
                activeEmployees.map(async (employee) => {
                  try {
                    const permissions =
                      await employeePermissionsService.getEmployeePermissions(
                        employee.salonId,
                        employee.id
                      );
                    const activePermissions = permissions.filter(
                      (p) => p.isActive
                    );
                    return {
                      employee,
                      activePermissions,
                      count: activePermissions.length,
                    };
                  } catch (error) {
                    return {
                      employee,
                      activePermissions: [],
                      count: 0,
                      error,
                    };
                  }
                })
              );

              // Find employee with most permissions (or any with permissions)
              let bestEmployee: { employee: any; count: number } | null = null;

              for (const result of permissionChecks) {
                if (result.status === "fulfilled") {
                  const { employee, count } = result.value;

                  if (count > 0) {
                    // Prefer employee with more permissions
                    if (!bestEmployee || count > bestEmployee.count) {
                      bestEmployee = { employee, count };
                    }
                  }
                }
              }

              if (bestEmployee) {
                // Found employee record with permissions - use this one!
                setCurrentSalonId(bestEmployee.employee.salonId);
                setCurrentEmployeeId(bestEmployee.employee.id);
                return; // Found employee record with permissions, stop searching
              }

              // If no employee record has permissions, use the first active one
              const activeEmployee =
                employeeRecords.find((emp) => emp.isActive) ||
                employeeRecords[0];
              if (activeEmployee) {
                setCurrentSalonId(activeEmployee.salonId);
                setCurrentEmployeeId(activeEmployee.id);
                return;
              }
            }
          } catch {
            // Silently try fallback
          }

          // Fallback: Try to get all salons and find where user is employee
          const allSalons = await salonService.getAllSalons().catch(() => []);

          // Try each salon to find employee record
          for (const salon of allSalons) {
            try {
              const employee = await salonService.getCurrentEmployee(salon.id);
              if (employee && String(employee.userId) === String(user.id)) {
                setCurrentSalonId(employee.salonId);
                setCurrentEmployeeId(employee.id);
                return; // Found employee record, stop searching
              }
            } catch {
              // Continue to next salon
              continue;
            }
          }

          // Last resort: Try to get employees from any salon
          if (!currentSalonId && allSalons.length > 0) {
            for (const salon of allSalons) {
              try {
                const employees = await salonService
                  .getEmployees(salon.id)
                  .catch(() => []);
                const employee = employees.find(
                  (emp: any) => String(emp.userId) === String(user.id)
                );
                if (employee) {
                  setCurrentSalonId(employee.salonId);
                  setCurrentEmployeeId(employee.id);
                  return;
                }
              } catch {
                continue;
              }
            }
          }
        } catch (error: any) {
          console.error("❌ Error loading employee data:", error);

          // Handle session expiration (401 error)
          if (error?.status === 401 || error?.isSessionExpired) {
            // Don't set error state, just stop loading
            // The permissions hook will handle logout
            setIsLoadingEmployee(false);
            return;
          }
        } finally {
          setIsLoadingEmployee(false);
        }
      }
    };

    if (
      autoFetch &&
      isAuthenticated &&
      user?.id &&
      user?.role === UserRole.SALON_EMPLOYEE
    ) {
      loadEmployeeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, autoFetch, isAuthenticated]); // Removed currentSalonId, currentEmployeeId, and isLoadingEmployee to prevent infinite loop

  const {
    hasPermission,
    activePermissions,
    loading,
    error,
    fetchMyPermissions,
  } = useEmployeePermissions({
    salonId: currentSalonId,
    employeeId: currentEmployeeId,
    autoFetch: true, // Enable auto-fetch when salonId and employeeId are available
  });

  // Check if user is owner (owners have all permissions)
  const isOwner = useMemo(() => {
    return user?.role === UserRole.SALON_OWNER;
  }, [user?.role]);

  // Check if user is admin (admins have all permissions)
  const isAdmin = useMemo(() => {
    return (
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.ASSOCIATION_ADMIN
    );
  }, [user?.role]);

  /**
   * Check if employee has owner-level permissions (significant permissions)
   * Employees with 5+ permissions or key management permissions should see owner navigation
   */
  const hasOwnerLevelPermissions = useMemo(() => {
    if (isOwner || isAdmin) return true;

    if (
      user?.role === UserRole.SALON_EMPLOYEE &&
      activePermissions.length > 0
    ) {
      // Key owner-level permissions that warrant owner navigation
      const ownerLevelPermissionCodes = [
        EmployeePermission.MANAGE_SALON_PROFILE,
        EmployeePermission.MANAGE_APPOINTMENTS,
        EmployeePermission.MANAGE_SERVICES,
        EmployeePermission.MANAGE_PRODUCTS,
        EmployeePermission.MANAGE_CUSTOMERS,
        EmployeePermission.PROCESS_PAYMENTS,
        EmployeePermission.VIEW_SALES_REPORTS,
        EmployeePermission.MANAGE_INVENTORY,
      ];

      // Check if employee has any owner-level permission OR has 5+ permissions
      const hasOwnerLevelPermission = activePermissions.some((perm) =>
        ownerLevelPermissionCodes.includes(perm)
      );

      return hasOwnerLevelPermission || activePermissions.length >= 5;
    }

    return false;
  }, [isOwner, isAdmin, user?.role, activePermissions]);

  /**
   * Check if user has permission (owners/admins always return true)
   */
  const checkPermission = useMemo(
    () =>
      (permission: EmployeePermission): boolean => {
        if (isOwner || isAdmin) {
          return true;
        }

        if (user?.role === UserRole.SALON_EMPLOYEE) {
          return hasPermission(permission);
        }

        return false;
      },
    [isOwner, isAdmin, hasPermission, user?.role]
  );

  /**
   * Check if user has any of the provided permissions
   */
  const checkAnyPermission = useMemo(
    () =>
      (permissions: EmployeePermission[]): boolean => {
        if (isOwner || isAdmin) {
          return true;
        }

        if (user?.role === UserRole.SALON_EMPLOYEE) {
          return permissions.some((perm) => hasPermission(perm));
        }

        return false;
      },
    [isOwner, isAdmin, hasPermission, user?.role]
  );

  /**
   * Check if user has all of the provided permissions
   */
  const checkAllPermissions = useMemo(
    () =>
      (permissions: EmployeePermission[]): boolean => {
        if (isOwner || isAdmin) {
          return true;
        }

        if (user?.role === UserRole.SALON_EMPLOYEE) {
          return permissions.every((perm) => hasPermission(perm));
        }

        return false;
      },
    [isOwner, isAdmin, hasPermission, user?.role]
  );

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasPermission,
    activePermissions,
    isOwner,
    isAdmin,
    hasOwnerLevelPermissions, // New: indicates if employee should see owner navigation
    isEmployee: user?.role === UserRole.SALON_EMPLOYEE,
    loading: loading || isLoadingEmployee, // Include employee loading state
    error,
    salonId: currentSalonId,
    employeeId: currentEmployeeId,
    fetchMyPermissions,
  };
};
