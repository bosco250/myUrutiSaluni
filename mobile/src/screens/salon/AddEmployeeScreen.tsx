import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService } from '../../services/salon';
import { userService, User } from '../../services/user';

interface AddEmployeeScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
    };
  };
}

// Professional titles from web
const SALON_PROFESSIONAL_TITLES = [
  'Senior Stylist', 'Junior Stylist', 'Colorist', 'Barber', 'Esthetician',
  'Makeup Artist', 'Nail Technician', 'Massage Therapist', 'Receptionist', 'Manager'
];

type SalaryType = 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION';
type PayFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export default function AddEmployeeScreen({ navigation, route }: AddEmployeeScreenProps) {
  const { salonId } = route.params;
  const { isDark } = useTheme();
  
  // State
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Field State
  const [roleTitle, setRoleTitle] = useState('');
  const [skills, setSkills] = useState(''); // Comma separated for now
  const [hireDate, setHireDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Payment State
  const [salaryType, setSalaryType] = useState<SalaryType>('COMMISSION_ONLY');
  const [commissionRate, setCommissionRate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('MONTHLY');
  const [hourlyRate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    input: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.backgroundSecondary,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    headerBorder: {
      borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    }
  };

  const fetchUsers = useCallback(async () => {
    setFetchingUsers(true);
    try {
      const fetchedUsers = await userService.getUsers();
      setAllUsers(fetchedUsers || []);
    } catch (error) {
       console.error('Failed to fetch users', error);
    } finally {
      setFetchingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!salonId) {
      Alert.alert('Error', 'Invalid Salon ID');
      navigation.goBack();
      return;
    }
    fetchUsers();
  }, [salonId, navigation, fetchUsers]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allUsers.filter(user => 
      (user.fullName && user.fullName.toLowerCase().includes(lowerQuery)) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
      (user.phone && user.phone.includes(lowerQuery))
    );
    setUsers(filtered);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedUser) newErrors.user = 'Please select a user';
    if (!roleTitle) newErrors.roleTitle = 'Role title is required';

    if (salaryType === 'COMMISSION_ONLY' || salaryType === 'SALARY_PLUS_COMMISSION') {
      if (!commissionRate) newErrors.commissionRate = 'Required';
      else if (isNaN(Number(commissionRate)) || Number(commissionRate) < 0 || Number(commissionRate) > 100) {
        newErrors.commissionRate = 'Invalid rate (0-100)';
      }
    }

    if (salaryType !== 'COMMISSION_ONLY') {
      if (!baseSalary) newErrors.baseSalary = 'Required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please check the form for errors.');
      return;
    }
    if (!selectedUser) return;

    setLoading(true);
    try {
      await salonService.addEmployee(salonId, {
        userId: selectedUser.id,
        roleTitle: roleTitle.trim(),
        skills: skills.split(',').map(s => s.trim()).filter(s => s),
        hireDate: hireDate.toISOString(),
        isActive,
        salaryType,
        baseSalary: baseSalary ? Number(baseSalary) : undefined,
        payFrequency,
        commissionRate: commissionRate ? Number(commissionRate) : undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        employmentType: 'FULL_TIME', // Default for now
      });

      Alert.alert(
        'Success',
        'Employee has been added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const renderSalaryTypeCard = (type: SalaryType, label: string, icon: any, desc: string) => {
    const isSelected = salaryType === type;
    return (
      <TouchableOpacity
        onPress={() => {
          setSalaryType(type);
          // Reset irrelevant fields
          if (type === 'COMMISSION_ONLY') setBaseSalary('');
          if (type === 'SALARY_ONLY') setCommissionRate('');
        }}
        style={[
          styles.salaryTypeCard, 
          dynamicStyles.card,
          isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : theme.colors.primaryLight + '15' }
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.salaryIconContainer}>
          <MaterialCommunityIcons 
            name={icon} 
            size={22} 
            color={isSelected ? theme.colors.primary : dynamicStyles.textSecondary.color} 
          />
        </View>
        <Text style={[styles.salaryTypeLabel, dynamicStyles.text, isSelected && { color: theme.colors.primary }]}>
          {label}
        </Text>
        <Text style={[styles.salaryTypeDesc, dynamicStyles.textSecondary]}>{desc}</Text>
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialIcons name="check-circle" size={16} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Add Employee</Text>
          <View style={{ width: 32 }} /> 
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* SECTION 1: USER SELECTION */}
          <View>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Select Employee</Text>
            
            <View style={[styles.card, dynamicStyles.card]}>
              {selectedUser ? (
                <View style={styles.selectedUserRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>{selectedUser.fullName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.userName, dynamicStyles.text]}>{selectedUser.fullName}</Text>
                    <Text style={styles.userEmail}>{selectedUser.email}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setSelectedUser(null)}
                    style={styles.removeUserBtn}
                  >
                    <MaterialIcons name="close" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[styles.searchBox, dynamicStyles.input]}>
                    <MaterialIcons name="search" size={20} color={dynamicStyles.textSecondary.color} />
                    <TextInput
                      style={[styles.searchInput, { color: dynamicStyles.text.color }]}
                      placeholder="Search name, email, phone..."
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                      value={searchQuery}
                      onChangeText={handleSearch}
                    />
                    {fetchingUsers && <ActivityIndicator size="small" color={theme.colors.primary} />}
                  </View>
                  
                  {users.length > 0 && (
                    <View style={styles.resultsList}>
                      {users.map(user => (
                        <TouchableOpacity 
                          key={user.id} 
                          style={styles.resultItem}
                          onPress={() => {
                            setSelectedUser(user);
                            setUsers([]);
                            setSearchQuery('');
                          }}
                        >
                          <View style={[styles.miniAvatar, { backgroundColor: theme.colors.gray300 }]}>
                            <Text style={styles.miniAvatarText}>{user.fullName.charAt(0)}</Text>
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.resultName, dynamicStyles.text]}>{user.fullName}</Text>
                            <Text style={[styles.resultEmail, dynamicStyles.textSecondary]}>{user.email}</Text>
                          </View>
                          <MaterialIcons name="add-circle-outline" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {errors.user && <Text style={styles.errorText}>{errors.user}</Text>}
                </>
              )}
            </View>
          </View>

          {/* SECTION 2: PROFESSIONAL INFO */}
          <View>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Professional Info</Text>
            
            <View style={[styles.card, dynamicStyles.card]}>
              <Text style={[styles.fieldLabel, dynamicStyles.text]}>Professional Title *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {SALON_PROFESSIONAL_TITLES.map(title => (
                  <TouchableOpacity
                    key={title}
                    onPress={() => setRoleTitle(title)}
                    style={[
                      styles.chip,
                      roleTitle === title 
                        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } 
                        : { borderColor: dynamicStyles.textSecondary.color + '40', borderWidth: 1 }
                    ]}
                  >
                    <Text style={[styles.chipText, roleTitle === title ? { color: '#fff' } : dynamicStyles.text]}>
                      {title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.roleTitle && <Text style={styles.errorText}>{errors.roleTitle}</Text>}

              <Text style={[styles.fieldLabel, dynamicStyles.text, { marginTop: 12 }]}>Skills (comma separated)</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={skills}
                onChangeText={setSkills} 
                placeholder="e.g. Hair Cutting, Coloring, Manicure"
                placeholderTextColor={dynamicStyles.textSecondary.color}
              />
            </View>
          </View>

          {/* SECTION 3: EMPLOYMENT & COMPENSATION */}
          <View>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Compensation</Text>
            
            <View style={[styles.card, dynamicStyles.card]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Hire Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.dateButton, dynamicStyles.input]}
                  >
                    <Text style={[styles.dateText, dynamicStyles.text]}>{hireDate.toLocaleDateString()}</Text>
                    <MaterialIcons name="calendar-today" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 1 }}>
                   <Text style={[styles.fieldLabel, dynamicStyles.text, { marginBottom: 6 }]}>Status</Text>
                   <View style={styles.statusRow}>
                     <Switch
                       value={isActive}
                       onValueChange={setIsActive}
                       trackColor={{ false: theme.colors.gray300, true: theme.colors.primaryLight }}
                       thumbColor={isActive ? theme.colors.primary : '#f4f3f4'}
                       style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                     />
                     <Text style={[styles.statusText, dynamicStyles.text]}>{isActive ? 'Active' : 'Inactive'}</Text>
                   </View>
                </View>
              </View>
              
              {showDatePicker && (
                <DateTimePicker
                  value={hireDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => {
                    setShowDatePicker(false);
                    if (date) setHireDate(date);
                  }}
                />
              )}

              <View style={styles.divider} />

              <Text style={[styles.fieldLabel, dynamicStyles.text, { marginBottom: 10 }]}>Payment Structure *</Text>
              <View style={styles.salaryTypesContainer}>
                {renderSalaryTypeCard('COMMISSION_ONLY', 'Commission', 'percent', 'Services Only')}
                {renderSalaryTypeCard('SALARY_ONLY', 'Salary', 'cash', 'Fixed Pay')}
                {renderSalaryTypeCard('SALARY_PLUS_COMMISSION', 'Hybrid', 'calculator', 'Base + Comm.')}
              </View>

              {/* Dynamic Fields */}
              {(salaryType === 'COMMISSION_ONLY' || salaryType === 'SALARY_PLUS_COMMISSION') && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Commission Rate (%) *</Text>
                  <View style={[styles.inputContainer, dynamicStyles.input]}>
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={commissionRate}
                      onChangeText={setCommissionRate}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                  {errors.commissionRate && <Text style={styles.errorText}>{errors.commissionRate}</Text>}
                </View>
              )}

              {salaryType !== 'COMMISSION_ONLY' && (
                <View style={{ marginTop: 16 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={[styles.fieldLabel, dynamicStyles.text]}>Base Salary *</Text>
                       <View style={[styles.inputContainer, dynamicStyles.input]}>
                          <Text style={styles.inputPrefix}>RWF</Text>
                          <TextInput
                            style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                            value={baseSalary}
                            onChangeText={setBaseSalary}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={dynamicStyles.textSecondary.color}
                          />
                       </View>
                       {errors.baseSalary && <Text style={styles.errorText}>{errors.baseSalary}</Text>}
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, dynamicStyles.text]}>Frequency</Text>
                      <TouchableOpacity 
                        onPress={() => setPayFrequency(payFrequency === 'MONTHLY' ? 'WEEKLY' : 'MONTHLY')}
                        style={[styles.input, dynamicStyles.input, { justifyContent: 'center', alignItems: 'center' }]}
                      >
                        <Text style={[styles.freqText, dynamicStyles.text]}>{payFrequency}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, dynamicStyles.card]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[
            styles.submitButton, 
            { backgroundColor: loading ? theme.colors.gray400 : theme.colors.primary }
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Add Employee</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  headerContainer: {
    paddingBottom: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 10,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    flex: 1,
    textAlign: 'center',
    marginRight: 0, 
  },

  scrollContent: { 
    padding: 12,
    paddingBottom: 100,
    gap: 16,
  },
  
  sectionTitle: { 
    fontSize: 14, 
    fontFamily: theme.fonts.semibold,
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.9,
  },
  
  card: { 
    borderRadius: 12, 
    padding: 12, 
    borderWidth: 1,
  },
  
  // Search Box
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  resultsList: { 
    marginTop: 12, 
    maxHeight: 200,
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(150, 150, 150, 0.1)' 
  },
  miniAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  miniAvatarText: { 
    color: '#555',
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
  resultName: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
  },
  resultEmail: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
  },
  
  // Selected User
  selectedUserRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 2
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 18, 
    fontFamily: theme.fonts.bold,
  },
  userName: { 
    fontSize: 14, 
    fontFamily: theme.fonts.semibold,
  },
  userEmail: { 
    fontSize: 12, 
    color: '#888',
    fontFamily: theme.fonts.regular,
  },
  removeUserBtn: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.error + '10',
  },

  // Chips
  chipsScroll: { 
    flexDirection: 'row',
  },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    marginRight: 8, 
  },
  chipText: { 
    fontSize: 12, 
    fontFamily: theme.fonts.medium,
  },

  // Inputs
  fieldLabel: { 
    fontSize: 12, 
    fontFamily: theme.fonts.medium,
    marginBottom: 6, 
    opacity: 0.8,
  },
  input: { 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  inputContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     borderWidth: 1,
     borderRadius: 10,
     paddingHorizontal: 12,
     height: 44,
  },
  inputPrefix: { marginRight: 8, fontSize: 13, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputSuffix: { marginLeft: 8, fontSize: 13, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputFlex: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, height: '100%' },

  dateButton: { 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  dateText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
  },
  statusRow: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
  },
  statusText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      marginLeft: 8,
  },
  
  // Salary Cards
  salaryTypesContainer: { 
    flexDirection: 'row', 
    gap: 8,
  },
  salaryTypeCard: { 
    flex: 1, 
    padding: 10, 
    borderWidth: 1, 
    borderRadius: 12, 
    alignItems: 'center', 
    position: 'relative', 
    minHeight: 80,
    justifyContent: 'center',
  },
  salaryIconContainer: { 
    marginBottom: 6 
  },
  salaryTypeLabel: { 
    fontSize: 12, 
    fontFamily: theme.fonts.semibold,
    marginBottom: 2, 
    textAlign: 'center',
  },
  salaryTypeDesc: { 
    fontSize: 10, 
    textAlign: 'center', 
    fontFamily: theme.fonts.regular,
    opacity: 0.8,
  },
  checkIcon: { 
    position: 'absolute', 
    top: 4, 
    right: 4 
  },

  freqText: {
      fontSize: 13, 
      fontFamily: theme.fonts.medium,
  },
  
  divider: {
      height: 1,
      backgroundColor: 'rgba(150,150,150,0.1)',
      marginVertical: 16,
  },

  row: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { 
    color: theme.colors.error, 
    fontSize: 11, 
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },

  // Bottom Bar
  bottomBar: { 
      padding: 12, 
      borderTopWidth: 1,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
  },
  submitButton: { 
    borderRadius: 10, 
    paddingVertical: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 44,
  },
  submitText: { 
    color: '#fff', 
    fontSize: 14, 
    fontFamily: theme.fonts.semibold,
  },
});
