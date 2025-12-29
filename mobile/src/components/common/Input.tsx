import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { EyeIcon, EyeOffIcon } from './Icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  secureTextEntry,
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) {
  const { isDark } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Dynamic styles based on dark/light mode
  const dynamicStyles = {
    label: {
      color: isDark ? '#FFFFFF' : theme.colors.text,
    },
    inputContainer: {
      backgroundColor: isDark ? '#3A3A3C' : theme.colors.backgroundSecondary,
      borderColor: isDark ? '#48484A' : theme.colors.border,
    },
    inputContainerFocused: {
      backgroundColor: isDark ? '#2C2C2E' : theme.colors.background,
      borderColor: theme.colors.primary,
    },
    input: {
      color: isDark ? '#FFFFFF' : theme.colors.text,
    },
    placeholder: isDark ? '#8E8E93' : theme.colors.textTertiary,
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          dynamicStyles.inputContainer,
          isFocused && [styles.inputContainerFocused, dynamicStyles.inputContainerFocused],
          error && styles.inputContainerError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, dynamicStyles.input, style]}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={dynamicStyles.placeholder}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            {isPasswordVisible ? (
              <EyeIcon size={18} color={isDark ? '#8E8E93' : theme.colors.textSecondary} />
            ) : (
              <EyeOffIcon size={18} color={isDark ? '#8E8E93' : theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.label,
    marginBottom: theme.spacing.xs / 2,
    fontSize: 13,
    fontFamily: theme.fontFamilies.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: theme.sizes.radius.md,
    paddingHorizontal: theme.componentSpacing.inputHorizontal - 2,
    paddingVertical: theme.componentSpacing.inputVertical - 4,
    minHeight: 40,
  },
  inputContainerFocused: {
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    fontFamily: theme.fontFamilies.regular,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: theme.spacing.xs / 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    ...theme.typography.caption,
    fontSize: 11,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fontFamilies.regular,
  },
});
