import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const {theme} = useTheme();

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceAccent,
    },
    danger: {
      backgroundColor: theme.colors.danger,
    },
    outline: {
      backgroundColor: `${theme.colors.primary}30`,
      borderWidth: 0,
    },
  };

  const textStyles: Record<string, TextStyle> = {
    primary: {color: '#ffffff'},
    secondary: {color: theme.colors.text},
    danger: {color: '#ffffff'},
    outline: {color: theme.colors.primary},
  };

  const sizeStyles = {
    sm: {height: 36, paddingHorizontal: 12, fontSize: 14},
    md: {height: 48, paddingHorizontal: 20, fontSize: 16},
    lg: {height: 56, paddingHorizontal: 20, fontSize: 16},
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        {height: sizeStyles[size].height},
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={textStyles[variant].color} />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={size === 'sm' ? 20 : 24}
              color={textStyles[variant].color}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              textStyles[variant],
              {fontSize: sizeStyles[size].fontSize},
            ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontWeight: '700',
  },
  icon: {
    marginRight: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});

