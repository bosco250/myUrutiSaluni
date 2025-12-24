import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { getNavigationTabsForRole } from '../../navigation/navigationConfig';

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabId: string) => void;
  unreadNotificationCount?: number;
}

/**
 * Role-aware bottom navigation component
 * Displays different tabs based on the user's role
 */
export default function BottomNavigation({ 
  activeTab, 
  onTabPress, 
  unreadNotificationCount = 0 
}: BottomNavigationProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  // Get tabs based on user's role
  const tabs = getNavigationTabsForRole(user?.role);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderTopColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    tabLabel: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: theme.colors.primary,
    },
    iconColor: (isActive: boolean) => {
      if (isActive) return theme.colors.primary;
      return isDark ? theme.colors.gray600 : theme.colors.textSecondary;
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === 'notifications' && unreadNotificationCount > 0;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={tab.icon as any}
                size={theme.sizes.icon.md}
                color={dynamicStyles.iconColor(isActive)}
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
                isActive ? [styles.tabLabelActive, dynamicStyles.tabLabelActive] : dynamicStyles.tabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderTopWidth: theme.sizes.divider.thin,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm + 4, // Extra padding for safe area
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: theme.sizes.elevation.md,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: theme.spacing.xs,
    minHeight: theme.touchTargets.comfortable, // Ensure proper touch target
  },
  tabLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fontFamilies.regular,
  },
  tabLabelActive: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fontFamilies.medium,
    fontWeight: '600',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: theme.sizes.icon.md,
    height: theme.sizes.icon.md,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.error,
    borderRadius: theme.sizes.badge.md / 2,
    minWidth: theme.sizes.badge.md,
    height: theme.sizes.badge.md,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
    zIndex: 10,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.fontFamilies.bold,
    lineHeight: 12,
  },
});
