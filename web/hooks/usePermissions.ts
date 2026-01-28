import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  UserRole,
  hasPermission,
  hasAnyRole,
  hasAllRoles,
  isAdmin,
  canManageSalons,
  canViewAllSalons,
  canManageUsers,
  canAccessAccounting,
  canAccessLoans,
  canAccessReports,
  canManageLoanProducts,
} from '@/lib/permissions';

/**
 * Hook to check user permissions based on their role
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role as UserRole | undefined;

  return useMemo(
    () => ({
      // User info
      user,
      userRole,
      isAuthenticated: !!user,

      // Permission checks
      hasPermission: (requiredRole: UserRole) => hasPermission(userRole, requiredRole),
      hasAnyRole: (requiredRoles: UserRole[]) => hasAnyRole(userRole, requiredRoles),
      hasAllRoles: (requiredRoles: UserRole[]) => hasAllRoles(userRole, requiredRoles),

      // Convenience methods
      isAdmin: () => isAdmin(userRole),
      canManageSalons: () => canManageSalons(userRole),
      canViewAllSalons: () => canViewAllSalons(userRole),
      canManageUsers: () => canManageUsers(userRole),
      canAccessAccounting: () => canAccessAccounting(userRole),
      canAccessLoans: () => canAccessLoans(userRole),
      canAccessReports: () => canAccessReports(userRole),
      canManageLoanProducts: () => canManageLoanProducts(userRole),

      // Role checks
      isSuperAdmin: () => userRole === UserRole.SUPER_ADMIN,
      isAssociationAdmin: () => userRole === UserRole.ASSOCIATION_ADMIN,
      isDistrictLeader: () => userRole === UserRole.DISTRICT_LEADER,
      isSalonOwner: () => userRole === UserRole.SALON_OWNER,
      isSalonEmployee: () => userRole === UserRole.SALON_EMPLOYEE,
      isCustomer: () => userRole === UserRole.CUSTOMER,
    }),
    [user, userRole]
  );
}

