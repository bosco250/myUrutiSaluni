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
    card?: { backgroundColor: string };
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
  const cardStyle = [
    styles.card,
    dynamicStyles.card || { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
    isDark ? { borderWidth: 1, borderColor: '#3A3A3C' } : { borderWidth: 1, borderColor: '#E5E7EB' }
  ];

  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      icon?: string;
      required?: boolean;
      compact?: boolean;
    } = {}
  ) => (
    <View style={[styles.inputGroup, options.compact && styles.inputGroupCompact]}>
      <Text style={[styles.inputLabel, dynamicStyles.text]}>
        {label}
        {options.required && <Text style={{ color: theme.colors.error }}> *</Text>}
      </Text>
      <View style={[
        styles.inputContainer,
        dynamicStyles.input,
        errors[field] && styles.inputError
      ]}>
        {options.icon && (
          <MaterialIcons
            name={options.icon as any}
            size={18}
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
    <View style={styles.container}>
      {/* Card 1: Interactive Map */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="map" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Pin Location</Text>
        </View>
        <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
          Tap on the map to allow customers to find you easily.
        </Text>
        
        <View style={styles.mapContainer}>
          <MapErrorBoundary isDark={isDark}>
            <OpenStreetMapView
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelected={handleLocationSelected}
              isDark={isDark}
            />
          </MapErrorBoundary>
        </View>
      </View>

      {/* Card 2: Address Details */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="place" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Address Details</Text>
        </View>

        {renderInputField('Street Address', 'address', {
          placeholder: 'e.g. 123 Main St',
          icon: 'location-on',
          required: true,
          compact: true
        })}

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderInputField('City', 'city', { 
              placeholder: 'City', 
              required: true,
              compact: true 
            })}
          </View>
          <View style={styles.halfWidth}>
            {renderInputField('District', 'district', { 
              placeholder: 'District',
              compact: true 
            })}
          </View>
        </View>
      </View>
    </View>
  );
});

Step2Location.displayName = 'Step2Location';

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
    fontFamily: theme.fonts.regular,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupCompact: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: theme.fonts.medium,
    opacity: 0.9,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    paddingVertical: 8,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  mapContainer: {
    height: 350,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
});
