import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService, SalonDetails, SalonEmployee } from '../../services/salon';
import { attendanceService, AttendanceLog, AttendanceType } from '../../services/attendance';
import { Loader } from '../../components/common';

export default function AttendanceScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<SalonDetails | null>(null);
  const [showSalonPicker, setShowSalonPicker] = useState(false);
  
  const [employeeRecord, setEmployeeRecord] = useState<SalonEmployee | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'in' | 'out'>('out');
  
  // Track if we're currently loading to prevent infinite loops
  const loadingRef = useRef(false);

  // Enhanced dynamic styles with system colors
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
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
      shadowColor: isDark ? '#000000' : '#000000',
    },
    header: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      borderBottomColor: isDark ? '#38383A' : '#E5E5EA',
    },
    pickerModal: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    },
    divider: {
      backgroundColor: isDark ? '#38383A' : '#E5E5EA',
    },
    emptyBackground: {
      backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
    },
  };

  const loadData = useCallback(async (salonId?: string) => {
    if (!user?.id) {
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
      setLoading(true);
      
      // 1. Fetch Salons (Workplaces or Owned)
      const salonList = await salonService.getMySalons();
      setSalons(salonList);
      
      if (salonList.length === 0) {
        // No salons found
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
        return;
      }

      // Determine which salon to use
      let currentSalon: SalonDetails | null = null;
      
      if (salonId) {
        // Use provided salon ID
        currentSalon = salonList.find(s => s.id === salonId) || null;
      } else {
        // Use first salon if no specific salon requested
        currentSalon = salonList[0];
      }
      
      // Update selected salon if it changed
      if (currentSalon) {
        setSelectedSalon(prevSalon => {
          // Only update if different to avoid infinite loop
          if (prevSalon?.id !== currentSalon?.id) {
            return currentSalon;
          }
          return prevSalon;
        });
      }

      if (currentSalon) {
        // 2. Fetch Employee Record for this salon
        const empRecord = await salonService.getCurrentEmployee(currentSalon.id);
        setEmployeeRecord(empRecord);

        // 3. Fetch Attendance History if employee record found
        if (empRecord) {
          const logs = await attendanceService.getAttendanceHistory(empRecord.id);
          setAttendanceLogs(logs);
          
          // Determine current status
          const status = attendanceService.getCurrentStatus(logs);
          setCurrentStatus(status === AttendanceType.CLOCK_IN ? 'in' : 'out');
        } else {
          // User might be owner but not employee?
          setAttendanceLogs([]);
          setCurrentStatus('out');
        }
      }
      
    } catch (error) {
      console.error('Error loading attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [user?.id]);

  // Initial load on mount
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Re-load when salon selection changes (but avoid loop)
  useEffect(() => {
    if (user?.id && selectedSalon?.id && !loadingRef.current) {
      // Only reload if not already loading
      loadData(selectedSalon.id);
    }
  }, [selectedSalon?.id, user?.id, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSalonSelect = (salon: SalonDetails) => {
    setShowSalonPicker(false);
    setSelectedSalon(salon);
    // loadData will be called by useEffect dependency on selectedSalon?.id
  };

  const handleClockAction = async () => {
    if (!employeeRecord) {
      Alert.alert('Error', 'Employee record not found. Please contact your manager.');
      return;
    }

    const newType = currentStatus === 'in' ? AttendanceType.CLOCK_OUT : AttendanceType.CLOCK_IN;
    const actionName = currentStatus === 'in' ? 'Clock Out' : 'Clock In';

    try {
      setActionLoading(true);
      
      await attendanceService.recordAttendance({
        salonEmployeeId: employeeRecord.id,
        type: newType,
        source: Platform.OS === 'web' ? 'web' : 'mobile_app'
      });
      
      // Refresh logs
      const logs = await attendanceService.getAttendanceHistory(employeeRecord.id);
      setAttendanceLogs(logs);
      setCurrentStatus(newType === AttendanceType.CLOCK_IN ? 'in' : 'out');
      
      Alert.alert('Success', `Successfully ${actionName}ed!`);
      
    } catch (error: any) {
      console.error(`Error ${actionName}:`, error);
      Alert.alert('Error', `Failed to ${actionName}. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };
  
  const getTodayDuration = () => {
    const todayLogs = attendanceService.getTodayLogs(attendanceLogs);
    // Rough calculation of duration today
    // This logic can be complex with multiple in/outs, sticking to simple visual log list for now is safer
    // But displaying "Clocked in at 9:00 AM" is useful.
    if (todayLogs.length > 0) {
        // Find latest CLOCK_IN
        const latestIn = todayLogs.find(l => l.type === AttendanceType.CLOCK_IN);
        if (latestIn) {
            return `Since ${new Date(latestIn.recordedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    }
    return '';
  };

  const renderSalonPicker = () => (
    <Modal
      visible={showSalonPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSalonPicker(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowSalonPicker(false)}
      >
        <View style={[styles.modalContent, dynamicStyles.pickerModal]}>
           <Text style={[styles.modalTitle, dynamicStyles.text]}>Select Workplace</Text>
           <ScrollView style={{ maxHeight: 300 }}>
             {salons.map(salon => (
               <TouchableOpacity
                 key={salon.id}
                 style={[
                   styles.salonOption,
                   selectedSalon?.id === salon.id && { backgroundColor: theme.colors.primary + '10' }
                 ]}
                 onPress={() => handleSalonSelect(salon)}
               >
                 <View style={styles.salonOptionInfo}>
                   <Text style={[styles.salonOptionName, dynamicStyles.text]}>{salon.name}</Text>
                   <Text style={[styles.salonOptionAddress, dynamicStyles.textSecondary]}>{salon.city || 'Location'}</Text>
                 </View>
                 {selectedSalon?.id === salon.id && (
                   <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                 )}
               </TouchableOpacity>
             ))}
           </ScrollView>
           <TouchableOpacity 
             style={styles.modalCancelButton}
             onPress={() => setShowSalonPicker(false)}
           >
             <Text style={styles.modalCancelText}>Cancel</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { borderBottomColor: dynamicStyles.header.borderBottomColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Attendance</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {loading && !refreshing ? (
        <Loader fullscreen message="Loading attendance..." />
      ) : salons.length === 0 ? (
        // Error State: No Salon Found
        <View style={[styles.errorContainer, dynamicStyles.container]}>
          <View style={[styles.errorContent, dynamicStyles.emptyBackground]}>
            <View style={[styles.errorIconContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <MaterialIcons name="store" size={64} color={theme.colors.error} />
            </View>
            <Text style={[styles.errorTitle, dynamicStyles.text]}>No Workplace Found</Text>
            <Text style={[styles.errorMessage, dynamicStyles.textSecondary]}>
              You don't have any salon assigned to you yet.{'\n\n'}
              Please contact your manager or salon owner to get assigned to a workplace.
            </Text>
            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={20} color={theme.colors.white} />
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
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
          {/* Salon Selector */}
          {salons.length > 0 && (
            <TouchableOpacity 
              style={[styles.salonCard, dynamicStyles.card, { borderColor: dynamicStyles.card.borderColor, shadowColor: dynamicStyles.card.shadowColor }]}
              onPress={() => salons.length > 1 && setShowSalonPicker(true)}
              disabled={salons.length <= 1}
              activeOpacity={0.7}
            >
              <View style={[styles.salonIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                <FontAwesome5 name="store" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.salonInfo}>
                <Text style={[styles.salonLabel, dynamicStyles.textSecondary]}>Current Workplace</Text>
                <Text style={[styles.salonName, dynamicStyles.text]} numberOfLines={1}>
                  {selectedSalon?.name || 'Select Salon'}
                </Text>
                {selectedSalon?.city && (
                  <Text style={[styles.salonAddress, dynamicStyles.textSecondary]} numberOfLines={1}>
                    {selectedSalon.city}
                  </Text>
                )}
              </View>
              {salons.length > 1 && (
                <MaterialIcons name="keyboard-arrow-down" size={24} color={dynamicStyles.textSecondary.color} />
              )}
            </TouchableOpacity>
          )}

          {/* Clock Status & Action */}
          {selectedSalon && !employeeRecord ? (
            // Error State: Not an Employee
            <View style={[styles.errorStateCard, dynamicStyles.card, { borderColor: dynamicStyles.card.borderColor }]}>
              <View style={[styles.errorIconContainer, { backgroundColor: theme.colors.error + '15' }]}>
                <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
              </View>
              <Text style={[styles.errorStateTitle, dynamicStyles.text]}>Not Assigned</Text>
              <Text style={[styles.errorStateMessage, dynamicStyles.textSecondary]}>
                You are not listed as an employee at this salon.{'\n\n'}
                Please contact your manager or salon owner to get assigned.
              </Text>
            </View>
          ) : selectedSalon && employeeRecord ? (
            <View style={styles.actionSection}>
              <View style={[
                styles.statusIndicator, 
                currentStatus === 'in' ? styles.statusIn : styles.statusOut,
                { backgroundColor: currentStatus === 'in' ? '#34C759' + '20' : '#FF3B30' + '20' }
              ]}>
                <View style={[styles.statusDot, { backgroundColor: currentStatus === 'in' ? '#34C759' : '#FF3B30' }]} />
                <Text style={[styles.statusLabel, { color: currentStatus === 'in' ? '#34C759' : '#FF3B30' }]}>
                  Currently
                </Text>
                <Text style={[styles.statusMainText, { color: currentStatus === 'in' ? '#34C759' : '#FF3B30' }]}>
                  {currentStatus === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT'}
                </Text>
                {currentStatus === 'in' && (
                  <Text style={[styles.statusSubText, dynamicStyles.textSecondary]}>
                    {getTodayDuration()}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.clockButton, 
                  currentStatus === 'in' ? styles.clockOutBtn : styles.clockInBtn,
                  { backgroundColor: currentStatus === 'in' ? '#FF3B30' : '#34C759' },
                  actionLoading && styles.disabledBtn
                ]}
                onPress={handleClockAction}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <MaterialIcons name="hourglass-empty" size={24} color="white" />
                ) : (
                  <>
                    <FontAwesome5 
                      name={currentStatus === 'in' ? "sign-out-alt" : "sign-in-alt"} 
                      size={22} 
                      color="white" 
                    />
                    <Text style={styles.clockBtnText}>
                      {currentStatus === 'in' ? 'CLOCK OUT' : 'CLOCK IN'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* History */}
          {selectedSalon && employeeRecord && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="history" size={20} color={theme.colors.primary} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Recent Activity</Text>
              </View>
              <View style={[styles.historyCard, dynamicStyles.card, { borderColor: dynamicStyles.card.borderColor, shadowColor: dynamicStyles.card.shadowColor }]}>
                {attendanceLogs.length > 0 ? (
                  attendanceLogs.slice(0, 10).map((log, index) => (
                    <View key={log.id}>
                      <View style={styles.logItem}>
                        <View style={[
                          styles.logIcon, 
                          { backgroundColor: log.type === AttendanceType.CLOCK_IN ? '#34C759' + '15' : '#FF3B30' + '15' }
                        ]}>
                          <MaterialIcons 
                            name={log.type === AttendanceType.CLOCK_IN ? "login" : "logout"} 
                            size={20} 
                            color={log.type === AttendanceType.CLOCK_IN ? "#34C759" : "#FF3B30"} 
                          />
                        </View>
                        <View style={styles.logInfo}>
                          <Text style={[styles.logType, dynamicStyles.text]}>
                            {log.type === AttendanceType.CLOCK_IN ? 'Clocked In' : 'Clocked Out'}
                          </Text>
                          <Text style={[styles.logDate, dynamicStyles.textSecondary]}>
                            {new Date(log.recordedAt).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                        <Text style={[styles.logTime, dynamicStyles.text]}>
                          {new Date(log.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {index < Math.min(attendanceLogs.length, 10) - 1 && (
                        <View style={[styles.divider, { backgroundColor: dynamicStyles.divider.backgroundColor }]} />
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyHistory}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <MaterialIcons name="history" size={32} color={dynamicStyles.textSecondary.color} />
                    </View>
                    <Text style={[styles.emptyHistoryText, dynamicStyles.textSecondary]}>
                      No recent attendance activity
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
      
      {renderSalonPicker()}
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  backButton: {
    padding: theme.spacing.xs,
    borderRadius: 20,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionIcon: {
    marginRight: 6,
  },
  
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: 20,
    maxWidth: 400,
    width: '100%',
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  errorButton: {
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
  },
  errorButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginLeft: theme.spacing.sm,
  },
  errorStateCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: theme.spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  errorStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorStateMessage: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Salon Card
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md + 2,
    borderRadius: 16,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  salonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  salonInfo: {
    flex: 1,
  },
  salonLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  salonName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  salonAddress: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  
  // Action Section
  actionSection: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 200,
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: 11,
    marginBottom: 2,
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusMainText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginTop: 2,
  },
  statusSubText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },
  
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md + 4,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 18,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  clockBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginLeft: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  
  // History
  historySection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  historyCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: theme.spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logType: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  logTime: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  divider: {
    height: 1,
    marginHorizontal: theme.spacing.md,
  },
  emptyHistory: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: '80%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  salonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  salonOptionInfo: {
    flex: 1,
  },
  salonOptionName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  salonOptionAddress: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  modalCancelButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  modalCancelText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
});
