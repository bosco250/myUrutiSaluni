import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { isDark } = useTheme();

  // Size-based styles
  const sizeStyles = {
    small: {
      paddingVertical: theme.componentSpacing.buttonVertical - 4,
      paddingHorizontal: theme.componentSpacing.buttonHorizontal - 8,
      minHeight: theme.touchTargets.minimum - 4,
      fontSize: theme.typography.button.fontSize - 2,
    },
    medium: {
      paddingVertical: theme.componentSpacing.buttonVertical,
      paddingHorizontal: theme.componentSpacing.buttonHorizontal,
      minHeight: theme.touchTargets.comfortable,
      fontSize: theme.typography.button.fontSize,
    },
    large: {
      paddingVertical: theme.componentSpacing.buttonVertical + 4,
      paddingHorizontal: theme.componentSpacing.buttonHorizontal + 8,
      minHeight: theme.touchTargets.large,
      fontSize: theme.typography.button.fontSize + 2,
    },
  };

  // Dynamic styles for dark/light mode support
  const dynamicStyles = {
    primaryButton: {
      backgroundColor: isDark ? theme.colors.white : theme.colors.buttonPrimary,
    },
    primaryText: {
      color: isDark ? theme.colors.black : theme.colors.textInverse,
    },
    secondaryButton: {
      backgroundColor: isDark ? theme.colors.secondaryLight : theme.colors.secondary,
    },
    outlineButton: {
      backgroundColor: isDark ? theme.colors.gray800 : 'transparent',
      borderColor: isDark ? theme.colors.gray600 : theme.colors.primary,
    },
    outlineText: {
      color: isDark ? theme.colors.white : theme.colors.primary,
    },
    ghostButton: {
      backgroundColor: 'transparent',
    },
    ghostText: {
      color: isDark ? theme.colors.white : theme.colors.primary,
    },
  };

  const getButtonStyle = () => {
    const baseStyle = [sizeStyles[size]];
    switch (variant) {
      case 'secondary':
        return [...baseStyle, styles.secondaryButton, dynamicStyles.secondaryButton];
      case 'outline':
        return [...baseStyle, styles.outlineButton, dynamicStyles.outlineButton];
      case 'ghost':
        return [...baseStyle, styles.ghostButton, dynamicStyles.ghostButton];
      default:
        return [...baseStyle, styles.primaryButton, dynamicStyles.primaryButton];
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      ...theme.typography.button,
      fontSize: sizeStyles[size].fontSize,
    };
    switch (variant) {
      case 'outline':
        return [baseTextStyle, styles.outlineText, dynamicStyles.outlineText];
      case 'secondary':
        return [baseTextStyle, styles.secondaryText];
      case 'ghost':
        return [baseTextStyle, styles.ghostText, dynamicStyles.ghostText];
      default:
        return [baseTextStyle, styles.primaryText, dynamicStyles.primaryText];
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost'
            ? (isDark ? theme.colors.white : theme.colors.primary) 
            : (isDark ? theme.colors.black : theme.colors.textInverse)}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 56,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 54,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 54,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 54,
  },
  primaryText: {
    color: theme.colors.textInverse,
    ...theme.typography.button,
    fontFamily: theme.fontFamilies.semibold,
  },
  secondaryText: {
    color: theme.colors.textInverse,
    ...theme.typography.button,
    fontFamily: theme.fontFamilies.semibold,
  },
  outlineText: {
    color: theme.colors.primary,
    ...theme.typography.button,
    fontFamily: theme.fontFamilies.semibold,
  },
  ghostText: {
    color: theme.colors.primary,
    ...theme.typography.button,
    fontFamily: theme.fontFamilies.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  fullWidth: {
    width: '100%',
  },
});

