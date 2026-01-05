import { useAuth } from '../context/AuthContext';
import {
  UserRole,
  hasRole,
  hasAnyRole,
  hasMinimumRole,
  isAdmin,
  isSalonStaff,
  isCustomer,
  getRoleName,
} from '../constants/roles';

/**
 * Hook for role-based access control
 * Provides easy access to role checking functions
 */
export const useRole = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    // User's current role
    role: userRole,
    roleName: getRoleName(userRole),

    // Role checking functions
    hasRole: (requiredRole: UserRole) => hasRole(userRole, requiredRole),
    hasAnyRole: (requiredRoles: UserRole[]) => hasAnyRole(userRole, requiredRoles),
    hasMinimumRole: (minimumRole: UserRole) => hasMinimumRole(userRole, minimumRole),

    // Convenience checks
    isAdmin: isAdmin(userRole),
    isSalonStaff: isSalonStaff(userRole),
    isCustomer: isCustomer(userRole),
    isSalonOwner: hasRole(userRole, UserRole.SALON_OWNER),
    isSalonEmployee: hasRole(userRole, UserRole.SALON_EMPLOYEE),
    isSuperAdmin: hasRole(userRole, UserRole.SUPER_ADMIN),
    isAssociationAdmin: hasRole(userRole, UserRole.ASSOCIATION_ADMIN),
    isDistrictLeader: hasRole(userRole, UserRole.DISTRICT_LEADER),
  };
};
