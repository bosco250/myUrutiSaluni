import React, { useState, useEffect } from "react";
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
import { useTheme } from "../../context";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { exploreService, Employee, Salon } from "../../services/explore";

interface EmployeeListScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId: string;
      salon?: Salon;
    };
  };
}

export default function EmployeeListScreen({
  navigation,
  route,
}: EmployeeListScreenProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "notifications" | "profile"
  >("explore");
  const unreadNotificationCount = useUnreadNotifications();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const salonId = route?.params?.salonId || route?.params?.salon?.id;
  const salon = route?.params?.salon;

  useEffect(() => {
    if (salonId) {
      fetchEmployees();
    }
  }, [salonId]);

  const fetchEmployees = async () => {
    if (!salonId) return;

    try {
      setLoading(true);
      const salonEmployees = await exploreService.getSalonEmployees(salonId);
      setEmployees(salonEmployees.filter((e) => e.isActive));
    } catch (error: any) {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeePress = (employee: Employee) => {
    navigation?.navigate("EmployeeDetail", {
      employeeId: employee.id,
      salonId: salonId,
      employee,
    });
  };

  const handleTabPress = (
    tabId: string
  ) => {
    setActiveTab(tabId as "home" | "bookings" | "explore" | "notifications" | "profile");
    if (tabId !== "explore") {
      const screenName =
        tabId === "home" ? "Home" : tabId.charAt(0).toUpperCase() + tabId.slice(1);
      navigation?.navigate(screenName as any);
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
          {salon?.name || "Employees"}
        </Text>
        <View style={styles.headerRight} />
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
              Our Team
            </Text>
            <Text style={[styles.sectionSubtitle, dynamicStyles.textSecondary]}>
              {employees.length} {employees.length === 1 ? "employee" : "employees"}
            </Text>
          </View>

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
                  style={[styles.employeeCard, dynamicStyles.card]}
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
    width: (Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.md) / 2,
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
});

