import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { BusinessTypePicker } from '../components/BusinessTypePicker';

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

interface Step1BasicInfoProps {
  formData: FormData;
  errors: FormErrors;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
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
  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      icon?: string;
      multiline?: boolean;
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
          onChangeText={(value) => onUpdateField(field, value)}
          multiline={options.multiline}
          numberOfLines={options.multiline ? 4 : 1}
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
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

      <BusinessTypePicker
        selectedTypes={formData.businessTypes}
        onToggleType={onToggleBusinessType}
        isDark={isDark}
        dynamicStyles={dynamicStyles}
        error={errors.businessTypes}
      />

      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.inputLabel, dynamicStyles.text]}>
            Target Clientele <Text style={{ color: theme.colors.error }}> *</Text>
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
              onPress={() => onUpdateTargetClientele(option.value)}
            >
              <MaterialIcons
                name={formData.targetClientele === option.value ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
                color={formData.targetClientele === option.value ? theme.colors.primary : dynamicStyles.textSecondary.color}
              />
              <Text
                style={[
                  styles.checkboxLabel,
                  dynamicStyles.text,
                  formData.targetClientele === option.value && { color: theme.colors.primary, fontWeight: '600' },
                ]}
              >
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
});

Step1BasicInfo.displayName = 'Step1BasicInfo';

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
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: theme.colors.error },
  errorText: { color: theme.colors.error, fontSize: 12, fontFamily: theme.fonts.regular, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', gap: 12 },
  checkboxOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  checkboxOptionSelected: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` },
  checkboxLabel: { fontSize: 14, fontWeight: '500', fontFamily: theme.fonts.medium },
});
