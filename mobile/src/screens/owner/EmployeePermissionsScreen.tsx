import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { useAuth } from '../../context/AuthContext';
import { useEmployeePermissionsManagement } from '../../hooks/useEmployeePermissions';
import { salonService } from '../../services/salon';
import { PermissionBadge } from '../../components/permissions/PermissionBadge';
import { Loader } from '../../components/common';

interface EmployeePermissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
    };
  };
}

export default function EmployeePermissionsScreen({
  navigation,
  route,
}: EmployeePermissionsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [salonId, setSalonId] = useState<string | null>(
    route?.params?.salonId || null,
  );
  const [salon, setSalon] = useState<any>(null);

  const {
    employees,
    loading,
    error,
    fetchEmployeesWithPermissions,
    fetchAvailablePermissions,
  } = useEmployeePermissionsManagement(salonId || undefined);

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
  };

  const loadSalon = useCallback(async () => {
    try {
      if (!salonId && user?.id) {
        const salons = await salonService.getSalonByOwnerId(String(user.id));
        if (salons?.id) {
          setSalonId(salons.id);
          setSalon(salons);
        }
      } else if (salonId) {
        const salonData = await salonService.getSalonDetails(salonId);
        setSalon(salonData);
      }
    } catch (error) {
      console.error('Error loading salon:', error);
    }
  }, [salonId, user?.id]);

  useEffect(() => {
    loadSalon();
  }, [loadSalon]);

  useEffect(() => {
    if (salonId) {
      fetchEmployeesWithPermissions();
      fetchAvailablePermissions();
    }
  }, [salonId, fetchEmployeesWithPermissions, fetchAvailablePermissions]);

  const handleEmployeePress = (employee: any) => {
    navigation.navigate('GrantPermissions', {
      employeeId: employee.id,
      salonId: salonId,
      employee: employee,
    });
  };

  const onRefresh = useCallback(() => {
    if (salonId) {
      fetchEmployeesWithPermissions();
    }
  }, [salonId, fetchEmployeesWithPermissions]);

  if (loading && !employees.length) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={['top']}
      >
        <Loader />
      </SafeAreaView>
    );
  }

  if (!salonId) {
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
            Employee Permissions
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="store"
            size={64}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyText, dynamicStyles.text]}>
            No Salon Found
          </Text>
          <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
            Please create a salon first
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          Employee Permissions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {salon && (
        <View style={[styles.salonInfo, dynamicStyles.card]}>
          <Text style={[styles.salonName, dynamicStyles.text]}>
            {salon.name}
          </Text>
          <Text style={[styles.salonAddress, dynamicStyles.textSecondary]}>
            {salon.address}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={[styles.errorCard, dynamicStyles.card]}>
            <MaterialIcons
              name="error-outline"
              size={24}
              color={theme.colors.error}
            />
            <Text style={[styles.errorText, dynamicStyles.text]}>
              {error.message}
            </Text>
          </View>
        )}

        {employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="people-outline"
              size={64}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.emptyText, dynamicStyles.text]}>
              No Employees
            </Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              Add employees to your salon to manage their permissions
            </Text>
          </View>
        ) : (
          employees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={[styles.employeeCard, dynamicStyles.card]}
              onPress={() => handleEmployeePress(employee)}
              activeOpacity={0.7}
            >
              <View style={styles.employeeHeader}>
                <View style={styles.employeeInfo}>
                  <Text style={[styles.employeeName, dynamicStyles.text]}>
                    {employee.user?.fullName || 'Unknown Employee'}
                  </Text>
                  {employee.roleTitle && (
                    <Text style={[styles.employeeRole, dynamicStyles.textSecondary]}>
                      {employee.roleTitle}
                    </Text>
                  )}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={dynamicStyles.textSecondary.color}
                />
              </View>

              {employee.permissions && employee.permissions.length > 0 ? (
                <View style={styles.permissionsContainer}>
                  <Text style={[styles.permissionsLabel, dynamicStyles.textSecondary]}>
                    Permissions ({employee.permissions.length}):
                  </Text>
                  <View style={styles.badgesContainer}>
                    {employee.permissions.map((perm: any) => (
                      <PermissionBadge
                        key={perm.code}
                        permission={perm.code}
                        size="small"
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.noPermissions}>
                  <Text style={[styles.noPermissionsText, dynamicStyles.textSecondary]}>
                    No permissions granted
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  salonInfo: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
  },
  salonName: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
    marginBottom: theme.spacing.xs,
  },
  salonAddress: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  scrollView: {
    flex: 1,
  },
  employeeCard: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginBottom: theme.spacing.xs,
  },
  employeeRole: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  permissionsContainer: {
    marginTop: theme.spacing.sm,
  },
  permissionsLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noPermissions: {
    marginTop: theme.spacing.sm,
  },
  noPermissionsText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
});

