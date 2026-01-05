import { useState, useEffect, useCallback, useRef } from 'react';
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

// CRITICAL: Global deduplication to prevent multiple hook instances from making duplicate calls
// Now stores the actual data so we only rate-limit when we have valid cached results
const globalFetchCache = new Map<string, { 
  timestamp: number; 
  promise: Promise<EmployeePermissionData[]> | null;
  data: EmployeePermissionData[] | null; // Store actual data for instant access
}>();
const MIN_REFETCH_INTERVAL = 5000; // 5 seconds minimum between fetches for same key

export const useEmployeePermissions = (options: UseEmployeePermissionsOptions = {}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { salonId, employeeId, autoFetch = false } = options;
  
  const [permissions, setPermissions] = useState<EmployeePermissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false); // Track session expiration to prevent retries
  
  // CRITICAL: Track if fetch has already been triggered for these IDs to prevent duplicates
  const hasFetchedRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

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
   * CRITICAL: Uses global cache and rate limiting to prevent infinite API call loops
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

    // CRITICAL: Create a unique cache key for this fetch
    const cacheKey = `${salonId}:${employeeId}`;
    
    // Check if we've already fetched for these IDs recently
    const cached = globalFetchCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < MIN_REFETCH_INTERVAL) {
      // Only rate-limit if we have cached data OR an in-flight promise
      if (cached.data || cached.promise) {
        console.log(`⏳ Skipping permission fetch for ${cacheKey} - rate limited`);
        // If there's cached data, use it immediately
        if (cached.data) {
          setPermissions(cached.data);
          return;
        }
        // If there's an in-flight request, wait for it
        if (cached.promise) {
          try {
            const data = await cached.promise;
            setPermissions(data);
          } catch {
            // Ignore - will be handled by the original request
          }
          return;
        }
      }
      // No cached data, allow fetch to proceed even within rate limit
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log(`🔒 Skipping permission fetch for ${cacheKey} - already fetching`);
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      
      // Create the promise and cache it
      const fetchPromise = employeePermissionsService.getEmployeePermissions(
        salonId,
        employeeId,
      );
      
      globalFetchCache.set(cacheKey, { timestamp: now, promise: fetchPromise, data: null });
      
      const data = await fetchPromise;
      setPermissions(data);
      
      // Update cache with completed fetch
      globalFetchCache.set(cacheKey, { timestamp: Date.now(), promise: null, data: data });
      hasFetchedRef.current = cacheKey;
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
      isFetchingRef.current = false;
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
      // CRITICAL: Check if we've already fetched for these exact IDs to prevent loops
      const currentKey = `${salonId}:${employeeId}`;
      if (hasFetchedRef.current === currentKey) {
        return; // Already fetched for these IDs
      }
      
      if (employeeId && salonId) {
        fetchPermissions();
      } else if (user?.role === 'salon_employee' && salonId) {
        fetchMyPermissions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, employeeId, salonId, user?.role, isAuthenticated]);

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

