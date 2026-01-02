import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import {
  EmployeePermission,
  getPermissionCategory,
  PermissionCategory,
} from '../../constants/employeePermissions';

interface PermissionBadgeProps {
  permission: EmployeePermission;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const categoryColors: Record<PermissionCategory, string> = {
  [PermissionCategory.APPOINTMENTS]: theme.colors.primary,
  [PermissionCategory.SERVICES]: theme.colors.success,
  [PermissionCategory.CUSTOMERS]: theme.colors.info,
  [PermissionCategory.SALES]: theme.colors.warning,
  [PermissionCategory.STAFF]: theme.colors.secondary,
  [PermissionCategory.INVENTORY]: '#8B5CF6',
  [PermissionCategory.SALON]: theme.colors.gray600,
};

const categoryIcons: Record<PermissionCategory, string> = {
  [PermissionCategory.APPOINTMENTS]: 'event',
  [PermissionCategory.SERVICES]: 'content-cut',
  [PermissionCategory.CUSTOMERS]: 'people',
  [PermissionCategory.SALES]: 'attach-money',
  [PermissionCategory.STAFF]: 'group',
  [PermissionCategory.INVENTORY]: 'inventory',
  [PermissionCategory.SALON]: 'store',
};

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  showIcon = true,
  size = 'medium',
}) => {
  const { isDark } = useTheme();
  const category = getPermissionCategory(permission);
  const color = categoryColors[category];
  const icon = categoryIcons[category];

  const sizeStyles = {
    small: {
      padding: theme.spacing.xs,
      fontSize: 10,
      iconSize: 12,
    },
    medium: {
      padding: theme.spacing.xs,
      fontSize: 12,
      iconSize: 16,
    },
    large: {
      padding: theme.spacing.sm,
      fontSize: 14,
      iconSize: 20,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + '20',
          borderColor: color,
          padding: currentSize.padding,
        },
      ]}
    >
      {showIcon && (
        <MaterialIcons
          name={icon as any}
          size={currentSize.iconSize}
          color={color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: isDark ? theme.colors.white : theme.colors.text,
            fontSize: currentSize.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {permission.replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.spacing.xs,
    borderWidth: 1,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  text: {
    fontFamily: theme.fonts.medium,
  },
});

