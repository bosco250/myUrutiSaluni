/**
 * User Role Enum - matches backend UserRole enum
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSOCIATION_ADMIN = 'association_admin',
  DISTRICT_LEADER = 'district_leader',
  SALON_OWNER = 'salon_owner',
  SALON_EMPLOYEE = 'salon_employee',
  CUSTOMER = 'customer',
}

/**
 * Role Hierarchy - defines which roles can access resources
 * Higher roles inherit permissions from lower roles
 */
export const RoleHierarchy: Record<UserRole, UserRole[]> = {
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
  [UserRole.SALON_OWNER]: [
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  ],
  [UserRole.SALON_EMPLOYEE]: [
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  ],
  [UserRole.CUSTOMER]: [
    UserRole.CUSTOMER,
  ],
};

/**
 * Check if a user role has permission to access a resource requiring a specific role
 */
export function hasPermission(userRole: string | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  
  // Convert string to UserRole enum if needed
  const role = userRole as UserRole;
  if (!RoleHierarchy[role]) return false;
  
  return RoleHierarchy[role].includes(requiredRole);
}

/**
 * Check if a user role has any of the required roles
 */
export function hasAnyRole(userRole: string | null | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) return false;
  return requiredRoles.some(role => hasPermission(userRole, role));
}

/**
 * Check if a user role has all of the required roles (for multiple role requirements)
 */
export function hasAllRoles(userRole: string | null | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) return false;
  return requiredRoles.every(role => hasPermission(userRole, role));
}

/**
 * Check if user is an admin (SUPER_ADMIN or ASSOCIATION_ADMIN)
 */
export function isAdmin(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]);
}

/**
 * Check if user can manage salons (admin or salon owner)
 */
export function canManageSalons(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
  ]);
}

/**
 * Check if user can view all salons (not just their own)
 */
export function canViewAllSalons(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  ]);
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
  ]);
}

/**
 * Check if user can access accounting/financial data
 */
export function canAccessAccounting(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  ]);
}

/**
 * Check if user can access loans
 */
export function canAccessLoans(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  ]);
}

/**
 * Check if user can access reports
 */
export function canAccessReports(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  ]);
}

/**
 * Check if user can manage loan products
 */
export function canManageLoanProducts(userRole: string | null | undefined): boolean {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
  ]);
}
