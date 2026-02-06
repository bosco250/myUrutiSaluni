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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService } from '../../services/salon';
import { uploadService } from '../../services/upload';

interface ServiceFormScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      mode?: 'create' | 'edit';
      onSave?: () => void;
      service?: {
        id: string;
        name: string;
        description?: string;
        price: number;
        basePrice?: number;
        duration: number;
        durationMinutes?: number;
        isActive: boolean;
        category?: string;
        targetGender?: string;
        imageUrl?: string;
        images?: string[];
        metadata?: {
          category?: string;
          targetGender?: string;
        };
      };
    };
  };
}

// Service Categories with individual colors (compact)
const SERVICE_CATEGORIES = [
  { value: 'haircut', label: 'Haircut', icon: 'content-cut', color: '#6366F1' },
  { value: 'styling', label: 'Styling', icon: 'auto-awesome', color: '#EC4899' },
  { value: 'coloring', label: 'Coloring', icon: 'palette', color: '#F59E0B' },
  { value: 'braiding', label: 'Braiding', icon: 'gesture', color: '#8B5CF6' },
  { value: 'treatment', label: 'Treatment', icon: 'spa', color: '#10B981' },
  { value: 'shaving', label: 'Shaving', icon: 'face', color: '#3B82F6' },
  { value: 'nails', label: 'Nails', icon: 'brush', color: '#EF4444' },
  { value: 'makeup', label: 'Makeup', icon: 'face-retouching-natural', color: '#F472B6' },
  { value: 'massage', label: 'Massage', icon: 'self-improvement', color: '#14B8A6' },
  { value: 'skincare', label: 'Skincare', icon: 'water-drop', color: '#06B6D4' },
  { value: 'other', label: 'Other', icon: 'add-circle-outline', color: '#6B7280' },
];

// Target Gender Options
const TARGET_GENDER = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'both', label: 'Both' },
];

export default function AddServiceScreen({ navigation, route }: ServiceFormScreenProps) {
  const { salonId, service } = route.params;
  const { isDark } = useTheme();
  
  // Implicitly detect edit mode if service is provided
  const mode = route.params.mode || (service ? 'edit' : 'create');
  const isEditMode = mode === 'edit' && !!service;

  React.useEffect(() => {
    if (!salonId) {
      Alert.alert('Error', 'Salon ID is missing');
      navigation.goBack();
    }
  }, [salonId, navigation]);
  
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.basePrice?.toString() || service?.price?.toString() || '',
    duration: service?.durationMinutes?.toString() || service?.duration?.toString() || '',
    category: service?.category || service?.metadata?.category || '',
    targetGender: service?.targetGender || service?.metadata?.targetGender || '',
    isActive: service?.isActive ?? true,
    imageUrl: service?.imageUrl || '',
    images: service?.images || [],
  });
  const [imageUris, setImageUris] = useState<string[]>(service?.images?.length ? service.images : (service?.imageUrl ? [service.imageUrl] : []));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#121212' : '#F5F5F5' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#9CA3AF' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderColor: isDark ? '#2D2D2D' : '#E8E8E8',
    },
    input: {
      backgroundColor: isDark ? '#2D2D2D' : '#F9F9F9',
      color: isDark ? '#FFFFFF' : '#1A1A2E',
      borderColor: isDark ? '#404040' : '#E0E0E0',
    },
    headerBorder: {
      borderBottomColor: isDark ? '#2D2D2D' : '#F0F0F0',
    },
  };



  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUris(prev => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index: number) => {
      setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Required';
    if (!formData.category) newErrors.category = 'Select category';
    if (!formData.targetGender) newErrors.targetGender = 'Select target';
    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Invalid';
    }
    if (!formData.duration.trim() || isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
      newErrors.duration = 'Invalid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    let finalImageUrls: string[] = [];

    try {
      // proper upload logic for multiple images
      if (imageUris.length > 0) {
         setUploading(true);
         const uploadPromises = imageUris.map(async (uri) => {
             if (uri.startsWith('http')) return uri; // Already uploaded
             const res = await uploadService.uploadServiceImage(uri);
             return res.url;
         });
         finalImageUrls = await Promise.all(uploadPromises);
         setUploading(false);
      }

      const primaryImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : '';

      if (isEditMode && service) {
        await salonService.updateService(service.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          basePrice: Number(formData.price),
          durationMinutes: Number(formData.duration),
          isActive: formData.isActive,
          category: formData.category,
          targetGender: formData.targetGender,
          imageUrl: primaryImageUrl,
          images: finalImageUrls,
        });
        route.params.onSave?.();
        Alert.alert('Success', 'Service updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await salonService.addService(salonId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          basePrice: Number(formData.price),
          durationMinutes: Number(formData.duration),
          category: formData.category,
          targetGender: formData.targetGender,
          imageUrl: primaryImageUrl,
          images: finalImageUrls,
        });
        route.params.onSave?.();
        Alert.alert('Success! 🎉', 'Service added!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      setUploading(false);
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!service) return;
    Alert.alert('Delete Service', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setDeleteLoading(true);
          try {
            await salonService.deleteService(service.id);
            Alert.alert('Deleted', 'Service removed');
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete');
          } finally {
            setDeleteLoading(false);
          }
        }
      }
    ]);
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Standard Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>
            {isEditMode ? 'Edit Service' : 'New Service'}
          </Text>
          {isEditMode && (
            <TouchableOpacity onPress={handleDelete} disabled={deleteLoading} style={styles.deleteBtn}>
              <MaterialIcons name="delete-outline" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Media Section */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Media</Text>
          <View style={[styles.card, dynamicStyles.card, { padding: 16 }]}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, alignItems: 'center' }}>
                 {/* Add Button */}
                 <TouchableOpacity 
                    style={[styles.addImageBtn, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }]} 
                    onPress={pickImage}
                    activeOpacity={0.7}
                 >
                    <View style={[styles.addIconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                        <MaterialIcons name="add-a-photo" size={20} color={theme.colors.primary} />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.colors.primary, marginTop: 6, fontWeight: '600' }}>Add Photo</Text>
                 </TouchableOpacity>

                 {/* Images List */}
                 {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageThumbnailContainer}>
                        <Image source={{ uri }} style={styles.imageThumbnail} />
                        <TouchableOpacity 
                           style={styles.removeImageBtn}
                           onPress={() => removeImage(index)}
                           activeOpacity={0.8}
                        >
                            <MaterialIcons name="close" size={12} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                 ))}
             </ScrollView>
             {imageUris.length === 0 && (
                 <Text style={[styles.subText, dynamicStyles.textSecondary, { textAlign: 'center', marginTop: 12 }]}>
                     Showcase your work with up to 5 photos
                 </Text>
             )}
          </View>

          {/* Basic Info Section */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service Details</Text>
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Service Name *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(t) => updateField('name', t)}
                  placeholder="e.g. Premium Haircut"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                />
            </View>
            
            <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, dynamicStyles.input]}
                  value={formData.description}
                  onChangeText={(t) => updateField('description', t)}
                  placeholder="Describe what's included in this service..."
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  multiline
                  numberOfLines={3}
                />
            </View>
          </View>

          {/* Category Section */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Category *</Text>
          <View style={[styles.card, dynamicStyles.card, { paddingVertical: 16 }]}>
            {errors.category && <Text style={styles.errorInline}>{errors.category}</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
              {SERVICE_CATEGORIES.map((cat) => {
                const isSelected = formData.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      { 
                        backgroundColor: isSelected ? theme.colors.primary : (isDark ? '#2D2D2D' : '#F3F4F6'),
                        borderColor: isSelected ? theme.colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => updateField('category', cat.value)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name={cat.icon as any} size={16} color={isSelected ? '#FFF' : cat.color} />
                    <Text style={[styles.chipText, { color: isSelected ? '#FFF' : dynamicStyles.text.color }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Settings Section */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Settings</Text>
          <View style={[styles.card, dynamicStyles.card]}>
            {/* Target Gender */}
            <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Target Audience *</Text>
                <View style={styles.genderRow}>
                  {TARGET_GENDER.map((opt) => {
                    const isSelected = formData.targetGender === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.genderBtn,
                          { 
                            backgroundColor: isSelected ? theme.colors.primary + '15' : (isDark ? '#2D2D2D' : '#F9FAFB'),
                            borderColor: isSelected ? theme.colors.primary : (isDark ? '#404040' : '#E5E7EB'),
                          },
                        ]}
                        onPress={() => updateField('targetGender', opt.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.genderText, { color: isSelected ? theme.colors.primary : dynamicStyles.text.color }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.targetGender && <Text style={[styles.errorInline, { marginTop: 4 }]}>{errors.targetGender}</Text>}
            </View>

            <View style={styles.divider} />

            {/* Price & Duration */}
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Price (RWF) *</Text>
                <View style={[styles.inputContainer, dynamicStyles.input, errors.price && styles.inputError]}>
                    <Text style={styles.inputPrefix}>RWF</Text>
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={formData.price}
                      onChangeText={(t) => updateField('price', t)}
                      placeholder="0"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                      keyboardType="numeric"
                    />
                </View>
              </View>
              <View style={styles.priceField}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Duration (min) *</Text>
                <View style={[styles.inputContainer, dynamicStyles.input, errors.duration && styles.inputError]}>
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={formData.duration}
                      onChangeText={(t) => updateField('duration', t)}
                      placeholder="30"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                      keyboardType="numeric"
                    />
                    <Text style={styles.inputSuffix}>min</Text>
                </View>
              </View>
            </View>

            {/* Active Toggle */}
            {isEditMode && (
                <>
                    <View style={styles.divider} />
                    <View style={styles.toggleRow}>
                      <View>
                        <Text style={[styles.fieldLabel, dynamicStyles.text]}>Available for Booking</Text>
                        <Text style={[styles.subText, dynamicStyles.textSecondary]}>Clients can see and book this service</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => updateField('isActive', !formData.isActive)}
                        style={[styles.toggle, { backgroundColor: formData.isActive ? theme.colors.success : '#E5E7EB' }]}
                        activeOpacity={0.9}
                      >
                        <View style={[styles.toggleKnob, formData.isActive ? { right: 2 } : { left: 2 }]} />
                      </TouchableOpacity>
                    </View>
                </>
            )}
          </View>

        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.bottomBar, dynamicStyles.card]}>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={loading} 
            style={[styles.submitBtn, { backgroundColor: loading ? '#9CA3AF' : theme.colors.primary }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {uploading ? 'Uploading Images...' : (isEditMode ? 'Save Changes' : 'Create Service')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    flex: 1,
    textAlign: 'center',
    marginRight: 0, 
  },
  backButton: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 16 },
  
  sectionTitle: {
      fontSize: 14,
      fontFamily: theme.fonts.semibold,
      marginBottom: -8, 
      opacity: 0.9,
      marginLeft: 4,
  },

  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  
  inputGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: theme.fonts.medium, marginBottom: 6, opacity: 0.8 },
  
  input: { 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    fontSize: 14,
    fontFamily: theme.fonts.regular 
  },
  textArea: { 
    height: 80, 
    textAlignVertical: 'top', 
    paddingTop: 10 
  },
  inputError: { borderColor: theme.colors.error },
  
  inputContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     borderWidth: 1,
     borderRadius: 10,
     paddingHorizontal: 12,
     height: 44,
  },
  inputPrefix: { marginRight: 8, fontSize: 14, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputSuffix: { marginLeft: 8, fontSize: 14, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputFlex: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, height: '100%' },

  errorInline: { color: theme.colors.error, fontSize: 11, marginTop: 4 },
  
  chipScrollContent: { paddingHorizontal: 4, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: { fontSize: 13, fontFamily: theme.fonts.medium },
  
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: { fontSize: 13, fontFamily: theme.fonts.medium },
  
  priceRow: { flexDirection: 'row', gap: 12 },
  priceField: { flex: 1 },
  
  divider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.1)', marginVertical: 16 },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subText: { fontSize: 11, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', position: 'absolute',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 2,
  },
  
  bottomBar: { 
      padding: 12, 
      borderTopWidth: 1,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
  },
  submitBtn: { 
    borderRadius: 10, 
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  submitText: { color: '#FFF', fontSize: 14, fontFamily: theme.fonts.semibold },
  
  addImageBtn: {
      width: 80,
      height: 80,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
  },
  addIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  imageThumbnailContainer: {
      width: 80,
      height: 80,
      borderRadius: 12,
      overflow: 'hidden',
  },
  imageThumbnail: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
  },
  removeImageBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
});
