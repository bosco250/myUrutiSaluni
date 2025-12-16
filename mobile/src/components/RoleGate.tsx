import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRole } from '../hooks/useRole';
import { UserRole } from '../constants/roles';
import { theme } from '../theme';

interface RoleGateProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  minimumRole?: UserRole;
  adminOnly?: boolean;
  salonStaffOnly?: boolean;
  customerOnly?: boolean;
  fallback?: ReactNode;
  showUnauthorizedMessage?: boolean;
}

/**
 * Component that conditionally renders children based on user role
 * 
 * Usage:
 * <RoleGate requiredRole={UserRole.SALON_OWNER}>
 *   <SalonOwnerFeature />
 * </RoleGate>
 * 
 * <RoleGate requiredRoles={[UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
 *   <SalonStaffFeature />
 * </RoleGate>
 * 
 * <RoleGate adminOnly>
 *   <AdminFeature />
 * </RoleGate>
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  requiredRole,
  requiredRoles,
  minimumRole,
  adminOnly,
  salonStaffOnly,
  customerOnly,
  fallback,
  showUnauthorizedMessage = false,
}) => {
  const role = useRole();

  // Determine if user has access
  let hasAccess = true;

  if (requiredRole) {
    hasAccess = role.hasRole(requiredRole);
  } else if (requiredRoles) {
    hasAccess = role.hasAnyRole(requiredRoles);
  } else if (minimumRole) {
    hasAccess = role.hasMinimumRole(minimumRole);
  } else if (adminOnly) {
    hasAccess = role.isAdmin;
  } else if (salonStaffOnly) {
    hasAccess = role.isSalonStaff;
  } else if (customerOnly) {
    hasAccess = role.isCustomer;
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
            Your role: {role.roleName}
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
