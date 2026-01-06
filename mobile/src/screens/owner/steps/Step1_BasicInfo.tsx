import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface FormData {
  name: string;
  description: string;
  registrationNumber: string;
  businessTypes: string[];
  targetClientele: string;
}

interface FormErrors {
  [key: string]: string;
}

const TARGET_CLIENTELE = [
  { value: 'men', label: 'Men', icon: 'male' as const },
  { value: 'women', label: 'Women', icon: 'female' as const },
  { value: 'both', label: 'Both', icon: 'people' as const },
];

const BUSINESS_TYPES = [
  { value: 'hair_salon', label: 'Hair Salon', icon: 'content-cut' as const },
  { value: 'beauty_spa', label: 'Beauty Spa', icon: 'spa' as const },
  { value: 'nail_salon', label: 'Nail Salon', icon: 'brush' as const },
  { value: 'barbershop', label: 'Barbershop', icon: 'face' as const },
  { value: 'full_service', label: 'Full Service', icon: 'storefront' as const },
  { value: 'mobile', label: 'Mobile', icon: 'directions-car' as const },
  { value: 'other', label: 'Other', icon: 'more-horiz' as const },
];

interface Step1BasicInfoProps {
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
  onToggleBusinessType: (value: string) => void;
  onUpdateTargetClientele: (value: string) => void;
}

export const Step1BasicInfo: React.FC<Step1BasicInfoProps> = React.memo(({
  formData,
  errors,
  isDark,
  dynamicStyles,
  onUpdateField,
  onToggleBusinessType,
  onUpdateTargetClientele,
}) => {
  const cardStyle = [
    styles.card,
    dynamicStyles.card || { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
    isDark ? { borderWidth: 1, borderColor: '#3A3A3C' } : { borderWidth: 1, borderColor: '#E5E7EB' } // Replaced shadow with subtle border
  ];

  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      icon?: string;
      multiline?: boolean;
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
        errors[field] && styles.inputError,
        options.multiline && { alignItems: 'flex-start' }
      ]}>
        {options.icon && !options.multiline && (
          <MaterialIcons
            name={options.icon as any}
            size={18}
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
          onChangeText={(value) => onUpdateField(field, value)}
          multiline={options.multiline}
          numberOfLines={options.multiline ? 4 : 1}
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Section 1: Salon Identity */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="storefront" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Salon Identity</Text>
        </View>

        {renderInputField('Salon Name', 'name', {
          placeholder: 'e.g. Luxury Cuts',
          required: true,
          compact: true
        })}

        {renderInputField('Description', 'description', {
          placeholder: 'Tell customers what makes your salon special...',
          multiline: true,
          required: true,
          compact: true
        })}

        {renderInputField('Business Registration No.', 'registrationNumber', {
          placeholder: 'Optional',
          compact: true
        })}
      </View>

      {/* Section 2: Service Profile */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="category" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service Profile</Text>
        </View>

        <View style={styles.compactGroup}>
          <Text style={[styles.inputLabel, dynamicStyles.text]}>
            Business Type <Text style={{ color: theme.colors.error }}>*</Text>
          </Text>
          
          <View style={styles.businessTypesGrid}>
            {BUSINESS_TYPES.map((type) => {
              const isSelected = formData.businessTypes?.includes(type.value);
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    dynamicStyles.input,
                    isSelected && { 
                      backgroundColor: `${theme.colors.primary}15`, 
                      borderColor: theme.colors.primary,
                      borderWidth: 1.5
                    }
                  ]}
                  onPress={() => onToggleBusinessType(type.value)}
                >
                  <MaterialIcons
                    name={type.icon as any}
                    size={16}
                    color={isSelected ? theme.colors.primary : dynamicStyles.textSecondary.color}
                  />
                  <Text style={[
                    styles.typeChipLabel,
                    dynamicStyles.text,
                    isSelected && { color: theme.colors.primary, fontWeight: '600' }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.businessTypes && <Text style={styles.errorText}>{errors.businessTypes}</Text>}
        </View>

        <View style={styles.compactGroup}>
          <Text style={[styles.inputLabel, dynamicStyles.text]}>
            Target Clientele <Text style={{ color: theme.colors.error }}>*</Text>
          </Text>
          <View style={styles.pillsContainer}>
            {TARGET_CLIENTELE.map((option) => {
               const isSelected = formData.targetClientele === option.value;
               return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pillOption,
                    dynamicStyles.input,
                    isSelected && { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => onUpdateTargetClientele(option.value)}
                >
                  <MaterialIcons
                    name={isSelected ? 'check' : option.icon}
                    size={16}
                    color={isSelected ? theme.colors.primary : dynamicStyles.textSecondary.color}
                  />
                  <Text style={[
                      styles.pillLabel,
                      dynamicStyles.text,
                      isSelected && { color: theme.colors.primary, fontWeight: '600' }
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.targetClientele && <Text style={styles.errorText}>{errors.targetClientele}</Text>}
        </View>
      </View>
    </View>
  );
});

Step1BasicInfo.displayName = 'Step1BasicInfo';

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
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupCompact: {
    marginBottom: 12,
  },
  compactGroup: {
    marginBottom: 16,
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
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
  businessTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20, // Rounded chips
    borderWidth: 1,
  },
  typeChipLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pillOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
