import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService } from '../../services/salon';

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
  });
  const [loading, setLoading] = useState(false);
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
    try {
      if (isEditMode && service) {
        await salonService.updateService(service.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          basePrice: Number(formData.price),
          durationMinutes: Number(formData.duration),
          isActive: formData.isActive,
          category: formData.category,
          targetGender: formData.targetGender,
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
        });
        route.params.onSave?.();
        Alert.alert('Success! 🎉', 'Service added!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
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
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Compact Header */}
      <View style={[styles.header, dynamicStyles.card]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {isEditMode ? 'Edit Service' : 'Add Service'}
        </Text>
        {isEditMode && (
          <TouchableOpacity onPress={handleDelete} disabled={deleteLoading} style={styles.deleteBtn}>
            <MaterialIcons name="delete-outline" size={22} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Name & Description - Compact Card */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.fieldRow}>
              <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, dynamicStyles.text]}>Service Name *</Text>
            </View>
            <TextInput
              style={[styles.input, dynamicStyles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(t) => updateField('name', t)}
              placeholder="e.g. Premium Haircut"
              placeholderTextColor={dynamicStyles.textSecondary.color}
            />
            
            <View style={[styles.fieldRow, { marginTop: 12 }]}>
              <MaterialIcons name="notes" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, dynamicStyles.text]}>Description</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea, dynamicStyles.input]}
              value={formData.description}
              onChangeText={(t) => updateField('description', t)}
              placeholder="What's included..."
              placeholderTextColor={dynamicStyles.textSecondary.color}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Category - Compact Horizontal */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.fieldRow}>
              <MaterialIcons name="category" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, dynamicStyles.text]}>Category *</Text>
              {errors.category && <Text style={styles.errorInline}>{errors.category}</Text>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SERVICE_CATEGORIES.map((cat) => {
                const isSelected = formData.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      { backgroundColor: isSelected ? cat.color : (isDark ? '#2D2D2D' : '#F0F0F0') },
                    ]}
                    onPress={() => updateField('category', cat.value)}
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

          {/* Target Gender - Compact Row */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.fieldRow}>
              <MaterialIcons name="people" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, dynamicStyles.text]}>For *</Text>
              {errors.targetGender && <Text style={styles.errorInline}>{errors.targetGender}</Text>}
            </View>
            <View style={styles.genderRow}>
              {TARGET_GENDER.map((opt) => {
                const isSelected = formData.targetGender === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.genderBtn,
                      { 
                        backgroundColor: isSelected ? theme.colors.primary : (isDark ? '#2D2D2D' : '#F0F0F0'),
                        borderColor: isSelected ? theme.colors.primary : (isDark ? '#404040' : '#E0E0E0'),
                      },
                    ]}
                    onPress={() => updateField('targetGender', opt.value)}
                  >
                    <Text style={[styles.genderText, { color: isSelected ? '#FFF' : dynamicStyles.text.color }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Price & Duration - Compact Row */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="attach-money" size={18} color={theme.colors.primary} />
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Price (RWF) *</Text>
                </View>
                <TextInput
                  style={[styles.input, dynamicStyles.input, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(t) => updateField('price', t)}
                  placeholder="5000"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceField}>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="schedule" size={18} color={theme.colors.primary} />
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Duration (min) *</Text>
                </View>
                <TextInput
                  style={[styles.input, dynamicStyles.input, errors.duration && styles.inputError]}
                  value={formData.duration}
                  onChangeText={(t) => updateField('duration', t)}
                  placeholder="30"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Active Toggle (Edit Mode Only) */}
          {isEditMode && (
            <View style={[styles.card, dynamicStyles.card, styles.toggleCard]}>
              <View>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Service Active</Text>
                <Text style={[styles.subText, dynamicStyles.textSecondary]}>Visible for bookings</Text>
              </View>
              <TouchableOpacity
                onPress={() => updateField('isActive', !formData.isActive)}
                style={[styles.toggle, { backgroundColor: formData.isActive ? theme.colors.success : '#CCC' }]}
              >
                <View style={[styles.toggleKnob, formData.isActive ? { right: 2 } : { left: 2 }]} />
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.bottomBar, dynamicStyles.card]}>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitBtn}>
            <LinearGradient
              colors={loading ? ['#9CA3AF', '#6B7280'] : [theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name={isEditMode ? 'save' : 'add-circle'} size={20} color="#FFF" />
                  <Text style={styles.submitText}>{isEditMode ? 'Save Changes' : 'Add Service'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight! + 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 12 },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 12 },
  
  card: { borderRadius: 14, padding: 14, borderWidth: 1 },
  
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  textArea: { height: 60, textAlignVertical: 'top', paddingTop: 10 },
  inputError: { borderColor: theme.colors.error },
  
  errorInline: { color: theme.colors.error, fontSize: 11, marginLeft: 'auto' },
  
  chipScroll: { marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 5,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: { fontSize: 14, fontWeight: '600' },
  
  priceRow: { flexDirection: 'row', gap: 12 },
  priceField: { flex: 1 },
  
  toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subText: { fontSize: 12, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', position: 'absolute',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 2,
  },
  
  bottomBar: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1 },
  submitBtn: { borderRadius: 12, overflow: 'hidden', elevation: 3 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
