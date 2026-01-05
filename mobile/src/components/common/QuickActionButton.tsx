import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: string;
}

export default function QuickActionButton({ icon, label, onPress, badge }: QuickActionButtonProps) {
  const { isDark } = useTheme();

  const dynamicStyles = {
    button: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      shadowColor: isDark ? "#000" : "#000",
    },
    label: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
  };

  return (
    <TouchableOpacity
      style={[styles.button, dynamicStyles.button]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {badge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={icon as any}
          size={28}
          color={theme.colors.primary}
        />
      </View>
      <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    minHeight: 100,
    // Premium soft shadow instead of border
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: theme.spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(200, 155, 104, 0.1)", // Primary with low opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
    fontWeight: "600",
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.error, // Red for attention
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

