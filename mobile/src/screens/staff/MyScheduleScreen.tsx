import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { appointmentsService, Appointment, AppointmentStatus } from '../../services/appointments';

// Simple calendar strip component since we need to avoid external deps if possible
// or use a simple implementation
const CalendarStrip = ({ selectedDate, onSelectDate }: { selectedDate: Date; onSelectDate: (date: Date) => void }) => {
  const { isDark } = useTheme();
  // 7 days window centered on current or selected
  // Let's just show next 7 days starting from today for simplicity, or a sliding window
  
  // Generating generic week view
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i); // Start from today
    return d;
  });

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.calendarStrip}
      contentContainerStyle={styles.calendarContent}
    >
      {weekDates.map((date) => {
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isToday = date.toDateString() === new Date().toDateString();
        
        return (
          <TouchableOpacity
            key={date.toISOString()}
            style={[
              styles.dateCard,
              isSelected && { backgroundColor: theme.colors.primary },
              // !isSelected && isDark && { backgroundColor: theme.colors.gray800 },
            ]}
            onPress={() => onSelectDate(date)}
          >
            <Text style={[
              styles.dayName, 
              isSelected ? { color: 'white' } : { color: isDark ? theme.colors.gray400 : theme.colors.gray500 }
            ]}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={[
              styles.dayNumber,
              isSelected ? { color: 'white' } : { color: isDark ? 'white' : theme.colors.text }
            ]}>
              {date.getDate()}
            </Text>
            {isToday && (
              <View style={[styles.todayDot, isSelected ? { backgroundColor: 'white' } : { backgroundColor: theme.colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export default function MyScheduleScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
  };

  const loadAppointments = useCallback(async () => {
    try {
      // Determine if we should filter for "my" appointments
      // If user is employee, we likely only want their appointments
      // If owner, they might want to see all
      const isEmployee = user?.role === 'salon_employee';
      
      // Fetch appointments
      const allAppointments = await appointmentsService.getSalonAppointments({
        myAppointments: isEmployee
      });
      
      // Filter for selected date
      const filtered = allAppointments.filter(apt => {
        const aptDate = new Date(apt.scheduledStart);
        return aptDate.toDateString() === selectedDate.toDateString();
      });

      // Sort by time
      filtered.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

      setAppointments(filtered);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, user?.role]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getStatusColor = (status: AppointmentStatus) => {
    return appointmentsService.getStatusColor(status);
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const startTime = new Date(appointment.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(appointment.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <TouchableOpacity 
        key={appointment.id}
        style={[styles.appointmentCard, dynamicStyles.card]}
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
      >
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, dynamicStyles.text]}>{startTime}</Text>
          <Text style={[styles.durationText, dynamicStyles.textSecondary]}>{endTime}</Text>
        </View>
        
        <View style={[styles.appointmentContent, { borderLeftColor: getStatusColor(appointment.status) }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.customerName, dynamicStyles.text]}>
              {appointment.customer?.user?.fullName || 'Unknown Customer'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                {appointment.status}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.serviceName, dynamicStyles.textSecondary]}>
            {appointment.service?.name || 'Service'}
          </Text>
          
          {appointment.notes && (
            <View style={styles.notesContainer}>
              <MaterialIcons name="notes" size={14} color={dynamicStyles.textSecondary.color} />
              <Text style={[styles.notesText, dynamicStyles.textSecondary]} numberOfLines={1}>
                {appointment.notes}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>My Schedule</Text>
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar Strip */}
      <View style={styles.calendarContainer}>
        <CalendarStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </View>
      
      <View style={styles.divider} />

      {/* Schedule List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : appointments.length > 0 ? (
          appointments.map(renderAppointmentCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}>
              <MaterialIcons name="event-busy" size={40} color={theme.colors.gray400} />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Appointments</Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              You don't have any appointments scheduled for {selectedDate.toDateString() === new Date().toDateString() ? 'today' : 'this day'}.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  actionButton: {
    padding: 8,
  },
  
  // Calendar Strip
  calendarContainer: {
    height: 90,
    paddingVertical: 10,
  },
  calendarStrip: {
    paddingHorizontal: 12,
  },
  calendarContent: {
    paddingRight: 24,
  },
  dateCard: {
    width: 60,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent', // can use for selection
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: theme.fonts.medium,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    fontWeight: 'bold',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0', // Light gray
    opacity: 0.5,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 0,
    minHeight: 100,
  },
  timeColumn: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE', // Ultra light
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  appointmentContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    borderLeftWidth: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceName: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: theme.fonts.medium,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
});
