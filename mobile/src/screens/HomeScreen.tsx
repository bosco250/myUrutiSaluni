import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import { useTheme } from "../context";
import BottomNavigation from "../components/common/BottomNavigation";
import QuickActionButton from "../components/common/QuickActionButton";
import AppointmentCard from "../components/common/AppointmentCard";

// Import logo
const logo = require("../../assets/Logo.png");

// Placeholder profile image - in production, use actual user image
const profileImage = require("../../assets/Logo.png");

interface HomeScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "favorites" | "profile"
  >("home");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerAnimatedValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

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

  const quickActions = [
    { icon: "search", label: "Search" },
    { icon: "auto-awesome", label: "AI Pickup" },
    { icon: "workspace-premium", label: "Loyalty" },
    { icon: "account-balance-wallet", label: "Wallet" },
    { icon: "local-offer", label: "Offers" },
    { icon: "chat", label: "Chats" },
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
    tab: "home" | "bookings" | "explore" | "favorites" | "profile"
  ) => {
    setActiveTab(tab);
    if (tab === "profile") {
      navigation?.navigate("Profile");
    } else if (tab === "explore") {
      navigation?.navigate("Explore");
    }
    // Other tabs can be handled here when their screens are created
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
            <Text style={styles.greeting}>Hello, Sarah!</Text>
            <Text style={styles.tagline}>Ready for a new look today?</Text>
          </View>
          <View style={styles.profileContainer}>
            <View style={styles.profileImageGlow} />
            <Image source={profileImage} style={styles.profileImage} />
            <TouchableOpacity
              style={styles.notificationBadge}
              onPress={() => navigation?.navigate("Notifications")}
              activeOpacity={0.7}
            >
              <View style={styles.badgePulse} />
              <Text style={styles.badgeNumber}>2</Text>
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
                  onPress={() => console.log(`${action.label} pressed`)}
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
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllLink}>View All</Text>
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          <AppointmentCard
            service="Hair Styling & Color"
            salon="Glamour Studio"
            date="Today"
            time="2:30 PM"
            stylist="Maria Johnson"
            onViewDetails={() => console.log("View details")}
            onShare={() => console.log("Share")}
          />
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
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllLink}>See All</Text>
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          {/* Salon list would go here */}
          <View style={styles.placeholderSalons}>
            <Text
              style={[
                styles.placeholderText,
                { color: dynamicStyles.textSecondary.color },
              ]}
            >
              Coming soon...
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
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
  notificationBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  badgePulse: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3B30",
    opacity: 0.5,
  },
  badgeNumber: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    zIndex: 1,
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
  placeholderSalons: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontStyle: "italic",
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
});
