import { UserRole } from '../../users/entities/user.entity';

/**
 * Role hierarchy - higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  ],
  [UserRole.ASSOCIATION_ADMIN]: [
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  ],
  [UserRole.DISTRICT_LEADER]: [
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  ],
  [UserRole.SALON_OWNER]: [UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER],
  [UserRole.SALON_EMPLOYEE]: [UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER],
  [UserRole.CUSTOMER]: [UserRole.CUSTOMER],
};

/**
 * Check if a user role has permission to perform an action
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  const userPermissions = ROLE_HIERARCHY[userRole] || [];
  return requiredRoles.some((role) => userPermissions.includes(role));
}

/**
 * Check if user can access resource owned by another user
 */
export function canAccessResource(
  userRole: UserRole,
  resourceOwnerId: string,
  currentUserId: string,
): boolean {
  // Super admin and association admin can access all resources
  if (
    userRole === UserRole.SUPER_ADMIN ||
    userRole === UserRole.ASSOCIATION_ADMIN
  ) {
    return true;
  }

  // District leaders can access resources in their district
  // (This would need district information - simplified for now)
  if (userRole === UserRole.DISTRICT_LEADER) {
    return true; // Would need district check
  }

  // Users can always access their own resources
  return resourceOwnerId === currentUserId;
}

