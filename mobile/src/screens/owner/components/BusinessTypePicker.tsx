import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface BusinessType {
  value: string;
  label: string;
}

interface BusinessTypePickerProps {
  selectedTypes: string[];
  onToggleType: (value: string) => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
  error?: string;
}

const BUSINESS_TYPES: BusinessType[] = [
  { value: 'hair_salon', label: 'Hair Salon' },
  { value: 'beauty_spa', label: 'Beauty Spa' },
  { value: 'nail_salon', label: 'Nail Salon' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'full_service', label: 'Full Service' },
  { value: 'mobile', label: 'Mobile Service' },
  { value: 'other', label: 'Other' },
];

export const BusinessTypePicker: React.FC<BusinessTypePickerProps> = React.memo(({
  selectedTypes,
  onToggleType,
  isDark,
  dynamicStyles,
  error,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.inputLabel, dynamicStyles.text]}>
          Business Type <Text style={{ color: theme.colors.error }}>*</Text>
        </Text>
      </View>
      <View style={[styles.pickerContainer, dynamicStyles.input, error && styles.inputError]}>
        <MaterialIcons 
          name="business" 
          size={20} 
          color={dynamicStyles.textSecondary.color} 
          style={styles.inputIcon} 
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.pickerScroll}
        >
          {BUSINESS_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type.value);
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.pickerOption,
                  isSelected && styles.pickerOptionSelected,
                ]}
                onPress={() => onToggleType(type.value)}
              >
                <MaterialIcons
                  name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                  size={18}
                  color={isSelected ? '#FFFFFF' : dynamicStyles.textSecondary.color}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.pickerOptionText,
                    dynamicStyles.text,
                    isSelected && styles.pickerOptionTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

BusinessTypePicker.displayName = 'BusinessTypePicker';

const styles = StyleSheet.create({
  container: {
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginRight: 8,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
});
