import React, { useState, useEffect } from 'react';
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
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { Input, Button } from '../../components';
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
  const [hourlyRate, setHourlyRate] = useState('');

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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.gray100,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray300,
    },
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    }
  };

  useEffect(() => {
    if (!salonId) {
      Alert.alert('Error', 'Invalid Salon ID');
      navigation.goBack();
      return;
    }
    fetchUsers();
  }, [salonId]);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const fetchedUsers = await userService.getUsers();
      setAllUsers(fetchedUsers || []);
    } catch (error) {
       console.error('Failed to fetch users', error);
    } finally {
      setFetchingUsers(false);
    }
  };

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
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : theme.colors.primaryLight + '20' }
        ]}
      >
        {isSelected && (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: theme.colors.primary + '10' }
            ]} 
          />
        )}
        <View style={styles.salaryIconContainer}>
          <MaterialCommunityIcons 
            name={icon} 
            size={24} 
            color={isSelected ? theme.colors.primary : isDark ? theme.colors.gray400 : theme.colors.gray600} 
          />
        </View>
        <Text style={[styles.salaryTypeLabel, dynamicStyles.text, isSelected && { color: theme.colors.primary, fontWeight: 'bold' }]}>
          {label}
        </Text>
        <Text style={[styles.salaryTypeDesc, dynamicStyles.textSecondary]}>{desc}</Text>
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialIcons name="check-circle" size={20} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, dynamicStyles.container]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray200 }]} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? theme.colors.white : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.text]}>Add New Employee</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* SECTION 1: USER SELECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="person-add" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Select Employee</Text>
          </View>
          
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
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <MaterialIcons name="close" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.searchBox, dynamicStyles.input]}>
                  <MaterialIcons name="search" size={20} color={isDark ? theme.colors.gray400 : theme.colors.gray500} />
                  <TextInput
                    style={[styles.searchInput, { color: isDark ? '#fff' : '#000' }]}
                    placeholder="Search name, email, phone..."
                    placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
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
                        <View style={{ marginLeft: 10 }}>
                          <Text style={[dynamicStyles.text, { fontWeight: '500' }]}>{user.fullName}</Text>
                          <Text style={[dynamicStyles.textSecondary, { fontSize: 12 }]}>{user.email}</Text>
                        </View>
                        <MaterialIcons name="add" size={20} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.secondary }]}>
              <MaterialIcons name="work" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Professional Info</Text>
          </View>
          
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.label, dynamicStyles.textSecondary]}>Professional Title *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {SALON_PROFESSIONAL_TITLES.map(title => (
                <TouchableOpacity
                  key={title}
                  onPress={() => setRoleTitle(title)}
                  style={[
                    styles.chip,
                    roleTitle === title ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: isDark ? theme.colors.gray600 : theme.colors.gray300 }
                  ]}
                >
                  <Text style={[styles.chipText, roleTitle === title && { color: '#fff' }, roleTitle !== title && dynamicStyles.text]}>{title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {errors.roleTitle && <Text style={styles.errorText}>{errors.roleTitle}</Text>}

            <Text style={[styles.label, dynamicStyles.textSecondary, { marginTop: 15 }]}>Skills (comma separated)</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              value={skills}
              onChangeText={setSkills} // Simple text input for parity MVP
              placeholder="e.g. Hair Cutting, Coloring, Manicure"
              placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
            />
          </View>
        </View>

        {/* SECTION 3: EMPLOYMENT & COMPENSATION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.success }]}>
              <MaterialIcons name="attach-money" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Compensation</Text>
          </View>
          
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.textSecondary]}>Hire Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateButton, dynamicStyles.input]}
                >
                  <Text style={dynamicStyles.text}>{hireDate.toLocaleDateString()}</Text>
                  <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={{ width: 15 }} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                 <Text style={[styles.label, dynamicStyles.textSecondary, { marginBottom: 5 }]}>Active Status</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Switch
                     value={isActive}
                     onValueChange={setIsActive}
                     trackColor={{ false: theme.colors.gray300, true: theme.colors.primaryLight }}
                     thumbColor={isActive ? theme.colors.primary : theme.colors.gray100}
                   />
                   <Text style={[dynamicStyles.text, { marginLeft: 10 }]}>{isActive ? 'Active' : 'Inactive'}</Text>
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

            <Text style={[styles.label, dynamicStyles.textSecondary, { marginTop: 20, marginBottom: 10 }]}>Payment Structure *</Text>
            <View style={styles.salaryTypesContainer}>
              {renderSalaryTypeCard('COMMISSION_ONLY', 'Commission', 'percent', 'Earns from services')}
              {renderSalaryTypeCard('SALARY_ONLY', 'Salary', 'cash', 'Fixed monthly pay')}
              {renderSalaryTypeCard('SALARY_PLUS_COMMISSION', 'Both', 'calculator', 'Base + Commission')}
            </View>

            {/* Dynamic Fields */}
            {(salaryType === 'COMMISSION_ONLY' || salaryType === 'SALARY_PLUS_COMMISSION') && (
              <View style={{ marginTop: 15 }}>
                <Text style={[styles.label, dynamicStyles.textSecondary]}>Commission Rate (%) *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={commissionRate}
                  onChangeText={setCommissionRate}
                  keyboardType="numeric"
                  placeholder="e.g. 40"
                  placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
                />
                {errors.commissionRate && <Text style={styles.errorText}>{errors.commissionRate}</Text>}
              </View>
            )}

            {salaryType !== 'COMMISSION_ONLY' && (
              <View style={{ marginTop: 15 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, dynamicStyles.textSecondary]}>Base Salary *</Text>
                     <TextInput
                      style={[styles.input, dynamicStyles.input]}
                      value={baseSalary}
                      onChangeText={setBaseSalary}
                      keyboardType="numeric"
                      placeholder="Amount"
                      placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
                    />
                     {errors.baseSalary && <Text style={styles.errorText}>{errors.baseSalary}</Text>}
                  </View>
                  <View style={{ width: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, dynamicStyles.textSecondary]}>Frequency</Text>
                    {/* Simplified frequency toggle for now */}
                    <TouchableOpacity 
                      onPress={() => setPayFrequency(payFrequency === 'MONTHLY' ? 'WEEKLY' : 'MONTHLY')}
                      style={[styles.input, dynamicStyles.input, { justifyContent: 'center' }]}
                    >
                      <Text style={dynamicStyles.text}>{payFrequency}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[
            styles.submitButton, 
            { backgroundColor: loading ? theme.colors.gray400 : theme.colors.primary }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Add Employee</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20, paddingTop: 0, paddingBottom: 50 },
  
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  
  card: { borderRadius: 16, padding: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  
  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  resultsList: { marginTop: 10, maxHeight: 200 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { fontWeight: 'bold', color: '#555' },
  
  // Selected User
  selectedUserRow: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userEmail: { fontSize: 14, color: '#888' },

  // Chips
  chipsScroll: { marginTop: 5 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8, marginVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Inputs
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16 },
  dateButton: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // Salary Cards
  salaryTypesContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  salaryTypeCard: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 12, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  salaryIconContainer: { marginBottom: 5 },
  salaryTypeLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  salaryTypeDesc: { fontSize: 10, textAlign: 'center', paddingHorizontal: 2 },
  checkIcon: { position: 'absolute', top: 5, right: 5 },

  // Helpers
  row: { flexDirection: 'row' },
  errorText: { color: theme.colors.error, fontSize: 12, marginTop: 5 },

  // Submit
  submitBtnContainer: { marginTop: 20 },
  submitButton: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
}); 
