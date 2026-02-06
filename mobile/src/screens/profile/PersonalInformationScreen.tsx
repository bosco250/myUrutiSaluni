import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from 'expo-image-picker';
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { uploadService } from '../../services/upload';
import { config } from '../../config';

const defaultAvatar = require("../../../assets/Logo.png");

// Helper to format image URL
const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const fixedUrl = url
      .replace(/^https?:\/\/localhost(:\d+)?/, baseUrl)
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, baseUrl);
    return fixedUrl;
  }
  if (url.startsWith('file:')) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

interface PersonalInformationScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export default function PersonalInformationScreen({
  navigation,
}: PersonalInformationScreenProps) {
  const { isDark } = useTheme();
  const { user, updateUser } = useAuth();

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [nationality, setNationality] = useState(user?.nationality || "Rwandan");
  const [maritalStatus, setMaritalStatus] = useState(user?.maritalStatus || "");
  
  // Address
  const [address, setAddress] = useState(user?.address || "");
  const [province, setProvince] = useState(user?.province || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [cell, setCell] = useState(user?.cell || "");
  const [village, setVillage] = useState(user?.village || "");
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContactName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContactPhone || "");
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyContactRelationship || "");
  
  // Professional
  const [bio, setBio] = useState(user?.bio || "");
  const [yearsExperience, setYearsExperience] = useState(user?.yearsOfExperience?.toString() || "");
  
  // Banking
  const [bankName, setBankName] = useState(user?.bankName || "");
  const [bankAccount, setBankAccount] = useState(user?.bankAccountNumber || "");
  const [momoNumber, setMomoNumber] = useState(user?.momoNumber || "");

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Parse date string to Date object
  const parseDateString = (dateStr: string): Date => {
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    return new Date(2000, 0, 1); // Default to Jan 1, 2000
  };

  // Format Date to YYYY-MM-DD string
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setDateOfBirth(user.dateOfBirth || "");
      setGender(user.gender || "");
      setNationalId(user.nationalId || "");
      setNationality(user.nationality || "Rwandan");
      setMaritalStatus(user.maritalStatus || "");
      
      setAddress(user.address || "");
      setProvince(user.province || "");
      setDistrict(user.district || "");
      setSector(user.sector || "");
      setCell(user.cell || "");
      setVillage(user.village || "");

      setEmergencyName(user.emergencyContactName || "");
      setEmergencyPhone(user.emergencyContactPhone || "");
      setEmergencyRelation(user.emergencyContactRelationship || "");
      setBio(user.bio || "");
      setYearsExperience(user.yearsOfExperience?.toString() || "");
      setBankName(user.bankName || "");
      setBankAccount(user.bankAccountNumber || "");
      setMomoNumber(user.momoNumber || "");
    }
  }, [user]);

  const dynamicStyles = {
    container: { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background },
    text: { color: isDark ? "#FFFFFF" : theme.colors.text },
    textSecondary: { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
    card: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white },
    input: { backgroundColor: 'transparent', color: isDark ? '#FFFFFF' : theme.colors.text, borderColor: isDark ? theme.colors.gray700 : theme.colors.border },
    headerBorder: { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight },
  };

  const getProfileData = () => {
    return {
      fullName,
      email,
      phone,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender.toLowerCase() || undefined,
      nationalId: nationalId || undefined,
      nationality: nationality || undefined,
      maritalStatus: maritalStatus.toLowerCase() || undefined,
      address: address || undefined,
      province: province || undefined,
      district: district || undefined,
      sector: sector || undefined,
      cell: cell || undefined,
      village: village || undefined,
      emergencyContactName: emergencyName || undefined,
      emergencyContactPhone: emergencyPhone || undefined,
      emergencyContactRelationship: emergencyRelation.toLowerCase() || undefined,
      bio: bio || undefined,
      yearsOfExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
      bankName: bankName || undefined,
      bankAccountNumber: bankAccount || undefined,
      momoNumber: momoNumber || undefined,
    };
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const profileData = getProfileData();
      await updateUser(profileData);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status === 'denied') {
         Alert.alert('Permission Required', 'You need to grant permission to access your photos.');
         return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (pickerResult.canceled) return;
      if (pickerResult.assets && pickerResult.assets.length > 0) {
        await handleUploadAvatar(pickerResult.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    setLoading(true);
    try {
        console.log('Starting avatar upload from PersonalInfo...');
        const response = await uploadService.uploadAvatar(uri);
        console.log('Avatar uploaded, URL:', response.url);

        if (response.url) {
            // Update ONLY the avatar first to ensure it's saved
            const updatedUser = await updateUser({ avatarUrl: response.url });
            console.log('User updated with avatar:', updatedUser.avatarUrl);

            // Verify avatar was saved
            if (updatedUser.avatarUrl === response.url) {
                Alert.alert("Success", "Profile photo updated successfully!");
            } else {
                console.warn('Avatar URL mismatch after update');
                Alert.alert("Warning", "Photo uploaded but may not be saved. Please try again.");
            }
        } else {
            throw new Error('No URL returned from upload');
        }
    } catch (error: any) {
        console.error('Avatar upload error:', error);
        Alert.alert("Error", error.message || "Failed to upload photo. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDateOfBirth(formatDate(selectedDate));
  };

  const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";

  const renderInput = (label: string, value: string, onChange: (t: string) => void, opts?: { placeholder?: string; keyboard?: 'default' | 'email-address' | 'phone-pad' | 'numeric'; multiline?: boolean; }) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>{label}</Text>
      <TextInput
        style={[styles.inputField, dynamicStyles.input, opts?.multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder || label}
        placeholderTextColor={dynamicStyles.textSecondary.color + '80'}
        keyboardType={opts?.keyboard || 'default'}
        multiline={opts?.multiline}
      />
    </View>
  );

  const renderDatePicker = () => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Date of Birth</Text>
      <TouchableOpacity style={[styles.dateButton, dynamicStyles.input]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
        <Text style={[styles.dateButtonText, dateOfBirth ? dynamicStyles.text : { color: dynamicStyles.textSecondary.color + '80' }]}>
          {formatDisplayDate(dateOfBirth)}
        </Text>
        <MaterialIcons name="calendar-today" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderChips = (label: string, options: string[], value: string, onChange: (v: string) => void) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {options.map((opt) => {
          const isSelected = value.toLowerCase() === opt.toLowerCase();
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip, 
                isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: dynamicStyles.textSecondary.color + '40' }
              ]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected ? { color: '#FFF' } : dynamicStyles.text]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <TouchableOpacity 
          onPress={() => navigation?.goBack?.()} 
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Personal Info</Text>
        <TouchableOpacity disabled={loading} onPress={handleSave} activeOpacity={0.7}>
            {loading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <Text style={styles.headerSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={loading} activeOpacity={0.9}>
            <Image 
              source={user?.avatarUrl ? { uri: getImageUrl(user.avatarUrl) || '' } : defaultAvatar} 
              style={styles.avatar} 
            />
            <View style={styles.avatarEditBtn}>
              <MaterialIcons name="camera-alt" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarName, dynamicStyles.text]}>{fullName || 'Your Name'}</Text>
          <Text style={[styles.avatarRole, dynamicStyles.textSecondary]}>{user?.role?.replace('_', ' ') || 'User'}</Text>
        </View>

        {/* Form Content */}
        <View style={styles.formContent}>
          {/* Basic Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, dynamicStyles.text]}>Basic Information</Text>
            {renderInput('Full Name', fullName, setFullName)}
            {renderInput('Email', email, setEmail, { keyboard: 'email-address' })}
            {renderInput('Phone', phone, setPhone, { keyboard: 'phone-pad', placeholder: '+250 7XX XXX XXX' })}
            {renderDatePicker()}
            {renderChips('Gender', ['Male', 'Female', 'Other'], gender, setGender)}
            
            {!isCustomer && (
              <>
                {renderInput('National ID', nationalId, setNationalId)}
                {renderInput('Nationality', nationality, setNationality)}
                {renderChips('Marital Status', ['Single', 'Married', 'Divorced'], maritalStatus, setMaritalStatus)}
              </>
            )}
          </View>
          
          <View style={styles.sectionSpacer} />

          {/* Address Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, dynamicStyles.text]}>Address</Text>
            {renderInput('Province', province, setProvince)}
            {renderInput('District', district, setDistrict)}
            {renderInput('Sector', sector, setSector)}
            {renderInput('Cell', cell, setCell)}
            {renderInput('Village', village, setVillage)}
            {renderInput('Street Address', address, setAddress, { placeholder: 'House number, street' })}
          </View>

          <View style={styles.sectionSpacer} />

          {/* Emergency Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, dynamicStyles.text]}>Emergency Contact</Text>
            {renderInput('Contact Name', emergencyName, setEmergencyName)}
            {renderInput('Contact Phone', emergencyPhone, setEmergencyPhone, { keyboard: 'phone-pad' })}
            {renderChips('Relationship', ['Parent', 'Spouse', 'Sibling', 'Friend'], emergencyRelation, setEmergencyRelation)}
          </View>

          {!isCustomer && (
            <>
              <View style={styles.sectionSpacer} />
              {/* Professional Section */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, dynamicStyles.text]}>Professional Details</Text>
                {renderInput('Bio', bio, setBio, { multiline: true, placeholder: 'Tell us about yourself...' })}
                {renderInput('Years of Experience', yearsExperience, setYearsExperience, { keyboard: 'numeric' })}
              </View>

              <View style={styles.sectionSpacer} />

              {/* Banking Section */}
              <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionHeader, dynamicStyles.text]}>Banking Information</Text>
                {renderInput('Bank Name', bankName, setBankName, { placeholder: 'e.g., Bank of Kigali' })}
                {renderInput('Account Number', bankAccount, setBankAccount, { keyboard: 'numeric' })}
                {renderInput('MoMo Number', momoNumber, setMomoNumber, { keyboard: 'phone-pad', placeholder: '+250 7XX XXX XXX' })}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <View style={[styles.datePickerContainer, dynamicStyles.card]}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, dynamicStyles.text]}>Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseDateString(dateOfBirth)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={parseDateString(dateOfBirth)}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semibold },
  headerSaveText: { fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.primary },
  
  scrollView: { flex: 1 },
  
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F0F0' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarName: { fontSize: 18, fontFamily: theme.fonts.bold, marginBottom: 2 },
  avatarRole: { fontSize: 12, fontFamily: theme.fonts.regular, textTransform: 'capitalize' },
  
  formContent: { paddingHorizontal: 0 },
  sectionContainer: { paddingHorizontal: 16 },
  sectionHeader: { fontSize: 14, fontFamily: theme.fonts.semibold, marginBottom: 12, color: theme.colors.primary },
  sectionSpacer: { height: 24 },
  
  inputRow: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontFamily: theme.fonts.medium, marginBottom: 6, opacity: 0.8 },
  inputField: { 
    height: 44, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    fontSize: 14, 
    fontFamily: theme.fonts.regular,
    borderWidth: 1, 
  },
  
  dateButton: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dateButtonText: { fontSize: 14, fontFamily: theme.fonts.regular },
  
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontFamily: theme.fonts.medium },
  
  // Date Picker Modal (kept as is, functional)
  datePickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  datePickerContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  datePickerTitle: { fontSize: 16, fontFamily: theme.fonts.semibold },
  datePickerCancel: { fontSize: 14, color: theme.colors.textSecondary, fontFamily: theme.fonts.medium },
  datePickerDone: { fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.primary },
});
