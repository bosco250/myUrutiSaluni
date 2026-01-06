import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface FormData {
  phone: string;
  email: string;
  website: string;
  images: string[];
}

interface FormErrors {
  [key: string]: string;
}

interface Step4ContactInfoProps {
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
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  uploading: boolean;
}

export const Step4ContactInfo: React.FC<Step4ContactInfoProps> = React.memo(({
  formData,
  errors,
  isDark,
  dynamicStyles,
  onUpdateField,
  onPickImage,
  onRemoveImage,
  uploading,
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
      keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
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
          value={String(formData[field as keyof FormData] || '')}
          onChangeText={(value) => onUpdateField(field, value)}
          keyboardType={options.keyboardType}
        />
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Contact Details Card */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="contact-phone" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Contact Details</Text>
        </View>

        {renderInputField('Phone Number', 'phone', {
          placeholder: '+250 7XX XXX XXX',
          icon: 'phone',
          keyboardType: 'phone-pad',
          required: true,
          compact: true
        })}

        {renderInputField('Email Address', 'email', {
          placeholder: 'salon@example.com',
          icon: 'email',
          keyboardType: 'email-address',
          compact: true
        })}

        {renderInputField('Website', 'website', {
          placeholder: 'https://',
          icon: 'language',
          keyboardType: 'url',
          compact: true
        })}
      </View>

      {/* Gallery Card */}
      <View style={cardStyle}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="photo-library" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Gallery</Text>
        </View>
        <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
          Add photos of your salon interior, exterior, and best work.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
          <TouchableOpacity 
            style={[styles.addPhotoButton, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` }]} 
            onPress={onPickImage} 
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <MaterialIcons name="add-a-photo" size={24} color={theme.colors.primary} />
                <Text style={[styles.addPhotoText, { color: theme.colors.primary }]}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
          
          {formData.images.map((img, index) => (
            <View key={index} style={styles.photoWrapper}>
              <Image source={{ uri: img }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhotoButton} onPress={() => onRemoveImage(index)}>
                <MaterialIcons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
});

Step4ContactInfo.displayName = 'Step4ContactInfo';

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
  helperText: {
    fontSize: 13,
    marginBottom: 16,
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
  photosContainer: {
    flexDirection: 'row',
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
  addPhotoText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  photoWrapper: {
    width: 100,
    height: 100,
    marginRight: 12,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden', // Ensure image respects radius
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
