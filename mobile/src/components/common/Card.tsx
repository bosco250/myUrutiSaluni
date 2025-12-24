import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Standardized Card Component
 * Mobile-optimized with proper spacing and touch targets
 */
export default function Card({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'medium',
}: CardProps) {
  const { isDark } = useTheme();

  const paddingStyles = {
    none: {},
    small: { padding: theme.componentSpacing.cardPadding / 2 },
    medium: { padding: theme.componentSpacing.cardPadding },
    large: { padding: theme.componentSpacing.cardPaddingLarge },
  };

  const dynamicStyles = {
    default: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    elevated: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: theme.sizes.elevation.md,
    },
    outlined: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  const cardStyle = [
    styles.card,
    dynamicStyles[variant],
    paddingStyles[padding],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.sizes.radius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
});

