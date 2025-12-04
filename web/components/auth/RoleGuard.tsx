'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * Component that conditionally renders children based on user role
 * 
 * @example
 * <RoleGuard requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * @example
 * <RoleGuard 
 *   requiredRoles={[UserRole.SALON_OWNER]} 
 *   fallback={<div>Access Denied</div>}
 * >
 *   <SalonManagement />
 * </RoleGuard>
 */
export default function RoleGuard({
  children,
  requiredRoles = [],
  requireAll = false,
  fallback = null,
  showError = false,
}: RoleGuardProps) {
  const { hasAnyRole, hasAllRoles, userRole } = usePermissions();

  // If no roles specified, allow access
  if (requiredRoles.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  const hasAccess = requireAll
    ? hasAllRoles(requiredRoles)
    : hasAnyRole(requiredRoles);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show error message if requested
  if (showError) {
    return (
      <div className="p-6 bg-danger/10 border border-danger rounded-xl">
        <p className="text-danger font-semibold">Access Denied</p>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
          You don't have permission to access this resource. Required roles:{' '}
          {requiredRoles.map((r) => r.replace('_', ' ')).join(', ')}
        </p>
      </div>
    );
  }

  return <>{fallback}</>;
}

