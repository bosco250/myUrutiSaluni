// User roles matching backend
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSOCIATION_ADMIN = 'association_admin',
  DISTRICT_LEADER = 'district_leader',
  SALON_OWNER = 'salon_owner',
  SALON_EMPLOYEE = 'salon_employee',
  CUSTOMER = 'customer',
}

// Role hierarchy levels (higher = more permissions)
export const ROLE_LEVELS = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ASSOCIATION_ADMIN]: 80,
  [UserRole.DISTRICT_LEADER]: 60,
  [UserRole.SALON_OWNER]: 40,
  [UserRole.SALON_EMPLOYEE]: 20,
  [UserRole.CUSTOMER]: 10,
};

// Check if user has specific role
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  return userRole === requiredRole;
};

// Check if user has any of the specified roles
export const hasAnyRole = (userRole: string | undefined, requiredRoles: UserRole[]): boolean => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole as UserRole);
};

// Check if user role is at least the specified level
export const hasMinimumRole = (userRole: string | undefined, minimumRole: UserRole): boolean => {
  if (!userRole) return false;
  const userLevel = ROLE_LEVELS[userRole as UserRole] || 0;
  const minimumLevel = ROLE_LEVELS[minimumRole] || 0;
  return userLevel >= minimumLevel;
};

// Check if user is admin (any admin type)
export const isAdmin = (userRole: string | undefined): boolean => {
  return hasAnyRole(userRole, [
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  ]);
};

// Check if user is salon staff (owner or employee)
export const isSalonStaff = (userRole: string | undefined): boolean => {
  return hasAnyRole(userRole, [
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  ]);
};

// Check if user is customer
export const isCustomer = (userRole: string | undefined): boolean => {
  return hasRole(userRole, UserRole.CUSTOMER);
};

// Get user-friendly role name
export const getRoleName = (role: string | undefined): string => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Admin';
    case UserRole.ASSOCIATION_ADMIN:
      return 'Association Admin';
    case UserRole.DISTRICT_LEADER:
      return 'District Leader';
    case UserRole.SALON_OWNER:
      return 'Salon Owner';
    case UserRole.SALON_EMPLOYEE:
      return 'Salon Employee';
    case UserRole.CUSTOMER:
      return 'Customer';
    default:
      return 'Unknown';
  }
};
