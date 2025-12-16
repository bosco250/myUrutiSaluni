import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePermissions } from '../hooks/usePermissions';
import { Screen, Action, Feature } from '../constants/permissions';
import { theme } from '../theme';

interface PermissionGateProps {
  children: ReactNode;
  requiredScreen?: Screen;
  requiredAction?: Action;
  requiredFeature?: Feature;
  fallback?: ReactNode;
  showUnauthorizedMessage?: boolean;
}

/**
 * Component that conditionally renders children based on permissions
 * 
 * This is more granular than RoleGate - it checks specific permissions
 * from the centralized permissions configuration.
 * 
 * Usage:
 * <PermissionGate requiredAction={Action.CREATE_BOOKING}>
 *   <BookButton />
 * </PermissionGate>
 * 
 * <PermissionGate requiredFeature={Feature.LOYALTY_POINTS}>
 *   <LoyaltySection />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredScreen,
  requiredAction,
  requiredFeature,
  fallback,
  showUnauthorizedMessage = false,
}) => {
  const permissions = usePermissions();

  // Determine if user has access
  let hasAccess = true;

  if (requiredScreen) {
    hasAccess = permissions.canAccessScreen(requiredScreen);
  } else if (requiredAction) {
    hasAccess = permissions.canPerformAction(requiredAction);
  } else if (requiredFeature) {
    hasAccess = permissions.canSeeFeature(requiredFeature);
  }

  // If no access, show fallback or unauthorized message
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUnauthorizedMessage) {
      return (
        <View style={styles.unauthorizedContainer}>
          <MaterialIcons name="lock" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.unauthorizedText}>
            You don't have permission to access this feature
          </Text>
          <Text style={styles.roleText}>
            Your role: {permissions.userRole}
          </Text>
        </View>
      );
    }

    return null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  unauthorizedText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  roleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
});
