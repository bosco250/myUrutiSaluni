import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { getNavigationTabsForRole, NavigationTab } from '../../navigation/navigationConfig';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';
// Removed unused imports - useEmployeePermissionCheck handles salon loading

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabId: string) => void;
  unreadNotificationCount?: number;
  currentScreen?: string; // Current screen name to detect salon view mode
  tabsOverride?: NavigationTab[]; // Caller-supplied tabs (used in guest mode)
}

/**
 * Role-aware bottom navigation component
 * Displays different tabs based on the user's role
 * Memoized to prevent unnecessary re-renders
 */
const BottomNavigation = React.memo(function BottomNavigation({
  activeTab,
  onTabPress,
  unreadNotificationCount = 0,
  currentScreen,
  tabsOverride,
}: BottomNavigationProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Use permission check hook - it will automatically load salonId and employeeId
  const {
    checkPermission,
    isOwner,
    isAdmin,
    hasOwnerLevelPermissions, // Check if employee has owner-level permissions
  } = useEmployeePermissionCheck({
    autoFetch: true,
  });

  // Get tabs based on user's role, filtered by permissions.
  // When tabsOverride is supplied (e.g. guest mode) use it directly.
  const tabs = React.useMemo(() => {
    if (tabsOverride) return tabsOverride;
    const calculatedTabs = getNavigationTabsForRole(
      user?.role,
      checkPermission,
      isOwner || false,
      isAdmin || false,
      hasOwnerLevelPermissions || false,
      currentScreen // Pass current screen to detect salon mode
    );

    return calculatedTabs;
  }, [tabsOverride, user?.role, checkPermission, isOwner, isAdmin, hasOwnerLevelPermissions, currentScreen]);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === 'notifications' && unreadNotificationCount > 0;
        
        // Active color configuration
        const activeColor = theme.colors.primary;
        const inactiveColor = isDark ? theme.colors.gray400 : theme.colors.textSecondary;
        const pillColor = isDark ? theme.colors.primary + '30' : theme.colors.primary + '15';

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[
              styles.iconContainer,
              isActive && { backgroundColor: pillColor }
            ]}>
              <MaterialIcons
                name={tab.icon as any}
                size={24}
                color={isActive ? activeColor : inactiveColor}
              />
              {showBadge && (
                <View style={[styles.badge, { borderColor: isDark ? theme.colors.gray900 : theme.colors.background }]}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? activeColor : inactiveColor, fontWeight: '700' }
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

export default BottomNavigation;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    
    // Premium Shadow / Soft Lift
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20, // ensure it sits above content
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 56,
  },
  iconContainer: {
    width: 60, // Wide Pill shape
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    fontFamily: theme.fontFamilies.medium,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 12,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
