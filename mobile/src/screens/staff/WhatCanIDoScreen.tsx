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
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../context/PermissionContext';
import {
  EmployeePermission,
  PERMISSION_DESCRIPTIONS,
  getPermissionCategory,
  PermissionCategory,
} from '../../constants/employeePermissions';
import { getScreensForPermissions } from '../../utils/permissionNavigation';

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<
  PermissionCategory,
  { icon: string; color: string; label: string }
> = {
  APPOINTMENTS: {
    icon: 'calendar-outline',
    color: '#3B82F6',
    label: 'Appointments',
  },
  SERVICES: { icon: 'cut-outline', color: '#8B5CF6', label: 'Services' },
  CUSTOMERS: { icon: 'people-outline', color: '#10B981', label: 'Customers' },
  SALES: { icon: 'cash-outline', color: '#F59E0B', label: 'Sales & Finance' },
  STAFF: { icon: 'person-outline', color: '#EC4899', label: 'Staff' },
  INVENTORY: { icon: 'cube-outline', color: '#6366F1', label: 'Inventory' },
  SALON: { icon: 'business-outline', color: '#14B8A6', label: 'Salon Settings' },
};

// Map screens to friendly names
const SCREEN_NAMES: Record<string, { name: string; icon: string }> = {
  SalonAppointments: { name: 'All Appointments', icon: 'calendar' },
  CreateAppointment: { name: 'Create Appointment', icon: 'add-circle' },
  AppointmentDetail: { name: 'Appointment Details', icon: 'document-text' },
  Appointments: { name: 'My Appointments', icon: 'calendar-outline' },
  AllServices: { name: 'Manage Services', icon: 'cut' },
  AddService: { name: 'Add Service', icon: 'add' },
  ServiceDetail: { name: 'Service Details', icon: 'document' },
  StockManagement: { name: 'Inventory', icon: 'cube' },
  InventoryManagement: { name: 'Stock Management', icon: 'layers' },
  AddProduct: { name: 'Add Product', icon: 'add' },
  CustomerManagement: { name: 'Customers', icon: 'people' },
  CustomerDetail: { name: 'Customer Details', icon: 'person' },
  Sales: { name: 'Sales', icon: 'cash' },
  SaleDetail: { name: 'Sale Details', icon: 'receipt' },
  SalesHistory: { name: 'Sales History', icon: 'time' },
  BusinessAnalytics: { name: 'Analytics', icon: 'bar-chart' },
  StaffManagement: { name: 'Staff', icon: 'people' },
  Commissions: { name: 'Commissions', icon: 'wallet' },
  MySchedule: { name: 'My Schedule', icon: 'time' },
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Access Control</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshPermissions} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What Can I Do?</Text>
          <Text style={styles.subtitle}>
            {activeSalon?.salonName || 'Your capabilities'} •{' '}
            {permissions.length} active permissions
          </Text>
        </View>

      {/* Owner/Admin Badge */}
      {(isOwner || isAdmin) && (
        <View style={styles.ownerBadge}>
          <Ionicons name="shield-checkmark" size={24} color="#fff" />
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
          <Text style={styles.sectionLabel}>YOUR SALONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableSalons.map((salon) => (
              <TouchableOpacity
                key={salon.salonId}
                style={[
                  styles.salonChip,
                  salon.salonId === activeSalon?.salonId &&
                    styles.salonChipActive,
                ]}
                onPress={() => handleSwitchSalon(salon.salonId)}
              >
                <Text
                  style={[
                    styles.salonChipText,
                    salon.salonId === activeSalon?.salonId &&
                      styles.salonChipTextActive,
                  ]}
                >
                  {salon.salonName}
                </Text>
                <View
                  style={[
                    styles.salonChipBadge,
                    salon.salonId === activeSalon?.salonId &&
                      styles.salonChipBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.salonChipBadgeText,
                      salon.salonId === activeSalon?.salonId &&
                        styles.salonChipBadgeTextActive,
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
          <Text style={styles.sectionLabel}>YOUR PERMISSIONS</Text>

          {Object.entries(permissionsByCategory).map(([category, perms]) => {
            const config = CATEGORY_CONFIG[category as PermissionCategory];
            if (!perms || perms.length === 0) return null;

            return (
              <View key={category} style={styles.categoryCard}>
                <View
                  style={[
                    styles.categoryHeader,
                    { backgroundColor: config.color + '15' },
                  ]}
                >
                  <Ionicons
                    name={config.icon as any}
                    size={24}
                    color={config.color}
                  />
                  <Text style={[styles.categoryLabel, { color: config.color }]}>
                    {config.label}
                  </Text>
                  <View
                    style={[styles.countBadge, { backgroundColor: config.color }]}
                  >
                    <Text style={styles.countText}>{perms.length}</Text>
                  </View>
                </View>

                {perms.map((perm) => (
                  <View key={perm} style={styles.permissionItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                    />
                    <View style={styles.permissionContent}>
                      <Text style={styles.permissionName}>
                        {perm
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={styles.permissionDesc}>
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
        <View style={styles.emptyState}>
          <Ionicons name="lock-open-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Permissions Yet</Text>
          <Text style={styles.emptyText}>
            Your salon owner hasn't granted you any specific permissions yet.
            Contact them to get access to more features.
          </Text>
        </View>
      )}

      {/* Accessible Screens */}
      {accessibleScreens.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEATURES YOU CAN ACCESS</Text>
          <View style={styles.screenGrid}>
            {accessibleScreens.slice(0, 12).map((screen) => {
              const info = SCREEN_NAMES[screen];
              return (
                <TouchableOpacity
                  key={screen}
                  style={styles.screenItem}
                  onPress={() => handleNavigateToScreen(screen)}
                >
                  <View style={styles.screenIcon}>
                    <Ionicons
                      name={info.icon as any}
                      size={24}
                      color="#6B46C1"
                    />
                  </View>
                  <Text style={styles.screenName} numberOfLines={2}>
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
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation?.navigate('MyPermissions')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="key-outline" size={24} color="#6B46C1" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Permission Details</Text>
            <Text style={styles.actionDesc}>
              See when permissions were granted and by whom
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => refreshPermissions()}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="refresh-outline" size={24} color="#10B981" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Refresh Permissions</Text>
            <Text style={styles.actionDesc}>
              Check for newly granted permissions
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
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
    backgroundColor: '#fff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  ownerBadgeContent: {
    flex: 1,
  },
  ownerBadgeTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  ownerBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  salonSelector: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  salonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  salonChipActive: {
    backgroundColor: '#6B46C1',
    borderColor: '#6B46C1',
  },
  salonChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  salonChipTextActive: {
    color: '#fff',
  },
  salonChipBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  salonChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  salonChipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  salonChipBadgeTextActive: {
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  categoryLabel: {
    flex: 1,
    fontWeight: '600',
    fontSize: 16,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  permissionItem: {
    flexDirection: 'row',
    padding: 12,
    paddingLeft: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  screenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenItem: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  screenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  screenName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  actionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    height: 40,
  },
});

export default WhatCanIDoScreen;
