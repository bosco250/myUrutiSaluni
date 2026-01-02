import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { UserRole } from '../constants/roles';
import { EmployeePermission } from '../constants/employeePermissions';
import { salonService } from '../services/salon';
import {
  employeePermissionsService,
  EmployeePermissionData,
} from '../services/employeePermissions';

/**
 * Represents a salon context for an employee
 */
interface SalonContext {
  salonId: string;
  salonName: string;
  employeeId: string;
  permissions: EmployeePermission[];
  permissionCount: number;
}

/**
 * Full permission state
 */
interface PermissionState {
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Salon context
  activeSalon: SalonContext | null;
  availableSalons: SalonContext[];

  // Permissions
  permissions: EmployeePermission[];
  permissionData: EmployeePermissionData[];

  // Timestamps
  lastFetched: Date | null;
  lastError: Error | null;
}

/**
 * Permission context type with all methods
 */
interface PermissionContextType extends PermissionState {
  // Permission checks
  hasPermission: (permission: EmployeePermission) => boolean;
  hasAnyPermission: (permissions: EmployeePermission[]) => boolean;
  hasAllPermissions: (permissions: EmployeePermission[]) => boolean;

  // Salon management
  setActiveSalon: (salonId: string) => Promise<void>;
  getActiveSalonId: () => string | undefined;

  // Refresh
  refreshPermissions: () => Promise<void>;
  forceRefresh: () => Promise<void>;

  // Role helpers
  isOwner: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  hasOwnerLevelPermissions: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

const STORAGE_KEY = '@uruti_permissions_cache';

/**
 * PermissionProvider
 *
 * Provides a centralized permission management context for the app.
 * Features:
 * - Auto-loads permissions on login
 * - Caches permissions in AsyncStorage
 * - Supports multi-salon employees
 * - Auto-refreshes on app foreground
 */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<PermissionState>({
    isLoading: true,
    isInitialized: false,
    activeSalon: null,
    availableSalons: [],
    permissions: [],
    permissionData: [],
    lastFetched: null,
    lastError: null,
  });

  // Role checks
  const isOwner = user?.role === UserRole.SALON_OWNER;
  const isAdmin =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ASSOCIATION_ADMIN;
  const isEmployee = user?.role === UserRole.SALON_EMPLOYEE;



  /**
   * Save permissions to AsyncStorage cache
   */
  const saveToCache = useCallback(async (newState: Partial<PermissionState>) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          userId: user?.id,
          state: {
            activeSalon: newState.activeSalon,
            availableSalons: newState.availableSalons,
            permissions: newState.permissions,
            lastFetched: newState.lastFetched?.toISOString(),
          },
          cachedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error('Error saving permissions cache:', error);
    }
  }, [user?.id]);

  /**
   * Refresh permissions from server
   */
  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated || !user || !isEmployee) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // 1. Get all employee records for this user
      const employeeRecords = await salonService.getEmployeeRecordsByUserId(
        String(user.id),
      );
      const activeRecords = employeeRecords.filter((emp) => emp.isActive);

      if (activeRecords.length === 0) {
        const emptyState = {
          isLoading: false,
          availableSalons: [],
          activeSalon: null,
          permissions: [],
          permissionData: [],
          lastFetched: new Date(),
          lastError: null,
        };
        setState((prev) => ({ ...prev, ...emptyState }));
        await saveToCache(emptyState);
        return;
      }

      // 2. Fetch permissions for all salons in parallel
      const salonContexts: SalonContext[] = await Promise.all(
        activeRecords.map(async (employee) => {
          try {
            const permissions =
              await employeePermissionsService.getEmployeePermissions(
                employee.salonId,
                employee.id,
              );
            const activePerms = permissions
              .filter((p) => p.isActive)
              .map((p) => p.permissionCode);

            return {
              salonId: employee.salonId,
              salonName: employee.salon?.name || 'Unknown Salon',
              employeeId: employee.id,
              permissions: activePerms,
              permissionCount: activePerms.length,
            };
          } catch (error) {
            console.error(
              `Error fetching permissions for salon ${employee.salonId}:`,
              error,
            );
            return {
              salonId: employee.salonId,
              salonName: employee.salon?.name || 'Unknown Salon',
              employeeId: employee.id,
              permissions: [],
              permissionCount: 0,
            };
          }
        }),
      );

      // 3. Determine active salon
      // Priority: current active salon (if still valid) > salon with most permissions > first
      let bestSalon = salonContexts[0];

      // Check if current active salon is still valid
      if (state.activeSalon) {
        const currentValid = salonContexts.find(
          (s) => s.salonId === state.activeSalon?.salonId,
        );
        if (currentValid) {
          bestSalon = currentValid;
        }
      }

      // If no current or invalid, pick salon with most permissions
      if (!state.activeSalon) {
        bestSalon = salonContexts.reduce(
          (best, current) =>
            current.permissionCount > (best?.permissionCount || 0)
              ? current
              : best,
          salonContexts[0],
        );
      }

      // 4. Get full permission data for active salon
      const permissionData = bestSalon
        ? await employeePermissionsService.getEmployeePermissions(
            bestSalon.salonId,
            bestSalon.employeeId,
          )
        : [];

      const newState = {
        isLoading: false,
        activeSalon: bestSalon || null,
        availableSalons: salonContexts,
        permissions: bestSalon?.permissions || [],
        permissionData: permissionData.filter((p) => p.isActive),
        lastFetched: new Date(),
        lastError: null,
      };

      setState((prev) => ({ ...prev, ...newState }));
      await saveToCache(newState);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        lastError:
          error instanceof Error
            ? error
            : new Error('Failed to fetch permissions'),
      }));
    }
  }, [isAuthenticated, user, isEmployee, state.activeSalon, saveToCache]);

  // Effect to refresh permissions when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Refresh permissions if app comes to foreground and it's been a while since last fetch
      if (
        nextAppState === 'active' &&
        isAuthenticated &&
        isEmployee &&
        (!state.lastFetched ||
          new Date().getTime() - state.lastFetched.getTime() >
            1000 * 60 * 5) // 5 minutes
      ) {
        refreshPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, isEmployee, state.lastFetched, refreshPermissions]);

  /**
   * Force refresh - always fetches fresh data
   */
  const forceRefresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await refreshPermissions();
  }, [refreshPermissions]);

  /**
   * Loading cached permissions from AsyncStorage
   */
  const loadCachedPermissions = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Validate cache is for current user
        if (parsed.userId === user?.id) {
          setState((prev) => ({
            ...prev,
            ...parsed.state,
            lastFetched: parsed.state.lastFetched
              ? new Date(parsed.state.lastFetched)
              : null,
            isLoading: false,
            isInitialized: true,
          }));

          // If employee, also fetch fresh data in background
          if (isEmployee) {
            refreshPermissions();
          }
          return;
        }
      }
    } catch (error) {
      console.error('Error loading cached permissions:', error);
    }

    // No valid cache, initialize and fetch
    setState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
    if (isEmployee) {
      refreshPermissions();
    }
  }, [user?.id, isEmployee, refreshPermissions]);

  // Load cached permissions on mount
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      loadCachedPermissions();
    } else if (!authLoading && !isAuthenticated) {
      // Clear state when not authenticated
      setState((prev) => ({
        isLoading: false,
        isInitialized: true,
        activeSalon: null,
        availableSalons: [],
        permissions: [],
        permissionData: [],
        lastFetched: null,
        lastError: null,
      }));
    }
  }, [authLoading, isAuthenticated, user, loadCachedPermissions]);

  /**
   * Set active salon for multi-salon employees
   */
  const setActiveSalon = useCallback(
    async (salonId: string) => {
      const salon = state.availableSalons.find((s) => s.salonId === salonId);
      if (!salon) {
        throw new Error('Salon not found in available salons');
      }

      // Fetch fresh permissions for this salon
      const permissionData =
        await employeePermissionsService.getEmployeePermissions(
          salon.salonId,
          salon.employeeId,
        );

      const newState = {
        activeSalon: salon,
        permissions: salon.permissions,
        permissionData: permissionData.filter((p) => p.isActive),
        lastFetched: new Date(),
      };

      setState((prev) => ({ ...prev, ...newState }));
      await saveToCache({ ...state, ...newState });
    },
    [state, saveToCache],
  );

  /**
   * Get active salon ID
   */
  const getActiveSalonId = useCallback((): string | undefined => {
    return state.activeSalon?.salonId;
  }, [state.activeSalon]);

  // Permission check functions
  const hasPermission = useCallback(
    (permission: EmployeePermission): boolean => {
      if (isOwner || isAdmin) return true;
      return state.permissions.includes(permission);
    },
    [isOwner, isAdmin, state.permissions],
  );

  const hasAnyPermission = useCallback(
    (permissions: EmployeePermission[]): boolean => {
      if (isOwner || isAdmin) return true;
      return permissions.some((p) => state.permissions.includes(p));
    },
    [isOwner, isAdmin, state.permissions],
  );

  const hasAllPermissions = useCallback(
    (permissions: EmployeePermission[]): boolean => {
      if (isOwner || isAdmin) return true;
      return permissions.every((p) => state.permissions.includes(p));
    },
    [isOwner, isAdmin, state.permissions],
  );

  // Owner-level permissions check
  const hasOwnerLevelPermissions = useMemo(() => {
    if (isOwner || isAdmin) return true;

    if (!isEmployee) return false;

    // Key owner-level permissions
    const ownerLevelPerms = [
      EmployeePermission.MANAGE_SALON_PROFILE,
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.MANAGE_SERVICES,
      EmployeePermission.MANAGE_PRODUCTS,
      EmployeePermission.PROCESS_PAYMENTS,
      EmployeePermission.VIEW_SALES_REPORTS,
      EmployeePermission.MANAGE_INVENTORY,
    ];

    return (
      state.permissions.length >= 5 ||
      state.permissions.some((p) => ownerLevelPerms.includes(p))
    );
  }, [isOwner, isAdmin, isEmployee, state.permissions]);

  // Clear permissions on logout
  useEffect(() => {
    if (!isAuthenticated && state.isInitialized) {
      setState({
        isLoading: false,
        isInitialized: true,
        activeSalon: null,
        availableSalons: [],
        permissions: [],
        permissionData: [],
        lastFetched: null,
        lastError: null,
      });
      AsyncStorage.removeItem(STORAGE_KEY).catch(console.error);
    }
  }, [isAuthenticated, state.isInitialized]);

  const value: PermissionContextType = {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    setActiveSalon,
    getActiveSalonId,
    refreshPermissions,
    forceRefresh,
    isOwner,
    isAdmin,
    isEmployee,
    hasOwnerLevelPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permission context
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Hook for simple permission check (does not throw)
 */
export function useHasPermission(permission: EmployeePermission): boolean {
  const { hasPermission, isLoading } = usePermissions();
  if (isLoading) return false;
  return hasPermission(permission);
}

/**
 * Hook for checking if user can access a feature while loading
 */
export function usePermissionStatus(permission: EmployeePermission): {
  canAccess: boolean;
  isLoading: boolean;
  isReady: boolean;
} {
  const { hasPermission, isLoading, isInitialized } = usePermissions();
  return {
    canAccess: hasPermission(permission),
    isLoading,
    isReady: isInitialized && !isLoading,
  };
}
