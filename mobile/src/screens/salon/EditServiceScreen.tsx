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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService } from '../../services/salon';

interface EditServiceScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      service: {
        id: string;
        name: string;
        description?: string;
        price: number;
        duration: number;
        isActive: boolean;
        code?: string;
      };
    };
  };
}

export default function EditServiceScreen({ navigation, route }: EditServiceScreenProps) {
  const { salonId, service } = route.params;
  const { isDark } = useTheme();
  
  const [formData, setFormData] = useState({
    name: service.name || '',
    description: service.description || '',
    price: service.price?.toString() || '',
    duration: service.duration?.toString() || '',
    isActive: service.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
      color: isDark ? '#FFFFFF' : '#000000', // High contrast forced
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray300,
    },
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Must be >= 0';
    }
    
    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    } else if (isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
      newErrors.duration = 'Must be > 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) {
        Alert.alert('Validation Error', 'Please check the form fields');
        return;
    }

    setLoading(true);
    try {
      await salonService.updateService(service.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        duration: Number(formData.duration),
        isActive: formData.isActive,
      });

      Alert.alert(
        'Success',
        'Service has been updated',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This may affect past appointments.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
               await salonService.deleteService(service.id);
               Alert.alert('Success', 'Service has been deleted');
               navigation.goBack();
            } catch (err: any) {
               Alert.alert('Error', err.message || 'Failed to delete service');
            } finally {
               setDeleteLoading(false);
            }
          }
        }
      ]
    );
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (typeof value === 'string' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Edit Service</Text>
        <TouchableOpacity 
             onPress={handleDelete}
             disabled={deleteLoading}
             style={{ padding: 8 }}
        >
            <MaterialIcons name="delete-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        {/* SECTION 1: DETAILS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.secondary }]}>
              <MaterialIcons name="content-cut" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Service Details</Text>
          </View>

          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.label, dynamicStyles.textSecondary]}>Service Name *</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="e.g. Mens Haircut"
              placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={[styles.label, dynamicStyles.textSecondary, { marginTop: 15 }]}>Description</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="Describe what's included..."
              placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* SECTION 2: PRICING */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.success }]}>
              <MaterialIcons name="attach-money" size={20} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Pricing & Time</Text>
          </View>

          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.textSecondary]}>Price (RWF) *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={formData.price}
                  onChangeText={(text) => updateField('price', text)}
                  placeholder="0"
                  placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
                  keyboardType="numeric"
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>
              <View style={{ width: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, dynamicStyles.textSecondary]}>Duration (min) *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={formData.duration}
                  onChangeText={(text) => updateField('duration', text)}
                  placeholder="30"
                  placeholderTextColor={isDark ? theme.colors.gray500 : theme.colors.gray400}
                  keyboardType="numeric"
                />
                {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: STATUS */}
        <View style={styles.section}>
            <View style={[styles.card, dynamicStyles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View>
                    <Text style={[styles.label, dynamicStyles.textSecondary, { marginBottom: 2 }]}>Active Service</Text>
                    <Text style={{ color: isDark ? theme.colors.gray500 : theme.colors.gray500, fontSize: 13 }}>
                        Visible for bookings
                    </Text>
                </View>
                <TouchableOpacity 
                    onPress={() => updateField('isActive', !formData.isActive)}
                    style={[
                        styles.toggle,
                        { backgroundColor: formData.isActive ? theme.colors.success : theme.colors.gray300 }
                    ]}
                >
                    <View style={[
                        styles.toggleKnob,
                        formData.isActive ? { right: 2 } : { left: 2 }
                    ]} />
                </TouchableOpacity>
            </View>
        </View>

        {/* Submit Button */}
         <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={[
            styles.submitButton, 
            { backgroundColor: loading ? theme.colors.gray400 : theme.colors.primary }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    paddingBottom: 20 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  
  card: { 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    elevation: 2,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { 
    height: 50, 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    fontSize: 16 
  },
  
  row: { flexDirection: 'row' },
  errorText: { color: theme.colors.error, fontSize: 12, marginTop: 5 },
  
  submitButton: { 
    marginTop: 10,
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 4
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
  },
  toggleKnob: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#fff',
      position: 'absolute',
      shadowColor: "#000",
      shadowOffset: {	width: 0, height: 2 },
      shadowOpacity: 0.2,
      elevation: 2,
  }
});
