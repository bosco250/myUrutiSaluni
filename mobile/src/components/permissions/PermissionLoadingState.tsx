import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { usePermissions } from '../../context/PermissionContext';
import { EmployeePermission } from '../../constants/employeePermissions';

interface PermissionLoadingStateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoadingMessage?: boolean;
  loadingText?: string;
  style?: ViewStyle;
}

/**
 * PermissionLoadingState
 *
 * Wraps content that requires permissions to be loaded.
 * Shows a loading indicator while permissions are being fetched.
 * This ensures users never see "No permission" while permissions are still loading.
 */
export function PermissionLoadingState({
  children,
  fallback,
  showLoadingMessage = true,
  loadingText = 'Loading permissions...',
  style,
}: PermissionLoadingStateProps) {
  const { isLoading, isInitialized } = usePermissions();

  // Show loading state
  if (isLoading || !isInitialized) {
    if (fallback) return <>{fallback}</>;
    if (!showLoadingMessage) return null;

    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#6B46C1" />
        <Text style={styles.text}>{loadingText}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  permission: EmployeePermission | EmployeePermission[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  showDenied?: boolean;
  deniedMessage?: string;
}

/**
 * PermissionGate
 *
 * Controls visibility of content based on permissions.
 * Handles loading states properly to never show "denied" while loading.
 *
 * @example
 * <PermissionGate permission={EmployeePermission.MANAGE_APPOINTMENTS}>
 *   <CreateAppointmentButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  mode = 'any',
  children,
  fallback = null,
  showLoading = true,
  showDenied = false,
  deniedMessage = 'You do not have permission to access this feature.',
}: PermissionGateProps) {
  const {
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    isInitialized,
    isOwner,
    isAdmin,
  } = usePermissions();

  // Owners and admins always have access
  if (isOwner || isAdmin) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading || !isInitialized) {
    if (!showLoading) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B46C1" />
      </View>
    );
  }

  // Check permissions
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess =
    mode === 'all'
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show denied state or fallback
  if (showDenied) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedText}>{deniedMessage}</Text>
      </View>
    );
  }

  return <>{fallback}</>;
}

interface PermissionSwitchProps {
  permission: EmployeePermission;
  whenGranted: React.ReactNode;
  whenDenied: React.ReactNode;
  whenLoading?: React.ReactNode;
}

/**
 * PermissionSwitch
 *
 * Renders different content based on permission status.
 * Useful when you need to show alternative UI for denied users.
 */
export function PermissionSwitch({
  permission,
  whenGranted,
  whenDenied,
  whenLoading,
}: PermissionSwitchProps) {
  const { hasPermission, isLoading, isInitialized, isOwner, isAdmin } =
    usePermissions();

  // Owners and admins always have access
  if (isOwner || isAdmin) {
    return <>{whenGranted}</>;
  }

  // Show loading state
  if (isLoading || !isInitialized) {
    if (whenLoading) return <>{whenLoading}</>;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B46C1" />
      </View>
    );
  }

  return hasPermission(permission) ? <>{whenGranted}</> : <>{whenDenied}</>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedContainer: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  deniedText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
});
