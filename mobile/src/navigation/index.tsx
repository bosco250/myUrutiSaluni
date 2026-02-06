import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
  Alert,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import AuthNavigator from "./AuthNavigator";
import WelcomeScreen from "../screens/WelcomeScreen";
import NetworkErrorScreen from "../screens/NetworkErrorScreen";
import {
  ThemeProvider,
  AuthProvider,
  useAuth,
  NetworkProvider,
  useNetwork,
  PushNotificationProvider,
} from "../context";
import { theme } from "../theme";
import { getDefaultHomeScreen } from "../constants/permissions";
import { Screen } from "../constants/permissions";
import { renderScreen } from "./screenRouter";
import {
  getNavigationTabsForRole,
  mapScreenToTab,
  ROLE_NAVIGATION_TABS,
  NavigationTab,
  GUEST_NAVIGATION_TABS,
} from "./navigationConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNavigation from "../components/common/BottomNavigation";
import SwipeableTabNavigator from "../components/common/SwipeableTabNavigator";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useEmployeePermissionCheck } from "../hooks/useEmployeePermissionCheck";
import { checkNavigationPermission } from "../utils/navigationGuard";
import { isPublicScreen } from "../utils/permissionNavigation";

type MainScreen =
  | "Home"
  | "Bookings"
  | "AppointmentDetail"
  | "BookingFlow"
  | "Notifications"
  | "Explore"
  | "ServiceDetail"
  | "AllServices"
  | "SalonDetail"
  | "EmployeeList"
  | "EmployeeDetail"
  | "Profile"
  | "Login"
  | "Search"
  | "AIFaceScan"
  | "AIConsultant"
  | "RecommendationDetail"
  | "Loyalty"
  | "Wallet"
  | "Offers"
  | "ChatList"
  | "Chat"
  | "ChatUserSearch"
  | "Review"
  | "Payment"
  | "PaymentHistory"
  | "Withdraw"
  | "MembershipInfo"
  | "MembershipApplication"
  | "ApplicationSuccess"
  | "StaffDashboard"
  | "OwnerDashboard"
  | "AdminDashboard"
  | "MySchedule"
  | "Attendance"
  | "CustomerManagement"
  | "StaffManagement"
  | "SalonSettings"
  | "BusinessAnalytics"
  | "InventoryManagement"
  | "StockManagement"
  | "SalonManagement"
  | "UserManagement"
  | "SystemReports"
  | "MembershipApprovals"
  | "Operations"
  | "Finance"
  | "MoreMenu"
  | "Help"
  | "WorkLog"
  | "Tasks"
  | "CreateSalon"
  | "SalonList"
  | "SalonAppointments"
  | "OwnerSalonDetail"
  | "OwnerEmployeeDetail"
  | "AddEmployee"
  | "AddService"
  | "AddProduct"
  | "EditService"
  | "EditSalon"
  | "Sales"
  | "SalesHistory"
  | "Commissions"
  | "CommissionDetail"
  | "SaleDetail"
  | "FinancialReports"
  | "ProfitLossReport"
  | "ExpenseBreakdown"
  | "RevenueByService"
  | "LoanRepayment"
  | "CreateAppointment"
  | "MyPermissions"
  | "EmployeePermissions"
  | "GrantPermissions"
  | "CustomerDetail"
  | "Favorites"
  | "ServiceList";

// Main tabs that are root level screens
const MAIN_TABS: MainScreen[] = [
  "Home",
  "Bookings",
  "Explore",
  "Profile",
  "Notifications",
];

// Props interface for NavigationContent
interface NavigationContentProps {
  onNavigationReady?: (
    navigate: (screen: string, params?: any) => void
  ) => void;
}

// Inner navigation component that uses auth context
function NavigationContent({ onNavigationReady }: NavigationContentProps) {
  interface HistoryItem {
    name: MainScreen;
    params: any;
  }

  const { isAuthenticated, isLoading, user } = useAuth();
  const { isConnected, isChecking, checkConnection } = useNetwork();
  const unreadNotificationCount = useUnreadNotifications();
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MainScreen>("Home");
  const [screenParams, setScreenParams] = useState<any>({});
  const [screenHistory, setScreenHistory] = useState<HistoryItem[]>([
    { name: "Home", params: {} },
  ]);
  const [activeTab, setActiveTab] = useState<string>("home");
  
  // Menu Animation State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = useCallback((show: boolean) => {
    if (show) setIsMenuOpen(true);
    Animated.timing(menuAnim, {
      toValue: show ? Dimensions.get('window').width * 0.75 : 0,
      duration: 400,
      useNativeDriver: false, // Width animation requires JS driver
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      if (!show) setIsMenuOpen(false);
    });
  }, [menuAnim]);

  // Track whether the user has ever been authenticated in this session.
  // When they log out (token disappears), reset back to the Welcome entry point
  // so the app doesn't stay stuck on the Login screen forever.
  const wasAuthenticatedRef = React.useRef(false);
  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
    } else if (wasAuthenticatedRef.current && !isLoading) {
      // Transition: was authenticated → now logged out → back to Welcome
      wasAuthenticatedRef.current = false;
      setIsGuest(false);
      setShowWelcome(true);
      setHasShownWelcome(false);
      setCurrentScreen("Home");
      setScreenHistory([{ name: "Home", params: {} }]);
      setActiveTab("home");
    }
  }, [isAuthenticated, isLoading]);

  // Initialize permission check hook - it will automatically load salonId and employeeId
  // No need to load salonId separately as the hook handles it internally
  const {
    checkPermission,
    isOwner,
    isAdmin,
    hasOwnerLevelPermissions, // Check if employee has owner-level permissions
    loading: permissionsLoading,
  } = useEmployeePermissionCheck({
    autoFetch: true,
  });

  // Default permission check function if hook hasn't loaded yet
  // Default permission check function if hook hasn't loaded yet
  const safeCheckPermission = useCallback(
    (permission: any) => {
      // If checkPermission is not available yet, we can't check
      if (!checkPermission) {
        return false;
      }

      // Trust the hook's checkPermission function
      // Even if loading is true (background refresh), we might have cached permissions
      // blocking on permissionsLoading causes "clickable but not working" issues
      return checkPermission(permission);
    },
    [checkPermission]
  );

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

  // Resume a pending booking intent after the user logs in from guest mode
  useEffect(() => {
    if (isAuthenticated && user) {
      AsyncStorage.getItem("@booking_intent").then((raw) => {
        if (!raw) return;
        AsyncStorage.removeItem("@booking_intent");
        try {
          const intent = JSON.parse(raw);
          // Defer to let the role-home effect finish first
          setTimeout(() => {
            setCurrentScreen("BookingFlow" as MainScreen);
            setScreenParams(intent);
            setScreenHistory((prev) => [
              ...prev,
              { name: "BookingFlow" as MainScreen, params: intent },
            ]);
          }, 200);
        } catch {
          // malformed intent — ignore
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Sync activeTab with current screen based on role
  // This ensures the correct tab is highlighted when navigating
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, user?.role, isAuthenticated, isLoading]); // Removed activeTab from dependencies to prevent loop

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
          {
            text: "Exit",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
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
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleWelcomeComplete = (screen?: string) => {
    setShowWelcome(false);
    setHasShownWelcome(true);
    if (screen === "guest") {
      setIsGuest(true);
      setCurrentScreen("Explore");
      setScreenHistory([{ name: "Explore", params: {} }]);
      setActiveTab("explore");
    }
  };

  const handleNavigate = useCallback(
    (screen: string, params?: any) => {
      const targetScreen = screen as MainScreen;

      // Ensure we have a valid screen
      if (!targetScreen) {
        console.warn("handleNavigate called with invalid screen:", screen);
        return;
      }

      // Handle Menu Navigation Slide-In
      if (screen === 'MoreMenu') {
        toggleMenu(true);
        return;
      }
      
      // Close menu if navigating elsewhere
      if (isMenuOpen) {
        toggleMenu(false);
      }

      // Guest mode: Login / SignUp switches to auth flow
      if (isGuest && (screen === "Login" || screen === "SignUp")) {
        setIsGuest(false);
        return;
      }

      // Customers can always access BookingFlow and other public screens
      if (user?.role === "customer" || user?.role === "CUSTOMER") {
        // Customers can access all customer screens including BookingFlow
        // No permission check needed for customers
      }
      // Check navigation permission for employees
      else if (
        user?.role === "salon_employee" ||
        user?.role === "SALON_EMPLOYEE"
      ) {
        // Always allow public screens, even while permissions are loading
        if (isPublicScreen(screen, user?.role)) {
          // Public screen - allow navigation, continue below
        } else if (!permissionsLoading) {
          // Only check permissions if they're loaded (not loading)
          const permissionCheck = checkNavigationPermission(
            screen,
            user?.role,
            safeCheckPermission,
            isOwner || false,
            isAdmin || false
          );

          if (!permissionCheck.canNavigate) {
            // Show alert and prevent navigation - stay on current screen
            Alert.alert(
              "Permission Required",
              permissionCheck.reason ||
                "You don't have permission to access this screen.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    // Do nothing - remain on current screen
                    // User clicked OK, just dismiss the alert
                  },
                },
              ]
            );
            return;
          }
        } else {
          // Permissions are still loading and screen is not public
          // Allow navigation but it will be checked when permissions load
          // This prevents blocking the user while permissions are being fetched
        }
      }

      const historyItem: HistoryItem = {
        name: targetScreen,
        params: params || {},
      };

      // If navigating to a main tab, reset history
      if (MAIN_TABS.includes(targetScreen)) {
        setScreenHistory([historyItem]);
      } else {
        // For detail screens, add to history
        setScreenHistory((prev) => [...prev, historyItem]);
      }

      // Update current screen - this is critical for rendering the correct screen
      setCurrentScreen(targetScreen);
      setScreenParams(params || {});
    },
    [user?.role, safeCheckPermission, isOwner, isAdmin, permissionsLoading, isGuest, isMenuOpen, toggleMenu]
  );

  // Expose navigate function to parent via callback
  useEffect(() => {
    if (onNavigationReady) {
      onNavigationReady(handleNavigate);
    }
  }, [onNavigationReady, handleNavigate]);

  const handleGoBack = useCallback(() => {
    if (isMenuOpen) {
      toggleMenu(false);
      return;
    }

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
  }, [screenHistory, user?.role, isMenuOpen, toggleMenu]);

  // Handle tab press - role aware - memoized to prevent re-renders
  const handleTabPress = React.useCallback(
    (tabId: string) => {
      // Guest mode: Sign In tab switches to auth flow
      if (isGuest && tabId === "signin") {
        setIsGuest(false);
        return;
      }

      // First, determine what screen this tab should navigate to
      // We need to check both owner and employee tabs to find the right screen
      let targetScreen: MainScreen = "Home"; // Default fallback
      let tab: NavigationTab | undefined;

      // Check owner tabs first (if employee has owner-level permissions and is in salon mode)
      if (hasOwnerLevelPermissions) {
        const ownerTabs = ROLE_NAVIGATION_TABS.salon_owner;
        const ownerTab = ownerTabs.find((t) => t.id === tabId);
        if (ownerTab) {
          tab = ownerTab;
          // Map owner tab screen to MainScreen
          if (tab.screen === Screen.OWNER_DASHBOARD) {
            targetScreen = "OwnerDashboard";
          } else if (tab.screen === Screen.OPERATIONS) {
            targetScreen = "Operations";
          } else if (tab.screen === Screen.SALON_LIST) {
            targetScreen = "SalonList";
          } else if (tab.screen === Screen.FINANCE) {
            targetScreen = "Finance";
          } else if (tab.screen === Screen.MORE_MENU) {
            targetScreen = "MoreMenu";
          } else if (tab.screen === Screen.PROFILE) {
            targetScreen = "Profile";
          }
        }
      }

      // If not found in owner tabs, check employee tabs
      if (!tab) {
        // Get employee tabs to find the tab
        const employeeTabs = getNavigationTabsForRole(
          user?.role,
          safeCheckPermission,
          isOwner || false,
          isAdmin || false,
          hasOwnerLevelPermissions || false,
          currentScreen
        );

        tab = employeeTabs.find((t) => t.id === tabId);

        if (!tab) {
          return;
        }

        // Map Screen enum to MainScreen string
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
        } else if (tab.screen === Screen.SYSTEM_REPORTS) {
          targetScreen = "SystemReports";
        } else if (tab.screen === Screen.OPERATIONS) {
          targetScreen = "Operations";
        } else if (tab.screen === Screen.FINANCE) {
          targetScreen = "Finance";
        } else if (tab.screen === Screen.MORE_MENU) {
          targetScreen = "MoreMenu";
        } else if (tab.screen === Screen.WORK_LOG) {
          targetScreen = "WorkLog";
        } else if (tab.screen === Screen.CHAT) {
          targetScreen = "ChatList";
        } else if (tab.screen === Screen.SALON_LIST) {
          targetScreen = "SalonList";
        } else {
          // Handle string screen names from navigationConfig (employee tabs use 'as any')
          // This section only runs if no Screen enum matched above
          // Cast to unknown first to allow comparison with string literals
          const screenValue = tab.screen as unknown;

          if (screenValue === "SalonAppointments") {
            targetScreen = "SalonAppointments";
          } else if (screenValue === "CustomerManagement") {
            targetScreen = "CustomerManagement";
          } else if (screenValue === "Sales") {
            targetScreen = "Sales";
          } else if (
            screenValue === "StockManagement" ||
            screenValue === "InventoryManagement"
          ) {
            targetScreen = "StockManagement";
          } else if (typeof screenValue === "string") {
            // Handle any other string screen names directly
            targetScreen = screenValue as MainScreen;
          }
        }
      }

      // Navigate first to ensure screen is updated, then update active tab
      // This ensures currentScreen is set before activeTab sync runs
      handleNavigate(targetScreen);
      setActiveTab(tabId);
    },
    [
      user?.role,
      handleNavigate,
      safeCheckPermission,
      isOwner,
      isAdmin,
      hasOwnerLevelPermissions, // Include in dependencies
      currentScreen, // Include currentScreen to detect salon mode correctly
      isGuest,
    ]
  );

  // ========================================================================
  // SWIPE NAVIGATION HOOKS - Must be before any conditional returns
  // ========================================================================
  
  // Get current navigation tabs for the user's role (guest mode returns guest tabs)
  const currentTabs = useMemo(() => {
    if (isGuest) return GUEST_NAVIGATION_TABS;
    return getNavigationTabsForRole(
      user?.role,
      safeCheckPermission,
      isOwner || false,
      isAdmin || false,
      hasOwnerLevelPermissions || false,
      currentScreen
    );
  }, [isGuest, user?.role, safeCheckPermission, isOwner, isAdmin, hasOwnerLevelPermissions, currentScreen]);

  // Map tab IDs to screen names for rendering
  const getScreenNameForTab = useCallback((tabId: string): string => {
    const tab = currentTabs.find(t => t.id === tabId);
    if (!tab) return "Home";
    
    // Map Screen enum to screen name
    switch (tab.screen) {
      case Screen.HOME: return "Home";
      case Screen.BOOKINGS: return "Bookings";
      case Screen.EXPLORE: return "Explore";
      case Screen.NOTIFICATIONS: return "Notifications";
      case Screen.PROFILE: return "Profile";
      case Screen.STAFF_DASHBOARD: return "StaffDashboard";
      case Screen.OWNER_DASHBOARD: return "OwnerDashboard";
      case Screen.ADMIN_DASHBOARD: return "AdminDashboard";
      case Screen.OPERATIONS: return "Operations";
      case Screen.FINANCE: return "Finance";
      case Screen.SALON_LIST: return "SalonList";
      case Screen.MORE_MENU: return "MoreMenu";
      case Screen.WORK_LOG: return "WorkLog";
      case Screen.CHAT: return "ChatList";
      default: 
        // Handle string screen names
        const screenValue = tab.screen as unknown;
        if (typeof screenValue === "string") {
          return screenValue;
        }
        return "Home";
    }
  }, [currentTabs]);

  // Screen to show
  const screenToShow = currentScreen || "Home";

  // Check if current screen is a main tab (swipeable) or a detail screen
  const isMainTabScreen = useMemo(() => {
    return currentTabs.some(tab => {
      const tabScreenName = getScreenNameForTab(tab.id);
      return tabScreenName === screenToShow;
    });
  }, [currentTabs, screenToShow, getScreenNameForTab]);

  // Render screen for a specific tab
  const renderTabScreen = useCallback((tabId: string) => {
    const screenName = getScreenNameForTab(tabId);
    return renderScreen(screenName, handleNavigate, handleGoBack, {});
  }, [getScreenNameForTab, handleNavigate, handleGoBack]);

  // Handle swipe navigation - update both active tab and current screen
  const handleSwipeChange = useCallback((tabId: string) => {
    const screenName = getScreenNameForTab(tabId);
    setActiveTab(tabId);
    setCurrentScreen(screenName as any);
    setScreenHistory([{ name: screenName as any, params: {} }]);
  }, [getScreenNameForTab]);

  // Show loading state while checking authentication
  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    // If loading takes more than 5 seconds, force proceed
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading timeout - proceeding anyway");
        setLoadingTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // If loading timeout occurred, proceed as if not loading
  const shouldShowLoading = isLoading && !loadingTimeout;

  if (shouldShowLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // Show network error screen when not connected (but allow if loading timed out)
  if (!isConnected && !shouldShowLoading) {
    return (
      <NetworkErrorScreen onRetry={checkConnection} isRetrying={isChecking} />
    );
  }

  // Show welcome screen only once and only if not authenticated
  if (showWelcome && !isAuthenticated) {
    return <WelcomeScreen navigation={{ navigate: handleWelcomeComplete }} />;
  }

  // After authentication (or in guest mode), show main app screens
  if (isAuthenticated || isGuest) {
    try {
      return (
        <View style={{ flex: 1 }}>
          {/* Main Content Area */}
          {isMainTabScreen && !isGuest ? (
            // Swipeable tabs for main navigation screens (disabled in guest mode)
            <SwipeableTabNavigator
              tabs={currentTabs}
              activeTabId={activeTab}
              onTabChange={handleSwipeChange}
              renderScreen={(tabId) => renderTabScreen(tabId)}
              enabled={currentTabs.length > 1}
            />
          ) : (
            // Detail screens (and guest explore) render directly without swipe
            renderScreen(
              screenToShow,
              handleNavigate,
              handleGoBack,
              screenParams
            )
          )}



          {/* Sliding Menu Overlay */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 0, 
                  bottom: 0, 
                  left: 0, 
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 9998,
                }}
                activeOpacity={1}
                onPress={() => toggleMenu(false)}
              />
              
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: Platform.OS === 'ios' ? 100 : 88, // Clear bottom nav fully
                  left: 0,
                  zIndex: 9999,
                  backgroundColor: theme.colors.background,
                  borderTopRightRadius: 24,
                  borderBottomRightRadius: 24,
                  width: menuAnim,
                  overflow: 'hidden', // Clip content as width grows
                  elevation: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 4, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <View style={{ width: Dimensions.get('window').width * 0.75, height: '100%' }}>
                {renderScreen(
                  "MoreMenu", 
                  handleNavigate, 
                  () => toggleMenu(false), // Custom back for menu
                  {}
                )}
                </View>
              </Animated.View>
            </>
          )}

          {/* Bottom Navigation: Only shown on top-level tab screens */}
          {isMainTabScreen && (
            <View style={{ zIndex: 10001, elevation: 20, backgroundColor: theme.colors.background }}>
              <BottomNavigation
                activeTab={activeTab}
                onTabPress={handleTabPress}
                unreadNotificationCount={unreadNotificationCount}
                currentScreen={currentScreen}
                tabsOverride={isGuest ? GUEST_NAVIGATION_TABS : undefined}
              />
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error("Error rendering screen:", error);
      // Fallback to Home screen if there's an error
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: theme.colors.error,
              fontSize: 16,
              marginBottom: 10,
            }}
          >
            Error loading screen
          </Text>
          <TouchableOpacity
            onPress={() => {
              setCurrentScreen("Home");
              setScreenParams({});
            }}
            style={{
              backgroundColor: theme.colors.primary,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.colors.white }}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // Not authenticated - show auth screens
  return <AuthNavigator />;
}

// Wrapper component with push notifications that has access to navigation
function NavigationWithPushNotifications() {
  // We need to use a ref to pass the navigation function to PushNotificationProvider
  const navigationRef = React.useRef<
    ((screen: string, params?: any) => void) | null
  >(null);

  const handleNotificationTap = useCallback((screen: string, params: any) => {
    if (navigationRef.current) {
      // Navigation guard will check permissions in handleNavigate
      navigationRef.current(screen, params);
    }
  }, []);

  return (
    <PushNotificationProvider onNotificationTap={handleNotificationTap}>
      <NavigationContent
        onNavigationReady={(navigate) => {
          navigationRef.current = navigate;
        }}
      />
    </PushNotificationProvider>
  );
}

// Main navigation component with providers
export default function Navigation() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationWithPushNotifications />
        </ThemeProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
});
