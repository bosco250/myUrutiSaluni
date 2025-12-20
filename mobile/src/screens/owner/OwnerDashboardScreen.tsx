import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context';
import { useTheme } from '../../context';
import { salonService, BusinessMetrics } from '../../services/salon';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { api } from '../../services/api';

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
      backgroundColor: isDark ? '#1C1C1E' : theme.colors.background,
    },
    text: {
      color: isDark ? '#FFFFFF' : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? '#8E8E93' : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? '#2C2C2E' : theme.colors.background,
    },
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Step 1: Check membership status first
      try {
        const membershipResponse = await api.get('/memberships/status');
        const { application } = membershipResponse as any;
        
        if (!application) {
          // No application exists - user needs to apply for membership
          setMembershipStatus('none');
          return;
        }
        
        if (application.status === 'pending') {
          setMembershipStatus('pending');
          return;
        }
        
        if (application.status === 'rejected') {
          setMembershipStatus('rejected');
          return;
        }
        
        // Application is approved
        setMembershipStatus('approved');
      } catch (membershipError: any) {
        console.error('[OwnerDashboard] Error checking membership:', membershipError);
        // If 404, user has no application
        if (membershipError?.response?.status === 404 || membershipError?.message?.includes('404')) {
          setMembershipStatus('none');
          return;
        }
        // For other errors, assume no membership and let them apply
        setMembershipStatus('none');
        return;
      }

      // Step 2: If membership is approved, check for salon
      const salon = await salonService.getSalonByOwnerId(String(user.id));
      if (!salon?.id) {
        setHasSalon(false);
        return;
      }

      setHasSalon(true);

      // Step 3: Get business metrics
      const businessMetrics = await salonService.getBusinessMetrics(salon.id);
      
      // Step 4: Get employee count if staffPerformance is empty
      if (!businessMetrics.staffPerformance || businessMetrics.staffPerformance.length === 0) {
        try {
          const employees = await salonService.getEmployees(salon.id);
          // Create minimal staff performance entries for counting
          businessMetrics.staffPerformance = employees.map((emp: any) => ({
            employeeId: emp.id,
            employeeName: emp.user?.fullName || 'Employee',
            appointments: 0,
            revenue: 0,
            rating: 0,
          }));
        } catch {
          // Ignore employee fetch errors
        }
      }
      
      setMetrics(businessMetrics);
    } catch (error: any) {
      console.error('[OwnerDashboard] Error loading dashboard data:', error);
      // If error is 404 or no salons, show onboarding
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        setHasSalon(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [user, loadDashboardData]);

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
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show "Apply for Membership" if user has no membership application
  if (membershipStatus === 'none') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <ScrollView
          contentContainerStyle={styles.onboardingContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.onboardingHeader}>
            <Image source={logo} style={styles.onboardingLogo} resizeMode="contain" />
          </View>

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

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // Show "Application Pending" if membership is pending
  if (membershipStatus === 'pending') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <ScrollView
          contentContainerStyle={styles.onboardingContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.onboardingHeader}>
            <Image source={logo} style={styles.onboardingLogo} resizeMode="contain" />
          </View>

          {/* Pending Card */}
          <LinearGradient
            colors={[theme.colors.warning, '#FF9800']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeIconContainer}>
              <MaterialIcons name="pending" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.welcomeTitle}>Application Pending</Text>
            <Text style={styles.welcomeSubtitle}>
              Your membership application is being reviewed. We'll notify you once it's approved.
            </Text>
          </LinearGradient>

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
            style={[styles.createSalonButton, { opacity: 0.9 }]}
            onPress={() => navigation.navigate('ApplicationSuccess', { status: 'pending' })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.warning, '#FF9800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createSalonGradient}
            >
              <MaterialIcons name="visibility" size={24} color="#FFFFFF" />
              <Text style={styles.createSalonText}>View Application</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Help Card */}
          <View style={[styles.helpCard, dynamicStyles.card]}>
            <MaterialIcons name="help-outline" size={24} color={theme.colors.primary} />
            <View style={styles.helpContent}>
              <Text style={[styles.helpTitle, dynamicStyles.text]}>Questions?</Text>
              <Text style={[styles.helpDesc, dynamicStyles.textSecondary]}>
                Contact our support team if you have any questions about your application.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
              <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // Show "Application Rejected" if membership was rejected
  if (membershipStatus === 'rejected') {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <ScrollView
          contentContainerStyle={styles.onboardingContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.onboardingHeader}>
            <Image source={logo} style={styles.onboardingLogo} resizeMode="contain" />
          </View>

          {/* Rejected Card */}
          <LinearGradient
            colors={[theme.colors.error, '#D32F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeIconContainer}>
              <MaterialIcons name="cancel" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.welcomeTitle}>Application Not Approved</Text>
            <Text style={styles.welcomeSubtitle}>
              Unfortunately, your membership application was not approved. You can apply again with updated information.
            </Text>
          </LinearGradient>

          {/* Reapply Button */}
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
              <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.createSalonText}>Apply Again</Text>
            </LinearGradient>
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

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // Show "Create Salon" onboarding if approved but no salon yet
  if (!hasSalon) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <ScrollView
          contentContainerStyle={styles.onboardingContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.onboardingHeader}>
            <Image source={logo} style={styles.onboardingLogo} resizeMode="contain" />
          </View>

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

          {/* Help Card */}
          <View style={[styles.helpCard, dynamicStyles.card]}>
            <MaterialIcons name="help-outline" size={24} color={theme.colors.primary} />
            <View style={styles.helpContent}>
              <Text style={[styles.helpTitle, dynamicStyles.text]}>Need Help?</Text>
              <Text style={[styles.helpDesc, dynamicStyles.textSecondary]}>
                Contact our support team if you have any questions.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
              <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.dashboardLabel, dynamicStyles.textSecondary]}>
              Owner Dashboard
            </Text>
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
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
            >
              <Image source={profileImage} style={styles.profileImage} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Card */}
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('Bookings')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                <MaterialIcons name="request-quote" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Loans</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('Bookings')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                <MaterialIcons name="event" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                <MaterialIcons name="support-agent" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Airtel Agent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Business Overview</Text>
          <View style={styles.overviewGrid}>
            {/* Bookings Today Card */}
            <View style={[styles.overviewCard, dynamicStyles.card]}>
              <View style={styles.overviewCardHeader}>
                <View style={[styles.overviewIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <MaterialIcons name="event-available" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.changeBadgePositive}>
                  <Text style={styles.changeBadgeText}>+12%</Text>
                </View>
              </View>
              <Text style={[styles.overviewValue, dynamicStyles.text]}>
                {metrics?.today.appointments || 0}
              </Text>
              <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                Bookings Today
              </Text>
            </View>

            {/* Staff Members Card */}
            <View style={[styles.overviewCard, dynamicStyles.card]}>
              <View style={styles.overviewCardHeader}>
                <View style={[styles.overviewIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialIcons name="people" size={20} color="#2196F3" />
                </View>
                <View style={styles.statusBadgeActive}>
                  <Text style={styles.statusBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={[styles.overviewValue, dynamicStyles.text]}>
                {metrics?.staffPerformance?.length || 0}
              </Text>
              <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                Staff Members
              </Text>
            </View>

            {/* Customer Satisfaction Card */}
            <View style={[styles.overviewCard, dynamicStyles.card]}>
              <View style={styles.overviewCardHeader}>
                <View style={[styles.overviewIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="star" size={20} color="#FF9800" />
                </View>
                <View style={styles.statusBadgeExcellent}>
                  <Text style={styles.statusBadgeTextGreen}>EXCELLENT</Text>
                </View>
              </View>
              <Text style={[styles.overviewValue, dynamicStyles.text]}>4.8</Text>
              <Text style={[styles.overviewLabel, dynamicStyles.textSecondary]}>
                Customer Rating
              </Text>
            </View>

            {/* New Customers Card */}
            <View style={[styles.overviewCard, dynamicStyles.card]}>
              <View style={styles.overviewCardHeader}>
                <View style={[styles.overviewIconContainer, { backgroundColor: '#F3E5F5' }]}>
                  <MaterialIcons name="person-add" size={20} color="#9C27B0" />
                </View>
                <View style={styles.changeBadgePositive}>
                  <Text style={styles.changeBadgeText}>+8</Text>
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

        {/* Top Services */}
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
                    index < metrics.topServices.slice(0, 4).length - 1 && styles.serviceRowBorder
                  ]}
                >
                  <View style={styles.serviceRank}>
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

        {/* Staff Performance */}
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
                    index < metrics.staffPerformance.slice(0, 3).length - 1 && styles.serviceRowBorder
                  ]}
                >
                  <View style={styles.staffAvatar}>
                    <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={[styles.staffName, dynamicStyles.text]}>{staff.employeeName}</Text>
                    <Text style={[styles.staffStats, dynamicStyles.textSecondary]}>
                      {staff.appointments} appointments • RWF {staff.revenue.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.staffRating}>
                    <MaterialIcons name="star" size={16} color="#FFB300" />
                    <Text style={styles.ratingText}>{staff.rating.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 36,
  },
  dashboardLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  notificationButton: {
    position: 'relative',
    padding: theme.spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },

  // Revenue Card
  revenueCardContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  revenueCard: {
    borderRadius: 20,
    padding: theme.spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  revenueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  revenueValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
  },
  revenueChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  revenueChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    gap: 4,
  },
  revenueChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
  revenueChangeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: theme.fonts.regular,
  },
  revenueIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickActionLabel: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },

  // Overview Grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  overviewCard: {
    width: '48.5%',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  overviewIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  overviewLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  changeBadgePositive: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: theme.fonts.medium,
  },
  statusBadgeActive: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2196F3',
    fontFamily: theme.fonts.bold,
  },
  statusBadgeExcellent: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
    fontFamily: theme.fonts.bold,
  },

  // List Cards
  listCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  serviceRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  serviceStats: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  serviceRevenue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // Staff Row
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  staffStats: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  staffRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    fontFamily: theme.fonts.medium,
  },

  // Onboarding styles
  onboardingContent: {
    padding: theme.spacing.lg,
    paddingTop: (StatusBar.currentHeight || 0) + theme.spacing.lg,
  },
  onboardingHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  onboardingLogo: {
    width: 120,
    height: 40,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  stepsCard: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  createSalonButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  createSalonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md + 4,
    gap: theme.spacing.sm,
  },
  createSalonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  helpContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  helpDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
});
