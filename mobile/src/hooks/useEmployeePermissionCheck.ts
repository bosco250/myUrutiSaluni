import { useMemo } from "react";
import { useEmployeePermissions } from "./useEmployeePermissions";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../constants/roles";
import { EmployeePermission } from "../constants/employeePermissions";
import { salonService } from "../services/salon";
import { useState, useEffect } from "react";

// ===== GLOBAL SINGLETON LOCK =====
// This prevents multiple component instances from fetching permissions simultaneously
// Without this, BottomNavigation + navigation/index + other screens all try to fetch at once
// creating exponential API call explosion that crashes the database
let globalLoadingLock = false;
let globalCachedSalonId: string | null = null;
let globalCachedEmployeeId: string | null = null;
let globalLoadPromise: Promise<{ salonId: string; employeeId: string } | null> | null = null;

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


  // Clear state immediately when user logs out to prevent API calls
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCurrentSalonId(undefined);
      setCurrentEmployeeId(undefined);
      setIsLoadingEmployee(false);
      // CRITICAL: Clear global cache on logout to prevent stale data
      globalCachedSalonId = null;
      globalCachedEmployeeId = null;
      globalLoadingLock = false;
      globalLoadPromise = null;
    }
  }, [isAuthenticated, user]);

  // Auto-fetch salon and employee IDs if not provided
  useEffect(() => {
    // Early exit if not authenticated - prevents any API calls
    if (!isAuthenticated || !user) {
      return;
    }

    // Only for employees
    if (user?.role !== UserRole.SALON_EMPLOYEE) {
      return;
    }

    // Skip if autoFetch is disabled
    if (!autoFetch) {
      return;
    }

    // CRITICAL: Use global cache if already loaded to prevent duplicate API calls
    if (globalCachedSalonId && globalCachedEmployeeId) {
      if (!currentSalonId || !currentEmployeeId) {
        setCurrentSalonId(globalCachedSalonId);
        setCurrentEmployeeId(globalCachedEmployeeId);
      }
      return;
    }

    // CRITICAL: If another instance is already loading, wait for it
    if (globalLoadingLock && globalLoadPromise) {
      globalLoadPromise.then((result) => {
        if (result) {
          setCurrentSalonId(result.salonId);
          setCurrentEmployeeId(result.employeeId);
        }
        setIsLoadingEmployee(false);
      });
      return;
    }

    // Skip if we already have values
    if (currentSalonId && currentEmployeeId) {
      return;
    }

    // ACQUIRE GLOBAL LOCK - Only one instance does the actual fetching
    globalLoadingLock = true;
    setIsLoadingEmployee(true);

    const loadEmployeeData = async (): Promise<{ salonId: string; employeeId: string } | null> => {
      try {
        // Get employee records directly - simpler, one API call
        const employeeRecords = await salonService.getEmployeeRecordsByUserId(String(user.id));

        if (employeeRecords && employeeRecords.length > 0) {
          // Find first active employee - skip the expensive permission checks
          // The permission system will handle checking permissions separately
          const activeEmployee = employeeRecords.find((emp) => emp.isActive) || employeeRecords[0];
          
          if (activeEmployee) {
            return {
              salonId: activeEmployee.salonId,
              employeeId: activeEmployee.id,
            };
          }
        }

        return null;
      } catch (error: any) {
        console.error("❌ Error loading employee data:", error);
        return null;
      }
    };

    // Create promise and store it globally so other instances can wait for it
    globalLoadPromise = loadEmployeeData();

    globalLoadPromise
      .then((result) => {
        if (result) {
          // Update global cache
          globalCachedSalonId = result.salonId;
          globalCachedEmployeeId = result.employeeId;
          // Update local state
          setCurrentSalonId(result.salonId);
          setCurrentEmployeeId(result.employeeId);
        }
      })
      .finally(() => {
        // RELEASE GLOBAL LOCK
        globalLoadingLock = false;
        globalLoadPromise = null;
        setIsLoadingEmployee(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, autoFetch, isAuthenticated]);

  const {
    hasPermission,
    activePermissions,
    loading,
    error,
    fetchMyPermissions,
  } = useEmployeePermissions({
    salonId: currentSalonId,
    employeeId: currentEmployeeId,
    // CRITICAL: Only enable auto-fetch when BOTH IDs are available to prevent loops
    autoFetch: !!(currentSalonId && currentEmployeeId),
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
