'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requireAll?: boolean;
  redirectTo?: string;
}

/**
 * Component that protects routes based on user role
 * Redirects to login or specified route if user doesn't have required permissions
 * 
 * @example
 * <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN]}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requireAll = false,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, hasAnyRole, hasAllRoles, userRole } = usePermissions();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // If roles are specified, check permissions
    if (requiredRoles.length > 0) {
      const hasAccess = requireAll
        ? hasAllRoles(requiredRoles)
        : hasAnyRole(requiredRoles);

      if (!hasAccess) {
        // Redirect to unauthorized page or dashboard
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, userRole, requiredRoles, requireAll, hasAnyRole, hasAllRoles, router, redirectTo]);

  // Show loading state while checking
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check permissions before rendering
  if (requiredRoles.length > 0) {
    const hasAccess = requireAll
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
          <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
              You don't have permission to access this page. Required roles:{' '}
              {requiredRoles.map((r) => r.replace('_', ' ')).join(', ')}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

