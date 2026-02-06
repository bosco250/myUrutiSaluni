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
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      </SafeAreaView>
    );
  }

  if (!salonId) {
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
                Manage Permissions
              </Text>
            </View>
            <MaterialIcons
              name="admin-panel-settings"
              size={22}
              color={theme.colors.primary}
            />
          </View>
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
              Manage Permissions
            </Text>
            {salon && (
              <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                {salon.name}
              </Text>
            )}
          </View>
          <MaterialIcons
            name="admin-panel-settings"
            size={22}
            color={theme.colors.primary}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={[styles.errorCard, dynamicStyles.card]}>
            <MaterialIcons
              name="error-outline"
              size={20}
              color={theme.colors.error}
            />
            <Text style={[styles.errorText, dynamicStyles.text]}>
              {error.message}
            </Text>
          </View>
        )}

        {employees.length > 0 && (
          <View style={styles.statsCard}>
            <MaterialIcons name="people" size={16} color={theme.colors.primary} />
            <Text style={[styles.statsText, dynamicStyles.text]}>
              {employees.length} {employees.length === 1 ? 'employee' : 'employees'} with access
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
          <View style={styles.employeesList}>
            {employees.map((employee) => (
              <TouchableOpacity
                key={employee.id}
                style={[styles.employeeCard, dynamicStyles.card]}
                onPress={() => handleEmployeePress(employee)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.employeeMainInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                        {(employee.user?.fullName || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.employeeDetails}>
                      <Text style={[styles.employeeName, dynamicStyles.text]} numberOfLines={1}>
                        {employee.user?.fullName || 'Unknown Employee'}
                      </Text>
                      {employee.roleTitle && (
                        <Text style={[styles.employeeRole, dynamicStyles.textSecondary]} numberOfLines={1}>
                          {employee.roleTitle}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardRightSection}>
                    <View style={[
                      styles.permissionsBadge,
                      {
                        backgroundColor: employee.permissions && employee.permissions.length > 0
                          ? theme.colors.success + '15'
                          : theme.colors.gray400 + '15'
                      }
                    ]}>
                      <MaterialIcons
                        name={employee.permissions && employee.permissions.length > 0 ? 'verified-user' : 'lock'}
                        size={14}
                        color={employee.permissions && employee.permissions.length > 0
                          ? theme.colors.success
                          : theme.colors.gray500}
                      />
                      <Text style={[
                        styles.permissionsBadgeText,
                        {
                          color: employee.permissions && employee.permissions.length > 0
                            ? theme.colors.success
                            : theme.colors.gray500
                        }
                      ]}>
                        {employee.permissions?.length || 0}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={dynamicStyles.textSecondary.color}
                    />
                  </View>
                </View>

                {employee.permissions && employee.permissions.length > 0 && (
                  <View style={styles.permissionsPreview}>
                    <Text style={[styles.permissionsPreviewText, dynamicStyles.textSecondary]} numberOfLines={2}>
                      {employee.permissions.slice(0, 3).map((p: any) =>
                        p.code.replace(/_/g, ' ').toLowerCase()
                      ).join(', ')}
                      {employee.permissions.length > 3 && ` +${employee.permissions.length - 3} more`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  statsCard: {
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
  statsText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  employeesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  employeeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  cardRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  permissionsBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.semibold,
  },
  permissionsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  permissionsPreviewText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
});

