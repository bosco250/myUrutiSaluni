import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { theme } from "../theme";
import { useTheme, useAuth } from "../context";
import QuickActionButton from "../components/common/QuickActionButton";
import AppointmentCard from "../components/common/AppointmentCard";
import { Loader } from "../components/common";
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
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(180);
  const headerAnimatedValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Data states
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [topSalons, setTopSalons] = useState<Salon[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const fetchAppointments = useCallback(async () => {
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
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

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
        const prioritized = [...todayAppointments, ...futureAppointments].slice(
          0,
          3
        );

        setUpcomingAppointments(prioritized);
      }
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      setUpcomingAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [user?.id]);

  // Fetch top-rated salons
  const fetchTopSalons = async () => {
    try {
      setSalonsLoading(true);
      const salons = await exploreService.getSalons();

      // Filter active salons and sort by rating (if available) or name
      const activeSalons = salons
        .filter(
          (salon) =>
            salon.status === "active" || (salon as any).isActive === true
        )
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
      setInitialLoading(true);
      await Promise.all([fetchAppointments(), fetchTopSalons()]);
      setInitialLoading(false);
    };
    loadData();
  }, [user?.id, fetchAppointments]);

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
      badge: "NEW",
    },
    {
      icon: "workspace-premium",
      label: "Loyalty",
      onPress: () => navigation?.navigate("Loyalty"),
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
    {
      icon: "favorite",
      label: "Favorites",
      onPress: () => navigation?.navigate("Favorites"),
    },
  ];

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY;

    // Calculate when Quick Actions reaches the top
    // Quick Actions starts at headerHeight + theme.spacing.sm
    const quickActionsTop = headerHeight + theme.spacing.sm;
    const shouldHideHeader = currentScrollY >= quickActionsTop - 20; // Small threshold for smooth transition

    // Show header immediately when scrolling UP (scrollDifference < 0)
    if (scrollDifference < 0 && !isHeaderVisible) {
      setIsHeaderVisible(true);
      Animated.timing(headerAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    // Show header when scroll position is before Quick Actions top
    else if (!shouldHideHeader && !isHeaderVisible) {
      setIsHeaderVisible(true);
      Animated.timing(headerAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    // Hide header when scrolling DOWN and Quick Actions reaches the top
    else if (
      scrollDifference > 0 &&
      shouldHideHeader &&
      isHeaderVisible &&
      currentScrollY > 50
    ) {
      setIsHeaderVisible(false);
      Animated.timing(headerAnimatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
    } catch {
      return { dateLabel: "Date TBD", time: "" };
    }
  };

  // Format created date and time
  const formatCreatedDateTime = (appointment: Appointment) => {
    try {
      const createdDate =
        (appointment as any).created_at || appointment.createdAt;
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
    } catch {
      return null;
    }
  };

  // Show fullscreen loader on initial load
  if (initialLoading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "light-content"} />
        <Loader fullscreen message="Loading home..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
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
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          setHeaderHeight(height);
        }}
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
            <Text style={styles.greeting}>Hello, {getUserFirstName()}!</Text>
            <Text style={styles.tagline}>Ready for a new look today?</Text>
          </View>
          <View style={styles.profileContainer}>
            <View style={styles.profileImageGlow} />
            <TouchableOpacity
              onPress={() => navigation?.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Image 
                source={user?.avatarUrl ? { uri: user.avatarUrl } : profileImage} 
                style={styles.profileImage}
                onError={(e) => console.log('Home avatar load error:', e.nativeEvent.error)}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + theme.spacing.sm },
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
        <View style={styles.firstSection}>
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
                  badge={(action as any).badge}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Appointments Section */}
        <View style={styles.section}>
          {upcomingAppointments.length > 0 && (
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
          )}

          {appointmentsLoading ? (
            <View style={styles.loadingContainer}>
              <Loader message="Loading appointments..." />
            </View>
          ) : upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => {
              const { dateLabel, time } = formatAppointmentDateTime(
                appointment.scheduledStart
              );
              const createdInfo = formatCreatedDateTime(appointment);
              const serviceName = appointment.service?.name || "Service";
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
            <View style={styles.premiumEmptyState}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.premiumEmptyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Decorative background elements for premium feel */}
                <View style={styles.decoCircle1} />
                <View style={styles.decoCircle2} />
                <View style={styles.decoStar1} />
                
                <View style={styles.premiumEmptyContent}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="auto-awesome" size={32} color="#FFF" />
                  </View>
                  <Text style={styles.premiumEmptyTitle}>Start Your Beauty Journey</Text>
                  <Text style={styles.premiumEmptySubtitle}>
                    Discover top-rated salons and professional stylists near you. Treat yourself to a new look today!
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.premiumBookButton}
                    onPress={() => navigation?.navigate("Explore")}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.premiumBookButtonText}>Explore Services</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
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
              <Loader message="Loading salons..." />
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
            colors={[
              theme.colors.primary + "15",
              theme.colors.primaryLight + "10",
            ]}
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
            <Text
              style={[styles.membershipSubtitle, dynamicStyles.textSecondary]}
            >
              Apply to start your salon business on our platform and grow your
              success
            </Text>

            <View style={styles.membershipBenefits}>
              <View style={styles.benefitRow}>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.benefitText, dynamicStyles.text]}>
                  Create Your Salon
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.benefitText, dynamicStyles.text]}>
                  Manage Bookings
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={theme.colors.primary}
                />
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
                <Text
                  style={[
                    styles.learnMoreText,
                    { color: theme.colors.primary },
                  ]}
                >
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
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
    paddingBottom: theme.spacing.lg,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  firstSection: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitleLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold,
    marginHorizontal: theme.spacing.sm,
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
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: theme.spacing.xs,
  },
  quickActionWrapper: {
    width: "30%",
    marginBottom: theme.spacing.sm,
  },
  salonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  bookNowButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 8,
  },
  bookNowText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  // Membership Banner Styles
  membershipSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  membershipBanner: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  membershipIconContainer: {
    marginBottom: theme.spacing.sm,
  },
  membershipIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    textAlign: "center",
    marginBottom: theme.spacing.xs / 2,
  },
  membershipSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  membershipBenefits: {
    width: "100%",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  membershipActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "100%",
  },
  learnMoreButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  applyNowButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  applyNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs / 2,
  },
  applyNowText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.white,
    fontFamily: theme.fonts.medium,
  },
  // Premium Empty State
  premiumEmptyState: {
    marginVertical: theme.spacing.sm,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  premiumEmptyGradient: {
    padding: theme.spacing.lg,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  premiumEmptyContent: {
    alignItems: "center",
    zIndex: 2,
    width: "100%",
  },
  premiumEmptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.textInverse,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  premiumEmptySubtitle: {
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.95,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
    maxWidth: "90%",
  },
  premiumBookButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumBookButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Decorative elements
  decoCircle1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decoCircle2: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decoStar1: {
    position: "absolute",
    top: 40,
    left: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});
