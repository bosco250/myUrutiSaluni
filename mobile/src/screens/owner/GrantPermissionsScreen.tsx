import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { useEmployeePermissionsManagement } from '../../hooks/useEmployeePermissions';
import {
  EmployeePermission,
  PermissionCategory,
} from '../../constants/employeePermissions';
import { PermissionCategoryGroup } from '../../components/permissions/PermissionCategoryGroup';
import { Loader } from '../../components/common';

interface GrantPermissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      employeeId: string;
      salonId: string;
      employee?: any;
    };
  };
}

export default function GrantPermissionsScreen({
  navigation,
  route,
}: GrantPermissionsScreenProps) {
  const { isDark } = useTheme();
  const { employeeId, salonId, employee } = route?.params || {};
  const [selectedPermissions, setSelectedPermissions] = useState<
    EmployeePermission[]
  >([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    availablePermissions,
    loading,
    fetchAvailablePermissions,
    grantPermissions,
    revokePermissions,
  } = useEmployeePermissionsManagement(salonId);

  const [currentPermissions, setCurrentPermissions] = useState<
    EmployeePermission[]
  >([]);

  const loadCurrentPermissions = React.useCallback(async () => {
    if (!salonId || !employeeId) return;
    try {
      const { employeePermissionsService } = await import(
        '../../services/employeePermissions'
      );
      const permissions = await employeePermissionsService.getEmployeePermissions(
        salonId,
        employeeId,
      );
      const active = permissions
        .filter((p) => p.isActive)
        .map((p) => p.permissionCode);
      setCurrentPermissions(active);
      setSelectedPermissions(active);
    } catch (error) {
      console.error('Error loading current permissions:', error);
    }
  }, [salonId, employeeId]);

  useEffect(() => {
    if (salonId) {
      fetchAvailablePermissions();
      loadCurrentPermissions();
    }
  }, [salonId, employeeId, fetchAvailablePermissions, loadCurrentPermissions]);

  const handleTogglePermission = (
    permission: EmployeePermission,
    granted: boolean,
  ) => {
    if (granted) {
      setSelectedPermissions((prev) => [...prev, permission]);
    } else {
      setSelectedPermissions((prev) =>
        prev.filter((p) => p !== permission),
      );
    }
  };

  const handleSave = async () => {
    if (!salonId || !employeeId) {
      Alert.alert('Error', 'Missing salon ID or employee ID');
      return;
    }

    try {
      setSaving(true);

      // Determine which permissions to grant and which to revoke
      const toGrant = selectedPermissions.filter(
        (p) => !currentPermissions.includes(p),
      );
      const toRevoke = currentPermissions.filter(
        (p) => !selectedPermissions.includes(p),
      );

      // Grant new permissions first
      if (toGrant.length > 0) {
        await grantPermissions(employeeId, toGrant, notes || undefined);
      }

      // Revoke removed permissions
      if (toRevoke.length > 0) {
        await revokePermissions(employeeId, toRevoke);
      }

      // Reload current permissions to reflect changes
      await loadCurrentPermissions();

      Alert.alert('Success', 'Permissions updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update permissions';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark
        ? theme.colors.gray700
        : theme.colors.backgroundSecondary,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray600 : theme.colors.border,
    },
  };

  if (loading && availablePermissions.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={['top']}
      >
        <Loader />
      </SafeAreaView>
    );
  }

  const allPermissions = Object.values(EmployeePermission);

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Grant Permissions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {employee && (
        <View style={[styles.employeeInfo, dynamicStyles.card]}>
          <Text style={[styles.employeeName, dynamicStyles.text]}>
            {employee.user?.fullName || 'Employee'}
          </Text>
          {employee.roleTitle && (
            <Text style={[styles.employeeRole, dynamicStyles.textSecondary]}>
              {employee.roleTitle}
            </Text>
          )}
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            Selected: {selectedPermissions.length} / {allPermissions.length}
          </Text>
        </View>

        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, dynamicStyles.text]}>
            Notes (Optional)
          </Text>
          <TextInput
            style={[styles.notesInput, dynamicStyles.input]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about these permissions..."
            placeholderTextColor={dynamicStyles.textSecondary.color}
            multiline
            numberOfLines={3}
          />
        </View>

        {Object.values(PermissionCategory).map((category) => (
          <PermissionCategoryGroup
            key={category}
            category={category}
            permissions={allPermissions}
            grantedPermissions={selectedPermissions}
            onToggle={handleTogglePermission}
            disabled={saving}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, dynamicStyles.card]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor:
                saving || selectedPermissions.length === 0
                  ? theme.colors.gray500
                  : theme.colors.primary,
            },
          ]}
          onPress={handleSave}
          disabled={saving || selectedPermissions.length === 0}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Permissions</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.semibold,
  },
  employeeInfo: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
  },
  employeeName: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
    marginBottom: theme.spacing.xs,
  },
  employeeRole: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    textAlign: 'center',
  },
  notesSection: {
    padding: theme.spacing.md,
  },
  notesLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  saveButton: {
    padding: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
  },
});

