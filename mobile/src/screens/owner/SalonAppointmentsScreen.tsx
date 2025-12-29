import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import {
  appointmentsService,
  Appointment,
  AppointmentStatus,
} from '../../services/appointments';
import { Loader } from '../../components/common';

interface SalonAppointmentsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type FilterType = 'all' | 'today' | 'upcoming' | 'past' | 'pending' | 'completed' | 'cancelled';

interface DateSection {
  title: string;
  data: Appointment[];
}

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'upcoming', label: 'Upcoming', icon: 'event' },
  { key: 'pending', label: 'Pending', icon: 'pending' },
  { key: 'completed', label: 'Done', icon: 'check-circle' },
  { key: 'cancelled', label: 'Cancelled', icon: 'cancel' },
];

// Helper to get date section label
const getDateSectionLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const aptDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (aptDate.getTime() === today.getTime()) return '📅 Today';
  if (aptDate.getTime() === yesterday.getTime()) return '📆 Yesterday';
  if (aptDate.getTime() === tomorrow.getTime()) return '🗓️ Tomorrow';
  if (aptDate > today && aptDate <= weekFromNow) return '📌 This Week';
  if (aptDate < today && aptDate >= weekAgo) return '🕐 Last Week';
  if (aptDate > weekFromNow) return '🔮 Upcoming';
  return '📁 Earlier';
};

// Sort order for sections
const getSectionOrder = (title: string): number => {
  const order: Record<string, number> = {
    '📅 Today': 0,
    '🗓️ Tomorrow': 1,
    '📌 This Week': 2,
    '🔮 Upcoming': 3,
    '📆 Yesterday': 4,
    '🕐 Last Week': 5,
    '📁 Earlier': 6,
  };
  return order[title] ?? 100;
};

export default function SalonAppointmentsScreen({ navigation }: SalonAppointmentsScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
      borderColor: isDark ? '#3A3A3C' : theme.colors.borderLight,
    },
    sectionHeader: {
      backgroundColor: isDark ? '#1C1C1E' : theme.colors.background,
    },
  };

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await appointmentsService.getSalonAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('[SalonAppointments] Error loading:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and group appointments into sections
  const sections = useMemo((): DateSection[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Apply filter
    let filtered: Appointment[];
    switch (activeFilter) {
      case 'today':
        filtered = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate >= todayStart && aptDate < todayEnd;
        });
        break;
      case 'upcoming':
        filtered = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate >= todayStart && 
                 apt.status !== AppointmentStatus.CANCELLED && 
                 apt.status !== AppointmentStatus.COMPLETED;
        });
        break;
      case 'past':
        filtered = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledStart);
          return aptDate < todayStart;
        });
        break;
      case 'pending':
        filtered = appointments.filter(apt => 
          apt.status === AppointmentStatus.PENDING || 
          apt.status === AppointmentStatus.BOOKED
        );
        break;
      case 'completed':
        filtered = appointments.filter(apt => apt.status === AppointmentStatus.COMPLETED);
        break;
      case 'cancelled':
        filtered = appointments.filter(apt => apt.status === AppointmentStatus.CANCELLED);
        break;
      default:
        filtered = appointments;
    }

    // Sort by date (upcoming first, then recent)
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduledStart);
      const dateB = new Date(b.scheduledStart);
      
      // Future appointments first (ascending), past appointments last (descending)
      const isAFuture = dateA >= todayStart;
      const isBFuture = dateB >= todayStart;
      
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;
      
      // Within same category, sort by time
      if (isAFuture) {
        return dateA.getTime() - dateB.getTime(); // Earlier future first
      } else {
        return dateB.getTime() - dateA.getTime(); // More recent past first
      }
    });

    // Group into sections
    const sectionMap = new Map<string, Appointment[]>();
    filtered.forEach(apt => {
      const label = getDateSectionLabel(new Date(apt.scheduledStart));
      if (!sectionMap.has(label)) {
        sectionMap.set(label, []);
      }
      sectionMap.get(label)!.push(apt);
    });

    // Convert to array and sort sections
    const result: DateSection[] = Array.from(sectionMap.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => getSectionOrder(a.title) - getSectionOrder(b.title));

    return result;
  }, [appointments, activeFilter]);

  // Count filtered appointments
  const filteredCount = useMemo(() => 
    sections.reduce((sum, section) => sum + section.data.length, 0),
    [sections]
  );

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    navigation.navigate('AppointmentDetail', { appointmentId: appointment.id });
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      await appointmentsService.updateAppointment(appointmentId, { status: newStatus });
      const statusLabel = newStatus.replace('_', ' ');
      Alert.alert('Success ✅', `Appointment marked as ${statusLabel}`);
      loadAppointments();
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to update appointment';
      Alert.alert('Error', errorMsg);
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    return appointmentsService.getStatusColor(status);
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      booked: 'Booked',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    };
    return labels[status] || status;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSectionHeader = ({ section }: { section: DateSection }) => (
    <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>{section.title}</Text>
      <Text style={[styles.sectionCount, dynamicStyles.textSecondary]}>
        {section.data.length} appointment{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const isPending = item.status === AppointmentStatus.PENDING || item.status === AppointmentStatus.BOOKED;
    const isConfirmed = item.status === AppointmentStatus.CONFIRMED;
    const isInProgress = item.status === AppointmentStatus.IN_PROGRESS;
    const canTakeAction = isPending || isConfirmed || isInProgress;
    
    return (
      <TouchableOpacity
        style={[styles.appointmentCard, dynamicStyles.card]}
        onPress={() => handleAppointmentPress(item)}
        activeOpacity={0.7}
      >
        {/* Status indicator */}
        <View style={[styles.statusBar, { backgroundColor: getStatusColor(item.status) }]} />
        
        <View style={styles.cardContent}>
          {/* Header with customer and status */}
          <View style={styles.cardHeader}>
            <View style={styles.customerInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                <MaterialIcons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.customerDetails}>
                <Text style={[styles.customerName, dynamicStyles.text]}>
                  {item.customer?.user?.fullName || 'Walk-in Customer'}
                </Text>
                <Text style={[styles.serviceName, dynamicStyles.textSecondary]}>
                  {item.service?.name || 'General Service'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          {/* Date, Time, and Staff */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="event" size={14} color={dynamicStyles.textSecondary.color} />
              <Text style={[styles.infoText, dynamicStyles.textSecondary]}>
                {formatDateShort(item.scheduledStart)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialIcons name="schedule" size={14} color={dynamicStyles.textSecondary.color} />
              <Text style={[styles.infoText, dynamicStyles.textSecondary]}>
                {formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)}
              </Text>
            </View>
          </View>
          
          {item.salonEmployee?.user?.fullName && (
            <View style={styles.staffRow}>
              <MaterialIcons name="person-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.staffName, { color: theme.colors.primary }]}>
                {item.salonEmployee.user.fullName}
              </Text>
            </View>
          )}

          {/* Price */}
          {item.serviceAmount !== undefined && item.serviceAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, dynamicStyles.text]}>
                {item.serviceAmount.toLocaleString()} RWF
              </Text>
            </View>
          )}

          {/* Action buttons */}
          {canTakeAction && (
            <View style={styles.actionButtons}>
              {isPending && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() => handleUpdateStatus(item.id, AppointmentStatus.CONFIRMED)}
                >
                  <MaterialIcons name="check" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Confirm</Text>
                </TouchableOpacity>
              )}
              
              {isConfirmed && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.startBtn]}
                  onPress={() => handleUpdateStatus(item.id, AppointmentStatus.IN_PROGRESS)}
                >
                  <MaterialIcons name="play-arrow" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Start</Text>
                </TouchableOpacity>
              )}
              
              {isInProgress && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn]}
                  onPress={() => handleUpdateStatus(item.id, AppointmentStatus.COMPLETED)}
                >
                  <MaterialIcons name="done-all" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Complete</Text>
                </TouchableOpacity>
              )}
              
              {(isPending || isConfirmed) && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.noShowBtn]}
                    onPress={() => {
                      Alert.alert(
                        'Mark as No Show',
                        'Did the customer not show up for this appointment?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Yes, No Show', onPress: () => handleUpdateStatus(item.id, AppointmentStatus.NO_SHOW) },
                        ]
                      );
                    }}
                  >
                    <MaterialIcons name="person-off" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>No Show</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => {
                      Alert.alert(
                        'Cancel Appointment',
                        'Are you sure you want to cancel this appointment?',
                        [
                          { text: 'No', style: 'cancel' },
                          { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleUpdateStatus(item.id, AppointmentStatus.CANCELLED) },
                        ]
                      );
                    }}
                  >
                    <MaterialIcons name="close" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-busy" size={64} color={dynamicStyles.textSecondary.color} />
      <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Appointments</Text>
      <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
        {activeFilter === 'all' 
          ? 'No appointments booked yet'
          : `No ${activeFilter} appointments found`}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading appointments..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>{filteredCount} total</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
        >
          <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={[styles.filterContainer, dynamicStyles.sectionHeader]}>
        <SectionList
          sections={[{ title: '', data: FILTERS }]}
          horizontal
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(item.key)}
            >
              <MaterialIcons
                name={item.icon as any}
                size={14}
                color={activeFilter === item.key ? '#FFFFFF' : theme.colors.primary}
              />
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          renderSectionHeader={() => null}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          stickySectionHeadersEnabled={false}
        />
      </View>

      {/* Appointments List with Sections */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentCard}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  filterList: {
    paddingHorizontal: theme.spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '15',
    marginRight: theme.spacing.sm,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  appointmentCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  serviceName: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: theme.fonts.regular,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: theme.fonts.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  staffName: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  priceRow: {
    marginTop: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 3,
  },
  confirmBtn: {
    backgroundColor: '#4CAF50',
  },
  startBtn: {
    backgroundColor: '#9C27B0',
  },
  completeBtn: {
    backgroundColor: '#2196F3',
  },
  noShowBtn: {
    backgroundColor: '#FF9800',
  },
  cancelBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  },
});
