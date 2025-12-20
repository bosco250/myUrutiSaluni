import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService, SalonDetails, SalonEmployee } from '../../services/salon';
import { attendanceService, AttendanceLog, AttendanceType } from '../../services/attendance';

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
    pickerModal: {
       backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
    }
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // 1. Fetch Salons (Workplaces or Owned)
      // Note: Backend logic updated to return workplaces for employees
      const salonList = await salonService.getMySalons();
      setSalons(salonList);
      
      let currentSalon = selectedSalon;
      
      // Auto-select first salon if none selected or if previously selected is not in list
      if (salonList.length > 0) {
          if (!currentSalon || !salonList.find(s => s.id === currentSalon?.id)) {
            currentSalon = salonList[0];
            setSelectedSalon(salonList[0]);
          }
      } else {
        // No salons found
        setLoading(false);
        setRefreshing(false);
        return;
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
    }
  }, [user?.id, selectedSalon]); // Depend on selectedSalon to refresh when switched

  useEffect(() => {
    loadData();
  }, [loadData, selectedSalon?.id]); // Re-load when selection changes (via picker which updates state directly)

  // Initial load
  useEffect(() => {
      // Logic inside loadData handles initial fetch, but we need to trigger it once on mount
      // if selectedSalon is null, loadData fetches list and sets it.
      if (!selectedSalon && !loading) { 
         // prevent double call if loadData handles internal logic, but here we just call it on mount
         setLoading(true);
         loadData();
      }
  }, [loadData, selectedSalon, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSalonSelect = (salon: SalonDetails) => {
    setSelectedSalon(salon);
    setShowSalonPicker(false);
    setLoading(true); // Trigger loading state for new data fetch
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
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Attendance</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
         contentContainerStyle={styles.scrollContent}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
         {loading && !refreshing && !selectedSalon ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
         ) : (
            <>
               {/* Salon Selector */}
               {salons.length > 0 ? (
                 <TouchableOpacity 
                   style={[styles.salonCard, dynamicStyles.card]}
                   onPress={() => salons.length > 1 && setShowSalonPicker(true)}
                   disabled={salons.length <= 1}
                 >
                    <View style={styles.salonIconContainer}>
                      <FontAwesome5 name="store" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.salonInfo}>
                       <Text style={[styles.salonLabel, dynamicStyles.textSecondary]}>Current Workplace</Text>
                       <Text style={[styles.salonName, dynamicStyles.text]}>{selectedSalon?.name || 'Select Salon'}</Text>
                    </View>
                    {salons.length > 1 && (
                       <MaterialIcons name="keyboard-arrow-down" size={24} color={dynamicStyles.textSecondary.color} />
                    )}
                 </TouchableOpacity>
               ) : (
                 <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, dynamicStyles.text]}>No workplaces found.</Text>
                 </View>
               )}

               {/* Clock Status & Action */}
               {selectedSalon && (
                 <View style={styles.actionSection}>
                    <View style={[styles.statusIndicator, currentStatus === 'in' ? styles.statusIn : styles.statusOut]}>
                       <Text style={styles.statusLabel}>Currently</Text>
                       <Text style={styles.statusMainText}>
                          {currentStatus === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT'}
                       </Text>
                       {currentStatus === 'in' && (
                         <Text style={styles.statusSubText}>{getTodayDuration()}</Text>
                       )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.clockButton, 
                        currentStatus === 'in' ? styles.clockOutBtn : styles.clockInBtn,
                        actionLoading && styles.disabledBtn
                      ]}
                      onPress={handleClockAction}
                      disabled={actionLoading || !employeeRecord}
                    >
                       {actionLoading ? (
                          <ActivityIndicator color="white" />
                       ) : (
                          <>
                             <FontAwesome5 name={currentStatus === 'in' ? "sign-out-alt" : "sign-in-alt"} size={24} color="white" />
                             <Text style={styles.clockBtnText}>
                                {currentStatus === 'in' ? 'CLOCK OUT' : 'CLOCK IN'}
                             </Text>
                          </>
                       )}
                    </TouchableOpacity>
                    
                    {!employeeRecord && (
                        <Text style={[styles.errorText, { textAlign: 'center', marginTop: 8 }]}>
                           You are not listed as an employee here.
                        </Text>
                    )}
                 </View>
               )}

               {/* History */}
               {selectedSalon && (
                 <View style={styles.historySection}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>Recent Activity</Text>
                    <View style={[styles.historyCard, dynamicStyles.card]}>
                       {attendanceLogs.length > 0 ? (
                          attendanceLogs.slice(0, 10).map((log, index) => (
                             <View key={log.id}>
                                <View style={styles.logItem}>
                                   <View style={[
                                      styles.logIcon, 
                                      { backgroundColor: log.type === AttendanceType.CLOCK_IN ? '#E8F5E9' : '#FFEBEE' }
                                   ]}>
                                      <MaterialIcons 
                                        name={log.type === AttendanceType.CLOCK_IN ? "login" : "logout"} 
                                        size={18} 
                                        color={log.type === AttendanceType.CLOCK_IN ? "#2E7D32" : "#C62828"} 
                                      />
                                   </View>
                                   <View style={styles.logInfo}>
                                      <Text style={[styles.logType, dynamicStyles.text]}>
                                         {log.type === AttendanceType.CLOCK_IN ? 'Clocked In' : 'Clocked Out'}
                                      </Text>
                                      <Text style={[styles.logDate, dynamicStyles.textSecondary]}>
                                         {new Date(log.recordedAt).toLocaleDateString()}
                                      </Text>
                                   </View>
                                   <Text style={[styles.logTime, dynamicStyles.text]}>
                                      {new Date(log.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </Text>
                                </View>
                                {index < Math.min(attendanceLogs.length, 10) - 1 && (
                                   <View style={[styles.divider, { backgroundColor: isDark ? theme.colors.gray700 : '#F0F0F0' }]} />
                                )}
                             </View>
                          ))
                       ) : (
                          <View style={styles.emptyHistory}>
                             <Text style={[styles.emptyHistoryText, dynamicStyles.textSecondary]}>No recent attendance activity.</Text>
                          </View>
                       )}
                    </View>
                 </View>
               )}
            </>
         )}
      </ScrollView>
      
      {renderSalonPicker()}
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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // Salon Card
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  salonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  
  // Action Section
  actionSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  statusIndicator: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100, // Pill shape
    borderWidth: 1,
    borderColor: 'transparent', // Can add border color
  },
  statusIn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  statusOut: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
  },
  statusMainText: {
     fontSize: 18,
     fontWeight: 'bold',
     fontFamily: theme.fonts.bold,
     color: '#333',
  },
  statusSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clockInBtn: {
    backgroundColor: '#2E7D32', // Green
  },
  clockOutBtn: {
     backgroundColor: '#C62828', // Red
  },
  disabledBtn: {
    opacity: 0.7,
  },
  clockBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginLeft: 12,
  },
  errorText: {
     fontSize: 14,
     color: '#C62828',
     fontFamily: theme.fonts.medium,
  },
  
  // History
  historySection: {
     marginBottom: 20,
  },
  sectionTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     fontFamily: theme.fonts.bold,
     marginBottom: 16,
  },
  historyCard: {
     borderRadius: 16,
     borderWidth: 1,
     padding: 8,
  },
  logItem: {
     flexDirection: 'row',
     alignItems: 'center',
     padding: 12,
  },
  logIcon: {
     width: 36,
     height: 36,
     borderRadius: 18,
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 12,
  },
  logInfo: {
     flex: 1,
  },
  logType: {
     fontSize: 16,
     fontWeight: '600',
     fontFamily: theme.fonts.bold,
  },
  logDate: {
     fontSize: 12,
     marginTop: 2,
  },
  logTime: {
     fontSize: 14,
     fontWeight: '500',
     fontFamily: theme.fonts.medium,
  },
  divider: {
     height: 1,
     marginHorizontal: 12,
  },
  emptyHistory: {
     padding: 24,
     alignItems: 'center',
  },
  emptyHistoryText: {
     fontSize: 14,
     fontStyle: 'italic',
  },
  emptyState: {
     alignItems: 'center',
     padding: 20,
  },
  emptyText: {
     fontSize: 16,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: theme.fonts.bold,
  },
  salonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  salonOptionInfo: {
    flex: 1,
  },
  salonOptionName: {
     fontSize: 16,
     fontWeight: '600',
     marginBottom: 2,
  },
  salonOptionAddress: {
     fontSize: 12,
  },
  modalCancelButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  modalCancelText: {
    color: theme.colors.error,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
});
