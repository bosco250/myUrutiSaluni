import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import {
  EmployeePermission,
  PermissionCategory,
  PERMISSION_CATEGORIES,
} from '../../constants/employeePermissions';
import { PermissionToggle } from './PermissionToggle';

interface PermissionCategoryGroupProps {
  category: PermissionCategory;
  permissions: EmployeePermission[];
  grantedPermissions: EmployeePermission[];
  onToggle: (permission: EmployeePermission, granted: boolean) => void;
  disabled?: boolean;
  collapsed?: boolean;
}

const categoryLabels: Record<PermissionCategory, string> = {
  [PermissionCategory.APPOINTMENTS]: 'Appointment Management',
  [PermissionCategory.SERVICES]: 'Services & Products',
  [PermissionCategory.CUSTOMERS]: 'Customer Management',
  [PermissionCategory.SALES]: 'Sales & Financial',
  [PermissionCategory.STAFF]: 'Staff Management',
  [PermissionCategory.INVENTORY]: 'Inventory Management',
  [PermissionCategory.SALON]: 'Salon Operations',
};

export const PermissionCategoryGroup: React.FC<PermissionCategoryGroupProps> = ({
  category,
  permissions,
  grantedPermissions,
  onToggle,
  disabled = false,
  collapsed = false,
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(!collapsed);

  const categoryPermissions = permissions.filter((p) =>
    PERMISSION_CATEGORIES[category].includes(p),
  );

  const grantedCount = categoryPermissions.filter((p) =>
    grantedPermissions.includes(p),
  ).length;

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.backgroundSecondary,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <TouchableOpacity
        style={[styles.header, dynamicStyles.header]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.categoryTitle, dynamicStyles.text]}>
            {categoryLabels[category]}
          </Text>
          <View style={styles.headerRight}>
            <Text style={[styles.count, dynamicStyles.textSecondary]}>
              {grantedCount}/{categoryPermissions.length}
            </Text>
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={dynamicStyles.textSecondary.color}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.permissionsList}>
          {categoryPermissions.map((permission) => (
            <PermissionToggle
              key={permission}
              permission={permission}
              isGranted={grantedPermissions.includes(permission)}
              onToggle={onToggle}
              disabled={disabled}
              showDescription={true}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
  },
  count: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginRight: theme.spacing.sm,
  },
  permissionsList: {
    padding: theme.spacing.sm,
  },
});

