import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AuthNavigator from "./AuthNavigator";
import WelcomeScreen from "../screens/WelcomeScreen";
import HomeScreen from "../screens/HomeScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import { ExploreScreen, ServiceDetailScreen, AllServicesScreen, SalonDetailScreen } from "../screens/explore";
import EmployeeListScreen from "../screens/explore/EmployeeListScreen";
import EmployeeDetailScreen from "../screens/explore/EmployeeDetailScreen";
import { BookingsScreen, AppointmentDetailScreen, BookingFlowScreen } from "../screens/booking";
import { ProfileScreen } from "../screens/profile";
import { ThemeProvider, AuthProvider, useAuth } from "../context";
import { theme } from "../theme";

type MainScreen = "Home" | "Bookings" | "AppointmentDetail" | "BookingFlow" | "Notifications" | "Explore" | "ServiceDetail" | "AllServices" | "SalonDetail" | "EmployeeList" | "EmployeeDetail" | "Profile" | "Login";

// Inner navigation component that uses auth context
function NavigationContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MainScreen>("Home");
  const [screenParams, setScreenParams] = useState<any>({});
  const [screenHistory, setScreenHistory] = useState<MainScreen[]>(["Home"]);

  // Skip welcome screen if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !hasShownWelcome) {
      setShowWelcome(false);
      setHasShownWelcome(true);
      // Ensure we're on Home screen when authenticated
      setCurrentScreen("Home");
    }
  }, [isAuthenticated, hasShownWelcome]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setHasShownWelcome(true);
  };

  const handleNavigate = (screen: MainScreen, params?: any) => {
    // If navigating to a main tab (Home, Bookings, Explore, Profile), reset history
    const mainTabs: MainScreen[] = ["Home", "Bookings", "Explore", "Profile", "Notifications"];
    if (mainTabs.includes(screen)) {
      setScreenHistory([screen]);
    } else {
      // For detail screens, add to history
      setScreenHistory((prev) => [...prev, screen]);
    }
    setCurrentScreen(screen);
    setScreenParams(params || {});
  };

  const handleGoBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
      setScreenParams({});
    } else {
      // If no history, go to Home
      setCurrentScreen("Home");
      setScreenHistory(["Home"]);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show welcome screen only once and only if not authenticated
  if (showWelcome && !isAuthenticated) {
    return (
      <WelcomeScreen navigation={{ navigate: handleWelcomeComplete }} />
    );
  }

  // After authentication, show main app screens
  if (isAuthenticated) {
    // Ensure we always show a screen - default to Home if currentScreen is not set
    const screenToShow = currentScreen || "Home";
    
    switch (screenToShow) {
      case "Bookings":
        return <BookingsScreen navigation={{ navigate: handleNavigate, goBack: handleGoBack }} />;
      case "AppointmentDetail":
        return (
          <AppointmentDetailScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "BookingFlow":
        return (
          <BookingFlowScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "Notifications":
        return <NotificationsScreen navigation={{ goBack: handleGoBack }} />;
      case "Explore":
        return <ExploreScreen navigation={{ navigate: handleNavigate }} />;
      case "AllServices":
        return (
          <AllServicesScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "ServiceDetail":
        return (
          <ServiceDetailScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "SalonDetail":
        return (
          <SalonDetailScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "EmployeeList":
        return (
          <EmployeeListScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "EmployeeDetail":
        return (
          <EmployeeDetailScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "Profile":
        return (
          <ProfileScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "Home":
      default:
        return <HomeScreen navigation={{ navigate: handleNavigate }} />;
    }
  }

  // Not authenticated - show auth screens
  return <AuthNavigator />;
}

// Main navigation component with providers
export default function Navigation() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
