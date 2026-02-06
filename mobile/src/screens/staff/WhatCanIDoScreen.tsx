import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { usePermissions } from '../../context/PermissionContext';
import { useTheme } from '../../context';
import { theme } from '../../theme';
import {
  EmployeePermission,
  PERMISSION_DESCRIPTIONS,
  getPermissionCategory,
  PermissionCategory,
} from '../../constants/employeePermissions';
import { getScreensForPermissions } from '../../utils/permissionNavigation';

// Category configuration with icons (colors will be from theme)
const CATEGORY_CONFIG: Record<
  PermissionCategory,
  { icon: string; colorKey: keyof typeof theme.colors; label: string }
> = {
  APPOINTMENTS: {
    icon: 'event',
    colorKey: 'info',
    label: 'Appointments',
  },
  SERVICES: { icon: 'content-cut', colorKey: 'secondary', label: 'Services' },
  CUSTOMERS: { icon: 'people', colorKey: 'success', label: 'Customers' },
  SALES: { icon: 'payments', colorKey: 'warning', label: 'Sales & Finance' },
  STAFF: { icon: 'person', colorKey: 'error', label: 'Staff' },
  INVENTORY: { icon: 'inventory-2', colorKey: 'primary', label: 'Inventory' },
  SALON: { icon: 'business', colorKey: 'infoDark', label: 'Salon Settings' },
};

// Map screens to friendly names (using MaterialIcons)
const SCREEN_NAMES: Record<string, { name: string; icon: string }> = {
  SalonAppointments: { name: 'All Appointments', icon: 'event' },
  CreateAppointment: { name: 'Create Appointment', icon: 'add-circle' },
  AppointmentDetail: { name: 'Appointment Details', icon: 'description' },
  Appointments: { name: 'My Appointments', icon: 'event-note' },
  AllServices: { name: 'Manage Services', icon: 'content-cut' },
  AddService: { name: 'Add Service', icon: 'add' },
  ServiceDetail: { name: 'Service Details', icon: 'description' },
  StockManagement: { name: 'Inventory', icon: 'inventory-2' },
  InventoryManagement: { name: 'Stock Management', icon: 'layers' },
  AddProduct: { name: 'Add Product', icon: 'add-box' },
  CustomerManagement: { name: 'Customers', icon: 'people' },
  CustomerDetail: { name: 'Customer Details', icon: 'person' },
  Sales: { name: 'Sales', icon: 'point-of-sale' },
  SaleDetail: { name: 'Sale Details', icon: 'receipt' },
  SalesHistory: { name: 'Sales History', icon: 'history' },
  BusinessAnalytics: { name: 'Analytics', icon: 'bar-chart' },
  StaffManagement: { name: 'Staff', icon: 'people' },
  Commissions: { name: 'Commissions', icon: 'account-balance-wallet' },
  MySchedule: { name: 'My Schedule', icon: 'schedule' },
  SalonSettings: { name: 'Salon Settings', icon: 'settings' },
  SalonDetail: { name: 'Salon Profile', icon: 'business' },
};

interface WhatCanIDoScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

export function WhatCanIDoScreen({ navigation }: WhatCanIDoScreenProps = {}) {
  const { isDark } = useTheme();
  const {
    permissions,
    activeSalon,
    availableSalons,
    isOwner,
    isAdmin,
    isEmployee,
    isLoading,
    refreshPermissions,
    setActiveSalon,
  } = usePermissions();

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
      borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Partial<Record<PermissionCategory, EmployeePermission[]>> =
      {};

    permissions.forEach((perm) => {
      const category = getPermissionCategory(perm);
      if (!grouped[category]) grouped[category] = [];
      grouped[category]!.push(perm);
    });

    return grouped;
  }, [permissions]);

  // Get accessible screens
  const accessibleScreens = useMemo(() => {
    const screens = getScreensForPermissions(permissions);
    // Filter to only show screens with friendly names
    return screens.filter((screen) => SCREEN_NAMES[screen]);
  }, [permissions]);

  const handleNavigateToScreen = (screen: string) => {
    try {
      navigation?.navigate(screen, {
        salonId: activeSalon?.salonId,
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSwitchSalon = async (salonId: string) => {
    try {
      await setActiveSalon(salonId);
    } catch (error) {
      console.error('Error switching salon:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header with Back Button */}
      <View style={[styles.topHeader, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>My Access Control</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={[styles.container, dynamicStyles.container]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshPermissions}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.title, dynamicStyles.text]}>What Can I Do?</Text>
          <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
            {activeSalon?.salonName || 'Your capabilities'} •{' '}
            {permissions.length} active permissions
          </Text>
        </View>

      {/* Owner/Admin Badge */}
      {(isOwner || isAdmin) && (
        <View style={[styles.ownerBadge, { backgroundColor: theme.colors.success }]}>
          <MaterialIcons name="verified-user" size={24} color={theme.colors.white} />
          <View style={styles.ownerBadgeContent}>
            <Text style={styles.ownerBadgeTitle}>
              {isOwner ? 'Salon Owner' : 'Administrator'}
            </Text>
            <Text style={styles.ownerBadgeText}>
              You have full access to all features
            </Text>
          </View>
        </View>
      )}

      {/* Multi-Salon Selector */}
      {isEmployee && availableSalons.length > 1 && (
        <View style={styles.salonSelector}>
          <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>YOUR SALONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableSalons.map((salon) => (
              <TouchableOpacity
                key={salon.salonId}
                style={[
                  styles.salonChip,
                  dynamicStyles.card,
                  salon.salonId === activeSalon?.salonId && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => handleSwitchSalon(salon.salonId)}
              >
                <Text
                  style={[
                    styles.salonChipText,
                    salon.salonId === activeSalon?.salonId
                      ? { color: theme.colors.white }
                      : dynamicStyles.text,
                  ]}
                >
                  {salon.salonName}
                </Text>
                <View
                  style={[
                    styles.salonChipBadge,
                    salon.salonId === activeSalon?.salonId
                      ? { backgroundColor: theme.colors.primary + '40' }
                      : { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 },
                  ]}
                >
                  <Text
                    style={[
                      styles.salonChipBadgeText,
                      salon.salonId === activeSalon?.salonId
                        ? { color: theme.colors.white }
                        : dynamicStyles.textSecondary,
                    ]}
                  >
                    {salon.permissionCount}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Permission Categories */}
      {isEmployee && permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>YOUR PERMISSIONS</Text>

          {Object.entries(permissionsByCategory).map(([category, perms]) => {
            const config = CATEGORY_CONFIG[category as PermissionCategory];
            if (!perms || perms.length === 0) return null;
            const categoryColor = theme.colors[config.colorKey];

            return (
              <View key={category} style={[styles.categoryCard, dynamicStyles.card]}>
                <View
                  style={[
                    styles.categoryHeader,
                    { backgroundColor: categoryColor + '15' },
                  ]}
                >
                  <MaterialIcons
                    name={config.icon as any}
                    size={24}
                    color={categoryColor}
                  />
                  <Text style={[styles.categoryLabel, { color: categoryColor }]}>
                    {config.label}
                  </Text>
                  <View
                    style={[styles.countBadge, { backgroundColor: categoryColor }]}
                  >
                    <Text style={styles.countText}>{perms.length}</Text>
                  </View>
                </View>

                {perms.map((perm) => (
                  <View key={perm} style={[styles.permissionItem, { borderTopColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <View style={styles.permissionContent}>
                      <Text style={[styles.permissionName, dynamicStyles.text]}>
                        {perm
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={[styles.permissionDesc, dynamicStyles.textSecondary]}>
                        {PERMISSION_DESCRIPTIONS[perm]}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* No Permissions */}
      {isEmployee && permissions.length === 0 && (
        <View style={[styles.emptyState, dynamicStyles.card]}>
          <MaterialIcons name="lock-open" size={48} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Permissions Yet</Text>
          <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
            Your salon owner hasn't granted you any specific permissions yet.
            Contact them to get access to more features.
          </Text>
        </View>
      )}

      {/* Accessible Screens */}
      {accessibleScreens.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>FEATURES YOU CAN ACCESS</Text>
          <View style={styles.screenGrid}>
            {accessibleScreens.slice(0, 12).map((screen) => {
              const info = SCREEN_NAMES[screen];
              return (
                <TouchableOpacity
                  key={screen}
                  style={[styles.screenItem, dynamicStyles.card]}
                  onPress={() => handleNavigateToScreen(screen)}
                >
                  <View style={[styles.screenIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <MaterialIcons
                      name={info.icon as any}
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={[styles.screenName, dynamicStyles.text]} numberOfLines={2}>
                    {info.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>QUICK ACTIONS</Text>

        <TouchableOpacity
          style={[styles.actionCard, dynamicStyles.card]}
          onPress={() => navigation?.navigate('MyPermissions')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
            <MaterialIcons name="vpn-key" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, dynamicStyles.text]}>View Permission Details</Text>
            <Text style={[styles.actionDesc, dynamicStyles.textSecondary]}>
              See when permissions were granted and by whom
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, dynamicStyles.card]}
          onPress={() => refreshPermissions()}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
            <MaterialIcons name="refresh" size={24} color={theme.colors.success} />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, dynamicStyles.text]}>Refresh Permissions</Text>
            <Text style={[styles.actionDesc, dynamicStyles.textSecondary]}>
              Check for newly granted permissions
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>
      </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  ownerBadgeContent: {
    flex: 1,
  },
  ownerBadgeTitle: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 18,
    fontFamily: theme.fonts.bold,
  },
  ownerBadgeText: {
    color: theme.colors.white,
    opacity: 0.9,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  salonSelector: {
    padding: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  salonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    gap: theme.spacing.xs,
  },
  salonChipText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  salonChipBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
  },
  salonChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  section: {
    padding: theme.spacing.md,
  },
  categoryCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryLabel: {
    flex: 1,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  permissionContent: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  permissionDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  screenItem: {
    flex: 1,
    minWidth: '28%',
    maxWidth: '32%',
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  screenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  screenName: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  actionDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  footer: {
    height: 40,
  },
});

export default WhatCanIDoScreen;
