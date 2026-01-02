import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions';
import { EmployeePermission } from '../../constants/employeePermissions';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../constants/roles';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface EmployeePermissionGateProps {
  children: ReactNode;
  requiredPermission: EmployeePermission;
  salonId?: string;
  employeeId?: string;
  fallback?: ReactNode;
  showUnauthorizedMessage?: boolean;
  onUnauthorizedPress?: () => void;
}

/**
 * Component that conditionally renders children based on employee permissions
 * 
 * This checks if an employee has been granted specific granular permissions
 * by the salon owner. Owners always have access.
 * 
 * Usage:
 * <EmployeePermissionGate requiredPermission={EmployeePermission.MANAGE_APPOINTMENTS}>
 *   <CreateAppointmentButton />
 * </EmployeePermissionGate>
 */
export const EmployeePermissionGate: React.FC<EmployeePermissionGateProps> = ({
  children,
  requiredPermission,
  salonId,
  employeeId,
  fallback,
  showUnauthorizedMessage = false,
  onUnauthorizedPress,
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { hasPermission, loading } = useEmployeePermissions({
    salonId,
    employeeId,
    autoFetch: true,
  });

  // Owners always have access
  if (user?.role === UserRole.SALON_OWNER) {
    return <>{children}</>;
  }

  // Super admins and association admins have access
  if (
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ASSOCIATION_ADMIN
  ) {
    return <>{children}</>;
  }

  // For employees, check if they have the required permission
  if (user?.role === UserRole.SALON_EMPLOYEE) {
    if (loading) {
      // Show loading state
      return (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary }]}>
            Checking permissions...
          </Text>
        </View>
      );
    }

    const hasAccess = hasPermission(requiredPermission);

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }

      if (showUnauthorizedMessage) {
        return (
          <TouchableOpacity
            style={[
              styles.unauthorizedContainer,
              {
                backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
              },
            ]}
            onPress={onUnauthorizedPress}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="lock"
              size={48}
              color={isDark ? theme.colors.gray500 : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.unauthorizedText,
                { color: isDark ? theme.colors.white : theme.colors.text },
              ]}
            >
              Permission Required
            </Text>
            <Text
              style={[
                styles.unauthorizedSubtext,
                { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
              ]}
            >
              You need the "{requiredPermission.replace(/_/g, ' ')}" permission to access this feature.
              Contact your salon owner to request access.
            </Text>
            {onUnauthorizedPress && (
              <Text
                style={[
                  styles.contactOwnerText,
                  { color: theme.colors.primary },
                ]}
              >
                Tap to view your permissions
              </Text>
            )}
          </TouchableOpacity>
        );
      }

      return null;
    }
  }

  // Default: show children if access is granted
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  unauthorizedContainer: {
    padding: theme.spacing.xl,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
    margin: theme.spacing.md,
  },
  unauthorizedText: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  unauthorizedSubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactOwnerText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
    textDecorationLine: 'underline',
  },
});

