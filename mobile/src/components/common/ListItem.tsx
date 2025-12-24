import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onPress?: () => void;
  style?: ViewStyle;
  showChevron?: boolean;
  disabled?: boolean;
}

/**
 * Standardized List Item Component
 * Mobile-optimized with proper touch targets and spacing
 */
export default function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  style,
  showChevron = true,
  disabled = false,
}: ListItemProps) {
  const { isDark } = useTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    title: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    subtitle: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    icon: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  const content = (
    <View style={[styles.container, dynamicStyles.container, style]}>
      {leftIcon && (
        <View style={styles.leftIconContainer}>
          <MaterialIcons
            name={leftIcon as any}
            size={theme.sizes.icon.md}
            color={dynamicStyles.icon.color}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text
          style={[styles.title, dynamicStyles.title]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, dynamicStyles.subtitle]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && (
        <View style={styles.rightIconContainer}>
          <MaterialIcons
            name={rightIcon as any}
            size={theme.sizes.icon.md}
            color={dynamicStyles.icon.color}
          />
        </View>
      )}
      {showChevron && onPress && (
        <View style={styles.chevronContainer}>
          <MaterialIcons
            name="chevron-right"
            size={theme.sizes.icon.sm}
            color={dynamicStyles.icon.color}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.componentSpacing.listItemPadding,
    paddingHorizontal: theme.componentSpacing.listItemPadding,
    minHeight: theme.touchTargets.comfortable,
  },
  leftIconContainer: {
    marginRight: theme.spacing.md,
    width: theme.sizes.icon.md,
    height: theme.sizes.icon.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    ...theme.typography.bodyMedium,
    fontFamily: theme.fontFamilies.medium,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fontFamilies.regular,
  },
  rightIconContainer: {
    marginLeft: theme.spacing.sm,
    width: theme.sizes.icon.md,
    height: theme.sizes.icon.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronContainer: {
    marginLeft: theme.spacing.xs,
    width: theme.sizes.icon.sm,
    height: theme.sizes.icon.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});

