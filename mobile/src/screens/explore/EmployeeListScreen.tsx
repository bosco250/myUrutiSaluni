import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
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

  // Calculate card width safely
  const cardWidth = useMemo(() => {
    try {
      return (Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.md) / 2;
    } catch {
      return 160; // Fallback width
    }
  }, []);

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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.container]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]} numberOfLines={1}>
          {canManageStaff ? "Staff Management" : (salonName || "Employees")}
        </Text>
        {canManageStaff ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddEmployee}
            activeOpacity={0.7}
          >
            <MaterialIcons name="person-add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              {canManageStaff ? "Your Team" : "Our Team"}
            </Text>
            <Text style={[styles.sectionSubtitle, dynamicStyles.textSecondary]}>
              {employees.length} {employees.length === 1 ? "employee" : "employees"}
            </Text>
          </View>

          {/* Quick Actions for Owners */}
          {canManageStaff && (
            <>
              <TouchableOpacity
                style={styles.addEmployeeCard}
                onPress={handleAddEmployee}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={theme.colors.primary} />
                <Text style={styles.addEmployeeText}>Add New Employee</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.addEmployeeCard, { backgroundColor: theme.colors.secondary + '15', borderColor: theme.colors.secondary + '30' }]}
                onPress={() => navigation?.navigate('EmployeePermissions', { salonId })}
                activeOpacity={0.7}
              >
                <MaterialIcons name="admin-panel-settings" size={20} color={theme.colors.secondary} />
                <Text style={[styles.addEmployeeText, { color: theme.colors.secondary }]}>Manage All Permissions</Text>
              </TouchableOpacity>
            </>
          )}

          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="people"
                size={48}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, dynamicStyles.text]}>
                No employees available
              </Text>
            </View>
          ) : (
            <View style={styles.employeesGrid}>
              {employees.map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={[styles.employeeCard, dynamicStyles.card, { width: cardWidth }]}
                  onPress={() => handleEmployeePress(employee)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.employeeImage, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={styles.employeeInitials}>
                      {employee.user?.fullName
                        ? getInitials(employee.user.fullName)
                        : "EM"}
                    </Text>
                  </View>
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
                        <View key={index} style={[styles.skillTag, { backgroundColor: theme.colors.primaryLight }]}>
                          <Text style={[styles.skillText, { color: theme.colors.primary }]}>
                            {skill}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  addButton: {
    padding: theme.spacing.xs,
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  employeesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    justifyContent: "space-between",
  },
  employeeCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  employeeImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  employeeInitials: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.bold,
  },
  employeeRole: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    justifyContent: "center",
  },
  skillTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  addEmployeeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    gap: theme.spacing.sm,
  },
  addEmployeeText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
});

