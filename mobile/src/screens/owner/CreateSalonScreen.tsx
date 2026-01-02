import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../../theme';
import { useAuth, useTheme } from '../../context';
import { salonService, CreateSalonDto } from '../../services/salon';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface CreateSalonScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params: {
      mode?: 'create' | 'edit';
      salon?: any;
    };
  };
}

interface FormData {
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  website: string;
  registrationNumber: string;
  latitude?: number;
  longitude?: number;
  // New fields
  businessTypes: string[]; // Array to allow multiple selections
  targetClientele: string; // 'men' | 'women' | 'both' - radio button
  openingDate: string;
  numberOfEmployees: string;
  licenseNumber: string;
  taxId: string;
}

interface FormErrors {
  [key: string]: string;
}

// Working hours for each day
interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DEFAULT_HOURS: DayHours = { isOpen: true, openTime: '08:00', closeTime: '18:00' };
const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '15:00' },
};

const STEPS = ['Basic Info', 'Location', 'Business', 'Contact'];

// Business Type Options
const BUSINESS_TYPES = [
  { value: 'hair_salon', label: 'Hair Salon' },
  { value: 'beauty_spa', label: 'Beauty Spa' },
  { value: 'nail_salon', label: 'Nail Salon' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'full_service', label: 'Full Service' },
  { value: 'mobile', label: 'Mobile Service' },
  { value: 'other', label: 'Other' },
];

// Target Clientele Options
const TARGET_CLIENTELE = [
  { value: 'men', label: 'Men', icon: 'male' as const },
  { value: 'women', label: 'Women', icon: 'female' as const },
  { value: 'both', label: 'Both', icon: 'people' as const },
];

export default function CreateSalonScreen({ navigation, route }: CreateSalonScreenProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  const mode = route?.params?.mode || 'create';
  const editingSalon = route?.params?.salon;

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    district: '',
    phone: user?.phone || '',
    email: user?.email || '',
    website: '',
    registrationNumber: '',
    // New fields
    businessTypes: [], // Array for multiple selection
    targetClientele: '',
    openingDate: '',
    numberOfEmployees: '',
    licenseNumber: '',
    taxId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [, setLocationPermission] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -1.9403,
    longitude: 29.8739,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  
  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeInfo, setSelectedTimeInfo] = useState<{
    day: keyof WorkingHours;
    field: 'openTime' | 'closeTime';
  } | null>(null);

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
      backgroundColor: isDark ? '#2C2C2E' : theme.colors.background,
    },
    input: {
      backgroundColor: isDark ? '#3A3A3C' : '#F5F5F5',
      color: isDark ? '#FFFFFF' : theme.colors.text,
      borderColor: isDark ? '#4A4A4C' : theme.colors.borderLight,
    },
  };

  const prefillForm = useCallback(() => {
    if (!editingSalon) return;

    setFormData({
      name: editingSalon.name || '',
      description: editingSalon.description || '',
      address: editingSalon.address || '',
      city: editingSalon.city || '',
      district: editingSalon.district || '',
      phone: editingSalon.phone || '',
      email: editingSalon.email || '',
      website: editingSalon.website || '',
      registrationNumber: editingSalon.registrationNumber || '',
      latitude: editingSalon.latitude,
      longitude: editingSalon.longitude,
      // Prefill new fields from settings
      // Handle backward compatibility: web uses businessType (string), mobile uses businessTypes (array)
      businessTypes: (() => {
        const settings = editingSalon.settings;
        if (settings?.businessTypes && Array.isArray(settings.businessTypes)) {
          return settings.businessTypes; // New format (array)
        } else if (settings?.businessType && typeof settings.businessType === 'string') {
          return [settings.businessType]; // Old format (single string from web) - convert to array
        }
        return [];
      })(),
      targetClientele: editingSalon.settings?.targetClientele || '',
      openingDate: editingSalon.settings?.openingDate || '',
      numberOfEmployees: editingSalon.settings?.numberOfEmployees?.toString() || '',
      licenseNumber: editingSalon.settings?.licenseNumber || '',
      taxId: editingSalon.settings?.taxId || '',
    });

    if (editingSalon.latitude && editingSalon.longitude) {
      setMapRegion(prev => ({
        ...prev,
        latitude: editingSalon.latitude,
        longitude: editingSalon.longitude,
      }));
    }

    if (editingSalon.businessHours) {
        // Map backend businessHours to WorkingHours format
        const newHours = { ...DEFAULT_WORKING_HOURS };
        Object.keys(newHours).forEach((key) => {
            const dayKey = key as keyof WorkingHours;
            const backendDay = editingSalon.businessHours[dayKey];
            if (backendDay) {
                newHours[dayKey] = {
                    isOpen: backendDay.isOpen !== undefined ? backendDay.isOpen : true,
                    openTime: backendDay.open || '09:00',
                    closeTime: backendDay.close || '17:00'
                };
            } else {
                 newHours[dayKey] = { ...DEFAULT_HOURS, isOpen: false };
            }
        });
        setWorkingHours(newHours);
    } else if (editingSalon.settings?.workingHours) {
        setWorkingHours(editingSalon.settings.workingHours);
    }
  }, [editingSalon]);

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setFormData(prev => ({ ...prev, latitude, longitude }));
      setMapRegion(prev => ({ ...prev, latitude, longitude }));
      await reverseGeocodeLocation(latitude, longitude);
    } catch {
      console.error('Error getting location');
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
    if (status === 'granted' && mode !== 'edit') {
      getCurrentLocation();
    }
  }, [mode, getCurrentLocation]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    if (mode === 'edit' && editingSalon) {
      prefillForm();
    }
  }, [mode, editingSalon, prefillForm]);

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const place = results[0];
        
        const streetParts: string[] = [];
        if (place.streetNumber) streetParts.push(place.streetNumber);
        if (place.street) streetParts.push(place.street);
        if (place.name && place.name !== place.street) streetParts.push(place.name);
        if (streetParts.length === 0 && place.district) {
          streetParts.push(place.district);
        }
        const streetAddress = streetParts.length > 0 ? streetParts.join(', ') : place.formattedAddress || '';
        const rwandaDistrict = place.subregion || place.district || '';
        const rwandaCity = place.city || (place.region?.includes('Kigali') ? 'Kigali' : '') || '';
        
        setFormData(prev => ({
          ...prev,
          address: streetAddress || prev.address,
          city: rwandaCity || prev.city,
          district: rwandaDistrict || prev.district,
        }));
        
        setErrors(prev => ({
          ...prev,
          address: '',
          city: '',
          district: '',
        }));
      }
    } catch {
      console.error('[CreateSalon] Reverse geocoding error');
    }
  };

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (): boolean => {
    const newErrors: FormErrors = {};

    if (currentStep === 0) {
      if (!formData.name.trim()) {
        newErrors.name = 'Salon name is required';
      }
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      }
    }

    if (currentStep === 1) {
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
    }

    if (currentStep === 3) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    try {
      setSubmitting(true);
      
      const commonData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        district: formData.district.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        registrationNumber: formData.registrationNumber.trim() || undefined,
        latitude: formData.latitude !== undefined ? Number(formData.latitude) : undefined,
        longitude: formData.longitude !== undefined ? Number(formData.longitude) : undefined,
        country: 'Rwanda',
        settings: {
          workingHours: workingHours,
          // New fields added to settings
          businessTypes: formData.businessTypes.length > 0 ? formData.businessTypes : undefined,
          targetClientele: formData.targetClientele || undefined,
          openingDate: formData.openingDate || undefined,
          numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees, 10) : undefined,
          licenseNumber: formData.licenseNumber.trim() || undefined,
          taxId: formData.taxId.trim() || undefined,
        },
      };

      if (mode === 'edit' && editingSalon?.id) {
          // UPDATE EXISTING SALON
          await salonService.updateSalon(editingSalon.id, commonData);
          
          Alert.alert(
            'Success',
            'Salon updated successfully',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );

      } else {
          // CREATE NEW SALON
          const salonData: CreateSalonDto = {
            ...commonData,
            ownerId: String(user.id),
          } as CreateSalonDto;

          // Clean data logic for creation
          const cleanedData: any = {};
          Object.keys(salonData).forEach(key => {
             const value = (salonData as any)[key];
             if (key === 'settings') {
               cleanedData[key] = value;
             } 
             else if (key === 'latitude' || key === 'longitude') {
               if (value !== undefined && value !== null && !isNaN(Number(value))) {
                 cleanedData[key] = Number(value);
               }
             }
             else if (value !== undefined && value !== '') {
               cleanedData[key] = value;
             }
          });

          const newSalon = await salonService.createSalon(cleanedData);
          
          Alert.alert(
            'Success! 🎉',
            `Your salon "${newSalon.name}" has been created successfully. Welcome to your dashboard!`,
            [
              {
                text: 'Go to Dashboard',
                onPress: () => navigation.navigate('OwnerDashboard'),
              },
            ]
          );
      }
    } catch (error: any) {
      console.error('[CreateSalon] Error:', error?.message || 'Unknown error');
      let errorMessage = 'Failed to submit. Please try again.';
      if (error?.response?.data?.message) {
        errorMessage = Array.isArray(error.response.data.message)
          ? error.response.data.message.join('\n')
          : error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('member')) {
        Alert.alert(
          'Membership Required',
          'You must be an approved member to perform this action.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setFormData(prev => ({ ...prev, latitude, longitude }));
    await reverseGeocodeLocation(latitude, longitude);
  };

  const updateDayHours = (day: keyof WorkingHours, field: keyof DayHours, value: boolean | string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const openTimePicker = (day: keyof WorkingHours, field: 'openTime' | 'closeTime') => {
    setSelectedTimeInfo({ day, field });
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (event.type === 'set' && selectedDate && selectedTimeInfo) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateDayHours(selectedTimeInfo.day, selectedTimeInfo.field, timeString);
    }
    
    if (Platform.OS === 'android') {
      setSelectedTimeInfo(null);
    }
  };

  const timeStringToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  // RENDER HELPERS
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((step, index) => (
        <React.Fragment key={step}>
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, index <= currentStep && styles.stepCircleActive]}>
              {index < currentStep ? (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, index <= currentStep && styles.stepNumberActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[
                styles.stepLabel, 
                dynamicStyles.textSecondary,
                index === currentStep && { color: theme.colors.primary }
            ]}>
              {step}
            </Text>
          </View>
          {index < STEPS.length - 1 && (
            <View style={[styles.stepLine, index < currentStep && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      multiline?: boolean;
      icon?: string;
      required?: boolean;
    } = {}
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.inputLabel, dynamicStyles.text]}>
          {label}
          {options.required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      </View>
      <View style={[styles.inputContainer, dynamicStyles.input, errors[field] && styles.inputError]}>
        {options.icon && (
          <MaterialIcons
            name={options.icon as any}
            size={20}
            color={dynamicStyles.textSecondary.color}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: dynamicStyles.input.color },
            options.multiline && styles.multilineInput,
          ]}
          placeholder={options.placeholder}
          placeholderTextColor={dynamicStyles.textSecondary.color}
          value={String(formData[field] || '')}
          onChangeText={(value) => updateFormData(field, value)}
          keyboardType={options.keyboardType || 'default'}
          multiline={options.multiline}
          numberOfLines={options.multiline ? 4 : 1}
        />
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, dynamicStyles.text]}>Basic Information</Text>
      <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
        Tell us about your salon
      </Text>
      
      {renderInputField('Salon Name', 'name', {
        placeholder: 'Enter your salon name',
        icon: 'store',
        required: true,
      })}

      {/* Business Type Picker */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.inputLabel, dynamicStyles.text]}>
            Business Type <Text style={{ color: theme.colors.error }}>*</Text>
          </Text>
        </View>
        <View style={[styles.pickerContainer, dynamicStyles.input, errors.businessTypes && styles.inputError]}>
          <MaterialIcons name="business" size={20} color={dynamicStyles.textSecondary.color} style={styles.inputIcon} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {BUSINESS_TYPES.map((type) => {
              const isSelected = formData.businessTypes.includes(type.value);
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.pickerOption,
                    isSelected && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData(prev => {
                      const currentTypes = prev.businessTypes;
                      if (currentTypes.includes(type.value)) {
                        // Remove if already selected
                        return { ...prev, businessTypes: currentTypes.filter(t => t !== type.value) };
                      } else {
                        // Add if not selected
                        return { ...prev, businessTypes: [...currentTypes, type.value] };
                      }
                    });
                    if (errors.businessTypes) setErrors(prev => ({ ...prev, businessTypes: '' }));
                  }}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={18}
                    color={isSelected ? '#FFFFFF' : dynamicStyles.textSecondary.color}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[
                    styles.pickerOptionText,
                    dynamicStyles.text,
                    isSelected && styles.pickerOptionTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {errors.businessTypes && <Text style={styles.errorText}>{errors.businessTypes}</Text>}
      </View>

      {/* Target Clientele Checkboxes */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.inputLabel, dynamicStyles.text]}>
            Target Clientele <Text style={{ color: theme.colors.error }}>*</Text>
          </Text>
        </View>
        <View style={styles.checkboxRow}>
          {TARGET_CLIENTELE.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.checkboxOption,
                dynamicStyles.input,
                formData.targetClientele === option.value && styles.checkboxOptionSelected,
              ]}
              onPress={() => {
                setFormData(prev => ({ ...prev, targetClientele: option.value }));
                if (errors.targetClientele) setErrors(prev => ({ ...prev, targetClientele: '' }));
              }}
            >
              <MaterialIcons
                name={formData.targetClientele === option.value ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
                color={formData.targetClientele === option.value ? theme.colors.primary : dynamicStyles.textSecondary.color}
              />
              <Text style={[
                styles.checkboxLabel,
                dynamicStyles.text,
                formData.targetClientele === option.value && { color: theme.colors.primary, fontWeight: '600' },
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.targetClientele && <Text style={styles.errorText}>{errors.targetClientele}</Text>}
      </View>

      {renderInputField('Registration Number', 'registrationNumber', {
        placeholder: 'Business Registration Number',
        icon: 'verified-user',
      })}
      
      {renderInputField('Description', 'description', {
        placeholder: 'Describe your salon and services...',
        icon: 'description',
        multiline: true,
        required: true,
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, dynamicStyles.text]}>Location</Text>
      <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
        Where is your salon located?
      </Text>
      {renderInputField('Street Address', 'address', {
        placeholder: 'Enter street address',
        icon: 'location-on',
        required: true,
      })}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          {renderInputField('City', 'city', { placeholder: 'City', required: true })}
        </View>
        <View style={styles.halfWidth}>
          {renderInputField('District', 'district', { placeholder: 'District' })}
        </View>
      </View>
      <View style={styles.mapContainer}>
        <Text style={[styles.inputLabel, dynamicStyles.text]}>Pin Location on Map</Text>
        <View style={styles.mapWrapper}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
          >
            {formData.latitude && formData.longitude && (
              <Marker
                coordinate={{ latitude: formData.latitude, longitude: formData.longitude }}
              />
            )}
          </MapView>
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <MaterialIcons name="my-location" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {formData.latitude && formData.longitude && (
          <Text style={[styles.coordinatesText, dynamicStyles.textSecondary]}>
            📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
          </Text>
        )}
      </View>
    </View>
  );

  const DAYS: { key: keyof WorkingHours; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, dynamicStyles.text]}>Business Hours</Text>
      <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
        Set your salon's working hours
      </Text>
      {DAYS.map(({ key, label }) => (
        <View key={key} style={[styles.dayRow, dynamicStyles.card]}>
          <View style={styles.dayInfo}>
            <TouchableOpacity
              style={[styles.dayToggle, workingHours[key].isOpen && styles.dayToggleActive]}
              onPress={() => updateDayHours(key, 'isOpen', !workingHours[key].isOpen)}
            >
              <MaterialIcons
                name={workingHours[key].isOpen ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={workingHours[key].isOpen ? theme.colors.primary : dynamicStyles.textSecondary.color}
              />
            </TouchableOpacity>
            <Text style={[styles.dayLabel, dynamicStyles.text, !workingHours[key].isOpen && { opacity: 0.5 }]}>
              {label}
            </Text>
          </View>
          
          {workingHours[key].isOpen ? (
            <View style={styles.timeContainer}>
              <TouchableOpacity
                style={[styles.timeButton, dynamicStyles.input]}
                onPress={() => openTimePicker(key, 'openTime')}
              >
                <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
                <Text style={[styles.timeButtonText, dynamicStyles.text]}>{workingHours[key].openTime}</Text>
              </TouchableOpacity>
              <Text style={[styles.timeSeparator, dynamicStyles.textSecondary]}>to</Text>
              <TouchableOpacity
                style={[styles.timeButton, dynamicStyles.input]}
                onPress={() => openTimePicker(key, 'closeTime')}
              >
                <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
                <Text style={[styles.timeButtonText, dynamicStyles.text]}>{workingHours[key].closeTime}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.closedText, dynamicStyles.textSecondary]}>Closed</Text>
          )}
        </View>
      ))}

      {showTimePicker && selectedTimeInfo && (
        <DateTimePicker
          value={timeStringToDate(workingHours[selectedTimeInfo.day][selectedTimeInfo.field])}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, dynamicStyles.text]}>Contact Information</Text>
      <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
        How can customers reach you?
      </Text>
      {renderInputField('Phone Number', 'phone', {
        placeholder: '+250 XXX XXX XXX',
        icon: 'phone',
        keyboardType: 'phone-pad',
        required: true,
      })}
      {renderInputField('Email', 'email', {
        placeholder: 'salon@example.com',
        icon: 'email',
        keyboardType: 'email-address',
      })}
      {renderInputField('Website', 'website', {
        placeholder: 'https://www.yoursalon.com',
        icon: 'language',
      })}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      default: return null;
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Salon' : 'Create Your Salon'}</Text>
          <Text style={styles.headerSubtitle}>Step {currentStep + 1} of {STEPS.length}</Text>
        </View>
        <View style={styles.placeholder} />
      </LinearGradient>

      {renderProgressBar()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={[styles.bottomBar, dynamicStyles.card]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.secondaryButton, dynamicStyles.card]}
              onPress={handleBack}
            >
              <Text style={[styles.secondaryButtonText, dynamicStyles.text]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              currentStep === 0 && styles.fullWidthButton,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={submitting}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>{mode === 'edit' ? 'Updating...' : 'Creating...'}</Text>
                </>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {currentStep === STEPS.length - 1 
                    ? (mode === 'edit' ? 'Update Salon' : 'Create Salon') 
                    : 'Next'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight!,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: 4,
    marginBottom: 16, // Align with circles
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  mapContainer: {
    marginTop: 8,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  locationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  coordinatesText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  dayRow: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayToggle: {
    marginRight: 12,
  },
  dayToggleActive: {
    opacity: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  timeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  timeSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  closedText: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingLeft: 34, 
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // New styles for Business Type Picker
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickerScroll: {
    flex: 1,
    marginLeft: 8,
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    marginRight: 8,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // New styles for Target Clientele Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkboxOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  checkboxOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(128, 74, 216, 0.1)',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
