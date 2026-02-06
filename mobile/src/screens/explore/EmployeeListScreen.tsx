import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { exploreService, Employee, Salon } from "../../services/explore";
import { salonService } from "../../services/salon";

import { useEmployeePermissionCheck } from "../../hooks/useEmployeePermissionCheck";
import { EmployeePermission } from "../../constants/employeePermissions";

interface EmployeeListScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
      salon?: Salon;
      isOwnerView?: boolean; // Set to true when coming from Staff Management
    };
  };
}

export default function EmployeeListScreen({
  navigation,
  route,
}: EmployeeListScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { checkPermission } = useEmployeePermissionCheck();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(
    route?.params?.salonId || route?.params?.salon?.id || null
  );
  const [salonName, setSalonName] = useState<string>(
    route?.params?.salon?.name || ""
  );
  
  // Check if this is an owner view (from Staff Management menu)
  // OR if the employee has permission to manage schedules (which implies staff management)
  const isOwnerView = route?.params?.isOwnerView || 
    (user?.role === 'salon_owner' && !route?.params?.salonId);

  const canManageStaff = isOwnerView || checkPermission(EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let currentSalonId = salonId;

      // If no salonId provided and user is an owner, get their salon
      if (!currentSalonId && user?.id && (user?.role === 'salon_owner' || user?.role === 'salon_employee')) {
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          currentSalonId = salon.id;
          setSalonId(salon.id);
          setSalonName(salon.name || "My Salon");
        }
      }

      if (currentSalonId) {
        const salonEmployees = await exploreService.getSalonEmployees(currentSalonId);
        setEmployees(salonEmployees.filter((e) => e.isActive));
      }
    } catch {
      console.error("Error loading employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, salonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEmployeePress = (employee: Employee) => {
    // Use owner view if it's an owner viewing their staff
    const detailScreen = canManageStaff ? "OwnerEmployeeDetail" : "EmployeeDetail";
    navigation?.navigate(detailScreen, {
      employeeId: employee.id,
      salonId: salonId,
      employee,
    });
  };

  const handleAddEmployee = () => {
    if (salonId) {
      navigation?.navigate("AddEmployee", { salonId });
    }
  };


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Redesigned Header */}
      <View style={[styles.headerContainer, dynamicStyles.card]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>
              {canManageStaff ? "Staff Management" : "Team"}
            </Text>
            {salonName && (
              <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                {salonName}
              </Text>
            )}
          </View>
          {canManageStaff ? (
            <TouchableOpacity
              style={styles.addIconButton}
              onPress={handleAddEmployee}
              activeOpacity={0.7}
            >
              <MaterialIcons name="person-add" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : (
            <MaterialIcons name="people" size={22} color={theme.colors.primary} />
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Card */}
          {employees.length > 0 && (
            <View style={[styles.statsCard, dynamicStyles.card]}>
              <MaterialIcons name="people" size={16} color={theme.colors.primary} />
              <Text style={[styles.statsText, dynamicStyles.text]}>
                {employees.length} {employees.length === 1 ? 'employee' : 'employees'} on your team
              </Text>
            </View>
          )}

          {/* Quick Actions for Owners */}
          {canManageStaff && employees.length > 0 && (
            <TouchableOpacity
              style={[styles.permissionsButton, dynamicStyles.card]}
              onPress={() => navigation?.navigate('EmployeePermissions', { salonId })}
              activeOpacity={0.7}
            >
              <View style={styles.permissionsButtonContent}>
                <View style={[styles.permissionsIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                  <MaterialIcons name="admin-panel-settings" size={18} color={theme.colors.secondary} />
                </View>
                <View style={styles.permissionsTextContainer}>
                  <Text style={[styles.permissionsTitle, dynamicStyles.text]}>Manage Permissions</Text>
                  <Text style={[styles.permissionsSubtitle, dynamicStyles.textSecondary]}>
                    Control access and roles
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          )}

          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, dynamicStyles.card]}>
                <MaterialIcons
                  name="people-outline"
                  size={40}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, dynamicStyles.text]}>
                No Employees Yet
              </Text>
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                {canManageStaff
                  ? "Start building your team by adding employees"
                  : "This salon hasn't added any team members yet"}
              </Text>
              {canManageStaff && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={handleAddEmployee}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="person-add" size={20} color={theme.colors.white} />
                  <Text style={styles.emptyAddButtonText}>Add First Employee</Text>
                </TouchableOpacity>
              )}
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
                  <View style={styles.cardMainContent}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                        {employee.user?.fullName
                          ? getInitials(employee.user.fullName)
                          : "EM"}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={[styles.employeeName, dynamicStyles.text]} numberOfLines={1}>
                        {employee.user?.fullName || "Employee"}
                      </Text>
                      {employee.roleTitle && (
                        <Text style={[styles.employeeRole, dynamicStyles.textSecondary]} numberOfLines={1}>
                          {employee.roleTitle}
                        </Text>
                      )}
                      {employee.skills && employee.skills.length > 0 && (
                        <View style={styles.skillsContainer}>
                          {employee.skills.slice(0, 2).map((skill, index) => (
                            <View key={index} style={[styles.skillTag, { backgroundColor: theme.colors.primary + '15' }]}>
                              <Text style={[styles.skillText, { color: theme.colors.primary }]}>
                                {skill}
                              </Text>
                            </View>
                          ))}
                          {employee.skills.length > 2 && (
                            <Text style={[styles.moreSkillsText, dynamicStyles.textSecondary]}>
                              +{employee.skills.length - 2} more
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* FAB-style Add Button */}
          {canManageStaff && employees.length > 0 && (
            <TouchableOpacity
              style={styles.fabButton}
              onPress={handleAddEmployee}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  addIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
  },
  statsText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  permissionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  permissionsButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  permissionsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  permissionsTextContainer: {
    flex: 1,
  },
  permissionsTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  permissionsSubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emptyAddButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
  },
  employeesList: {
    gap: 10,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardMainContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  skillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
  },
  moreSkillsText: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginLeft: 4,
  },
  fabButton: {
    position: "absolute",
    bottom: 16,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

