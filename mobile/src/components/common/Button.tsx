import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { isDark } = useTheme();

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
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.secondaryButton, dynamicStyles.secondaryButton];
      case 'outline':
        return [styles.outlineButton, dynamicStyles.outlineButton];
      default:
        return [styles.primaryButton, dynamicStyles.primaryButton];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return [styles.outlineText, dynamicStyles.outlineText];
      case 'secondary':
        return styles.secondaryText;
      default:
        return [styles.primaryText, dynamicStyles.primaryText];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' 
            ? (isDark ? theme.colors.white : theme.colors.primary) 
            : (isDark ? theme.colors.black : theme.colors.textInverse)}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  secondaryText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  outlineText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});

