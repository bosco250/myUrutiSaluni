import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../context';
import { appointmentsService, Appointment, AppointmentStatus } from '../../services/appointments';

interface CalendarDay {
  day: string;
  date: number;
  fullDate: Date;
}

interface TimelineItem {
  id: string;
  time: string;
  title: string | null;
  subtitle?: string;
  duration?: string;
  type?: string;
  status?: string;
  dotColor: string;
  appointment?: Appointment;
}

// Helper to get day abbreviation
const getDayAbbrev = (date: Date): string => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[date.getDay()];
};

// Helper to get month name
const getMonthName = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
};

// Helper to format time to 12-hour format
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Helper to calculate duration string
const calculateDuration = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h 00m`;
  } else {
    return `${mins}m`;
  }
};

// Map appointment status to timeline dot color
const getStatusColor = (status: AppointmentStatus): string => {
  switch (status) {
    case AppointmentStatus.COMPLETED:
      return '#34C759'; // Green
    case AppointmentStatus.IN_PROGRESS:
      return '#5856D6'; // Purple
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.BOOKED:
      return '#2196F3'; // Blue
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return '#FF3B30'; // Red
    case AppointmentStatus.PENDING:
    default:
      return '#C7C7CC'; // Gray
  }
};

// Map status to display text
const getStatusText = (status: AppointmentStatus): string => {
  switch (status) {
    case AppointmentStatus.COMPLETED:
      return 'Completed';
    case AppointmentStatus.IN_PROGRESS:
      return 'In Progress';
    case AppointmentStatus.CONFIRMED:
      return 'Confirmed';
    case AppointmentStatus.BOOKED:
      return 'Booked';
    case AppointmentStatus.CANCELLED:
      return 'Cancelled';
    case AppointmentStatus.NO_SHOW:
      return 'No Show';
    case AppointmentStatus.PENDING:
    default:
      return 'Scheduled';
  }
};

// Generate calendar days centered around today
const generateCalendarDays = (): CalendarDay[] => {
  const today = new Date();
  const days: CalendarDay[] = [];
  
  // Show 3 days before and 3 days after today (7 days total)
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      day: getDayAbbrev(date),
      date: date.getDate(),
      fullDate: date,
    });
  }
  
  return days;
};

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const WorkLogScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize calendar days
  useEffect(() => {
    setCalendarDays(generateCalendarDays());
  }, []);

  // Note: Employee ID is fetched by the appointments service using myAppointments: true
  // No need to store it separately

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await appointmentsService.getSalonAppointments({ myAppointments: true });
      setAppointments(data);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch appointments on mount and when employee changes
  useEffect(() => {
    if (user?.id) {
      fetchAppointments();
    }
  }, [user?.id, fetchAppointments]);

  // Filter and transform appointments for selected date
  useEffect(() => {
    if (!appointments.length) {
      setTimelineItems([]);
      return;
    }

    const filtered = appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledStart);
      return isSameDay(aptDate, selectedDate);
    });

    // Sort by start time
    filtered.sort((a, b) => 
      new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );

    // Transform to timeline items
    const items: TimelineItem[] = filtered.map((apt) => ({
      id: apt.id,
      time: formatTime(apt.scheduledStart),
      title: apt.service?.name || 'Service',
      subtitle: apt.customer?.user?.fullName || 'Customer',
      duration: calculateDuration(apt.scheduledStart, apt.scheduledEnd),
      type: 'Service',
      status: getStatusText(apt.status),
      dotColor: getStatusColor(apt.status),
      appointment: apt,
    }));

    setTimelineItems(items);
  }, [appointments, selectedDate]);

  // Calculate stats
  const getStats = () => {
    const serviceCount = timelineItems.filter(item => item.type === 'Service').length;
    
    let totalMinutes = 0;
    timelineItems.forEach((item) => {
      if (item.appointment) {
        const start = new Date(item.appointment.scheduledStart);
        const end = new Date(item.appointment.scheduledEnd);
        totalMinutes += (end.getTime() - start.getTime()) / 60000;
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    const hoursText = mins > 0 ? `${hours}.${Math.round(mins / 6)}` : `${hours}`;
    
    return {
      serviceCount,
      hoursText,
    };
  };

  const stats = getStats();

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
  };

  // Get current month/year for header
  const getMonthYearLabel = (): string => {
    return `${getMonthName(selectedDate)} ${selectedDate.getFullYear()}`;
  };

  const renderCalendarDay = (item: CalendarDay) => {
    const isActive = isSameDay(item.fullDate, selectedDate);
    
    return (
      <TouchableOpacity 
        key={item.fullDate.toISOString()} 
        style={[styles.calendarDay, isActive && styles.activeCalendarDay]}
        onPress={() => setSelectedDate(item.fullDate)}
      >
        <Text style={[styles.dayName, isActive && styles.activeDayText]}>{item.day}</Text>
        <Text style={[styles.dayDate, isActive && styles.activeDayText]}>{item.date}</Text>
      </TouchableOpacity>
    );
  };

  const renderTimelineItem = (item: TimelineItem, index: number) => {
    const isLast = index === timelineItems.length - 1;
    
    return (
      <View key={item.id} style={styles.timelineItem}>
        {/* Timeline Line & Dot */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: item.dotColor }]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Content */}
        <View style={styles.timelineContent}>
          <Text style={styles.timeText}>{item.time}</Text>
          
          {item.title && (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => {
                if (item.appointment) {
                  navigation?.navigate('AppointmentDetail', {
                    appointmentId: item.appointment.id,
                    appointment: item.appointment,
                  });
                }
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
              
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{item.type}</Text>
                </View>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={theme.colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Appointments</Text>
      <Text style={styles.emptySubtitle}>You don't have any appointments scheduled for this day.</Text>
    </View>
  );

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
          <Text style={styles.headerTitle}>Work Log</Text>
          <TouchableOpacity style={styles.datePickerButton}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
            <Text style={styles.datePickerText}>{getMonthYearLabel()}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarStrip}>
            {calendarDays.map(renderCalendarDay)}
          </View>
        </View>

        {/* Timeline Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionStats}>
            {stats.serviceCount} Service{stats.serviceCount !== 1 ? 's' : ''} • {stats.hoursText} Hour{stats.hoursText !== '1' ? 's' : ''}
          </Text>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline List */}
        {!loading && !error && (
          <View style={styles.timelineList}>
            {timelineItems.length > 0 
              ? timelineItems.map(renderTimelineItem)
              : renderEmptyState()
            }
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerText: {
    marginLeft: 6,
    fontSize: 14,
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
    color: '#8E8E93',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    minHeight: 120,
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
    backgroundColor: '#E5E5EA',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    backgroundColor: '#F7F6F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#A67C52',
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
});

export default WorkLogScreen;
