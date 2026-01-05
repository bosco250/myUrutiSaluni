import { useAuth } from '../context/AuthContext';
import {
  Screen,
  Action,
  Feature,
  canAccessScreen,
  canPerformAction,
  canSeeFeature,
  getAccessibleScreens,
  getAllowedActions,
  getVisibleFeatures,
  getDefaultHomeScreen,
} from '../constants/permissions';

/**
 * Hook for checking permissions based on current user's role
 * 
 * This provides a convenient way to check permissions throughout the app
 * All permission checks reference the centralized permissions configuration
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    // Screen access
    canAccessScreen: (screen: Screen) => canAccessScreen(userRole, screen),
    getAccessibleScreens: () => getAccessibleScreens(userRole),
    getDefaultHomeScreen: () => getDefaultHomeScreen(userRole),
    
    // Action permissions
    canPerformAction: (action: Action) => canPerformAction(userRole, action),
    getAllowedActions: () => getAllowedActions(userRole),
    
    // Feature visibility
    canSeeFeature: (feature: Feature) => canSeeFeature(userRole, feature),
    getVisibleFeatures: () => getVisibleFeatures(userRole),
    
    // Convenience getters
    userRole,
  };
};
