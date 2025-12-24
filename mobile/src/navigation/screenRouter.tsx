import React from "react";
import { View, Text, StyleSheet } from "react-native";
import RoleBasedHome from "../screens/RoleBasedHome";
import NotificationsScreen from "../screens/NotificationsScreen";
import {
  ExploreScreen,
  ServiceDetailScreen,
  AllServicesScreen,
  SalonDetailScreen,
} from "../screens/explore";
import EmployeeListScreen from "../screens/explore/EmployeeListScreen";
import EmployeeDetailScreen from "../screens/explore/EmployeeDetailScreen";
import {
  BookingsScreen,
  AppointmentDetailScreen,
  BookingFlowScreen,
} from "../screens/booking";
import { ProfileScreen } from "../screens/profile";
import {
  SearchScreen,
  AIFaceScanScreen,
  AIConsultantScreen,
  RecommendationDetailScreen,
  LoyaltyScreen,
  WalletScreen,
  OffersScreen,
  ChatListScreen,
  ChatScreen,
  ChatUserSearchScreen,
} from "../screens/quickActions";
import ReviewScreen from "../screens/reviews/ReviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentHistoryScreen from "../screens/payment/PaymentHistoryScreen";
import WithdrawScreen from "../screens/payment/WithdrawScreen";
import {
  MembershipInfoScreen,
  MembershipApplicationScreen,
  ApplicationSuccessScreen,
} from "../screens/membership";
import {
  StaffDashboardScreen,
  MyScheduleScreen,
  AttendanceScreen,
  CreateAppointmentScreen,
} from "../screens/staff";
import {
  OwnerDashboardScreen,
  MoreMenuScreen,
  CreateSalonScreen,
  SalonAppointmentsScreen,
  OperationsScreen,
} from "../screens/owner";
import { AdminDashboardScreen, SalonManagementScreen } from "../screens/admin";
import {
  SalonListScreen,
  SalonDetailScreen as OwnerSalonDetailScreen,
  EmployeeDetailScreen as OwnerEmployeeDetailScreen,
  AddEmployeeScreen,
  AddServiceScreen,
  AddProductScreen,
  EditServiceScreen,
  EditSalonScreen,
  StockManagementScreen,
  CustomerManagementScreen,
  CustomerDetailScreen,
} from "../screens/salon";
import {
  SalesScreen,
  SalesHistoryScreen,
  CommissionsScreen,
  CommissionDetailScreen,
  SaleDetailScreen,
} from "../screens/sales";
import { BusinessAnalyticsScreen } from "../screens/analytics";
import { SalonSettingsScreen } from "../screens/settings";
import { FinanceScreen, LoanRepaymentScreen } from "../screens/finance";
import {
  FinancialReportsScreen,
  ProfitLossReportScreen,
  ExpenseBreakdownScreen,
  RevenueByServiceScreen,
} from "../screens/reports";
import UnifiedWorkLogScreen from "../screens/workLog/UnifiedWorkLogScreen";
import { theme } from "../theme";

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
      return <PaymentHistoryScreen navigation={navigation} />;

    case "Withdraw":
      return <WithdrawScreen navigation={navigation} />;

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
