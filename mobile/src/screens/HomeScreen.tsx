import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { theme } from "../theme";
import { useTheme, useAuth } from "../context";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import QuickActionButton from "../components/common/QuickActionButton";
import AppointmentCard from "../components/common/AppointmentCard";
import SalonCard from "./explore/components/SalonCard";
import AutoSlider from "./explore/components/AutoSlider";
import { appointmentsService, Appointment } from "../services/appointments";
import { customersService } from "../services/customers";
import { exploreService, Salon } from "../services/explore";

// Import logo
const logo = require("../../assets/Logo.png");

// Placeholder profile image - in production, use actual user image
const profileImage = require("../../assets/Logo.png");

interface HomeScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "notifications" | "profile"
  >("home");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const unreadNotificationCount = useUnreadNotifications();
  const headerAnimatedValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Data states
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [topSalons, setTopSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [salonsLoading, setSalonsLoading] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
    },
  };

  // Get user's first name for greeting
  const getUserFirstName = () => {
    if (user?.fullName) {
      const nameParts = user.fullName.split(" ");
      return nameParts[0] || "there";
    }
    return "there";
  };

  // Fetch customer ID and appointments
  const fetchAppointments = async () => {
    if (!user?.id) {
      setAppointmentsLoading(false);
      return;
    }

    try {
      setAppointmentsLoading(true);
      const userId = String(user.id);
      const customer = await customersService.getCustomerByUserId(userId);

      if (customer?.id) {
        const appointments = await appointmentsService.getCustomerAppointments(
          customer.id
        );

        // Filter upcoming appointments (scheduledStart in the future or today)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Separate today's appointments and future appointments
        const todayAppointments: Appointment[] = [];
        const futureAppointments: Appointment[] = [];
        
        appointments.forEach((apt) => {
          const scheduledStart = new Date(apt.scheduledStart);
          const scheduledDate = new Date(
            scheduledStart.getFullYear(),
            scheduledStart.getMonth(),
            scheduledStart.getDate()
          );
          
          // Include today's appointments and future appointments
          if (scheduledDate.getTime() >= today.getTime()) {
            if (scheduledDate.getTime() === today.getTime()) {
              todayAppointments.push(apt);
            } else {
              futureAppointments.push(apt);
            }
          }
        });
        
        // Sort today's appointments by time (earliest first)
        todayAppointments.sort((a, b) => {
          return (
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime()
          );
        });
        
        // Sort future appointments by time (earliest first)
        futureAppointments.sort((a, b) => {
          return (
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime()
          );
        });
        
        // Prioritize today's appointments, then future appointments
        const prioritized = [...todayAppointments, ...futureAppointments].slice(0, 3);
        
        setUpcomingAppointments(prioritized);
      }
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      setUpcomingAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Fetch top-rated salons
  const fetchTopSalons = async () => {
    try {
      setSalonsLoading(true);
      const salons = await exploreService.getSalons();

      // Filter active salons and sort by rating (if available) or name
      const activeSalons = salons
        .filter((salon) => salon.status === "active" || (salon as any).isActive === true)
        .sort((a, b) => {
          // Sort by rating if available, otherwise by name
          const ratingA = (a as any).rating || 0;
          const ratingB = (b as any).rating || 0;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, 5); // Show top 5 salons

      setTopSalons(activeSalons);
    } catch (error: any) {
      console.error("Error fetching salons:", error);
      setTopSalons([]);
    } finally {
      setSalonsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAppointments(), fetchTopSalons()]);
      setLoading(false);
    };
    loadData();
  }, [user?.id]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAppointments(), fetchTopSalons()]);
    setRefreshing(false);
  };

  const quickActions = [
    {
      icon: "search",
      label: "Search",
      onPress: () => navigation?.navigate("Search"),
    },
    {
      icon: "auto-awesome",
      label: "AI Pickup",
      onPress: () => navigation?.navigate("AIFaceScan"),
    },
    {
      icon: "workspace-premium",
      label: "Loyalty",
      onPress: () => navigation?.navigate("Loyalty"),
    },
    {
      icon: "account-balance-wallet",
      label: "Wallet",
      onPress: () => navigation?.navigate("Wallet"),
    },
    {
      icon: "local-offer",
      label: "Offers",
      onPress: () => navigation?.navigate("Offers"),
    },
    {
      icon: "chat",
      label: "Chats",
      onPress: () => navigation?.navigate("ChatList"),
    },
  ];

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY;

    // Show header when scrolling up, hide when scrolling down
    if (scrollDifference > 0 && currentScrollY > 50) {
      // Scrolling down - hide header
      if (isHeaderVisible) {
        setIsHeaderVisible(false);
        Animated.timing(headerAnimatedValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (scrollDifference < 0) {
      // Scrolling up - show header
      if (!isHeaderVisible) {
        setIsHeaderVisible(true);
        Animated.timing(headerAnimatedValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }

    setLastScrollY(currentScrollY);
  };

  const headerTranslateY = headerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -200],
  });

  const headerOpacity = headerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleTabPress = (
    tabId: string
  ) => {
    setActiveTab(tabId as "home" | "bookings" | "explore" | "notifications" | "profile");
    if (tabId === "profile") {
      navigation?.navigate("Profile");
    } else if (tabId === "explore") {
      navigation?.navigate("Explore");
    } else if (tabId === "bookings") {
      navigation?.navigate("Bookings");
    } else if (tabId === "notifications") {
      navigation?.navigate("Notifications");
    }
  };

  // Format appointment date and time - clearer format
  const formatAppointmentDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const appointmentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const diffTime = appointmentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dateLabel = "";
      if (diffDays === 0) {
        dateLabel = "Today";
      } else if (diffDays === 1) {
        dateLabel = "Tomorrow";
      } else if (diffDays > 1 && diffDays <= 7) {
        dateLabel = format(date, "EEEE, MMM d"); // Day name, Month and day
      } else {
        dateLabel = format(date, "MMM d, yyyy"); // Full date
      }

      const time = format(date, "h:mm a");
      return { dateLabel, time };
    } catch (error) {
      return { dateLabel: "Date TBD", time: "" };
    }
  };
  
  // Format created date and time
  const formatCreatedDateTime = (appointment: Appointment) => {
    try {
      const createdDate = (appointment as any).created_at || appointment.createdAt;
      if (!createdDate) return null;
      
      const date = new Date(createdDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const createdDateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const diffTime = createdDateOnly.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dateLabel = "";
      if (diffDays === 0) {
        dateLabel = "Today";
      } else if (diffDays === 1) {
        dateLabel = "Yesterday";
      } else if (diffDays > 1 && diffDays <= 7) {
        dateLabel = format(date, "EEEE");
      } else {
        dateLabel = format(date, "MMM d");
      }

      const time = format(date, "h:mm a");
      return { dateLabel, time };
    } catch (error) {
      return null;
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "light-content"} />

      {/* Header Section with Gold Background - Animated */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          },
        ]}
        pointerEvents={isHeaderVisible ? "auto" : "none"}
      >
        {/* Decorative Background Elements */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        <View style={styles.headerDecoration3} />

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <View style={styles.logoGlow} />
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.greeting}>
              Hello, {getUserFirstName()}!
            </Text>
            <Text style={styles.tagline}>Ready for a new look today?</Text>
          </View>
          <View style={styles.profileContainer}>
            <View style={styles.profileImageGlow} />
            <TouchableOpacity
              onPress={() => navigation?.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Image source={profileImage} style={styles.profileImage} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (StatusBar.currentHeight || 0) + 180 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionTitleLine} />
            <Text
              style={[styles.sectionTitle, { color: dynamicStyles.text.color }]}
            >
              Quick Actions
            </Text>
            <View style={styles.sectionTitleLine} />
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <View key={index} style={styles.quickActionWrapper}>
                <QuickActionButton
                  icon={action.icon}
                  label={action.label}
                  onPress={action.onPress}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Appointments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={styles.sectionIcon} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: dynamicStyles.text.color },
                ]}
              >
                Upcoming Appointments
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation?.navigate("Bookings")}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>View All</Text>
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {appointmentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => {
              const { dateLabel, time } = formatAppointmentDateTime(
                appointment.scheduledStart
              );
              const createdInfo = formatCreatedDateTime(appointment);
              const serviceName =
                appointment.service?.name || "Service";
              const salonName = appointment.salon?.name || "Salon";
              const stylistName =
                appointment.salonEmployee?.user?.fullName || "Any Stylist";

              return (
                <AppointmentCard
                  key={appointment.id}
                  service={serviceName}
                  salon={salonName}
                  date={dateLabel}
                  time={time}
                  stylist={stylistName}
                  status={appointment.status}
                  createdDate={createdInfo?.dateLabel}
                  createdTime={createdInfo?.time}
                  onViewDetails={() => {
                    navigation?.navigate("AppointmentDetail", {
                      appointmentId: appointment.id,
                      appointment: appointment,
                    });
                  }}
                  onShare={() => {
                    // TODO: Implement share functionality
                    console.log("Share appointment");
                  }}
                />
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="event-busy"
                size={48}
                color={dynamicStyles.textSecondary.color}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: dynamicStyles.textSecondary.color },
                ]}
              >
                No upcoming appointments
              </Text>
              <TouchableOpacity
                style={styles.bookNowButton}
                onPress={() => navigation?.navigate("Explore")}
                activeOpacity={0.7}
              >
                <Text style={styles.bookNowText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Top Rated Salons Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={styles.sectionIcon} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: dynamicStyles.text.color },
                ]}
              >
                Top Rated Salons
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation?.navigate("Explore")}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>See All</Text>
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {salonsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : topSalons.length > 0 ? (
            <AutoSlider
              onItemPress={(index) => {
                if (topSalons[index]) {
                  navigation?.navigate("SalonDetail", {
                    salonId: topSalons[index].id,
                    salon: topSalons[index],
                  });
                }
              }}
            >
              {topSalons.map((salon) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  width={280}
                  onPress={() => {
                    navigation?.navigate("SalonDetail", {
                      salonId: salon.id,
                      salon: salon,
                    });
                  }}
                />
              ))}
            </AutoSlider>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="store"
                size={48}
                color={dynamicStyles.textSecondary.color}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: dynamicStyles.textSecondary.color },
                ]}
              >
                No salons available
              </Text>
            </View>
          )}
        </View>

        {/* Membership Association Banner */}
        <View style={styles.membershipSection}>
          <LinearGradient
            colors={[theme.colors.primary + "15", theme.colors.primaryLight + "10"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.membershipBanner}
          >
            <View style={styles.membershipIconContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.membershipIcon}
              >
                <MaterialIcons name="groups" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={[styles.membershipTitle, dynamicStyles.text]}>
              Become a Salon Owner
            </Text>
            <Text style={[styles.membershipSubtitle, dynamicStyles.textSecondary]}>
              Apply to start your salon business on our platform and grow your success
            </Text>

            <View style={styles.membershipBenefits}>
              <View style={styles.benefitRow}>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.benefitText, dynamicStyles.text]}>
                  Create Your Salon
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.benefitText, dynamicStyles.text]}>
                  Manage Bookings
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.benefitText, dynamicStyles.text]}>
                  Track Revenue
                </Text>
              </View>
            </View>

            <View style={styles.membershipActions}>
              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => navigation?.navigate("MembershipInfo")}
                activeOpacity={0.7}
              >
                <Text style={[styles.learnMoreText, { color: theme.colors.primary }]}>
                  Learn More
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyNowButton}
                onPress={() => navigation?.navigate("MembershipInfo")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.applyNowGradient}
                >
                  <Text style={styles.applyNowText}>Apply Now</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
    backgroundColor: theme.colors.primary,
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerDecoration1: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerDecoration2: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerDecoration3: {
    position: "absolute",
    top: 60,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  logoContainer: {
    position: "relative",
    marginBottom: theme.spacing.sm,
  },
  logoGlow: {
    position: "absolute",
    width: 140,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -5,
    left: -10,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 40,
    zIndex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.textInverse,
    opacity: 0.9,
    fontFamily: theme.fonts.regular,
  },
  profileContainer: {
    position: "relative",
  },
  profileImageGlow: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -5,
    left: -5,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: theme.colors.textInverse,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitleLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginHorizontal: theme.spacing.md,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionIcon: {
    width: 4,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 8,
    backgroundColor: "rgba(200, 155, 104, 0.1)",
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  quickActionWrapper: {
    width: "30%",
    marginBottom: theme.spacing.md,
  },
  salonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  bookNowButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  bookNowText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  // Membership Banner Styles
  membershipSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  membershipBanner: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  membershipIconContainer: {
    marginBottom: theme.spacing.md,
  },
  membershipIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  membershipTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  membershipSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  membershipBenefits: {
    width: "100%",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  membershipActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
  },
  learnMoreButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  learnMoreText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  applyNowButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  applyNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  applyNowText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
});
