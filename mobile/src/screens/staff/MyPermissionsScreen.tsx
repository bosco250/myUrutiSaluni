import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';
import {
  EmployeePermission,
  PermissionCategory,
  PERMISSION_CATEGORIES,
  PERMISSION_DESCRIPTIONS,
} from '../../constants/employeePermissions';
import { Loader } from '../../components/common';
import { getPrimaryScreenFromPermissions, getAccessibleScreens } from '../../utils/permissionNavigation';

interface MyPermissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function MyPermissionsScreen({
  navigation,
}: MyPermissionsScreenProps) {
  const { isDark } = useTheme();
  
  // Use the robust permission check hook that auto-discovers employee/salon IDs
  const { 
    activePermissions, 
    loading, 
    error, 
    fetchMyPermissions,
  } = useEmployeePermissionCheck({
    autoFetch: true
  });

  const onRefresh = useCallback(() => {
    fetchMyPermissions();
  }, [fetchMyPermissions]);

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

  if (loading && activePermissions.length === 0) {
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

  const permissionsByCategory: Record<PermissionCategory, EmployeePermission[]> =
    {
      [PermissionCategory.APPOINTMENTS]: [],
      [PermissionCategory.SERVICES]: [],
      [PermissionCategory.CUSTOMERS]: [],
      [PermissionCategory.SALES]: [],
      [PermissionCategory.STAFF]: [],
      [PermissionCategory.INVENTORY]: [],
      [PermissionCategory.SALON]: [],
    };

  activePermissions.forEach((perm) => {
    const category = Object.keys(PERMISSION_CATEGORIES).find((cat) =>
      PERMISSION_CATEGORIES[cat as PermissionCategory].includes(perm),
    ) as PermissionCategory;
    if (category) {
      permissionsByCategory[category].push(perm);
    }
  });

  const categoryLabels: Record<PermissionCategory, string> = {
    [PermissionCategory.APPOINTMENTS]: 'Calendar & Bookings',
    [PermissionCategory.SERVICES]: 'Service Menu',
    [PermissionCategory.CUSTOMERS]: 'Clients',
    [PermissionCategory.SALES]: 'Sales & Finance',
    [PermissionCategory.STAFF]: 'Team Management',
    [PermissionCategory.INVENTORY]: 'Products & Stock',
    [PermissionCategory.SALON]: 'Salon Settings',
  };

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
          My Access Controls
        </Text>
        <View style={{ width: 24 }} />
      </View>

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

        {activePermissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="emoji-people"
              size={64}
              color={theme.colors.primary}
            />
            <Text style={[styles.emptyText, dynamicStyles.text]}>
              Welcome to the Team!
            </Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              Your access profile is currently empty.
              {'\n'}
              Ask your manager to assign you tasks to get started.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, dynamicStyles.card]}>
              <Text style={[styles.summaryTitle, dynamicStyles.text]}>
                You have access to {activePermissions.length} feature areas
              </Text>
              {activePermissions.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    const primaryScreen = getPrimaryScreenFromPermissions(activePermissions);
                    navigation.navigate(primaryScreen);
                  }}
                >
                  <MaterialIcons name="arrow-forward" size={20} color={theme.colors.white} />
                  <Text style={styles.actionButtonText}>
                    Go to {getPrimaryScreenFromPermissions(activePermissions) === 'SalonAppointments' ? 'Calendar' : 
                           getPrimaryScreenFromPermissions(activePermissions) === 'AllServices' ? 'Services' :
                           getPrimaryScreenFromPermissions(activePermissions) === 'StockManagement' ? 'Inventory' :
                           getPrimaryScreenFromPermissions(activePermissions) === 'CustomerManagement' ? 'Clients' :
                           getPrimaryScreenFromPermissions(activePermissions) === 'Sales' ? 'Sales' : 'Dashboard'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {Object.values(PermissionCategory).map((category) => {
              const categoryPerms = permissionsByCategory[category];
              if (categoryPerms.length === 0) return null;

              return (
                <View
                  key={category}
                  style={[styles.categoryCard, dynamicStyles.card]}
                >
                  <Text style={[styles.categoryTitle, dynamicStyles.text]}>
                    {categoryLabels[category]}
                  </Text>
                  
                  {/* Replaced badges with simple list of capabilities */}
                  <View style={styles.descriptionsContainer}>
                    {categoryPerms.map((perm) => (
                      <View key={perm} style={styles.descriptionItem}>
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color={theme.colors.primary}
                        />
                        <Text
                          style={[styles.descriptionText, dynamicStyles.textSecondary]}
                        >
                          {/* Use description but fallback to humanized perm name if needed */}
                          {PERMISSION_DESCRIPTIONS[perm] || perm.replace(/_/g, ' ').toLowerCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Action button to navigate to relevant screen for this category */}
                  {(() => {
                    // Get primary screen for this category's permissions
                    const categoryScreens = getAccessibleScreens(categoryPerms);
                    if (categoryScreens.length > 0) {
                      const primaryScreen = categoryScreens[0];
                      const screenLabels: Record<string, string> = {
                        'SalonAppointments': 'Open Calendar',
                        'AllServices': 'View Services',
                        'StockManagement': 'Check Inventory',
                        'CustomerManagement': 'View Clients',
                        'Sales': 'Open Register',
                        'StaffManagement': 'View Team',
                        'Commissions': 'View My Earnings',
                        'SalonSettings': 'Open Settings',
                      };
                      
                      return (
                        <TouchableOpacity
                          style={[styles.categoryActionButton, { borderColor: theme.colors.primary }]}
                          onPress={() => navigation.navigate(primaryScreen)}
                        >
                          <Text style={[styles.categoryActionText, { color: theme.colors.primary }]}>
                            {screenLabels[primaryScreen] || 'Open Feature'}
                          </Text>
                          <MaterialIcons name="arrow-forward" size={16} color={theme.colors.primary} />
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()}
                </View>
              );
            })}
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
    marginBottom: 8,
  },
  categoryCard: {
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semibold,
    marginBottom: 10,
    color: theme.colors.primary,
  },
  badgesContainer: {
    display: 'none', // Hidden as requested to simply interface
  },
  descriptionsContainer: {
    marginTop: 4,
  },
  descriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
  },
  categoryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    backgroundColor: 'transparent',
  },
  categoryActionText: {
    fontSize: 13,
    fontFamily: theme.fonts.semibold,
  },
});

