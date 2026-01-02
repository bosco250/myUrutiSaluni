import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';
import { EmployeePermission } from '../../constants/employeePermissions';
import { salonService, SalonDetails, BusinessMetrics } from '../../services/salon';
import { Loader } from '../../components/common';

// Import logo
const logo = require('../../../assets/Logo.png');

interface EmployeeSalonDashboardProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
    };
  };
}

interface FeatureItem {
  id: string;
  icon: string;
  label: string;
  description: string;
  screen: string;
  permission: EmployeePermission;
  color: string;
  category: string;
}

// Feature definitions with required permissions
const FEATURES: FeatureItem[] = [
  // Appointments
  {
    id: 'appointments',
    icon: 'calendar-today',
    label: 'Salon Appointments',
    description: 'View team schedule',
    screen: 'SalonAppointments',
    permission: EmployeePermission.VIEW_ALL_APPOINTMENTS,
    color: '#007AFF',
    category: 'appointments',
  },
  {
    id: 'manage-appointments',
    icon: 'add-circle-outline',
    label: 'Book Appointment',
    description: 'Schedule a client',
    screen: 'CreateAppointment', // Point to Create if they can manage? Or just Calendar? Let's keep Calendar for now but label it "Bookings"
    permission: EmployeePermission.MANAGE_APPOINTMENTS,
    color: '#5856D6',
    category: 'appointments',
  },
  // Customers
  {
    id: 'customers',
    icon: 'people-outline',
    label: 'Clients',
    description: 'Client list & profiles',
    screen: 'CustomerManagement',
    permission: EmployeePermission.MANAGE_CUSTOMERS,
    color: '#FF9500',
    category: 'customers',
  },
  {
    id: 'customer-history',
    icon: 'history',
    label: 'Client History',
    description: 'Past visits & notes',
    screen: 'CustomerManagement',
    permission: EmployeePermission.VIEW_CUSTOMER_HISTORY,
    color: '#FF9500',
    category: 'customers',
  },
  // Sales & Finance
  {
    id: 'quick-sale',
    icon: 'attach-money',
    label: 'Checkout',
    description: 'Process payment',
    screen: 'Sales',
    permission: EmployeePermission.PROCESS_PAYMENTS,
    color: '#34C759',
    category: 'sales',
  },
  {
    id: 'sales-reports',
    icon: 'receipt',
    label: 'Transactions',
    description: 'Daily sales history',
    screen: 'SalesHistory',
    permission: EmployeePermission.VIEW_SALES_REPORTS,
    color: '#34C759',
    category: 'sales',
  },
  {
    id: 'commissions',
    icon: 'account-balance-wallet',
    label: 'Earnings & Commissions',
    description: 'Track earnings & commissions',
    screen: 'Commissions',
    permission: EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
    color: '#FF9500',
    category: 'sales',
  },
  // Inventory
  {
    id: 'inventory',
    icon: 'inventory',
    label: 'Inventory',
    description: 'Check stock levels',
    screen: 'StockManagement',
    permission: EmployeePermission.MANAGE_INVENTORY,
    color: '#5856D6',
    category: 'inventory',
  },
  {
    id: 'products',
    icon: 'add-shopping-cart',
    label: 'Products',
    description: 'Update product lists',
    screen: 'StockManagement',
    permission: EmployeePermission.MANAGE_PRODUCTS,
    color: '#5856D6',
    category: 'inventory',
  },
  // Services
  {
    id: 'services',
    icon: 'content-cut',
    label: 'Service Menu',
    description: 'Update prices & items',
    screen: 'Operations',
    permission: EmployeePermission.MANAGE_SERVICES,
    color: '#FF2D55',
    category: 'services',
  },
  // Staff
  {
    id: 'staff',
    icon: 'groups',
    label: 'Team',
    description: 'Manage staff list',
    screen: 'StaffManagement',
    permission: EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES,
    color: '#007AFF',
    category: 'staff',
  },
  {
    id: 'performance',
    icon: 'insights',
    label: 'Team Performance',
    description: 'View statistics',
    screen: 'BusinessAnalytics',
    permission: EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE,
    color: '#34C759',
    category: 'staff',
  },
  // Salon Settings
  {
    id: 'salon-profile',
    icon: 'storefront',
    label: 'Salon Profile',
    description: 'Update info',
    screen: 'SalonSettings',
    permission: EmployeePermission.MANAGE_SALON_PROFILE,
    color: theme.colors.primary,
    category: 'settings',
  },
  {
    id: 'salon-settings',
    icon: 'settings',
    label: 'Settings',
    description: 'App preferences',
    screen: 'SalonSettings',
    permission: EmployeePermission.VIEW_SALON_SETTINGS,
    color: '#8E8E93',
    category: 'settings',
  },
  {
    id: 'business-hours',
    icon: 'access-time',
    label: 'Opening Hours',
    description: 'Set work times',
    screen: 'SalonSettings',
    permission: EmployeePermission.MANAGE_BUSINESS_HOURS,
    color: '#FF9500',
    category: 'settings',
  },
  // Analytics
  {
    id: 'analytics',
    icon: 'bar-chart',
    label: 'Business Insights',
    description: 'Growth & trends',
    screen: 'BusinessAnalytics',
    permission: EmployeePermission.VIEW_SALES_REPORTS,
    color: '#5856D6',
    category: 'analytics',
  },
];

export default function EmployeeSalonDashboard({ navigation, route }: EmployeeSalonDashboardProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const routeSalonId = route?.params?.salonId;
  const { checkPermission, activePermissions, salonId: employeeSalonId, loading: permissionsLoading } = useEmployeePermissionCheck();
  
  const salonId = routeSalonId || employeeSalonId;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salon, setSalon] = useState<SalonDetails | null>(null);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);

  // Dynamic styles
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000000' : '#F2F2F7',
    },
    text: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    textSecondary: {
      color: isDark ? '#8E8E93' : '#6D6D70',
    },
    card: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#E5E5EA',
    },
    header: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    },
  };

  // Get features the employee has permission for
  const permittedFeatures = useMemo(() => {
    if (!activePermissions || activePermissions.length === 0) return [];
    
    // Deduplicate by screen to avoid showing multiple items for the same destination
    const seen = new Set<string>();
    return FEATURES.filter(feature => {
      // Logic: Only show if they have the specific permission
      if (checkPermission(feature.permission)) {
        const key = `${feature.screen}-${feature.category}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
      return false;
    });
  }, [activePermissions, checkPermission]);

  // Group features by category
  const groupedFeatures = useMemo(() => {
    const groups: { [key: string]: FeatureItem[] } = {};
    permittedFeatures.forEach(feature => {
      if (!groups[feature.category]) {
        groups[feature.category] = [];
      }
      groups[feature.category].push(feature);
    });
    return groups;
  }, [permittedFeatures]);

  const categoryLabels: { [key: string]: string } = {
    appointments: 'Schedule',
    customers: 'Clients',
    sales: 'Finance',
    inventory: 'Products',
    services: 'Service Menu',
    staff: 'Team',
    settings: 'Settings',
    analytics: 'Reports',
  };

  const loadData = useCallback(async () => {
    try {
      if (!salonId) return;
      
      // Load salon details
      const salonData = await salonService.getSalonDetails(salonId).catch(() => null);
      if (salonData) {
        setSalon(salonData);
      }

      // Load metrics if user has sales reports permission
      if (checkPermission(EmployeePermission.VIEW_SALES_REPORTS)) {
        const metricsData = await salonService.getBusinessMetrics(salonId).catch(() => null);
        if (metricsData) {
          setMetrics(metricsData);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, checkPermission]);

  useEffect(() => {
    if (!permissionsLoading && salonId) {
      loadData();
    }
  }, [loadData, permissionsLoading, salonId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFeaturePress = (feature: FeatureItem) => {
    navigation.navigate(feature.screen, { salonId });
  };

  if (loading || permissionsLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header with Salon Info */}
        <View style={[styles.headerCard, dynamicStyles.card]}>
          <View style={styles.headerTop}>
            <Image source={logo} style={styles.salonLogo} resizeMode="contain" />
            <View style={styles.headerInfo}>
              <Text style={[styles.salonName, dynamicStyles.text]}>
                {salon?.name || 'My Salon'}
              </Text>
              <Text style={[styles.employeeRole, dynamicStyles.textSecondary]}>
                Hello, {user?.fullName?.split(' ')[0] || 'Team Member'} 👋
              </Text>
            </View>
          </View>
          
          {/* Quick Stats Row - Only show if they have report access */}
          {metrics && checkPermission(EmployeePermission.VIEW_SALES_REPORTS) && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.text]}>
                  {metrics.today.appointments}
                </Text>
                <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                  Appointments
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: dynamicStyles.card.borderColor }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.text]}>
                  RWF {(metrics.today.revenue || 0).toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                  Revenue
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Access Level Badge - SIMPLIFIED */}
        <View style={styles.permissionsBadge}>
          <TouchableOpacity 
            style={[styles.viewPermissionsBtn, { borderColor: theme.colors.primary + '30', backgroundColor: theme.colors.primary + '10' }]}
            onPress={() => navigation.navigate('MyPermissions')}
          >
            <MaterialIcons name="security" size={14} color={theme.colors.primary} />
            <Text style={[styles.viewPermissionsBtnText, { color: theme.colors.primary }]}>
              My Access Controls
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Grid by Category */}
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              {categoryLabels[category] || category}
            </Text>
            <View style={styles.featuresGrid}>
              {features.map(feature => (
                <TouchableOpacity
                  key={feature.id}
                  style={[styles.featureCard, dynamicStyles.card]}
                  onPress={() => handleFeaturePress(feature)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                    <MaterialIcons name={feature.icon as any} size={24} color={feature.color} />
                  </View>
                  <Text style={[styles.featureLabel, dynamicStyles.text]} numberOfLines={1}>
                    {feature.label}
                  </Text>
                  <Text style={[styles.featureDesc, dynamicStyles.textSecondary]} numberOfLines={1}>
                    {feature.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* No Permissions State - HUMANIZED */}
        {permittedFeatures.length === 0 && (
          <View style={[styles.emptyState, dynamicStyles.card]}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="emoji-people" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>Welcome to the Team!</Text>
            <Text style={[styles.emptyDesc, dynamicStyles.textSecondary]}>
              It looks like your access hasn't been set up yet. 
              {'\n\n'}
              Ask your salon manager to assign you tasks so you can start using the app.
            </Text>
            <TouchableOpacity 
              style={styles.contactBtn}
              onPress={() => navigation.navigate('MyPermissions')}
            >
              <Text style={styles.contactBtnText}>Check My Status</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  headerCard: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    // Add subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonLogo: {
    width: 56,
    height: 56,
    borderRadius: 28, // Round logo
    marginRight: theme.spacing.md,
    backgroundColor: '#F2F2F7',
  },
  headerInfo: {
    flex: 1,
  },
  salonName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    marginHorizontal: theme.spacing.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionsBadge: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  viewPermissionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewPermissionsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginLeft: 6,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18, // Larger section title
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
    marginLeft: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: '46%', // Slightly narrower to fit gap
    marginHorizontal: '2%',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: 20, // More rounded
    borderWidth: 1,
    alignItems: 'center',
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    marginVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    maxWidth: '80%',
  },
  contactBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
});
