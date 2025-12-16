import React, { useState, useEffect } from 'react';
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
import { staffService, ClockStatus, TodayStats, ScheduleItem } from '../../services/staff';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

// Import assets
const logo = require('../../../assets/Logo.png');
const profileImage = require('../../../assets/Logo.png');

interface StaffDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function StaffDashboardScreen({ navigation }: StaffDashboardScreenProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const unreadNotificationCount = useUnreadNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [employeeLevel, setEmployeeLevel] = useState(3);

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

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load mock data for demo
      setClockStatus({
        isClockedIn: true,
        clockInTime: '08:30 AM',
        clockOutTime: null,
        totalHoursToday: 4.5,
      });

      setTodayStats({
        appointmentsCount: 8,
        completedCount: 5,
        upcomingCount: 3,
        earnings: 285,
        customerCount: 12,
      });

      setSchedule([
        {
          id: '1',
          serviceName: 'Hair Cut & Style',
          customerName: 'Sarah Johnson',
          startTime: '9:00 AM',
          endTime: '10:30 AM',
          status: 'confirmed',
          price: 65,
        },
        {
          id: '2',
          serviceName: 'Hair Coloring',
          customerName: 'Emma Wilson',
          startTime: '11:00 AM',
          endTime: '1:00 PM',
          status: 'confirmed',
          price: 120,
        },
        {
          id: '3',
          serviceName: 'Blow Dry',
          customerName: 'Michelle Brown',
          startTime: '2:00 PM',
          endTime: '2:45 PM',
          status: 'pending',
          price: 35,
        },
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#E8F5E9';
      case 'pending':
        return '#FFF3E0';
      case 'completed':
        return '#E3F2FD';
      default:
        return theme.colors.backgroundSecondary;
    }
  };

  // Get user position/role formatted
  const getUserPosition = () => {
    return 'Hair Stylist';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="notifications-none" size={26} color="#FFFFFF" />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
            >
              <Image source={profileImage} style={styles.profileImage} />
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.fullName || 'Employee'}</Text>
              <Text style={styles.profileRole}>
                {getUserPosition()} • Level {employeeLevel}
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, dynamicStyles.card]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="schedule" size={18} color="#2196F3" />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {todayStats?.appointmentsCount || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>TODAY'S{'\n'}TASKS</Text>
            </View>

            <View style={[styles.statCard, dynamicStyles.card]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="people" size={18} color="#4CAF50" />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                {todayStats?.customerCount || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>CUSTOMERS</Text>
            </View>

            <View style={[styles.statCard, dynamicStyles.card]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="attach-money" size={18} color="#FF9800" />
              </View>
              <Text style={[styles.statValue, dynamicStyles.text]}>
                ${todayStats?.earnings || 0}
              </Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>EARNINGS</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            {/* Clocked In Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <MaterialIcons name="access-time" size={24} color="#4CAF50" />
                </View>
                {clockStatus?.isClockedIn && (
                  <View style={styles.onTimeBadge}>
                    <Text style={styles.onTimeBadgeText}>On Time</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.textSecondary]}>Clocked In</Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>
                {clockStatus?.clockInTime || '--:--'}
              </Text>
            </View>

            {/* Wallet Balance Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#2196F3" />
                </View>
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.textSecondary]}>Wallet Balance</Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>$1,285.50</Text>
            </View>

            {/* Goal Setting Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                  <MaterialIcons name="track-changes" size={24} color="#9C27B0" />
                </View>
                <View style={[styles.activeBadge]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.textSecondary]}>Goal Setting</Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>2 Targets</Text>
            </View>

            {/* Training Card */}
            <View style={[styles.quickActionCard, dynamicStyles.card]}>
              <View style={styles.quickActionHeader}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="play-circle-outline" size={24} color="#FF9800" />
                </View>
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.textSecondary]}>Training</Text>
              <Text style={[styles.quickActionValue, dynamicStyles.text]}>2 Pending</Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Today's Schedule</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('MySchedule')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={[styles.emptyCard, dynamicStyles.card]}>
              <MaterialIcons name="event-available" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No appointments scheduled for today
              </Text>
            </View>
          ) : (
            schedule.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.scheduleCard, dynamicStyles.card]}
                onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.scheduleCardLeft}>
                  <View style={styles.customerAvatar}>
                    <MaterialIcons name="person" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleMainRow}>
                      <Text style={[styles.serviceName, dynamicStyles.text]}>
                        {item.serviceName}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.customerName, dynamicStyles.textSecondary]}>
                      {item.customerName}
                    </Text>
                    <View style={styles.scheduleDetails}>
                      <View style={styles.scheduleTime}>
                        <MaterialIcons name="schedule" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.timeText, dynamicStyles.textSecondary]}>
                          {item.startTime} - {item.endTime}
                        </Text>
                      </View>
                      <Text style={styles.priceText}>${item.price}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

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
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },

  // Header
  header: {
    paddingTop: (StatusBar.currentHeight || 0) + theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 90,
    height: 32,
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
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: theme.fonts.regular,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs,
    position: 'absolute',
    bottom: -30,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  quickActionCard: {
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
  quickActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  quickActionValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  onTimeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: theme.fonts.medium,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: theme.fonts.medium,
  },

  // Schedule Card
  scheduleCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  scheduleCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  customerName: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  scheduleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },

  // Empty State
  emptyCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
});
