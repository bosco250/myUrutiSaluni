import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth, useTheme } from '../../context';
import { salonService, CreateSalonDto } from '../../services/salon';
import { uploadService } from '../../services/upload';
import * as ImagePicker from 'expo-image-picker';

// Step Components 
import { Step1BasicInfo } from './steps/Step1_BasicInfo';
import { Step2Location } from './steps/Step2_Location';
import { Step3BusinessHours } from './steps/Step3_BusinessHours';
import { Step4ContactInfo } from './steps/Step4_ContactInfo';

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
  images: string[];
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
    images: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  


  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (uri: string) => {
    setUploading(true);
    try {
      const response = await uploadService.uploadServiceImage(uri);
      setFormData(prev => ({
          ...prev,
          images: [...prev.images, response.url]
      }));
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
    }));
  };

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
      borderColor: isDark ? '#4A4A4C' : (theme.colors.borderLight || '#E0E0E0'),
    },
    border: {
      borderColor: isDark ? '#374151' : '#E5E7EB',
    }
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
      images: editingSalon.images || editingSalon.photos || [],
    });

    if (editingSalon.latitude && editingSalon.longitude) {
      // Location coordinates are handled by Step2Location component
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

  // Load salon data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && editingSalon) {
      prefillForm();
    }
  }, [mode, editingSalon, prefillForm]);

  const updateFormData = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleToggleBusinessType = useCallback((type: string) => {
    setFormData(prev => {
      const currentTypes = prev.businessTypes;
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      return { ...prev, businessTypes: newTypes };
    });
    if (errors.businessTypes) {
        setErrors(prev => { const e = { ...prev }; delete e.businessTypes; return e; });
    }
  }, [errors]);

  const validateStep = (): boolean => {
    const newErrors: FormErrors = {};

    if (currentStep === 0) {
      if (!formData.name.trim()) {
        newErrors.name = 'Salon name is required';
      }
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      }
      if (!formData.targetClientele) {
        newErrors.targetClientele = 'Target clientele is required';
      }
      if (formData.businessTypes.length === 0) {
        newErrors.businessTypes = 'At least one business type is required';
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
        images: formData.images || [],
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

          console.log('Creating salon with data:', cleanedData);
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
      console.error('[CreateSalon] Error:', error);
      let errorMessage = 'Failed to submit. Please try again.';
      
      // Better error handling
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



  // RENDER HELPERS
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((step, index) => (
        <React.Fragment key={step}>
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, index <= currentStep && styles.stepCircleActive, { borderColor: theme.colors.primary }]}>
              {index < currentStep ? (
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, index <= currentStep && styles.stepNumberActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[
                styles.stepLabel, 
                dynamicStyles.textSecondary,
                index === currentStep && { color: theme.colors.primary, fontWeight: '700' }
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

  const renderStep1 = () => (
    <Step1BasicInfo
        formData={formData}
        errors={errors}
        isDark={isDark}
        dynamicStyles={dynamicStyles}
        onUpdateField={updateFormData}
        onToggleBusinessType={handleToggleBusinessType}
        onUpdateTargetClientele={(value) => {
            setFormData(prev => ({ ...prev, targetClientele: value }));
            if (errors.targetClientele) setErrors(prev => ({ ...prev, targetClientele: '' }));
        }}
    />
  );

  const renderStep2 = () => (
      <Step2Location
        formData={formData}
        errors={errors}
        isDark={isDark}
        dynamicStyles={dynamicStyles}
        onUpdateField={updateFormData}
        onLocationSelected={(lat, lng, address, city, district) => {
            setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            address: address || prev.address,
            city: city || prev.city,
            district: district || prev.district,
            }));
            setErrors(prev => ({
            ...prev,
            address: '',
            city: '',
            district: '',
            }));
        }}
    />
  );

  const renderStep3 = () => (
    <Step3BusinessHours
      workingHours={workingHours}
      onUpdateWorkingHours={setWorkingHours}
      isDark={isDark}
      dynamicStyles={dynamicStyles}
    />
  );

  const renderStep4 = () => (
    <Step4ContactInfo
      formData={formData}
      errors={errors}
      isDark={isDark}
      dynamicStyles={dynamicStyles}
      onUpdateField={updateFormData}
      onPickImage={pickImage}
      onRemoveImage={removeImage}
      uploading={uploading}
    />
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Admin Style Standard Header */}
      <View style={[styles.header, { borderBottomColor: dynamicStyles.border.borderColor }]}>
        <View style={styles.headerTopRow}>
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: dynamicStyles.card.backgroundColor, borderColor: dynamicStyles.border.borderColor }]} 
              onPress={handleBack}
            >
              <MaterialIcons name="arrow-back" size={20} color={dynamicStyles.text.color} />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, dynamicStyles.text]}>{mode === 'edit' ? 'Edit Salon' : 'Create Salon'}</Text>
                <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>Step {currentStep + 1} of {STEPS.length}</Text>
            </View>
            <View style={{ width: 40 }} /> 
        </View>
      </View>

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

        <View style={[styles.bottomBar, dynamicStyles.card, { borderTopColor: dynamicStyles.border.borderColor }]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.secondaryButton, dynamicStyles.card, { borderColor: dynamicStyles.border.borderColor }]}
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
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={handleNext}
            disabled={submitting}
          >
             {submitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>{mode === 'edit' ? 'Updating...' : 'Creating...'}</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                   <Text style={styles.primaryButtonText}>
                    {currentStep === STEPS.length - 1 
                      ? (mode === 'edit' ? 'Update Salon' : 'Create Salon') 
                      : 'Next'}
                  </Text>
                  {currentStep < STEPS.length - 1 && <MaterialIcons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 4 }} />}
                </View>
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitles: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
    marginBottom: 20, // Align with circles
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
    padding: 16,
    paddingBottom: 80,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },
  dayRow: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
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
    padding: 16,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  primaryButton: {
    flex: 2,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  photosContainer: {
    marginBottom: 16,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 140,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
});
