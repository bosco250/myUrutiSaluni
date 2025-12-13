import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface BottomNavigationProps {
  activeTab: 'home' | 'bookings' | 'explore' | 'notifications' | 'profile';
  onTabPress: (tab: 'home' | 'bookings' | 'explore' | 'notifications' | 'profile') => void;
  unreadNotificationCount?: number;
}

export default function BottomNavigation({ activeTab, onTabPress, unreadNotificationCount = 0 }: BottomNavigationProps) {
  const { isDark } = useTheme();
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: 'home' },
    { id: 'bookings' as const, label: 'Bookings', icon: 'event' as any },
    { id: 'explore' as const, label: 'Explore', icon: 'explore' },
    { id: 'notifications' as const, label: 'Notifications', icon: 'notifications' },
    { id: 'profile' as const, label: 'Profile', icon: 'person' },
  ];

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
                size={24}
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: theme.spacing.xs,
  },
  tabLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30', // Red color for badge
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    lineHeight: 12,
  },
});

