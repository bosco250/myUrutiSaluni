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
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { Button } from '../../components';
import { salonService, SalonDetails } from '../../services/salon';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '../../services/upload';
import { Image } from 'react-native';

interface EditSalonScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      salon?: SalonDetails;
    };
  };
}

export default function EditSalonScreen({ navigation, route }: EditSalonScreenProps) {
  const salonId = route.params?.salonId;
  const initialSalon = route.params?.salon;
  const { isDark } = useTheme();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    registrationNumber: '',
    openTime: '08:00',
    closeTime: '20:00',
    isOpenSunday: false,
    images: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initialSalon);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    sectionTitle: {
      color: theme.colors.primary,
    }
  };

  const populateForm = useCallback((salon: any) => {
    // Try to extract hours from settings or businessHours
    let openTime = '08:00';
    let closeTime = '20:00';
    
    // Simplistic extraction for now - assuming Mon-Sat are similar
    if (salon.businessHours?.monday) {
        openTime = salon.businessHours.monday.open || '08:00';
        closeTime = salon.businessHours.monday.close || '20:00';
    }

    setFormData({
      name: salon.name || '',
      address: salon.address || '',
      city: salon.city || '',
      district: salon.district || '',
      phone: salon.phone || '',
      email: salon.email || '',
      website: salon.website || '',
      description: salon.description || '',
      registrationNumber: salon.registrationNumber || '', // Check if this field exists on backend
      openTime,
      closeTime,
      isOpenSunday: !!salon.businessHours?.sunday?.isOpen,
      images: salon.images || salon.photos || [],
    });
  }, []);

  const loadSalonDetails = useCallback(async () => {
    try {
      const salon = await salonService.getSalonDetails(salonId);
      populateForm(salon);
    } catch {
      Alert.alert('Error', 'Failed to load salon details');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  }, [salonId, navigation, populateForm]);

  useEffect(() => {
    if (!salonId) {
      Alert.alert('Error', 'Salon ID missing');
      navigation.goBack();
      return;
    }

    if (initialSalon) {
      populateForm(initialSalon);
    } else {
      loadSalonDetails();
    }
  }, [initialSalon, salonId, navigation, populateForm, loadSalonDetails]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Salon name is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.openTime && !/^\d{2}:\d{2}$/.test(formData.openTime)) {
        newErrors.openTime = 'Format: HH:MM';
    }
    if (formData.closeTime && !/^\d{2}:\d{2}$/.test(formData.closeTime)) {
        newErrors.closeTime = 'Format: HH:MM';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
        // Construct business hours object
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const businessHours: any = {};
        
        days.forEach(day => {
            businessHours[day] = { open: formData.openTime, close: formData.closeTime, isOpen: true };
        });
        
        // Sunday special handling
        if (formData.isOpenSunday) {
            businessHours['sunday'] = { open: formData.openTime, close: formData.closeTime, isOpen: true };
        } else {
            businessHours['sunday'] = { isOpen: false };
        }

      await salonService.updateSalon(salonId, {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        description: formData.description.trim() || undefined,
        // Add extra fields - type 'any' used broadly in service to allow extensions
        city: formData.city.trim() || undefined,
        district: formData.district.trim() || undefined,
        website: formData.website.trim() || undefined,
        registrationNumber: formData.registrationNumber.trim() || undefined,
        images: formData.images,
        settings: {
            businessHours, // For some backends
            operatingHours: businessHours // For other backends/explore compatibility
        }
      } as any);

      Alert.alert(
        'Success',
        'Salon details updated successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
        console.error('Update Error:', err);
      Alert.alert('Error', err.message || 'Failed to update salon');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (typeof value === 'string' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, dynamicStyles.container]}>
        <Text style={dynamicStyles.textSecondary}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={isDark ? theme.colors.white : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Edit Salon</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, dynamicStyles.text, { marginTop: 0 }]}>Salon Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            <TouchableOpacity style={[styles.addPhotoButton, { borderColor: theme.colors.primary }]} onPress={pickImage} disabled={uploading}>
                {uploading ? (
                    <Text style={{ color: theme.colors.primary }}>Uploading...</Text>
                ) : (
                    <>
                        <MaterialIcons name="add-a-photo" size={24} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 4 }}>Add Photo</Text>
                    </>
                )}
            </TouchableOpacity>
            {formData.images.map((img, index) => (
                <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri: img }} style={styles.photo} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => removeImage(index)}>
                        <MaterialIcons name="close" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Basic Information</Text>
        
        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Salon Name *</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input, errors.name && styles.inputError]}
              placeholder="Enter salon name"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Registration Number</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Business registration number"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.registrationNumber}
              onChangeText={(value) => updateField('registrationNumber', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, dynamicStyles.input]}
              placeholder="Describe your salon..."
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Phone</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Email</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input, errors.email && styles.inputError]}
              placeholder="Enter email address"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Website</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="https://example.com"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.website}
              onChangeText={(value) => updateField('website', value)}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Location</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.text]}>Address</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Street address"
              placeholderTextColor={theme.colors.textTertiary}
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, dynamicStyles.text]}>City</Text>
                <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="City"
                placeholderTextColor={theme.colors.textTertiary}
                value={formData.city}
                onChangeText={(value) => updateField('city', value)}
                />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, dynamicStyles.text]}>District</Text>
                <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="District"
                placeholderTextColor={theme.colors.textTertiary}
                value={formData.district}
                onChangeText={(value) => updateField('district', value)}
                />
            </View>
          </View>

          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Operating Hours</Text>
          <Text style={[styles.helperText, dynamicStyles.textSecondary]}>Set your standard opening hours (Mon-Sat).</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, dynamicStyles.text]}>Open (HH:MM)</Text>
                <TextInput
                style={[styles.input, dynamicStyles.input, errors.openTime && styles.inputError]}
                placeholder="08:00"
                placeholderTextColor={theme.colors.textTertiary}
                value={formData.openTime}
                onChangeText={(value) => updateField('openTime', value)}
                />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, dynamicStyles.text]}>Close (HH:MM)</Text>
                <TextInput
                style={[styles.input, dynamicStyles.input, errors.closeTime && styles.inputError]}
                placeholder="20:00"
                placeholderTextColor={theme.colors.textTertiary}
                value={formData.closeTime}
                onChangeText={(value) => updateField('closeTime', value)}
                />
            </View>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={[styles.inputLabel, dynamicStyles.text, { marginBottom: 0 }]}>Open on Sundays?</Text>
            <Switch
                value={formData.isOpenSunday}
                onValueChange={(val) => updateField('isOpenSunday', val)}
                trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }}
            />
          </View>

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  form: {
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },
  textArea: {
    minHeight: 80,
    paddingTop: theme.spacing.md,
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
  submitButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  photosContainer: {
      flexDirection: 'row',
      marginBottom: 20,
  },
  addPhotoButton: {
      width: 100,
      height: 100,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
  },
  photoWrapper: {
      width: 100,
      height: 100,
      marginRight: 10,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
  },
  photo: {
      width: '100%',
      height: '100%',
  },
  removePhotoButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  }
});
