import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface BottomNavigationProps {
  activeTab: 'home' | 'bookings' | 'explore' | 'favorites' | 'profile';
  onTabPress: (tab: 'home' | 'bookings' | 'explore' | 'favorites' | 'profile') => void;
}

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: 'home' },
    { id: 'bookings' as const, label: 'Bookings', icon: 'event' },
    { id: 'explore' as const, label: 'Explore', icon: 'explore' },
    { id: 'favorites' as const, label: 'Favorites', icon: 'favorite' },
    { id: 'profile' as const, label: 'Profile', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={24}
              color={isActive ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
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
    shadowColor: '#000',
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
});

