import { Screen } from '../constants/permissions';
import { EmployeePermission } from '../constants/employeePermissions';
import { UserRole } from '../constants/roles';
import { canAccessScreen, isPublicScreen } from './permissionNavigation';

/**
 * Navigation guard result
 */
export interface NavigationGuardResult {
  canNavigate: boolean;
  reason?: string;
  alternativeScreen?: Screen;
}

/**
 * Check if navigation to a screen should be allowed
 */
export function checkNavigationPermission(
  screen: Screen | string,
  userRole: UserRole | string | undefined,
  hasPermission: (permission: EmployeePermission) => boolean,
  isOwner: boolean,
  isAdmin: boolean
): NavigationGuardResult {
  // Use screen name directly (string) for permission checking
  const targetScreen = typeof screen === 'string' ? screen : screen;

  // Customers can access all their screens without permission checks
  if (userRole === UserRole.CUSTOMER || userRole === 'customer') {
    return { canNavigate: true };
  }

  // Public screens are always accessible
  if (isPublicScreen(targetScreen, userRole)) {
    return { canNavigate: true };
  }

  // Check if user can access the screen
  const canAccess = canAccessScreen(
    targetScreen,
    userRole,
    hasPermission,
    isOwner,
    isAdmin
  );

  if (canAccess) {
    return { canNavigate: true };
  }

  // User cannot access - provide reason and alternative
  return {
    canNavigate: false,
    reason: `You don't have permission to access ${screen}. Contact your salon owner to request access.`,
    alternativeScreen: Screen.HOME, // Default fallback
  };
}

/**
 * Navigation guard hook result
 */
export interface UseNavigationGuardResult {
  canNavigate: (screen: Screen | string) => NavigationGuardResult;
  navigateWithGuard: (
    screen: Screen | string,
    params?: any,
    onUnauthorized?: () => void
  ) => void;
}

/**
 * Create a navigation guard
 */
export function createNavigationGuard(
  userRole: UserRole | string | undefined,
  hasPermission: (permission: EmployeePermission) => boolean,
  isOwner: boolean,
  isAdmin: boolean,
  navigate: (screen: string, params?: any) => void
): UseNavigationGuardResult {
  const canNavigate = (screen: Screen | string): NavigationGuardResult => {
    return checkNavigationPermission(
      screen,
      userRole,
      hasPermission,
      isOwner,
      isAdmin
    );
  };

  const navigateWithGuard = (
    screen: Screen | string,
    params?: any,
    onUnauthorized?: () => void
  ) => {
    const result = canNavigate(screen);
    
    if (result.canNavigate) {
      navigate(screen as string, params);
    } else {
      // Show unauthorized message or navigate to alternative
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Default: navigate to home or show alert
        if (result.alternativeScreen) {
          navigate(result.alternativeScreen as string);
        }
      }
    }
  };

  return { canNavigate, navigateWithGuard };
}

