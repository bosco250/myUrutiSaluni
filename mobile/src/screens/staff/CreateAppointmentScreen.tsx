import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { appointmentsService, AppointmentStatus, TimeSlot } from '../../services/appointments';
import { exploreService, Service } from '../../services/explore';
import { staffService } from '../../services/staff';
import { api } from '../../services/api';
import { EmployeePermissionGate } from '../../components/permissions/EmployeePermissionGate';
import { EmployeePermission } from '../../constants/employeePermissions';

import { salonService } from '../../services/salon';

interface Customer {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
}

interface CreateAppointmentScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function CreateAppointmentScreen({
  navigation,
}: CreateAppointmentScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Initialize with today, ensuring it's not in the past
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayDate());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // ... dynamicStyles removed for brevity in replacement constraint (assuming it follows, but I need to be careful not to delete it if I don't include it in target) ...
  // Wait, I can't skip dynamicStyles if I target a range that includes it.
  // I will target up to the useEffects.

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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
      color: isDark ? theme.colors.white : theme.colors.text,
    },
  };

  const loadEmployees = React.useCallback(async (salonId: string) => {
    try {
      setLoadingEmployees(true);
      const staff = await salonService.getEmployees(salonId);
      // Filter active employees
      const activeStaff = staff.filter((e: any) => e.isActive !== false);
      setEmployees(activeStaff);

      // Auto-select logic
      if (user?.role === 'salon_employee') {
        // If current user is employee, select them
        const me = activeStaff.find((e: any) => e.userId === user.id);
        if (me) setSelectedEmployee(me);
      } else if (activeStaff.length > 0 && !selectedEmployee) {
        // Optional: Pre-select first employee for convenience? 
        // Or leave null to force selection. Let's leave null to ensure intentional assignment.
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  }, [user?.role, user?.id, selectedEmployee]);

  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Keeping user?.id as specific dep

  // Ensure selected date is never in the past
  useEffect(() => {
    const today = getTodayDate();
    if (selectedDate < today) {
      setSelectedDate(today);
      setSelectedTime('');
    }
  }, [selectedDate]);

  // Load employees when salon changes
  useEffect(() => {
    if (selectedSalonId) {
      loadEmployees(selectedSalonId);
    }
  }, [selectedSalonId, loadEmployees]);

  // Load time slots when date, service, or employee changes
  useEffect(() => {
    if (selectedDate && selectedService && selectedEmployee && selectedSalonId) {
      loadTimeSlots();
    } else {
      setAvailableTimeSlots([]);
      setSelectedTime('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService?.id, selectedEmployee?.id, selectedSalonId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      let initialSalonId: string | null = null;

      // Handle Owners: Get owned salons
      if (user?.role === 'salon_owner') {
        const mySalons = await salonService.getMySalons();
        if (mySalons.length > 0) {
          initialSalonId = mySalons[0].id;
        }
      } 
      // Handle Employees: Get employee records
      else {
        // Get employee records
        const employeeData = await staffService.getEmployeeByUserId(String(user?.id));
        const records = Array.isArray(employeeData) ? employeeData : [employeeData];
        // Removing unused setEmployeeRecords call
        
        if (records.length > 0) {
          initialSalonId = records[0].salonId;
        }
      }

      if (initialSalonId) {
        setSelectedSalonId(initialSalonId);
        await loadServices(initialSalonId);
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (salonId: string) => {
    try {
      setLoadingServices(true);
      const salonServices = await exploreService.getServices(salonId);
      const activeServices = Array.isArray(salonServices) 
        ? salonServices.filter(s => s.isActive !== false)
        : [];
      setServices(activeServices);
      
      if (activeServices.length === 0) {
        console.warn('No active services found for salon:', salonId);
      }
    } catch (error: any) {
      console.error('Error loading services:', error);
      setServices([]);
      Alert.alert(
        'Error',
        error.message || 'Failed to load services. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingServices(false);
    }
  };

  const searchCustomers = async (query: string) => {
    if (!query.trim() || !selectedSalonId) return;
    
    try {
      setLoadingCustomers(true);
      const response = await api.get<any>(`/salons/${selectedSalonId}/customers?search=${encodeURIComponent(query)}`);
      
      let customerList: Customer[] = [];
      if (Array.isArray(response)) {
        customerList = response.map((c: any) => ({
          id: c.customer?.id || c.id,
          fullName: c.customer?.user?.fullName || c.customer?.fullName || c.fullName || 'Unknown',
          phone: c.customer?.phone || c.phone,
          email: c.customer?.user?.email || c.email,
        }));
      } else if (response.data && Array.isArray(response.data)) {
        customerList = response.data.map((c: any) => ({
          id: c.customer?.id || c.id,
          fullName: c.customer?.user?.fullName || c.customer?.fullName || c.fullName || 'Unknown',
          phone: c.customer?.phone || c.phone,
          email: c.customer?.user?.email || c.email,
        }));
      }
      
      setCustomers(customerList);
    } catch (error: any) {
      console.error('Error searching customers:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const createCustomer = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    try {
      setCreatingCustomer(true);
      const customerData: any = {
        fullName: customerName.trim(),
      };
      if (customerPhone.trim()) {
        customerData.phone = customerPhone.trim();
      }

      const response = await api.post<any>('/customers', customerData);
      const newCustomer: Customer = {
        id: response.id || response.data?.id,
        fullName: response.fullName || response.data?.fullName || customerName.trim(),
        phone: response.phone || response.data?.phone || customerPhone.trim(),
        email: response.email || response.data?.email,
      };

      setSelectedCustomer(newCustomer);
      setShowCustomerModal(false);
      setCustomerSearchQuery('');
      Alert.alert('Success', 'Customer created successfully');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', error.message || 'Failed to create customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleTimeSelect = (timeStr: string) => {
    const slot = availableTimeSlots.find(s => s.startTime === timeStr);
    if (slot && slot.available) {
      setSelectedTime(timeStr);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedService || !selectedSalonId || !selectedDate || !selectedEmployee) return;

    try {
      setLoadingTimeSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const duration = selectedService.durationMinutes || 30;
      
      console.log('Loading time slots:', {
        employeeId: selectedEmployee.id,
        date: dateStr,
        duration,
        serviceId: selectedService.id,
      });
      
      const slots = await appointmentsService.getEmployeeTimeSlots(
        selectedEmployee.id,
        dateStr,
        duration,
        selectedService.id
      );
      
      console.log('Time slots received:', {
        total: slots.length,
        available: slots.filter(s => s.available).length,
        unavailable: slots.filter(s => !s.available).length,
        reasons: slots.filter(s => !s.available).map(s => s.reason),
      });
      
      setAvailableTimeSlots(slots);
      
      // Clear selected time if it's no longer available
      if (selectedTime) {
        const isStillAvailable = slots.some(
          slot => slot.startTime === selectedTime && slot.available
        );
        if (!isStillAvailable) {
          setSelectedTime('');
        }
      }
    } catch (error: any) {
      console.error('Error loading time slots:', error);
      setAvailableTimeSlots([]);
      Alert.alert(
        'Error',
        error.message || 'Failed to load available time slots. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // On Android, event.type can be 'set' or 'dismissed'
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      return;
    }
    
    if (date) {
      // Set time to start of day to avoid timezone issues
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      
      // Ensure date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (newDate < today) {
        Alert.alert('Invalid Date', 'Please select today or a future date.');
        // Reset to today if past date was selected
        setSelectedDate(today);
        return;
      }
      
      setSelectedDate(newDate);
      setSelectedTime(''); // Clear selected time when date changes
    }
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    if (dateToCheck.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedSalonId) {
      Alert.alert('Error', 'Please select a salon');
      return;
    }

    if (!selectedService) {
      Alert.alert('Error', 'Please select a service');
      return;
    }

    if (!selectedCustomer && !customerName.trim()) {
      Alert.alert('Error', 'Please select or enter customer name');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Error', 'Please select appointment time');
      return;
    }

    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select a stylist');
      return;
    }

    try {
      setSubmitting(true);

      // Create customer if needed
      let customerId = selectedCustomer?.id;
      if (!customerId && customerName.trim()) {
        const customerData: any = { fullName: customerName.trim() };
        if (customerPhone.trim()) {
          customerData.phone = customerPhone.trim();
        }
        const newCustomer = await api.post<any>('/customers', customerData);
        customerId = newCustomer.id || newCustomer.data?.id;
      }

      // Build scheduled start/end times from selected time string (HH:MM format)
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledStart = new Date(selectedDate);
      scheduledStart.setHours(hour, minute, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (selectedService.durationMinutes || 30));

      // Create appointment with status "pending" for owner confirmation
      const appointmentData = {
        salonId: selectedSalonId,
        customerId: customerId,
        serviceId: selectedService.id,
        salonEmployeeId: selectedEmployee.id, // Assign to the selected employee
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        status: AppointmentStatus.PENDING, // Pending for owner confirmation
        notes: notes.trim() || undefined,
      };

      const appointment = await appointmentsService.createAppointment(appointmentData);

      Alert.alert(
        'Success',
        'Appointment created successfully! It will be confirmed by the owner.',
        [
          {
            text: 'View Appointment',
            onPress: () => {
              navigation.navigate('AppointmentDetail', { appointmentId: appointment.id });
            },
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', error.message || 'Failed to create appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <EmployeePermissionGate
      requiredPermission={EmployeePermission.MANAGE_APPOINTMENTS}
      salonId={selectedSalonId || undefined}
      showUnauthorizedMessage={true}
      onUnauthorizedPress={() => navigation.goBack()}
    >
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.card]}>
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
            New Appointment
          </Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            Create appointment for owner confirmation
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Selection */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="person"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Customer
            </Text>
          </View>

          {selectedCustomer ? (
            <View style={styles.selectedCustomerCard}>
              <View style={styles.selectedCustomerInfo}>
                <Text style={[styles.selectedCustomerName, dynamicStyles.text]}>
                  {selectedCustomer.fullName}
                </Text>
                {selectedCustomer.phone && (
                  <Text style={[styles.selectedCustomerPhone, dynamicStyles.textSecondary]}>
                    {selectedCustomer.phone}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCustomer(null);
                  setCustomerName('');
                  setCustomerPhone('');
                }}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.searchButton, dynamicStyles.input]}
                onPress={() => setShowCustomerModal(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.searchButtonText, dynamicStyles.textSecondary]}>
                  Search existing customer
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dividerText, dynamicStyles.textSecondary]}>OR</Text>

              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Customer Name *"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Phone (Optional)"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
            </>
          )}
        </View>

        {/* Service Selection */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="content-cut"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service</Text>
          </View>
          {loadingServices ? (
            <View style={styles.servicesLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                Loading services...
              </Text>
            </View>
          ) : services.length === 0 ? (
            <View style={styles.emptyServicesContainer}>
              <MaterialIcons
                name="content-cut"
                size={32}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyServicesText, dynamicStyles.textSecondary]}>
                No services available
              </Text>
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                Please contact the salon owner to add services
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesContainer}
            >
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    selectedService?.id === service.id && styles.serviceChipSelected,
                    selectedService?.id === service.id && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedService(service);
                    // Clear selected time when service changes
                    setSelectedTime('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.serviceChipText,
                      selectedService?.id === service.id && styles.serviceChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {service.name}
                  </Text>
                  <Text
                    style={[
                      styles.serviceChipPrice,
                      selectedService?.id === service.id && styles.serviceChipTextSelected,
                    ]}
                  >
                    RWF {service.basePrice?.toLocaleString() || '0'}
                  </Text>
                  {service.durationMinutes && (
                    <Text
                      style={[
                        styles.serviceChipDuration,
                        selectedService?.id === service.id && styles.serviceChipTextSelected,
                      ]}
                    >
                      {service.durationMinutes} min
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {selectedService && (
            <View style={styles.selectedServiceInfo}>
              <MaterialIcons
                name="check-circle"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.selectedServiceText, dynamicStyles.text]}>
                Selected: {selectedService.name}
              </Text>
            </View>
          )}
        </View>

        {/* Stylist Selection */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="person-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Stylist</Text>
          </View>
          {loadingEmployees ? (
            <View style={styles.servicesLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                Loading stylists...
              </Text>
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.emptyServicesContainer}>
              <MaterialIcons
                name="person-off"
                size={32}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyServicesText, dynamicStyles.textSecondary]}>
                No stylists available
              </Text>
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                Please contact the salon owner to add employees
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesContainer}
            >
              {employees.map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={[
                    styles.serviceChip,
                    selectedEmployee?.id === employee.id && styles.serviceChipSelected,
                    selectedEmployee?.id === employee.id && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedEmployee(employee);
                    // Clear selected time when employee changes
                    setSelectedTime('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.serviceChipText,
                      selectedEmployee?.id === employee.id && styles.serviceChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {employee.user?.fullName || employee.roleTitle || 'Unknown'}
                  </Text>
                  {employee.roleTitle && (
                    <Text
                      style={[
                        styles.serviceChipDuration,
                        selectedEmployee?.id === employee.id && styles.serviceChipTextSelected,
                      ]}
                    >
                      {employee.roleTitle}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {selectedEmployee && (
            <View style={styles.selectedServiceInfo}>
              <MaterialIcons
                name="check-circle"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.selectedServiceText, dynamicStyles.text]}>
                Selected: {selectedEmployee.user?.fullName || 'Stylist'}
              </Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="calendar-today"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Date</Text>
          </View>
          <TouchableOpacity
            style={[styles.datePickerButton, dynamicStyles.input]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="calendar-today"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.datePickerText, dynamicStyles.text]}>
              {formatDate(selectedDate)}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={dynamicStyles.textSecondary.color}
            />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={getTodayDate()}
              maximumDate={(() => {
                const maxDate = new Date();
                maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow up to 1 year in advance
                return maxDate;
              })()}
              textColor={isDark ? theme.colors.white : theme.colors.text}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={[styles.datePickerDoneButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Time Selection */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="access-time"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Time</Text>
          </View>
          {!selectedService ? (
            <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
              Please select a service first to see available time slots
            </Text>
          ) : loadingTimeSlots ? (
            <View style={styles.timeSlotsLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                Loading available time slots...
              </Text>
            </View>
          ) : availableTimeSlots.length === 0 ? (
            <View style={styles.emptyTimeSlotsContainer}>
              <MaterialIcons
                name="schedule"
                size={32}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyTimeSlotsText, dynamicStyles.textSecondary]}>
                No time slots available
              </Text>
              <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                The employee may not have working hours configured for this date, or all slots are booked.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeSlotsContainer}
              >
                {availableTimeSlots.map((slot, index) => {
                  const timeStr = slot.startTime;
                  const isSelected = selectedTime === timeStr;
                  const isAvailable = slot.available;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlot,
                        !isAvailable && styles.timeSlotUnavailable,
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => isAvailable && handleTimeSelect(timeStr)}
                      disabled={!isAvailable}
                      activeOpacity={isAvailable ? 0.7 : 1}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          !isAvailable && styles.timeSlotTextUnavailable,
                          isSelected && styles.timeSlotTextSelected,
                        ]}
                      >
                        {timeStr}
                      </Text>
                      {!isAvailable && slot.reason && (
                        <Text style={[styles.timeSlotReason, dynamicStyles.textSecondary]}>
                          {slot.reason}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {availableTimeSlots.filter(s => s.available).length === 0 && availableTimeSlots.length > 0 && (
                <View style={styles.allBookedContainer}>
                  <MaterialIcons
                    name="event-busy"
                    size={24}
                    color={theme.colors.error}
                  />
                  <Text style={[styles.allBookedText, { color: theme.colors.error }]}>
                    All time slots are unavailable for this date
                  </Text>
                  <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                    {(() => {
                      const reasons = availableTimeSlots
                        .filter(s => !s.available && s.reason)
                        .map(s => s.reason)
                        .filter((v, i, a) => a.indexOf(v) === i); // Unique reasons
                      
                      if (reasons.length > 0) {
                        return `Reasons: ${reasons.join(', ')}`;
                      }
                      return 'Please try selecting another date or contact the salon owner.';
                    })()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Notes */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="notes"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Notes</Text>
          </View>
          <TextInput
            style={[styles.textArea, dynamicStyles.input]}
            placeholder="Additional notes (Optional)"
            placeholderTextColor={dynamicStyles.textSecondary.color}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.colors.primary },
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color={theme.colors.white} />
              <Text style={styles.submitButtonText}>Create Appointment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.text]}>
                Search Customer
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={dynamicStyles.text.color}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, dynamicStyles.input]}
              placeholder="Search by name or phone..."
              placeholderTextColor={dynamicStyles.textSecondary.color}
              value={customerSearchQuery}
              onChangeText={(text) => {
                setCustomerSearchQuery(text);
                if (text.trim()) {
                  searchCustomers(text);
                } else {
                  setCustomers([]);
                }
              }}
            />

            {loadingCustomers ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={{ marginTop: 20 }}
              />
            ) : (
              <ScrollView style={styles.customerList}>
                {customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[styles.customerItem, dynamicStyles.card]}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                      setCustomerSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.customerItemInfo}>
                      <Text style={[styles.customerItemName, dynamicStyles.text]}>
                        {customer.fullName}
                      </Text>
                      {customer.phone && (
                        <Text style={[styles.customerItemPhone, dynamicStyles.textSecondary]}>
                          {customer.phone}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && customerSearchQuery.trim() && (
                  <View style={styles.createCustomerSection}>
                    <Text style={[styles.createCustomerText, dynamicStyles.textSecondary]}>
                      Customer not found
                    </Text>
                    <TouchableOpacity
                      style={[styles.createCustomerButton, { backgroundColor: theme.colors.primary }]}
                      onPress={createCustomer}
                      disabled={creatingCustomer}
                    >
                      {creatingCustomer ? (
                        <ActivityIndicator color={theme.colors.white} />
                      ) : (
                        <>
                          <MaterialIcons name="add" size={20} color={theme.colors.white} />
                          <Text style={styles.createCustomerButtonText}>
                            Create "{customerSearchQuery}"
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </EmployeePermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  searchButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  dividerText: {
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
  },
  selectedCustomerInfo: {
    flex: 1,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  selectedCustomerPhone: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  servicesContainer: {
    paddingVertical: theme.spacing.xs,
  },
  servicesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyServicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  emptyServicesText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  serviceChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    minWidth: 120,
    maxWidth: 180,
  },
  serviceChipSelected: {
    borderColor: theme.colors.primary,
  },
  serviceChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  serviceChipTextSelected: {
    color: theme.colors.white,
  },
  serviceChipPrice: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  serviceChipDuration: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
    color: theme.colors.textSecondary,
  },
  selectedServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: `${theme.colors.primary}15`,
    gap: theme.spacing.xs,
  },
  selectedServiceText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  hintText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  datePickerDoneButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  timeSlotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  timeSlotsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginRight: theme.spacing.sm,
    backgroundColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  timeSlotUnavailable: {
    opacity: 0.5,
    borderColor: theme.colors.gray400,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  timeSlotTextUnavailable: {
    color: theme.colors.gray400,
    textDecorationLine: 'line-through',
  },
  timeSlotTextSelected: {
    color: theme.colors.white,
  },
  timeSlotReason: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  emptyTimeSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  emptyTimeSlotsText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  allBookedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  allBookedText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.md,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
  },
  customerList: {
    maxHeight: 400,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  customerItemInfo: {
    flex: 1,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  customerItemPhone: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  createCustomerSection: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  createCustomerText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
  },
  createCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  createCustomerButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
});

