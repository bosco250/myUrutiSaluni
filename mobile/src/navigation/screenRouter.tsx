import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

// ============================================================================
// PERFORMANCE OPTIMIZATION: Load ALL screens at startup
// Bundle once at startup → Navigate instantly forever
// No lazy loading = No bundling delays on navigation
// ============================================================================

// Import ALL screens directly for instant navigation
import RoleBasedHome from "../screens/RoleBasedHome";
import NotificationsScreen from "../screens/NotificationsScreen";
import { ExploreScreen } from "../screens/explore";
import { BookingsScreen } from "../screens/booking";
import { ProfileScreen } from "../screens/profile";
import { StaffDashboardScreen } from "../screens/staff";
import { OwnerDashboardScreen } from "../screens/owner";
import { AdminDashboardScreen } from "../screens/admin";

// Explore screens
import ServiceDetailScreen from "../screens/explore/ServiceDetailScreen";
import AllServicesScreen from "../screens/explore/AllServicesScreen";
import SalonDetailScreen from "../screens/explore/SalonDetailScreen";
import EmployeeListScreen from "../screens/explore/EmployeeListScreen";
import EmployeeDetailScreen from "../screens/explore/EmployeeDetailScreen";

// Booking screens
import AppointmentDetailScreen from "../screens/booking/AppointmentDetailScreen";
import BookingFlowScreen from "../screens/booking/BookingFlowScreen";

// Quick action screens
import FavoritesScreen from "../screens/favorites/FavoritesScreen";
import SearchScreen from "../screens/quickActions/SearchScreen";
import AIFaceScanScreen from "../screens/quickActions/AIFaceScanScreen";
import AIConsultantScreen from "../screens/quickActions/AIConsultantScreen";
import RecommendationDetailScreen from "../screens/quickActions/RecommendationDetailScreen";
import LoyaltyScreen from "../screens/quickActions/LoyaltyScreen";
import WalletScreen from "../screens/quickActions/WalletScreen";
import OffersScreen from "../screens/quickActions/OffersScreen";
import ChatListScreen from "../screens/quickActions/ChatListScreen";
import ChatScreen from "../screens/quickActions/ChatScreen";
import ChatUserSearchScreen from "../screens/quickActions/ChatUserSearchScreen";

// Review & Payment screens
import ReviewScreen from "../screens/reviews/ReviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentHistoryScreen from "../screens/payment/PaymentHistoryScreen";
import WithdrawScreen from "../screens/payment/WithdrawScreen";

// Membership screens
import MembershipInfoScreen from "../screens/membership/MembershipInfoScreen";
import MembershipApplicationScreen from "../screens/membership/MembershipApplicationScreen";
import ApplicationSuccessScreen from "../screens/membership/ApplicationSuccessScreen";

// Staff screens
import MyScheduleScreen from "../screens/staff/MyScheduleScreen";
import AttendanceScreen from "../screens/staff/AttendanceScreen";
import CreateAppointmentScreen from "../screens/staff/CreateAppointmentScreen";

// Owner screens
import MoreMenuScreen from "../screens/owner/MoreMenuScreen";
import CreateSalonScreen from "../screens/owner/CreateSalonScreen";
import SalonAppointmentsScreen from "../screens/owner/SalonAppointmentsScreen";
import OperationsScreen from "../screens/owner/OperationsScreen";

// Admin screens
import SalonManagementScreen from "../screens/admin/SalonManagementScreen";

// Salon management screens
import SalonListScreen from "../screens/salon/SalonListScreen";
import OwnerSalonDetailScreen from "../screens/salon/SalonDetailScreen";
import OwnerEmployeeDetailScreen from "../screens/salon/EmployeeDetailScreen";
import AddEmployeeScreen from "../screens/salon/AddEmployeeScreen";
import AddServiceScreen from "../screens/salon/AddServiceScreen";
import AddProductScreen from "../screens/salon/AddProductScreen";
import EditServiceScreen from "../screens/salon/EditServiceScreen";
import EditSalonScreen from "../screens/salon/EditSalonScreen";
import StockManagementScreen from "../screens/salon/StockManagementScreen";
import CustomerManagementScreen from "../screens/salon/CustomerManagementScreen";
import CustomerDetailScreen from "../screens/salon/CustomerDetailScreen";

// Sales screens
import SalesScreen from "../screens/sales/SalesScreen";
import SalesHistoryScreen from "../screens/sales/SalesHistoryScreen";
import CommissionsScreen from "../screens/sales/CommissionsScreen";
import CommissionDetailScreen from "../screens/sales/CommissionDetailScreen";
import SaleDetailScreen from "../screens/sales/SaleDetailScreen";

// Analytics & Settings
import BusinessAnalyticsScreen from "../screens/analytics/BusinessAnalyticsScreen";
import SalonSettingsScreen from "../screens/settings/SalonSettingsScreen";

// Reports screens
import FinancialReportsScreen from "../screens/reports/FinancialReportsScreen";
import ProfitLossReportScreen from "../screens/reports/ProfitLossReportScreen";
import ExpenseBreakdownScreen from "../screens/reports/ExpenseBreakdownScreen";
import RevenueByServiceScreen from "../screens/reports/RevenueByServiceScreen";

// Work log screens
import UnifiedWorkLogScreen from "../screens/workLog/UnifiedWorkLogScreen";

// Finance screens
import FinanceScreen from "../screens/finance/FinanceScreen";
import LoanRepaymentScreen from "../screens/finance/LoanRepaymentScreen";

/**
 * Screen router helper
 * Maps screen names to their components with navigation props
 */
export const renderScreen = (
  screenName: string,
  handleNavigate: (screen: string, params?: any) => void,
  handleGoBack: () => void,
  screenParams: any
): React.ReactElement => {
  const navigation = { navigate: handleNavigate, goBack: handleGoBack };

  switch (screenName) {
    // Main screens
    case "Home":
      return <RoleBasedHome navigation={{ navigate: handleNavigate }} />;

    case "Bookings":
      return <BookingsScreen navigation={navigation} />;

    case "Explore":
      return <ExploreScreen navigation={{ navigate: handleNavigate }} />;

    case "Notifications":
      return <NotificationsScreen navigation={navigation} />;

    case "Profile":
      return <ProfileScreen navigation={navigation} />;

    case "Favorites":
      return <FavoritesScreen navigation={navigation} />;

    // Role-specific dashboards
    case "StaffDashboard":
      return <StaffDashboardScreen navigation={{ navigate: handleNavigate }} />;

    case "OwnerDashboard":
      return <OwnerDashboardScreen navigation={{ navigate: handleNavigate }} />;

    case "AdminDashboard":
      return <AdminDashboardScreen navigation={{ navigate: handleNavigate }} />;

    // Booking screens
    case "AppointmentDetail":
      return (
        <AppointmentDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "BookingFlow":
      return (
        <BookingFlowScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Explore screens
    case "AllServices":
      return <AllServicesScreen navigation={navigation} />;

    case "ServiceDetail":
      return (
        <ServiceDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "SalonDetail":
      return (
        <SalonDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "EmployeeList":
      return (
        <EmployeeListScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "EmployeeDetail":
      return (
        <EmployeeDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Quick action screens
    case "Search":
      return (
        <SearchScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "AIFaceScan":
      return <AIFaceScanScreen navigation={navigation} />;

    case "AIConsultant":
      return (
        <AIConsultantScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "RecommendationDetail":
      return (
        <RecommendationDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "Loyalty":
      return <LoyaltyScreen navigation={navigation} />;

    case "Wallet":
      return <WalletScreen navigation={navigation} />;

    case "Offers":
      return <OffersScreen navigation={navigation} />;

    case "ChatList":
      return <ChatListScreen navigation={navigation} />;

    case "Chat":
      return (
        <ChatScreen navigation={navigation} route={{ params: screenParams }} />
      );

    case "ChatUserSearch":
      return <ChatUserSearchScreen navigation={navigation} />;

    // Review & Payment screens
    case "Review":
      return (
        <ReviewScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "Payment":
      return (
        <PaymentScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "PaymentHistory":
      return (
        <PaymentHistoryScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "Withdraw":
      return (
        <WithdrawScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Membership screens
    case "MembershipInfo":
      return <MembershipInfoScreen navigation={navigation} />;

    case "MembershipApplication":
      return <MembershipApplicationScreen navigation={navigation} />;

    case "ApplicationSuccess":
      return (
        <ApplicationSuccessScreen
          navigation={{ navigate: handleNavigate }}
          route={{ params: screenParams }}
        />
      );

    // Owner More Menu screen
    case "MoreMenu":
      return <MoreMenuScreen navigation={{ navigate: handleNavigate }} />;

    // Create Salon screen
    case "CreateSalon":
      return (
        <CreateSalonScreen
          navigation={{
            navigate: handleNavigate,
            goBack: handleGoBack || (() => handleNavigate("OwnerDashboard")),
          }}
          route={{ params: screenParams }}
        />
      );

    // Salon Appointments screen (for salon owners)
    case "SalonAppointments":
      return (
        <SalonAppointmentsScreen
          navigation={{ navigate: handleNavigate, goBack: handleGoBack }}
        />
      );

    // Salon Management screens (for salon owners)
    case "SalonList":
      return <SalonListScreen navigation={{ navigate: handleNavigate }} />;

    case "OwnerSalonDetail":
      return (
        <OwnerSalonDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "OwnerEmployeeDetail":
      return (
        <OwnerEmployeeDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "AddEmployee":
      return (
        <AddEmployeeScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "AddService":
      return (
        <AddServiceScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "AddProduct":
      return (
        <AddProductScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "EditService":
      return (
        <EditServiceScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "EditSalon":
      return (
        <EditSalonScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Stock/Inventory Management screen
    case "StockManagement":
    case "InventoryManagement":
      return (
        <StockManagementScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Staff Management - routes to employee list for owner's salon
    case "StaffManagement":
      return (
        <EmployeeListScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Customer Management screen
    case "CustomerManagement":
      return (
        <CustomerManagementScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Customer Detail screen
    case "CustomerDetail":
      return (
        <CustomerDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Operations screen (for salon owners)
    case "Operations":
      return <OperationsScreen navigation={navigation} />;

    case "MySchedule":
      return <MyScheduleScreen navigation={navigation} />;

    case "CreateAppointment":
      return <CreateAppointmentScreen navigation={navigation} />;

    case "Attendance":
      return <AttendanceScreen navigation={navigation} />;

    // Business Analytics screen
    case "BusinessAnalytics":
      return (
        <BusinessAnalyticsScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    // Salon Settings screen
    case "SalonSettings":
      return <SalonSettingsScreen navigation={navigation} />;

    // Placeholder screens for features under development
    // Salon Management screens
    case "SalonManagement":
      return (
        <SalonManagementScreen navigation={{ navigate: handleNavigate }} />
      );

    case "UserManagement":
    case "SystemReports":
    case "MembershipApprovals":
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>{screenName}</Text>
          <Text style={styles.placeholderText}>Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>
            This feature is currently under development.
          </Text>
        </View>
      );

    // Sales screens
    case "Sales":
      return <SalesScreen navigation={navigation} />;
    case "SalesHistory":
      return (
        <SalesHistoryScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );
    case "Commissions":
      return <CommissionsScreen navigation={navigation} />;

    case "CommissionDetail":
      return (
        <CommissionDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );
    case "SaleDetail":
      return (
        <SaleDetailScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "Finance":
      return <FinanceScreen navigation={navigation} />;

    case "LoanRepayment":
      return (
        <LoanRepaymentScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "FinancialReports":
      return <FinancialReportsScreen navigation={navigation} />;

    case "ProfitLossReport":
      return (
        <ProfitLossReportScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "ExpenseBreakdown":
      return (
        <ExpenseBreakdownScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "RevenueByService":
      return (
        <RevenueByServiceScreen
          navigation={navigation}
          route={{ params: screenParams }}
        />
      );

    case "Help":
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>{screenName}</Text>
          <Text style={styles.placeholderText}>Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>
            This feature is currently under development.
          </Text>
        </View>
      );

    case "WorkLog":
    case "Tasks":
      return <UnifiedWorkLogScreen navigation={navigation} />;

    default:
      return <RoleBasedHome navigation={{ navigate: handleNavigate }} />;
  }
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  placeholderText: {
    fontSize: 18,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
});
