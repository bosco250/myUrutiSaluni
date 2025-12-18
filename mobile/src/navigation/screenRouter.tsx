import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RoleBasedHome from '../screens/RoleBasedHome';
import NotificationsScreen from '../screens/NotificationsScreen';
import { ExploreScreen, ServiceDetailScreen, AllServicesScreen, SalonDetailScreen } from '../screens/explore';
import EmployeeListScreen from '../screens/explore/EmployeeListScreen';
import EmployeeDetailScreen from '../screens/explore/EmployeeDetailScreen';
import { BookingsScreen, AppointmentDetailScreen, BookingFlowScreen } from '../screens/booking';
import { ProfileScreen } from '../screens/profile';
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
} from '../screens/quickActions';
import ReviewScreen from '../screens/reviews/ReviewScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import PaymentHistoryScreen from '../screens/payment/PaymentHistoryScreen';
import WithdrawScreen from '../screens/payment/WithdrawScreen';
import { MembershipInfoScreen, MembershipApplicationScreen, ApplicationSuccessScreen } from '../screens/membership';
import { StaffDashboardScreen } from '../screens/staff';
import { OwnerDashboardScreen, MoreMenuScreen, CreateSalonScreen, SalonAppointmentsScreen, OperationsScreen } from '../screens/owner';
import { AdminDashboardScreen } from '../screens/admin';
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
} from '../screens/salon';
import { SalesScreen, SalesHistoryScreen, CommissionsScreen, SaleDetailScreen } from '../screens/sales';
import { theme } from '../theme';

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
    case 'Home':
      return <RoleBasedHome navigation={{ navigate: handleNavigate }} />;
    
    case 'Bookings':
      return <BookingsScreen navigation={navigation} />;
    
    case 'Explore':
      return <ExploreScreen navigation={{ navigate: handleNavigate }} />;
    
    case 'Notifications':
      return <NotificationsScreen navigation={navigation} />;
    
    case 'Profile':
      return <ProfileScreen navigation={navigation} />;

    // Role-specific dashboards
    case 'StaffDashboard':
      return <StaffDashboardScreen navigation={{ navigate: handleNavigate }} />;
    
    case 'OwnerDashboard':
      return <OwnerDashboardScreen navigation={{ navigate: handleNavigate }} />;
    
    case 'AdminDashboard':
      return <AdminDashboardScreen navigation={{ navigate: handleNavigate }} />;

    // Booking screens
    case 'AppointmentDetail':
      return <AppointmentDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'BookingFlow':
      return <BookingFlowScreen navigation={navigation} route={{ params: screenParams }} />;

    // Explore screens
    case 'AllServices':
      return <AllServicesScreen navigation={navigation} />;
    
    case 'ServiceDetail':
      return <ServiceDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'SalonDetail':
      return <SalonDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'EmployeeList':
      return <EmployeeListScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'EmployeeDetail':
      return <EmployeeDetailScreen navigation={navigation} route={{ params: screenParams }} />;

    // Quick action screens
    case 'Search':
      return <SearchScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'AIFaceScan':
      return <AIFaceScanScreen navigation={navigation} />;
    
    case 'AIConsultant':
      return <AIConsultantScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'RecommendationDetail':
      return <RecommendationDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'Loyalty':
      return <LoyaltyScreen navigation={navigation} />;
    
    case 'Wallet':
      return <WalletScreen navigation={navigation} />;
    
    case 'Offers':
      return <OffersScreen navigation={navigation} />;
    
    case 'ChatList':
      return <ChatListScreen navigation={navigation} />;
    
    case 'Chat':
      return <ChatScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'ChatUserSearch':
      return <ChatUserSearchScreen navigation={navigation} />;

    // Review & Payment screens
    case 'Review':
      return <ReviewScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'Payment':
      return <PaymentScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'PaymentHistory':
      return <PaymentHistoryScreen navigation={navigation} />;
    
    case 'Withdraw':
      return <WithdrawScreen navigation={navigation} />;

    // Membership screens
    case 'MembershipInfo':
      return <MembershipInfoScreen navigation={navigation} />;
    
    case 'MembershipApplication':
      return <MembershipApplicationScreen navigation={navigation} />;
    
    case 'ApplicationSuccess':
      return <ApplicationSuccessScreen navigation={{ navigate: handleNavigate }} route={{ params: screenParams }} />;

    // Owner More Menu screen
    case 'MoreMenu':
      return <MoreMenuScreen navigation={{ navigate: handleNavigate }} />;

    // Create Salon screen
    case 'CreateSalon':
      return <CreateSalonScreen 
        navigation={{ navigate: handleNavigate, goBack: handleGoBack || (() => handleNavigate('OwnerDashboard')) }} 
        route={{ params: screenParams }}
      />;

    // Salon Appointments screen (for salon owners)
    case 'SalonAppointments':
      return <SalonAppointmentsScreen navigation={{ navigate: handleNavigate, goBack: handleGoBack }} />;

    // Salon Management screens (for salon owners)
    case 'SalonList':
      return <SalonListScreen navigation={{ navigate: handleNavigate }} />;
    
    case 'OwnerSalonDetail':
      return <OwnerSalonDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'OwnerEmployeeDetail':
      return <OwnerEmployeeDetailScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'AddEmployee':
      return <AddEmployeeScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'AddService':
      return <AddServiceScreen navigation={navigation} route={{ params: screenParams }} />;

    case 'AddProduct':
      return <AddProductScreen navigation={navigation} route={{ params: screenParams }} />;
    
    case 'EditService':
      return <EditServiceScreen navigation={navigation} route={{ params: screenParams }} />;
      
    case 'EditSalon':
      return <EditSalonScreen navigation={navigation} route={{ params: screenParams }} />;

    // Placeholder screens for features under development
    case 'MySchedule':
    case 'Attendance':
    case 'CustomerManagement':
    case 'StaffManagement':
    case 'SalonSettings':
    case 'BusinessAnalytics':
    case 'StockManagement':
      return <StockManagementScreen navigation={navigation} route={{ params: screenParams }} />;
    // case 'InventoryManagement': // Replaced by StockManagement
    case 'SalonManagement':
    case 'UserManagement':
    case 'SystemReports':
    case 'MembershipApprovals':
    // Operations screen (for salon owners)
    case 'Operations':
      return <OperationsScreen navigation={navigation} />;

    // Sales screens
    case 'Sales':
      return <SalesScreen navigation={navigation} />;
    case 'SalesHistory':
      return <SalesHistoryScreen navigation={navigation} route={{ params: screenParams }} />;
    case 'Commissions':
      return <CommissionsScreen navigation={navigation} />;
    case 'SaleDetail':
      return <SaleDetailScreen navigation={navigation} route={{ params: screenParams }} />;

    case 'Finance':
    case 'Help':
    case 'WorkLog':
    case 'Leaderboard':
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>{screenName}</Text>
          <Text style={styles.placeholderText}>Coming Soon</Text>
          <Text style={styles.placeholderSubtext}>
            This feature is currently under development.
          </Text>
        </View>
      );

    default:
      return <RoleBasedHome navigation={{ navigate: handleNavigate }} />;
  }
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  },
});
