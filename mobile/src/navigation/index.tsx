import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet, BackHandler, Alert, Text } from "react-native";
import AuthNavigator from "./AuthNavigator";
import WelcomeScreen from "../screens/WelcomeScreen";
import { ThemeProvider, AuthProvider, useAuth } from "../context";
import { theme } from "../theme";
import { getDefaultHomeScreen } from "../constants/permissions";
import { Screen } from "../constants/permissions";
import { renderScreen } from "./screenRouter";
import { getNavigationTabsForRole, mapScreenToTab } from "./navigationConfig";
import BottomNavigation from "../components/common/BottomNavigation";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";

type MainScreen = "Home" | "Bookings" | "AppointmentDetail" | "BookingFlow" | "Notifications" | "Explore" | "ServiceDetail" | "AllServices" | "SalonDetail" | "EmployeeList" | "EmployeeDetail" | "Profile" | "Login" | "Search" | "AIFaceScan" | "AIConsultant" | "RecommendationDetail" | "Loyalty" | "Wallet" | "Offers" | "ChatList" | "Chat" | "ChatUserSearch" | "Review" | "Payment" | "PaymentHistory" | "Withdraw" | "MembershipInfo" | "MembershipApplication" | "ApplicationSuccess" | "StaffDashboard" | "OwnerDashboard" | "AdminDashboard" | "MySchedule" | "Attendance" | "CustomerManagement" | "StaffManagement" | "SalonSettings" | "BusinessAnalytics" | "InventoryManagement" | "SalonManagement" | "UserManagement" | "SystemReports" | "MembershipApprovals" | "Operations" | "Finance" | "MoreMenu" | "Help" | "WorkLog" | "Leaderboard" | "CreateSalon" | "SalonList" | "SalonAppointments" | "OwnerSalonDetail" | "OwnerEmployeeDetail" | "AddEmployee" | "AddService" | "EditSalon";

// Main tabs that are root level screens
const MAIN_TABS: MainScreen[] = ["Home", "Bookings", "Explore", "Profile", "Notifications"];

// Inner navigation component that uses auth context
function NavigationContent() {
  interface HistoryItem {
    name: MainScreen;
    params: any;
  }

  const { isAuthenticated, isLoading, user } = useAuth();
  const unreadNotificationCount = useUnreadNotifications();
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MainScreen>("Home");
  const [screenParams, setScreenParams] = useState<any>({});
  const [screenHistory, setScreenHistory] = useState<HistoryItem[]>([{ name: "Home", params: {} }]);
  const [activeTab, setActiveTab] = useState<string>("home");

  // Skip welcome screen if user is already authenticated
  // Also set appropriate home screen based on role
  useEffect(() => {
    // Only run when auth is loaded and user is authenticated
    if (!isLoading && isAuthenticated && !hasShownWelcome && user) {
      setShowWelcome(false);
      setHasShownWelcome(true);
      
      // Set role-appropriate home screen
      const roleHomeScreen = getDefaultHomeScreen(user?.role);
      let initialScreen: MainScreen = "Home";
      let initialTab = "home";
      
      // Map Screen enum to MainScreen type
      switch (roleHomeScreen) {
        case Screen.STAFF_DASHBOARD:
          initialScreen = "StaffDashboard";
          initialTab = "dashboard";
          break;
        case Screen.OWNER_DASHBOARD:
          initialScreen = "OwnerDashboard";
          initialTab = "dashboard";
          break;
        case Screen.ADMIN_DASHBOARD:
          initialScreen = "AdminDashboard";
          initialTab = "dashboard";
          break;
        default:
          initialScreen = "Home";
          initialTab = "home";
      }
      
      setCurrentScreen(initialScreen);
      setScreenHistory([{ name: initialScreen, params: {} }]);
      setActiveTab(initialTab);
    }
  }, [isLoading, isAuthenticated, hasShownWelcome, user]);

  // Sync activeTab with current screen based on role
  // This ensures the correct tab is highlighted when navigating
  // MOVED OUT of conditional block to fix hook error
  useEffect(() => {
    // Only sync if authenticated and not loading, and we have a valid screen
    if (isAuthenticated && !isLoading && currentScreen && user?.role) {
      try {
        // Map current screen to Screen enum
        let screenEnum: Screen | undefined;
        switch (currentScreen) {
          case "Home":
            screenEnum = Screen.HOME;
            break;
          case "Bookings":
            screenEnum = Screen.BOOKINGS;
            break;
          case "Explore":
            screenEnum = Screen.EXPLORE;
            break;
          case "Profile":
            screenEnum = Screen.PROFILE;
            break;
          case "Notifications":
            screenEnum = Screen.NOTIFICATIONS;
            break;
          case "StaffDashboard":
            screenEnum = Screen.STAFF_DASHBOARD;
            break;
          case "OwnerDashboard":
            screenEnum = Screen.OWNER_DASHBOARD;
            break;
          case "AdminDashboard":
            screenEnum = Screen.ADMIN_DASHBOARD;
            break;
          case "MySchedule":
            screenEnum = Screen.MY_SCHEDULE;
            break;
          case "CustomerManagement":
            screenEnum = Screen.CUSTOMER_MANAGEMENT;
            break;
          case "StaffManagement":
            screenEnum = Screen.STAFF_MANAGEMENT;
            break;
          case "BusinessAnalytics":
            screenEnum = Screen.BUSINESS_ANALYTICS;
            break;
          case "SalonManagement":
            screenEnum = Screen.SALON_MANAGEMENT;
            break;
          case "MembershipApprovals":
            screenEnum = Screen.MEMBERSHIP_APPROVALS;
            break;
          case "SalonList":
          case "OwnerSalonDetail":
            screenEnum = Screen.SALON_LIST;
            break;
        }
        
        if (screenEnum) {
          const tabId = mapScreenToTab(screenEnum, user?.role);
          if (tabId && tabId !== activeTab) {
            setActiveTab(tabId);
          }
        }
      } catch (error) {
        // Silently handle errors to prevent app crash
        console.error("Error syncing activeTab:", error);
      }
    }
  }, [currentScreen, user?.role, isAuthenticated, isLoading, activeTab]);


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
      setCurrentScreen(previousScreen.name);
      setScreenParams(previousScreen.params || {});
      return true; // We handled the back press
    }

    // If already on role's home screen, show exit confirmation
    const roleHome = getDefaultHomeScreen(user?.role);
    let homeScreenName: MainScreen = "Home";
    switch (roleHome) {
      case Screen.STAFF_DASHBOARD:
        homeScreenName = "StaffDashboard";
        break;
      case Screen.OWNER_DASHBOARD:
        homeScreenName = "OwnerDashboard";
        break;
      case Screen.ADMIN_DASHBOARD:
        homeScreenName = "AdminDashboard";
        break;
      default:
        homeScreenName = "Home";
    }

    if (currentScreen === homeScreenName) {
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

    // If on any main tab but not home, go to home
    if (MAIN_TABS.includes(currentScreen)) {
      setCurrentScreen(homeScreenName);
      setScreenHistory([{ name: homeScreenName, params: {} }]);
      setScreenParams({});
      return true;
    }

    // Default: go to role's home screen
    setCurrentScreen(homeScreenName);
    setScreenHistory([{ name: homeScreenName, params: {} }]);
    return true;
  }, [showWelcome, isAuthenticated, screenHistory, currentScreen, user?.role]);

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
    const historyItem: HistoryItem = { name: targetScreen, params: params || {} };
    
    // If navigating to a main tab, reset history
    if (MAIN_TABS.includes(targetScreen)) {
      setScreenHistory([historyItem]);
    } else {
      // For detail screens, add to history
      setScreenHistory((prev) => [...prev, historyItem]);
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
      setCurrentScreen(previousScreen.name);
      setScreenParams(previousScreen.params || {});
    } else {
      // If no history, go to role's home screen
      const roleHome = getDefaultHomeScreen(user?.role);
      let homeScreen: MainScreen = "Home";
      switch (roleHome) {
        case Screen.STAFF_DASHBOARD:
          homeScreen = "StaffDashboard";
          break;
        case Screen.OWNER_DASHBOARD:
          homeScreen = "OwnerDashboard";
          break;
        case Screen.ADMIN_DASHBOARD:
          homeScreen = "AdminDashboard";
          break;
        default:
          homeScreen = "Home";
      }
      setCurrentScreen(homeScreen);
      setScreenHistory([{ name: homeScreen, params: {} }]);
    }
  };

  // Handle tab press - role aware
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    
    // Map tab ID to screen based on role
    const tabs = getNavigationTabsForRole(user?.role);
    const tab = tabs.find(t => t.id === tabId);
    
    if (tab) {
      // Map Screen enum to MainScreen string
      const screenName = tab.screen.toString() as MainScreen;
      
      // Specific mappings for role dashboards
      let targetScreen: MainScreen = screenName as MainScreen;
      if (tab.screen === Screen.STAFF_DASHBOARD) {
        targetScreen = "StaffDashboard";
      } else if (tab.screen === Screen.OWNER_DASHBOARD) {
        targetScreen = "OwnerDashboard";
      } else if (tab.screen === Screen.ADMIN_DASHBOARD) {
        targetScreen = "AdminDashboard";
      } else if (tab.screen === Screen.HOME) {
        targetScreen = "Home";
      } else if (tab.screen === Screen.BOOKINGS) {
        targetScreen = "Bookings";
      } else if (tab.screen === Screen.EXPLORE) {
        targetScreen = "Explore";
      } else if (tab.screen === Screen.PROFILE) {
        targetScreen = "Profile";
      } else if (tab.screen === Screen.NOTIFICATIONS) {
        targetScreen = "Notifications";
      } else if (tab.screen === Screen.MY_SCHEDULE) {
        targetScreen = "MySchedule";
      } else if (tab.screen === Screen.CUSTOMER_MANAGEMENT) {
        targetScreen = "CustomerManagement";
      } else if (tab.screen === Screen.STAFF_MANAGEMENT) {
        targetScreen = "StaffManagement";
      } else if (tab.screen === Screen.BUSINESS_ANALYTICS) {
        targetScreen = "BusinessAnalytics";
      } else if (tab.screen === Screen.SALON_MANAGEMENT) {
        targetScreen = "SalonManagement";
      } else if (tab.screen === Screen.MEMBERSHIP_APPROVALS) {
        targetScreen = "MembershipApprovals";
      } else if (tab.screen === Screen.OPERATIONS) {
        targetScreen = "Operations";
      } else if (tab.screen === Screen.FINANCE) {
        targetScreen = "Finance";
      } else if (tab.screen === Screen.MORE_MENU) {
        targetScreen = "MoreMenu";
      } else if (tab.screen === Screen.WORK_LOG) {
        targetScreen = "WorkLog";
      } else if (tab.screen === Screen.LEADERBOARD) {
        targetScreen = "Leaderboard";
      } else if (tab.screen === Screen.CHAT) {
        targetScreen = "ChatList";
      } else if (tab.screen === Screen.SALON_LIST) {
        targetScreen = "SalonList";
      }
      
      handleNavigate(targetScreen);
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

  // After authentication, show main app screens using screen router
  if (isAuthenticated) {
    const screenToShow = currentScreen || "Home";
    

    
    return (
      <View style={{ flex: 1 }}>
        {renderScreen(screenToShow, handleNavigate, handleGoBack, screenParams)}
        
        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={handleTabPress}
          unreadNotificationCount={unreadNotificationCount}
        />
      </View>
    );
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
