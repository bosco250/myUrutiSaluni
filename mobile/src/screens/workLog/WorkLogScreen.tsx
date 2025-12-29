import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context';
import {
  workLogService,
  WorkLogDay,
  WorkLogSummary,
} from '../../services/workLog';
import { staffService } from '../../services/staff';

const { width } = Dimensions.get('window');

interface CalendarDay {
  day: string;
  date: number;
  fullDate: Date;
  dateString: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

// Helper functions
const getDayAbbrev = (date: Date): string => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[date.getDay()];
};

const getMonthName = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const generateCalendarDays = (): CalendarDay[] => {
  const today = new Date();
  const days: CalendarDay[] = [];

  // Show 3 days before and 3 days after today (7 days total)
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    days.push({
      day: getDayAbbrev(date),
      date: date.getDate(),
      fullDate: date,
      dateString: `${year}-${month}-${day}`,
    });
  }

  return days;
};

export const WorkLogScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [workLogDay, setWorkLogDay] = useState<WorkLogDay | null>(null);
  const [workLogSummary, setWorkLogSummary] = useState<WorkLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  // Track if we're currently loading to prevent infinite loops
  const loadingRef = useRef(false);

  // Initialize calendar days
  useEffect(() => {
    setCalendarDays(generateCalendarDays());
  }, []);

  // Get employee ID
  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          const employee = await staffService.getEmployeeByUserId(String(user.id));
          if (employee) {
            const employeeData = Array.isArray(employee) ? employee[0] : employee;
            setEmployeeId(employeeData.id);
          } else {
            // No employee record found
            setEmployeeId(null);
          }
        } catch (err) {
          console.error('Error fetching employee ID:', err);
          setEmployeeId(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchEmployeeId();
  }, [user?.id]);

  // Fetch work log data
  const fetchWorkLogData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
      return;
    }

    // Prevent concurrent loads
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setError(null);
      setLoading(true);
      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

      // Fetch work log for selected date
      const dayLog = await workLogService.getWorkLogForDate(employeeId, dateString);
      setWorkLogDay(dayLog);

      // Fetch summary for current view mode
      const summary = await workLogService.getWorkLogSummary(
        employeeId,
        viewMode === 'day' ? 'week' : viewMode
      );
      setWorkLogSummary(summary);
    } catch (err: any) {
      console.error('Error fetching work log:', err);
      setError('Failed to load work log');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [employeeId, selectedDate, viewMode]);

  useEffect(() => {
    if (employeeId && !loadingRef.current) {
      fetchWorkLogData();
    }
  }, [employeeId, selectedDate, viewMode, fetchWorkLogData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkLogData();
  };

  // Calculate statistics for selected day
  const getStats = (): StatCard[] => {
    if (!workLogDay) {
      return [
        { label: 'Hours', value: '0', icon: 'access-time', color: theme.colors.primary },
        { label: 'Services', value: '0', icon: 'work', color: theme.colors.secondary },
        { label: 'Earnings', value: '0', icon: 'attach-money', color: theme.colors.success },
      ];
    }

    return [
      {
        label: 'Hours',
        value: workLogDay.totalHours.toFixed(1),
        icon: 'access-time',
        color: theme.colors.primary,
      },
      {
        label: 'Services',
        value: workLogDay.completedAppointments.length.toString(),
        icon: 'work',
        color: theme.colors.secondary,
      },
      {
        label: 'Earnings',
        value: `RWF ${workLogDay.earnings.toLocaleString()}`,
        icon: 'attach-money',
        color: theme.colors.success,
      },
    ];
  };

  const stats = getStats();

  const renderCalendarDay = (item: CalendarDay) => {
    const isActive = isSameDay(item.fullDate, selectedDate);
    
    return (
      <TouchableOpacity
        key={item.dateString}
        style={[styles.calendarDay, isActive && styles.activeCalendarDay]}
        onPress={() => setSelectedDate(item.fullDate)}
      >
        <Text style={[styles.dayName, isActive && styles.activeDayText]}>
          {item.day}
        </Text>
        <Text style={[styles.dayDate, isActive && styles.activeDayText]}>
          {item.date}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStatCard = (stat: StatCard) => (
    <View key={stat.label} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
        <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );

  const renderTimelineEntry = (entry: any, index: number) => {
    const isLast = index === workLogDay!.entries.length - 1;
    const isAppointment = entry.type === 'appointment';
    const isAttendance = entry.type === 'attendance';
    
    let dotColor = theme.colors.primary;
    if (isAppointment) {
      if (entry.status === 'completed') {
        dotColor = theme.colors.success;
      } else if (entry.status === 'in_progress') {
        dotColor = theme.colors.secondary;
      } else {
        dotColor = theme.colors.warning;
      }
    } else if (isAttendance) {
      dotColor = theme.colors.info;
    }

    return (
      <View key={entry.id} style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <View style={styles.timelineContent}>
          <Text style={styles.timeText}>{formatTime(entry.timestamp)}</Text>
          
          <TouchableOpacity
            style={styles.entryCard}
            onPress={() => {
              if (entry.appointment) {
                navigation?.navigate('AppointmentDetail', {
                  appointmentId: entry.appointment.id,
                  appointment: entry.appointment,
                });
              }
            }}
            disabled={!entry.appointment}
          >
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              {entry.duration && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {formatDuration(entry.duration)}
                  </Text>
                </View>
              )}
            </View>
            
            {entry.description && (
              <Text style={styles.entryDescription}>{entry.description}</Text>
            )}
            
            {entry.earnings && entry.earnings > 0 && (
              <View style={styles.earningsContainer}>
                <MaterialIcons name="attach-money" size={16} color={theme.colors.success} />
                <Text style={styles.earningsText}>
                  RWF {entry.earnings.toLocaleString()}
                </Text>
              </View>
            )}

            {entry.status && (
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        entry.status === 'completed'
                          ? theme.colors.success
                          : entry.status === 'in_progress'
                          ? theme.colors.secondary
                          : theme.colors.warning,
                    },
                  ]}
                />
                <Text style={styles.statusText}>{entry.status}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="work-outline" size={64} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Work Log</Text>
      <Text style={styles.emptySubtitle}>
        {workLogDay?.status === 'not_worked'
          ? "You didn't work on this day."
          : 'No activities recorded for this day.'}
      </Text>
    </View>
  );

  const getMonthYearLabel = (): string => {
    return `${getMonthName(selectedDate)} ${selectedDate.getFullYear()}`;
  };

  // Show empty state if employee is not assigned to any salon
  if (!loading && !employeeId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <MaterialIcons 
              name="business-center" 
              size={64} 
              color={theme.colors.textSecondary} 
            />
          </View>
          <Text style={styles.emptyStateTitle}>
            No Salon Assignment
          </Text>
          <Text style={styles.emptyStateMessage}>
            You are not currently assigned to any salon.{'\n'}
            Please contact your salon owner or administrator to get assigned.
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.emptyStateButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Work Log</Text>
            <Text style={styles.headerSubtitle}>{getMonthYearLabel()}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => {
              const modes: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];
              const currentIndex = modes.indexOf(viewMode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setViewMode(modes[nextIndex]);
            }}
          >
            <Text style={styles.viewModeText}>{viewMode.toUpperCase()}</Text>
            <MaterialIcons name="swap-vert" size={16} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarStrip}>
            {calendarDays.map(renderCalendarDay)}
          </View>
        </View>

        {/* Statistics Cards */}
        {workLogDay && (
          <View style={styles.statsContainer}>
            {stats.map(renderStatCard)}
          </View>
        )}

        {/* Clock In/Out Status */}
        {workLogDay && workLogDay.clockIn && (
          <View style={styles.clockStatusCard}>
            <View style={styles.clockStatusRow}>
              <View style={styles.clockStatusItem}>
                <MaterialIcons
                  name="login"
                  size={20}
                  color={theme.colors.success}
                />
                <Text style={styles.clockStatusLabel}>Clock In</Text>
                <Text style={styles.clockStatusTime}>
                  {formatTime(workLogDay.clockIn)}
                </Text>
              </View>
              {workLogDay.clockOut ? (
                <View style={styles.clockStatusItem}>
                  <MaterialIcons
                    name="logout"
                    size={20}
                    color={theme.colors.error}
                  />
                  <Text style={styles.clockStatusLabel}>Clock Out</Text>
                  <Text style={styles.clockStatusTime}>
                    {formatTime(workLogDay.clockOut)}
                  </Text>
                </View>
              ) : (
                <View style={styles.clockStatusItem}>
                  <View style={styles.workingIndicator} />
                  <Text style={styles.clockStatusLabel}>Status</Text>
                  <Text style={[styles.clockStatusTime, { color: theme.colors.warning }]}>
                    Working...
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timeline Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {workLogDay && (
            <Text style={styles.sectionStats}>
              {workLogDay.entries.length} {workLogDay.entries.length === 1 ? 'Entry' : 'Entries'}
            </Text>
          )}
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading work log...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchWorkLogData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline List */}
        {!loading && !error && workLogDay && (
          <View style={styles.timelineList}>
            {workLogDay.entries.length > 0 ? (
              workLogDay.entries.map(renderTimelineEntry)
            ) : (
              renderEmptyState()
            )}
          </View>
        )}

        {/* Summary Section (for week/month view) */}
        {!loading && !error && workLogSummary && viewMode !== 'day' && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              {viewMode === 'week' ? 'Weekly' : 'Monthly'} Summary
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{workLogSummary.daysWorked}</Text>
                <Text style={styles.summaryLabel}>Days Worked</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {workLogSummary.totalHours.toFixed(1)}
                </Text>
                <Text style={styles.summaryLabel}>Total Hours</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {workLogSummary.totalAppointments}
                </Text>
                <Text style={styles.summaryLabel}>Appointments</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  RWF {workLogSummary.totalEarnings.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Total Earnings</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarDay: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 50,
  },
  activeCalendarDay: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  activeDayText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  clockStatusCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clockStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  clockStatusItem: {
    alignItems: 'center',
    gap: 8,
  },
  clockStatusLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  clockStatusTime: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  workingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.warning,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionStats: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  timelineList: {
    paddingHorizontal: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 100,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.borderLight,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  entryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  entryDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontWeight: '400',
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  earningsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.text,
  },
  emptyStateMessage: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: theme.colors.primary,
  },
  emptyStateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginLeft: theme.spacing.sm,
  },
  summarySection: {
    marginTop: 32,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default WorkLogScreen;
