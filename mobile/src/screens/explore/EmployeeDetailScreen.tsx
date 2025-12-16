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
import {
  exploreService,
  Employee,
  Service,
  Salon,
} from "../../services/explore";

interface EmployeeDetailScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      employeeId: string;
      salonId: string;
      employee?: Employee;
    };
  };
}

export default function EmployeeDetailScreen({
  navigation,
  route,
}: EmployeeDetailScreenProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "notifications" | "profile"
  >("explore");
  const unreadNotificationCount = useUnreadNotifications();
  const [employee, setEmployee] = useState<Employee | null>(
    route?.params?.employee || null
  );
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(!route?.params?.employee);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const employeeId = route?.params?.employeeId;
  const salonId = route?.params?.salonId;

  useEffect(() => {
    if (employeeId && salonId) {
      if (!employee) {
        fetchEmployee();
      }
      fetchSalon();
      fetchEmployeeServices();
    }
  }, [employeeId, salonId]);

  const fetchEmployee = async () => {
    if (!employeeId || !salonId) return;

    try {
      setLoading(true);
      const fetchedEmployee = await exploreService.getEmployeeById(
        employeeId,
        salonId
      );
      if (fetchedEmployee) {
        setEmployee(fetchedEmployee);
      }
    } catch (error: any) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchSalon = async () => {
    if (!salonId) return;

    try {
      const fetchedSalon = await exploreService.getSalonById(salonId);
      setSalon(fetchedSalon);
    } catch (error: any) {
      // Handle error
    }
  };

  const fetchEmployeeServices = async () => {
    if (!salonId) return;

    try {
      setServicesLoading(true);
      const salonServices = await exploreService.getServices(salonId);
      // Filter active services - in a real app, you'd filter by employee
      setServices(salonServices.filter((s) => s.isActive).slice(0, 5));
    } catch (error: any) {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
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

  const handleServicePress = (service: Service) => {
    navigation?.navigate("ServiceDetail", {
      serviceId: service.id,
      service,
    });
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
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Employee not found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const employeeName = employee.user?.fullName || "Employee";
  const employeeTitle = employee.roleTitle || "Stylist";
  const specialties = employee.skills || [];

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
        <Text
          style={[styles.headerTitle, dynamicStyles.text]}
          numberOfLines={1}
        >
          Stylist Profile
        </Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorite ? "favorite" : "favorite-border"}
            size={24}
            color={isFavorite ? theme.colors.error : dynamicStyles.text.color}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View
            style={[
              styles.profileImage,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Text style={styles.profileInitials}>
              {getInitials(employeeName)}
            </Text>
          </View>
          <Text style={[styles.employeeName, dynamicStyles.text]}>
            {employeeName}
          </Text>
          <Text style={[styles.employeeTitle, dynamicStyles.textSecondary]}>
            {employeeTitle}
          </Text>
          {/* Rating - placeholder since backend doesn't have ratings yet */}
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color={theme.colors.warning} />
            <Text style={[styles.ratingText, dynamicStyles.text]}>
              4.8 (124 reviews)
            </Text>
          </View>
        </View>

        {/* About Me Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, dynamicStyles.text]}>
            About Me
          </Text>
          <Text style={[styles.aboutText, dynamicStyles.textSecondary]}>
            {employee.user?.email
              ? `With over 10 years of experience, I specialize in creating personalized looks that blend modern trends with timeless style. My passion is making every client feel beautiful and confident.`
              : "Experienced stylist dedicated to creating beautiful looks for every client."}
          </Text>
        </View>

        {/* Specialties Section */}
        {specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, dynamicStyles.text]}>
              Specialties
            </Text>
            <View style={styles.specialtiesContainer}>
              {specialties.map((specialty, index) => (
                <View
                  key={index}
                  style={[
                    styles.specialtyTag,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.specialtyText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {specialty}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => {
              navigation?.navigate("Chat", {
                employeeId: employee?.id,
                salonId: salonId,
              });
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Services Offered Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, dynamicStyles.text]}>
            Services Offered
          </Text>
          {servicesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No services available
              </Text>
            </View>
          ) : (
            <View style={styles.servicesContainer}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceCard, dynamicStyles.card]}
                  onPress={() => handleServicePress(service)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceContent}>
                    <Text style={[styles.serviceName, dynamicStyles.text]}>
                      {service.name}
                    </Text>
                    <View style={styles.serviceMeta}>
                      <MaterialIcons
                        name="schedule"
                        size={14}
                        color={dynamicStyles.textSecondary.color}
                      />
                      <Text
                        style={[
                          styles.serviceDuration,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        {service.durationMinutes} min
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.servicePrice,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {service.basePrice && service.basePrice > 0
                      ? `$${Number(service.basePrice).toFixed(2)}`
                      : "Price N/A"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  favoriteButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  profileInitials: {
    color: theme.colors.primary,
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  employeeTitle: {
    fontSize: 16,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    gap: theme.spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.fonts.regular,
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  specialtyTag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  servicesContainer: {
    gap: theme.spacing.md,
  },
  serviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.medium,
  },
  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  serviceDuration: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  actionButtonsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
