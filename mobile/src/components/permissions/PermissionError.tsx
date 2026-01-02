import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../context/PermissionContext';
import { PERMISSION_DESCRIPTIONS } from '../../constants/employeePermissions';

interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface PermissionErrorProps {
  code: string;
  message: string;
  permission?: string;
  permissionDescription?: string;
  salonId?: string;
  navigation?: NavigationProp;
  ownerContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  onRequestPermission?: () => void;
  onSwitchSalon?: () => void;
  onRetry?: () => void;
}

/**
 * PermissionError
 *
 * Displays actionable error messages when permission checks fail.
 * Provides clear next steps for the user.
 */
export function PermissionError({
  code,
  message,
  permission,
  permissionDescription,
  salonId,
  navigation,
  ownerContact,
  onRequestPermission,
  onSwitchSalon,
  onRetry,
}: PermissionErrorProps) {
  const { availableSalons, setActiveSalon, refreshPermissions } = usePermissions();

  const getIcon = () => {
    switch (code) {
      case 'PERMISSION_DENIED':
        return 'lock-closed-outline';
      case 'SALON_ID_REQUIRED':
        return 'business-outline';
      case 'EMPLOYEE_NOT_FOUND':
        return 'person-remove-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getTitle = () => {
    switch (code) {
      case 'PERMISSION_DENIED':
        return 'Permission Required';
      case 'SALON_ID_REQUIRED':
        return 'Select a Salon';
      case 'EMPLOYEE_NOT_FOUND':
        return 'Not Registered';
      default:
        return 'Access Restricted';
    }
  };

  const handleViewPermissions = () => {
    navigation?.navigate('MyPermissions');
  };

  const handleContactOwner = async () => {
    if (ownerContact?.phone) {
      const url = `tel:${ownerContact.phone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      }
    } else if (ownerContact?.email) {
      const url = `mailto:${ownerContact.email}`;
      Linking.openURL(url);
    }
  };

  const handleSwitchSalon = async (targetSalonId: string) => {
    try {
      await setActiveSalon(targetSalonId);
      onSwitchSalon?.();
    } catch (error) {
      console.error('Error switching salon:', error);
    }
  };

  const handleRetry = async () => {
    await refreshPermissions();
    onRetry?.();
  };

  const renderActions = () => {
    switch (code) {
      case 'PERMISSION_DENIED':
        return (
          <View style={styles.actions}>
            {onRequestPermission && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onRequestPermission}
              >
                <Ionicons name="hand-right-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Request Permission</Text>
              </TouchableOpacity>
            )}

            {ownerContact && (ownerContact.phone || ownerContact.email) && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleContactOwner}
              >
                <Ionicons
                  name={ownerContact.phone ? 'call-outline' : 'mail-outline'}
                  size={20}
                  color="#6B46C1"
                />
                <Text style={styles.secondaryButtonText}>
                  Contact {ownerContact.name || 'Owner'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'SALON_ID_REQUIRED':
        if (availableSalons.length > 0) {
          return (
            <View style={styles.salonList}>
              <Text style={styles.salonListTitle}>Select a salon:</Text>
              {availableSalons.map((salon) => (
                <TouchableOpacity
                  key={salon.salonId}
                  style={styles.salonItem}
                  onPress={() => handleSwitchSalon(salon.salonId)}
                >
                  <View style={styles.salonInfo}>
                    <Ionicons name="business" size={20} color="#6B46C1" />
                    <Text style={styles.salonName}>{salon.salonName}</Text>
                  </View>
                  <View style={styles.permissionBadge}>
                    <Text style={styles.permissionBadgeText}>
                      {salon.permissionCount} permissions
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        }
        return (
          <View style={styles.helpText}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#6B7280"
            />
            <Text style={styles.helpTextContent}>
              You are not currently associated with any salon. Please contact a
              salon owner to add you as an employee.
            </Text>
          </View>
        );

      case 'EMPLOYEE_NOT_FOUND':
        return (
          <View>
            {availableSalons.length > 0 && (
              <View style={styles.salonList}>
                <Text style={styles.salonListTitle}>
                  You are registered at these salons:
                </Text>
                {availableSalons.map((salon) => (
                  <TouchableOpacity
                    key={salon.salonId}
                    style={styles.salonItem}
                    onPress={() => handleSwitchSalon(salon.salonId)}
                  >
                    <View style={styles.salonInfo}>
                      <Ionicons name="business" size={20} color="#6B46C1" />
                      <Text style={styles.salonName}>{salon.salonName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.helpText}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#6B7280"
              />
              <Text style={styles.helpTextContent}>
                If you should be registered at this salon, please contact the
                salon owner to add you as an employee.
              </Text>
            </View>
          </View>
        );

      default:
        return (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
            <Ionicons name="refresh-outline" size={20} color="#6B46C1" />
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <Ionicons name={getIcon() as any} size={48} color="#EF4444" />
        </View>
      </View>

      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.message}>{message}</Text>

      {permission && (
        <View style={styles.permissionInfo}>
          <Text style={styles.permissionLabel}>Required Permission:</Text>
          <Text style={styles.permissionCode}>
            {permission.replace(/_/g, ' ')}
          </Text>
          {permissionDescription && (
            <Text style={styles.permissionDesc}>{permissionDescription}</Text>
          )}
        </View>
      )}

      {renderActions()}

      <TouchableOpacity
        style={styles.viewPermissionsLink}
        onPress={handleViewPermissions}
      >
        <Text style={styles.linkText}>View My Permissions →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Simplified permission denied message for inline use
 */
export function PermissionDeniedInline({
  permission,
  compact = false,
  navigation,
}: {
  permission: string;
  compact?: boolean;
  navigation?: NavigationProp;
}) {
  const description = PERMISSION_DESCRIPTIONS[permission as keyof typeof PERMISSION_DESCRIPTIONS];

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons name="lock-closed" size={16} color="#EF4444" />
        <Text style={styles.compactText}>
          Requires {permission.replace(/_/g, ' ')} permission
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      <View style={styles.inlineHeader}>
        <Ionicons name="lock-closed" size={20} color="#EF4444" />
        <Text style={styles.inlineTitle}>Permission Required</Text>
      </View>
      <Text style={styles.inlineMessage}>
        You need the "{permission.replace(/_/g, ' ')}" permission.
      </Text>
      {description && (
        <Text style={styles.inlineDescription}>{description}</Text>
      )}
      <TouchableOpacity
        style={styles.inlineLink}
        onPress={() => navigation?.navigate('MyPermissions')}
      >
        <Text style={styles.linkText}>View My Permissions</Text>
        <Ionicons name="arrow-forward" size={16} color="#6B46C1" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  permissionInfo: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  permissionLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    marginBottom: 4,
  },
  permissionCode: {
    fontSize: 16,
    color: '#78350F',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#6B46C1',
    fontWeight: '600',
    fontSize: 16,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  helpTextContent: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  salonList: {
    width: '100%',
    marginBottom: 16,
  },
  salonListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  salonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  salonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salonName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  permissionBadge: {
    backgroundColor: '#E9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionBadgeText: {
    fontSize: 12,
    color: '#6B46C1',
    fontWeight: '500',
  },
  viewPermissionsLink: {
    marginTop: 24,
    paddingVertical: 8,
  },
  linkText: {
    color: '#6B46C1',
    fontSize: 14,
    fontWeight: '600',
  },
  // Inline styles
  inlineContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
  },
  inlineMessage: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  inlineDescription: {
    fontSize: 12,
    color: '#991B1B',
    marginBottom: 12,
  },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  compactText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
