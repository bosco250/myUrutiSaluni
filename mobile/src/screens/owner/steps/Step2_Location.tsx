import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { OpenStreetMapView } from '../components/OpenStreetMapView';
import { MapErrorBoundary } from '../components/MapErrorBoundary';

interface FormData {
  address: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
}

interface FormErrors {
  [key: string]: string;
}

interface Step2LocationProps {
  formData: FormData;
  errors: FormErrors;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
  onUpdateField: (field: keyof FormData, value: string) => void;
  onLocationSelected: (lat: number, lng: number, address: string, city?: string, district?: string) => void;
}

export const Step2Location: React.FC<Step2LocationProps> = React.memo(({
  formData,
  errors,
  isDark,
  dynamicStyles,
  onUpdateField,
  onLocationSelected,
}) => {
  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
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
          style={[styles.input, { color: dynamicStyles.input.color }]}
          placeholder={options.placeholder}
          placeholderTextColor={dynamicStyles.textSecondary.color}
          value={String(formData[field] || '')}
          onChangeText={(value) => onUpdateField(field, value)}
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const handleLocationSelected = async (lat: number, lng: number, address?: string, city?: string, district?: string) => {
    onLocationSelected(lat, lng, address || '', city || '', district || '');
  };

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, dynamicStyles.text]}>Location</Text>
      <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
        Where is your salon located?
      </Text>

      <MapErrorBoundary isDark={isDark}>
        <OpenStreetMapView
          latitude={formData.latitude}
          longitude={formData.longitude}
          onLocationSelected={handleLocationSelected}
          isDark={isDark}
        />
      </MapErrorBoundary>

      {renderInputField('Street Address', 'address', {
        placeholder: 'Tap map above or enter address',
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
    </View>
  );
});

Step2Location.displayName = 'Step2Location';

const styles = StyleSheet.create({
  stepContent: { paddingBottom: 20 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: theme.fonts.bold, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, fontFamily: theme.fonts.regular, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  labelRow: { marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '500', fontFamily: theme.fonts.medium },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 50 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: theme.fonts.regular, paddingVertical: 12 },
  inputError: { borderColor: theme.colors.error },
  errorText: { color: theme.colors.error, fontSize: 12, fontFamily: theme.fonts.regular, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfWidth: { flex: 1 },
});
