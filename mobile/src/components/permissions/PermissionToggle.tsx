import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import {
  EmployeePermission,
  PERMISSION_DESCRIPTIONS,
} from '../../constants/employeePermissions';

interface PermissionToggleProps {
  permission: EmployeePermission;
  isGranted: boolean;
  onToggle: (permission: EmployeePermission, granted: boolean) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

export const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permission,
  isGranted,
  onToggle,
  disabled = false,
  showDescription = true,
}) => {
  const { isDark } = useTheme();

  const handleToggle = () => {
    if (!disabled) {
      onToggle(permission, !isGranted);
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={handleToggle}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <MaterialIcons
            name={isGranted ? 'check-circle' : 'radio-button-unchecked'}
            size={20}
            color={
              isGranted
                ? theme.colors.primary
                : isDark
                  ? theme.colors.gray500
                  : theme.colors.border
            }
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.title, dynamicStyles.text]}>
              {permission.replace(/_/g, ' ')}
            </Text>
            {showDescription && (
              <Text style={[styles.description, dynamicStyles.textSecondary]}>
                {PERMISSION_DESCRIPTIONS[permission]}
              </Text>
            )}
          </View>
        </View>
        <Switch
          value={isGranted}
          onValueChange={(value) => onToggle(permission, value)}
          disabled={disabled}
          trackColor={{
            false: isDark ? theme.colors.gray700 : theme.colors.borderLight,
            true: theme.colors.primary + '80',
          }}
          thumbColor={isGranted ? theme.colors.primary : theme.colors.gray400}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    marginBottom: 3,
  },
  description: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    lineHeight: 15,
  },
});

