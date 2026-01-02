import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { Loader } from '../../components/common';
import {
  appointmentsService,
  Appointment,
  AppointmentStatus,
} from '../../services/appointments';
import { EmployeePermissionGate } from '../../components/permissions/EmployeePermissionGate';
import { EmployeePermission } from '../../constants/employeePermissions';

interface GroupedAppointments {
  date: string;
  dateLabel: string;
  appointments: Appointment[];
}

export default function MyScheduleScreen({ navigation }: any) {
  const { isDark } = useTheme();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<
    GroupedAppointments[]
  >([]);
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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return 'Tomorrow';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const groupAppointmentsByDate = useCallback((
    appointmentsList: Appointment[]
  ): GroupedAppointments[] => {
    const grouped: Record<string, Appointment[]> = {};

    appointmentsList.forEach((apt) => {
      const aptDate = new Date(apt.scheduledStart);
      const dateKey = formatDate(aptDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });

    // Get today's date string for comparison
    const todayStr = formatDate(new Date());

    // Convert to array and sort by date, with today first
    const groupedArray: GroupedAppointments[] = Object.keys(grouped)
      .sort((a, b) => {
        // If one is today, it comes first
        if (a === todayStr) return -1;
        if (b === todayStr) return 1;
        
        // Otherwise sort chronologically
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .map((dateKey) => ({
        date: dateKey,
        dateLabel: getDateLabel(dateKey),
        appointments: grouped[dateKey].sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime()
        ),
      }));

    return groupedArray;
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all appointments assigned to the employee
      const allAppointments = await appointmentsService.getSalonAppointments({
        myAppointments: true,
      });

      // Filter out cancelled and no_show appointments
      const activeAppointments = allAppointments.filter(
        (apt) =>
          apt.status !== AppointmentStatus.CANCELLED &&
          apt.status !== AppointmentStatus.NO_SHOW
      );

      // Sort all appointments by scheduled start time
      activeAppointments.sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
      );

      setAppointments(activeAppointments);
      setGroupedAppointments(groupAppointmentsByDate(activeAppointments));
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load appointments. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupAppointmentsByDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return isDark ? theme.colors.success : '#4CAF50';
      case AppointmentStatus.BOOKED:
        return isDark ? theme.colors.info : '#2196F3';
      case AppointmentStatus.PENDING:
        return isDark ? theme.colors.warning : '#FF9800';
      case AppointmentStatus.IN_PROGRESS:
        return isDark ? theme.colors.secondary : '#9C27B0';
      case AppointmentStatus.COMPLETED:
        return isDark ? theme.colors.gray500 : '#607D8B';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: AppointmentStatus): string => {
    const color = getStatusColor(status);
    return isDark ? `${color}20` : `${color}15`;
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const startTime = new Date(appointment.scheduledStart).toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit', hour12: true }
    );
    const endTime = new Date(appointment.scheduledEnd).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const isPast = new Date(appointment.scheduledStart) < new Date();
    const isUpcoming = !isPast && appointment.status !== AppointmentStatus.COMPLETED;

    return (
      <TouchableOpacity
        key={appointment.id}
        style={[
          styles.appointmentCard,
          dynamicStyles.card,
          isPast && styles.pastAppointment,
        ]}
        onPress={() =>
          navigation.navigate('AppointmentDetail', {
            appointmentId: appointment.id,
          })
        }
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.timeColumn,
            {
              backgroundColor: isDark
                ? `${getStatusColor(appointment.status)}15`
                : `${getStatusColor(appointment.status)}10`,
            },
          ]}
        >
          <MaterialIcons
            name="schedule"
            size={18}
            color={getStatusColor(appointment.status)}
            style={{ marginBottom: 4 }}
          />
          <Text
            style={[
              styles.timeText,
              { color: getStatusColor(appointment.status) },
            ]}
          >
            {startTime}
          </Text>
          <Text style={[styles.durationText, dynamicStyles.textSecondary]}>
            {endTime}
          </Text>
        </View>

        <View style={styles.appointmentContent}>
          <View style={styles.headerRow}>
            <View style={styles.customerInfo}>
              <MaterialIcons
                name="person"
                size={16}
                color={dynamicStyles.textSecondary.color}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.customerName, dynamicStyles.text]}
                numberOfLines={1}
              >
                {appointment.customer?.user?.fullName || 'Unknown Customer'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(appointment.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(appointment.status) },
                ]}
              >
                {appointment.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.serviceRow}>
            <MaterialIcons
              name="content-cut"
              size={16}
              color={dynamicStyles.textSecondary.color}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.serviceName, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              {appointment.service?.name || 'Service'}
            </Text>
          </View>

          {appointment.salon && (
            <View style={styles.salonRow}>
              <MaterialIcons
                name="store"
                size={14}
                color={dynamicStyles.textSecondary.color}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.salonName, dynamicStyles.textSecondary]}
                numberOfLines={1}
              >
                {appointment.salon.name}
              </Text>
            </View>
          )}

          {appointment.notes && (
            <View style={styles.notesContainer}>
              <MaterialIcons
                name="notes"
                size={14}
                color={dynamicStyles.textSecondary.color}
              />
              <Text
                style={[styles.notesText, dynamicStyles.textSecondary]}
                numberOfLines={2}
              >
                {appointment.notes}
              </Text>
            </View>
          )}

          {isUpcoming && (
            <View style={styles.upcomingBadge}>
              <MaterialIcons
                name="arrow-upward"
                size={12}
                color={theme.colors.primary}
              />
              <Text style={[styles.upcomingText, { color: theme.colors.primary }]}>
                Upcoming
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDateSection = (group: GroupedAppointments) => {
    const isToday = group.dateLabel === 'Today';
    const dateObj = new Date(group.date);
    const dayNumber = dateObj.getDate();
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

    return (
      <View key={group.date} style={styles.dateSection}>
        <View style={styles.dateHeader}>
          <View style={styles.dateHeaderLeft}>
            {isToday && (
              <View
                style={[
                  styles.todayIndicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            )}
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, dynamicStyles.text]}>
                {group.dateLabel}
              </Text>
              <Text style={[styles.dateSubLabel, dynamicStyles.textSecondary]}>
                {monthName} {dayNumber}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.appointmentCountBadge,
              {
                backgroundColor: isDark
                  ? `${theme.colors.primary}20`
                  : `${theme.colors.primary}15`,
              },
            ]}
          >
            <Text
              style={[styles.appointmentCount, { color: theme.colors.primary }]}
            >
              {group.appointments.length}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentsList}>
          {group.appointments.map(renderAppointmentCard)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>
            My Schedule
          </Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            {loading ? 'Loading...' : `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={loading}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={loading ? dynamicStyles.textSecondary.color : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Schedule List */}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <Loader message="Loading appointments..." />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedAppointments.length > 0 ? (
          groupedAppointments.map(renderDateSection)
        ) : (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                {
                  backgroundColor: isDark
                    ? theme.colors.gray800
                    : theme.colors.gray100,
                },
              ]}
            >
              <MaterialIcons
                name="event-busy"
                size={48}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>
              No Appointments
            </Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              You don't have any appointments scheduled yet. Check back later or
              contact your manager.
            </Text>
          </View>
        )}
        </ScrollView>
      )}

      {/* Floating Action Button - Permission Based */}
      <EmployeePermissionGate
        requiredPermission={EmployeePermission.MANAGE_APPOINTMENTS}
        salonId={undefined}
        employeeId={undefined}
        fallback={null}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CreateAppointment')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color={theme.colors.white} />
        </TouchableOpacity>
      </EmployeePermissionGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: (StatusBar.currentHeight || 0) + theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },

  // Date Section
  dateSection: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  dateSubLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  appointmentCountBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentCount: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  appointmentsList: {
    gap: theme.spacing.sm,
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pastAppointment: {
    opacity: 0.7,
  },
  timeColumn: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRightWidth: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  durationText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  appointmentContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  customerName: {
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
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  salonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  salonName: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.xs,
    gap: 6,
  },
  notesText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 16,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${theme.colors.primary}15`,
    gap: 4,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
