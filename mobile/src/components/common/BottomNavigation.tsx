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
      borderTopColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    tabLabel: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: theme.colors.primary,
    },
    iconColor: (isActive: boolean) => {
      if (isActive) return theme.colors.primary;
      return isDark ? theme.colors.gray400 : theme.colors.textSecondary;
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
            style={[
              styles.tab,
              isActive && styles.tabActive,
              isActive && {
                backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
              }
            ]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={tab.icon as any}
                size={isActive ? 26 : 24}
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
                { fontSize: isActive ? 12 : 11, fontWeight: isActive ? '700' : '600' }
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md + 4, // Extra padding for safe area
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 12,
    minHeight: 64, // Ensure proper touch target
    marginHorizontal: 2,
  },
  tabActive: {
    borderRadius: 12,
  },
  tabLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontFamily: theme.fontFamilies.medium,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fontFamilies.bold,
    fontWeight: '700',
    fontSize: 12,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
    zIndex: 10,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.fontFamilies.bold,
    lineHeight: 12,
  },
});
