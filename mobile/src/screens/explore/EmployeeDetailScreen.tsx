import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  exploreService,
  Employee,
  Service,
  Salon,
} from "../../services/explore";
import { Loader } from "../../components/common";

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
  const [employee, setEmployee] = useState<Employee | null>(
    route?.params?.employee || null
  );
  const [, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(!route?.params?.employee);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const employeeId = route?.params?.employeeId;
  const salonId = route?.params?.salonId;

  const fetchEmployee = useCallback(async () => {
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
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [employeeId, salonId]);

  const fetchSalon = useCallback(async () => {
    if (!salonId) return;

    try {
      const fetchedSalon = await exploreService.getSalonById(salonId);
      setSalon(fetchedSalon);
    } catch {
      // Handle error
    }
  }, [salonId]);

  const fetchEmployeeServices = useCallback(async () => {
    if (!salonId) return;

    try {
      setServicesLoading(true);
      const salonServices = await exploreService.getServices(salonId);
      // Filter active services - in a real app, you'd filter by employee
      setServices(salonServices.filter((s) => s.isActive).slice(0, 5));
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (employeeId && salonId) {
      if (!employee) {
        fetchEmployee();
      }
      fetchSalon();
      fetchEmployeeServices();
    }
  }, [employeeId, salonId, employee, fetchEmployee, fetchSalon, fetchEmployeeServices]);


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
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    sectionBorder: {
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading employee profile..." />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={[styles.errorText, dynamicStyles.text]}>
            Employee not found
          </Text>
          <TouchableOpacity
            style={[styles.errorBackButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const employeeName = employee.user?.fullName || "Employee";
  const employeeTitle = employee.roleTitle || "Stylist";
  const specialties = employee.skills || [];

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.container, { borderBottomColor: dynamicStyles.sectionBorder.borderColor }]}>
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
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.primaryLight + "20" }]}>
          <View style={styles.profileHeaderContent}>
            <View
              style={[
                styles.profileImage,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.profileInitials}>
                {getInitials(employeeName)}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.employeeName, dynamicStyles.text]} numberOfLines={1}>
                {employeeName}
              </Text>
              <Text style={[styles.employeeTitle, dynamicStyles.textSecondary]} numberOfLines={1}>
                {employeeTitle}
              </Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={14} color={theme.colors.warning} />
                <Text style={[styles.ratingText, dynamicStyles.text]}>
                  4.8 (124)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, dynamicStyles.card, { borderColor: dynamicStyles.card.borderColor }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <MaterialIcons name="person" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>About</Text>
              <Text style={[styles.infoValue, dynamicStyles.text]} numberOfLines={3}>
                {employee.user?.email
                  ? `With over 10 years of experience, I specialize in creating personalized looks that blend modern trends with timeless style.`
                  : "Experienced stylist dedicated to creating beautiful looks for every client."}
              </Text>
            </View>
          </View>
          
          {specialties.length > 0 && (
            <View style={[styles.infoRow, styles.infoRowTopBorder, { borderTopColor: dynamicStyles.sectionBorder.borderColor }]}>
              <View style={[styles.infoIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialIcons name="star" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>Specialties</Text>
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
            </View>
          )}
        </View>

        {/* Action Button */}
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
            <MaterialIcons name="chat" size={18} color={theme.colors.white} />
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
              <Loader message="Loading services..." />
            </View>
          ) : services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="content-cut"
                size={40}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No services available
              </Text>
            </View>
          ) : (
            <View style={styles.servicesContainer}>
              {services.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    dynamicStyles.card,
                    { borderColor: dynamicStyles.card.borderColor },
                    index === services.length - 1 && styles.serviceCardLast,
                  ]}
                  onPress={() => handleServicePress(service)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceLeft}>
                    <View style={[styles.serviceIcon, { backgroundColor: theme.colors.primaryLight }]}>
                      <MaterialIcons name="content-cut" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.serviceContent}>
                      <Text style={[styles.serviceName, dynamicStyles.text]} numberOfLines={1}>
                        {service.name}
                      </Text>
                      <View style={styles.serviceMeta}>
                        <MaterialIcons
                          name="schedule"
                          size={12}
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
                  </View>
                  <Text
                    style={[
                      styles.servicePrice,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {service.basePrice && service.basePrice > 0
                      ? `RWF ${Number(service.basePrice).toFixed(2)}`
                      : "N/A"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  favoriteButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 15,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
    fontFamily: theme.fonts.medium,
  },
  errorBackButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    marginTop: theme.spacing.md,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInitials: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  profileInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  employeeTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs / 2,
    marginTop: theme.spacing.xs / 2,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  infoCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  infoRowTopBorder: {
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs / 2,
  },
  specialtyTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  servicesContainer: {
    gap: 0,
  },
  serviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  serviceCardLast: {
    borderBottomWidth: 0,
  },
  serviceLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.medium,
  },
  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs / 2,
  },
  serviceDuration: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  actionButtonsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 10,
    gap: theme.spacing.xs,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
