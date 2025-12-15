import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, BackHandler, Alert } from "react-native";
import AuthNavigator from "./AuthNavigator";
import WelcomeScreen from "../screens/WelcomeScreen";
import HomeScreen from "../screens/HomeScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import { ExploreScreen, ServiceDetailScreen, AllServicesScreen, SalonDetailScreen } from "../screens/explore";
import EmployeeListScreen from "../screens/explore/EmployeeListScreen";
import EmployeeDetailScreen from "../screens/explore/EmployeeDetailScreen";
import { BookingsScreen, AppointmentDetailScreen, BookingFlowScreen } from "../screens/booking";
import { ProfileScreen } from "../screens/profile";
import { SearchScreen, AIFaceScanScreen, AIConsultantScreen, RecommendationDetailScreen, LoyaltyScreen, WalletScreen, OffersScreen, ChatListScreen, ChatScreen, ChatUserSearchScreen } from "../screens/quickActions";
import ReviewScreen from "../screens/reviews/ReviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentHistoryScreen from "../screens/payment/PaymentHistoryScreen";
import WithdrawScreen from "../screens/payment/WithdrawScreen";
import { MembershipInfoScreen, MembershipApplicationScreen, ApplicationSuccessScreen } from "../screens/membership";
import { ThemeProvider, AuthProvider, useAuth } from "../context";
import { theme } from "../theme";

type MainScreen = "Home" | "Bookings" | "AppointmentDetail" | "BookingFlow" | "Notifications" | "Explore" | "ServiceDetail" | "AllServices" | "SalonDetail" | "EmployeeList" | "EmployeeDetail" | "Profile" | "Login" | "Search" | "AIFaceScan" | "AIConsultant" | "RecommendationDetail" | "Loyalty" | "Wallet" | "Offers" | "ChatList" | "Chat" | "ChatUserSearch" | "Review" | "Payment" | "PaymentHistory" | "Withdraw" | "MembershipInfo" | "MembershipApplication" | "ApplicationSuccess";

// Main tabs that are root level screens
const MAIN_TABS: MainScreen[] = ["Home", "Bookings", "Explore", "Profile", "Notifications"];

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

  // Handle Android hardware back button
  const handleBackPress = useCallback(() => {
    // If on welcome screen, let the default behavior happen (exit app)
    if (showWelcome) {
      return false;
    }

    // If not authenticated, let default behavior happen
    if (!isAuthenticated) {
      return false;
    }

    // If we have history, go back
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop();
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
      setScreenParams({});
      return true; // We handled the back press
    }

    // If already on Home screen, show exit confirmation
    if (currentScreen === "Home") {
      Alert.alert(
        "Exit App",
        "Are you sure you want to exit?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() }
        ],
        { cancelable: true }
      );
      return true; // We handled the back press (showing dialog)
    }

    // If on any main tab but not Home, go to Home
    if (MAIN_TABS.includes(currentScreen)) {
      setCurrentScreen("Home");
      setScreenHistory(["Home"]);
      setScreenParams({});
      return true;
    }

    // Default: go to Home
    setCurrentScreen("Home");
    setScreenHistory(["Home"]);
    return true;
  }, [showWelcome, isAuthenticated, screenHistory, currentScreen]);

  // Set up BackHandler listener
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    setHasShownWelcome(true);
  };

  const handleNavigate = (screen: string, params?: any) => {
    const targetScreen = screen as MainScreen;
    // If navigating to a main tab (Home, Bookings, Explore, Profile), reset history
    if (MAIN_TABS.includes(targetScreen)) {
      setScreenHistory([targetScreen]);
    } else {
      // For detail screens, add to history
      setScreenHistory((prev) => [...prev, targetScreen]);
    }
    setCurrentScreen(targetScreen);
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
        return <NotificationsScreen navigation={{ navigate: handleNavigate, goBack: handleGoBack }} />;
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
      case "Search":
        return (
          <SearchScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "AIFaceScan":
        return (
          <AIFaceScanScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "AIConsultant":
        return (
          <AIConsultantScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "RecommendationDetail":
        return (
          <RecommendationDetailScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "Loyalty":
        return (
          <LoyaltyScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "Wallet":
        return (
          <WalletScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "Offers":
        return (
          <OffersScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "ChatList":
        return (
          <ChatListScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "Chat":
        return (
          <ChatScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "ChatUserSearch":
        return (
          <ChatUserSearchScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "Review":
        return (
          <ReviewScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "Payment":
        return (
          <PaymentScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "PaymentHistory":
        return (
          <PaymentHistoryScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
            route={{ params: screenParams }}
          />
        );
      case "Withdraw":
        return (
          <WithdrawScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "MembershipInfo":
        return (
          <MembershipInfoScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "MembershipApplication":
        return (
          <MembershipApplicationScreen
            navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
          />
        );
      case "ApplicationSuccess":
        return (
          <ApplicationSuccessScreen
            navigation={{ navigate: handleNavigate }}
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
