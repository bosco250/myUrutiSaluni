import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth, useTheme } from '../../context';
import { salonService, BusinessMetrics, SalonDetails } from '../../services/salon';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { api } from '../../services/api';
import { Loader } from '../../components/common';
import { SalonRequirementGuard } from '../../components/SalonRequirementGuard';

// Import logo
const logo = require('../../../assets/Logo.png');
const profileImage = require('../../../assets/Logo.png');

interface OwnerDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function OwnerDashboardScreen({ navigation }: OwnerDashboardScreenProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const unreadNotificationCount = useUnreadNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Membership status: 'checking' | 'none' | 'pending' | 'rejected' | 'approved'
  const [membershipStatus, setMembershipStatus] = useState<'checking' | 'none' | 'pending' | 'rejected' | 'approved'>('checking');
  const [hasSalon, setHasSalon] = useState(true); // Assume true until proven otherwise
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);

  // Dynamic styles for dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    border: {
       borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    iconBg: {
       backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Safeguard: If user is admin, they shouldn't be here. Redirect to Admin Dashboard.
      const role = user.role?.toLowerCase();
      if (role?.includes('admin') || role === 'district_leader') {
        // console.log('[OwnerDashboard] User is admin, redirecting to AdminDashboard');
        // Prevent membership check which fails for admins
        navigation.navigate('AdminDashboard');
        setLoading(false);
        return;
      }

      // PERFORMANCE OPTIMIZATION: Load all data in parallel with timeout
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      // Step 1: Check membership status with timeout (10 seconds)
      try {
        const membershipResponse = await Promise.race([
          api.get('/memberships/status', { cache: true, cacheDuration: 60000 }),
          timeout(10000) // Increased timeout to 10 seconds
        ]) as any;
        
        // Backend returns { isMember: boolean, application: MembershipApplication | null }
        const { application, isMember } = membershipResponse || {};
        
        if (!application) {
          setMembershipStatus('none');
          // Continue to check for salon even without membership
        } else {
          // Handle application status
          if (application.status === 'pending' || application.status === 'PENDING') {
            setMembershipStatus('pending');
            // Continue to check for salon even if pending
          } else if (application.status === 'rejected' || application.status === 'REJECTED') {
            setMembershipStatus('rejected');
            // Continue to check for salon even if rejected
          } else if (application.status === 'approved' || application.status === 'APPROVED' || isMember) {
            setMembershipStatus('approved');
            // Continue to check for salon
          } else {
            // Default to none if status is unknown
            setMembershipStatus('none');
            // Continue to check for salon
          }
        }
      } catch (membershipError: any) {
        // Silently handle timeout/404 errors - these are expected when user has no membership
        const isExpectedError = 
          membershipError?.response?.status === 404 || 
          membershipError?.message?.includes('404') ||
          membershipError?.message?.includes('timeout') ||
          membershipError?.message?.includes('Request timeout');
        
        if (!isExpectedError) {
          // Only log unexpected errors
          console.error('[OwnerDashboard] Error checking membership:', membershipError);
        }
        
        // For any error (timeout, 404, etc.), assume no membership
        setMembershipStatus('none');
        // Continue to check for salon even if membership check fails
      }

      // Step 2: Get salon with timeout (5 seconds)
      const salonResponse = await Promise.race([
        salonService.getSalonByOwnerId(String(user.id)),
        timeout(5000)
      ]).catch((err) => {
        console.error('[OwnerDashboard] Error getting salon:', err);
        return null;
      });

      const salon = salonResponse as SalonDetails | null;

      if (!salon?.id) {
        setHasSalon(false);
        setLoading(false);
        return;
      }

      setHasSalon(true);
      setLoading(false); // Show UI immediately with salon info

      // Step 3: Load metrics and employees in parallel in background
      Promise.all([
        salonService.getBusinessMetrics(salon.id).catch(() => null),
        salonService.getEmployees(salon.id).catch(() => [])
      ]).then(([businessMetrics, employees]) => {
        if (businessMetrics) {
          // Add employee count if staffPerformance is empty
          if (!businessMetrics.staffPerformance || businessMetrics.staffPerformance.length === 0) {
            businessMetrics.staffPerformance = employees.map((emp: any) => ({
              employeeId: emp.id,
              employeeName: emp.user?.fullName || 'Employee',
              appointments: 0,
              revenue: 0,
              rating: 0,
            }));
          }
          setMetrics(businessMetrics);
        }
      }).catch((error) => {
        console.error('[OwnerDashboard] Error loading metrics:', error);
      });

    } catch (error: any) {
      console.error('[OwnerDashboard] Error loading dashboard data:', error);
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        setHasSalon(false);
      }
      setLoading(false);
    }
  }, [user?.id, navigation, user?.role]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // ✅ Only depend on user ID, not the whole user object

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Calculate percentage change
  const getRevenueChange = () => {
    if (!metrics) return { value: 0, isPositive: true };
    const today = metrics.today.revenue;
    const yesterday = metrics.week.revenue / 7; // Approximate daily from weekly
    if (yesterday === 0) return { value: 0, isPositive: true };
    const change = ((today - yesterday) / yesterday) * 100;
    return { value: Math.abs(change).toFixed(1), isPositive: change >= 0 };
  };

  const revenueChange = getRevenueChange();

  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading dashboard..." />
      </View>
    );
  }

  // Common Header Component
  const OnboardingHeader = () => (
    <View style={styles.onboardingHeader}>
      <Image source={logo} style={styles.onboardingLogo} resizeMode="contain" />
    </View>
  );

  // Show "Apply for Membership" if user has no membership application
  if (membershipStatus === 'none') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.onboardingContent}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingHeader />

            {/* Welcome Card */}
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              <View style={styles.welcomeIconContainer}>
                <MaterialIcons name="card-membership" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.welcomeTitle}>Welcome, {user?.fullName?.split(' ')[0] || 'Owner'}!</Text>
              <Text style={styles.welcomeSubtitle}>
                To start managing your salon business, you need to apply for membership first.
              </Text>
            </LinearGradient>

            {/* Steps Card */}
            <View style={[styles.stepsCard, dynamicStyles.card]}>
              <Text style={[styles.stepsTitle, dynamicStyles.text]}>How It Works</Text>
              
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.text]}>Apply for Membership</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Submit your business information</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.borderLight }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.textSecondary }]}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.textSecondary]}>Wait for Approval</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Usually within 24-48 hours</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.borderLight }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.textSecondary }]}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.textSecondary]}>Create Your Salon</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Set up your salon profile</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.createSalonButton}
              onPress={() => navigation.navigate('MembershipApplication')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createSalonGradient}
              >
                <MaterialIcons name="assignment" size={24} color="#FFFFFF" />
                <Text style={styles.createSalonText}>Apply for Membership</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Card */}
            <View style={[styles.helpCard, dynamicStyles.card]}>
              <MaterialIcons name="info-outline" size={24} color={theme.colors.primary} />
              <View style={styles.helpContent}>
                <Text style={[styles.helpTitle, dynamicStyles.text]}>Why Apply?</Text>
                <Text style={[styles.helpDesc, dynamicStyles.textSecondary]}>
                  Membership gives you access to create salons, manage staff, and grow your business on our platform.
                </Text>
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Show "Application Pending" if membership is pending
  if (membershipStatus === 'pending') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.onboardingContent}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingHeader />

            {/* Pending Card */}
            <View style={[styles.statusCard, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }]}>
              <View style={[styles.statusIconBox, { backgroundColor: theme.colors.warning + '15' }]}>
                <MaterialIcons name="hourglass-top" size={40} color={theme.colors.warning} />
              </View>
              <Text style={[styles.statusTitle, { color: isDark ? theme.colors.white : theme.colors.text }]}>Application Pending</Text>
              <Text style={[styles.statusSubtitle, { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary }]}>
                Your membership application is being reviewed. We'll notify you once it's approved.
              </Text>
            </View>

            {/* Status Card */}
            <View style={[styles.stepsCard, dynamicStyles.card]}>
              <Text style={[styles.stepsTitle, dynamicStyles.text]}>Application Status</Text>
              
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.success }]}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.text]}>Application Submitted</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Your application has been received</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.warning }]}>
                  <MaterialIcons name="hourglass-top" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.text]}>Under Review</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Usually takes 24-48 hours</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.borderLight }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.textSecondary }]}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.textSecondary]}>Approval & Salon Creation</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Coming soon!</Text>
                </View>
              </View>
            </View>

            {/* View Application Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.warning }]}
              onPress={() => navigation.navigate('ApplicationSuccess', { status: 'pending' })}
              activeOpacity={0.85}
            >
              <MaterialIcons name="visibility" size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>View Application</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Show "Application Rejected" if membership was rejected
  if (membershipStatus === 'rejected') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.onboardingContent}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingHeader />

            {/* Rejected Card */}
            <View style={[styles.statusCard, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }]}>
              <View style={[styles.statusIconBox, { backgroundColor: theme.colors.error + '15' }]}>
                <MaterialIcons name="cancel" size={40} color={theme.colors.error} />
              </View>
              <Text style={[styles.statusTitle, { color: isDark ? theme.colors.white : theme.colors.text }]}>Application Not Approved</Text>
              <Text style={[styles.statusSubtitle, { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary }]}>
                Unfortunately, your application was not approved. You can apply again with updated information.
              </Text>
            </View>

            {/* Reapply Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('MembershipApplication')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="refresh" size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Apply Again</Text>
            </TouchableOpacity>

            {/* Help Card */}
            <View style={[styles.helpCard, dynamicStyles.card]}>
              <MaterialIcons name="help-outline" size={24} color={theme.colors.primary} />
              <View style={styles.helpContent}>
                <Text style={[styles.helpTitle, dynamicStyles.text]}>Need Help?</Text>
                <Text style={[styles.helpDesc, dynamicStyles.textSecondary]}>
                  Contact our support team to learn more about why your application was not approved.
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
                <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Show "Create Salon" onboarding if approved but no salon yet
  if (!hasSalon) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.onboardingContent}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingHeader />

            {/* Welcome Card */}
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              <View style={styles.welcomeIconContainer}>
                <MaterialIcons name="celebration" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.welcomeTitle}>Welcome, {user?.fullName?.split(' ')[0] || 'Owner'}!</Text>
              <Text style={styles.welcomeSubtitle}>
                Your membership has been approved! Now let's set up your salon.
              </Text>
            </LinearGradient>

            {/* Steps Card */}
            <View style={[styles.stepsCard, dynamicStyles.card]}>
              <Text style={[styles.stepsTitle, dynamicStyles.text]}>Get Started</Text>
              
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.success }]}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.text]}>Membership Approved</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>You're now a verified salon owner</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.text]}>Create Your Salon</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Add your salon info and location</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.borderLight }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.textSecondary }]}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, dynamicStyles.textSecondary]}>Add Services & Staff</Text>
                  <Text style={[styles.stepDesc, dynamicStyles.textSecondary]}>Set up your offerings</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.createSalonButton}
              onPress={() => navigation.navigate('CreateSalon')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createSalonGradient}
              >
                <MaterialIcons name="add-business" size={24} color="#FFFFFF" />
                <Text style={styles.createSalonText}>Create Your Salon</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SalonRequirementGuard navigation={navigation}>
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerLeft, { flexDirection: 'row', alignItems: 'center' }]}>
            <TouchableOpacity 
              onPress={() => navigation.navigate("MoreMenu")} 
              style={{ marginRight: 4 }}
              activeOpacity={0.7}
            >
               <MaterialIcons name="menu" size={26} color={dynamicStyles.text.color} />
            </TouchableOpacity>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="notifications-none" size={26} color={dynamicStyles.text.color} />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

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
          {/* Revenue Card (Flat Design) */}
          <View style={styles.revenueCardContainer}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revenueCard}
            >
              <View style={styles.revenueContent}>
                <View>
                  <Text style={styles.revenueLabel}>Today's Revenue</Text>
                  <Text style={styles.revenueValue}>
                    RWF {(metrics?.today.revenue || 0).toLocaleString()}
                  </Text>
                  <View style={styles.revenueChangeContainer}>
                    <View style={styles.revenueChangeBadge}>
                      <MaterialIcons 
                        name={revenueChange.isPositive ? 'trending-up' : 'trending-down'} 
                        size={14} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.revenueChangeText}>
                        {revenueChange.isPositive ? '+' : '-'}{revenueChange.value}%
                      </Text>
                    </View>
                    <Text style={styles.revenueChangeLabel}>vs yesterday</Text>
                  </View>
                </View>
                <View style={styles.revenueIconContainer}>
                  <MaterialIcons name="show-chart" size={32} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions (Flat Grid) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              {[
                { label: 'Loans', icon: 'request-quote', screen: 'ComingSoon', params: { featureName: 'Loans' } },
                { label: 'Appointments', icon: 'event', screen: 'SalonAppointments', params: {} },
                { label: 'Airtel Agent', icon: 'support-agent', screen: 'ComingSoon', params: { featureName: 'Airtel Agent' } },
              ].map((action, i) => (
                <TouchableOpacity 
                  key={i}
                  style={[styles.quickActionCard, dynamicStyles.card]}
                  onPress={() => navigation.navigate(action.screen, action.params)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, dynamicStyles.iconBg]}>
                    <MaterialIcons name={action.icon as any} size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.quickActionLabel, dynamicStyles.text]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Business Overview (Flat Cards) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Business Overview</Text>
            <View style={styles.overviewGrid}>
              
              {/* Bookings Today */}
              <View style={[styles.overviewCard, dynamicStyles.card]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIconContainer, dynamicStyles.iconBg]}>
                    <MaterialIcons name="event-available" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={[styles.changeBadgePositive, { backgroundColor: isDark ? 'rgba(76,175,80,0.1)' : '#E8F5E9' }]}>
                    <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: '700' }}>+12%</Text>
                  </View>
                </View>
                <Text style={[styles.overviewValue, dynamicStyles.text]}>
                  {metrics?.today.appointments || 0}
                </Text>
                <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                  Bookings Today
                </Text>
              </View>

              {/* Staff Members */}
              <View style={[styles.overviewCard, dynamicStyles.card]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIconContainer, dynamicStyles.iconBg]}>
                    <MaterialIcons name="people" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={[styles.statusBadgeActive, { backgroundColor: 'rgba(33,150,243,0.1)' }]}>
                    <Text style={{ color: theme.colors.info, fontSize: 10, fontWeight: '700' }}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={[styles.overviewValue, dynamicStyles.text]}>
                  {metrics?.staffPerformance?.length || 0}
                </Text>
                <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                  Staff Members
                </Text>
              </View>

              {/* Rating */}
              <View style={[styles.overviewCard, dynamicStyles.card]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIconContainer, dynamicStyles.iconBg]}>
                    <MaterialIcons name="star" size={20} color={theme.colors.warning} />
                  </View>
                  <View style={[styles.statusBadgeActive, { backgroundColor: isDark ? 'rgba(76,175,80,0.1)' : '#E8F5E9' }]}>
                    <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: '700' }}>EXCELLENT</Text>
                  </View>
                </View>
                <Text style={[styles.overviewValue, dynamicStyles.text]}>4.8</Text>
                <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                  Customer Rating
                </Text>
              </View>

              {/* New Customers */}
              <View style={[styles.overviewCard, dynamicStyles.card]}>
                <View style={styles.overviewCardHeader}>
                  <View style={[styles.overviewIconContainer, dynamicStyles.iconBg]}>
                    <MaterialIcons name="person-add" size={20} color={theme.colors.secondary} />
                  </View>
                  <View style={[styles.changeBadgePositive, { backgroundColor: isDark ? 'rgba(76,175,80,0.1)' : '#E8F5E9' }]}>
                    <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: '700' }}>+8</Text>
                  </View>
                </View>
                <Text style={[styles.overviewValue, dynamicStyles.text]}>
                  {metrics?.today.newCustomers || 0}
                </Text>
                <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                  New Customers
                </Text>
              </View>
            </View>
          </View>

          {/* Top Services (Flat List) */}
          {metrics?.topServices && metrics.topServices.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Top Services</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('BusinessAnalytics')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.listCard, dynamicStyles.card]}>
                {metrics.topServices.slice(0, 4).map((service, index) => (
                  <View 
                    key={service.serviceId} 
                    style={[
                      styles.serviceRow,
                      styles.serviceRowPadding,
                      index < metrics.topServices.slice(0, 4).length - 1 && [styles.serviceRowBorder, dynamicStyles.border]
                    ]}
                  >
                    <View style={[styles.serviceRank, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, dynamicStyles.text]}>{service.serviceName}</Text>
                      <Text style={[styles.serviceStats, dynamicStyles.textSecondary]}>
                        {service.bookings} bookings
                      </Text>
                    </View>
                    <Text style={styles.serviceRevenue}>RWF {service.revenue.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Staff Performance (Flat List) */}
          {metrics?.staffPerformance && metrics.staffPerformance.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Staff Performance</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('StaffManagement')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>Manage</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.listCard, dynamicStyles.card]}>
                {metrics.staffPerformance.slice(0, 3).map((staff, index) => (
                  <View 
                    key={staff.employeeId} 
                    style={[
                      styles.staffRow,
                      styles.serviceRowPadding,
                      index < metrics.staffPerformance.slice(0, 3).length - 1 && [styles.serviceRowBorder, dynamicStyles.border]
                    ]}
                  >
                    <View style={[styles.staffAvatar, dynamicStyles.iconBg]}>
                      <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={[styles.staffName, dynamicStyles.text]}>{staff.employeeName}</Text>
                      <Text style={[styles.staffStats, dynamicStyles.textSecondary]}>
                        {staff.appointments} appointments
                      </Text>
                    </View>
                    <View style={styles.staffRating}>
                      <MaterialIcons name="star" size={14} color="#FFB300" />
                      <Text style={[styles.ratingText, dynamicStyles.text]}>{staff.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
      </View>
    </SalonRequirementGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12, // Slightly tighter
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  logo: { width: 90, height: 32 }, // Adjusted scale
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationButton: { 
    width: 40, height: 40, 
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)', // Subtle background
  },
  notificationBadge: { 
    position: 'absolute', top: 4, right: 4, 
    backgroundColor: theme.colors.error, 
    borderRadius: 6, minWidth: 14, height: 14, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 1.5, borderColor: theme.colors.background 
  },
  notificationBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  profileImage: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderLight }, // Modern rounded square
  
  // Premium Revenue Card
  revenueCardContainer: { paddingHorizontal: 20 },
  revenueCard: { 
    borderRadius: 24, 
    padding: 24, 
    minHeight: 160,
    justifyContent: 'space-between',
    // Shadow for depth
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  revenueContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start' 
  },
  revenueLabel: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    marginBottom: 8, 
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  revenueValue: { 
    fontSize: 38, // Larger
    fontWeight: '800', 
    color: '#FFFFFF', 
    letterSpacing: -1,
    lineHeight: 46,
  },
  revenueChangeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginTop: 'auto', // Push to bottom
  },
  revenueChangeBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12, 
    gap: 6 
  },
  revenueChangeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  revenueChangeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  revenueIconContainer: { 
    width: 56, height: 56, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  // Sections
  section: { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  viewAllText: { fontSize: 14, color: theme.colors.primary, fontWeight: '700' },
  
  // Quick Actions - Pop Style
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickActionCard: { 
    flex: 1, 
    borderRadius: 20, 
    paddingVertical: 16, 
    paddingHorizontal: 8, 
    alignItems: 'center', 
    borderWidth: 0, // Removed border for cleaner look
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: { 
    width: 52, height: 52, 
    borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 10,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  
  // Overview Grid - Clean Stats
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  overviewCard: { 
    width: '48%', // Flexible width
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1,
    borderColor: 'transparent', // Default transparent
  },
  overviewCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  overviewIconContainer: { 
    width: 40, height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center' 
  },
  overviewValue: { 
    fontSize: 26, 
    fontWeight: '800', 
    marginBottom: 4, 
    letterSpacing: -0.5 
  },
  overviewLabel: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
  changeBadgePositive: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeActive: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  
  // List Styles - Polished
  listCard: { 
    borderRadius: 24, 
    borderWidth: 1, 
    overflow: 'hidden' 
  },
  serviceRow: { flexDirection: 'row', alignItems: 'center' },
  serviceRowPadding: { padding: 18 }, // More breathing room
  serviceRowBorder: { borderBottomWidth: 1 },
  serviceRank: { 
    width: 28, height: 28, 
    borderRadius: 8, 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  rankNumber: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  serviceStats: { fontSize: 13, fontWeight: '500', opacity: 0.6 },
  serviceRevenue: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  
  staffRow: { flexDirection: 'row', alignItems: 'center' },
  staffAvatar: { 
    width: 44, height: 44, 
    borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 14 
  },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  staffStats: { fontSize: 13, opacity: 0.7 },
  staffRating: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },

  // Onboarding Styles (kept mostly same but refined spacing)
  onboardingContent: { padding: 24 },
  onboardingHeader: { alignItems: 'center', marginBottom: 32, marginTop: 24 },
  onboardingLogo: { width: 140, height: 48 },
  welcomeCard: { borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24 },
  welcomeIconContainer: { 
    width: 80, height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 20 
  },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  welcomeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 24 },
  stepsCard: { borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1 },
  stepsTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  stepNumberText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  stepContent: { flex: 1, paddingTop: 4 },
  stepLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  stepDesc: { fontSize: 14, lineHeight: 20 },
  createSalonButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, elevation: 4 },
  createSalonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  createSalonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  helpCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 20, borderWidth: 1 },
  helpContent: { flex: 1, marginLeft: 16 },
  helpTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  helpDesc: { fontSize: 14, lineHeight: 20 },
  statusCard: { borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  statusIconBox: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  statusTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  statusSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 50, paddingVertical: 16, paddingHorizontal: 32, gap: 10, marginBottom: 24, elevation: 6, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  actionButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.white },
});
