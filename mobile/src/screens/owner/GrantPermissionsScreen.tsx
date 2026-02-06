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
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  const allPermissions = Object.values(EmployeePermission);

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
      <View style={[styles.headerContainer, dynamicStyles.card]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>
              Grant Permissions
            </Text>
            {employee && (
              <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                {employee.user?.fullName || 'Employee'}
                {employee.roleTitle && ` • ${employee.roleTitle}`}
              </Text>
            )}
          </View>
          <MaterialIcons
            name="security"
            size={22}
            color={theme.colors.primary}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <MaterialIcons name="check-circle" size={16} color={theme.colors.primary} />
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            {selectedPermissions.length} of {allPermissions.length} permissions selected
          </Text>
        </View>

        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, dynamicStyles.text]}>
            Add Notes (Optional)
          </Text>
          <TextInput
            style={[styles.notesInput, dynamicStyles.input]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about these permissions..."
            placeholderTextColor={dynamicStyles.textSecondary.color}
            multiline
            numberOfLines={2}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '15',
    gap: 6,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  notesSection: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    marginBottom: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
  },
});

