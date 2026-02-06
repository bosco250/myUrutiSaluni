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
    text: { color: isDark ? "#FFFFFF" : "#1A1A2E" },
    textSecondary: { color: isDark ? "#8E8E93" : "#6B7280" },
    card: { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white },
    input: { backgroundColor: isDark ? theme.colors.gray900 : "#F9FAFB", color: isDark ? "#FFFFFF" : "#1F2937", borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight },
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
        const response = await uploadService.uploadAvatar(uri);
        if (response.url) {
            const profileData = { ...getProfileData(), avatarUrl: response.url };
            await updateUser(profileData);
            Alert.alert("Success", "Profile photo updated!");
        }
    } catch (error: any) {
        Alert.alert("Error", "Failed to upload photo");
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
        style={[styles.inputField, dynamicStyles.input, opts?.multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder || label}
        placeholderTextColor={dynamicStyles.textSecondary.color}
        keyboardType={opts?.keyboard || 'default'}
        multiline={opts?.multiline}
      />
    </View>
  );

  const renderDatePicker = () => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Date of Birth</Text>
      <TouchableOpacity style={[styles.dateButton, dynamicStyles.input]} onPress={() => setShowDatePicker(true)}>
        <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
        <Text style={[styles.dateButtonText, dateOfBirth ? dynamicStyles.text : dynamicStyles.textSecondary]}>
          {formatDisplayDate(dateOfBirth)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderChips = (label: string, options: string[], value: string, onChange: (v: string) => void) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>{label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt) => {
          const isSelected = value.toLowerCase() === opt.toLowerCase();
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.chipText, isSelected && { color: '#FFF' }, !isSelected && dynamicStyles.text]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Personal Info</Text>
        <TouchableOpacity disabled={loading} onPress={handleSave}>
            {loading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <Text style={styles.headerSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={user?.avatarUrl ? { uri: getImageUrl(user.avatarUrl) || '' } : defaultAvatar} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.avatarEditBtn} onPress={handlePickImage} disabled={loading}>
              <MaterialIcons name="camera-alt" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
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
          <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

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
          <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

          {/* Emergency Section */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeader, dynamicStyles.text]}>Emergency Contact</Text>
            {renderInput('Contact Name', emergencyName, setEmergencyName)}
            {renderInput('Contact Phone', emergencyPhone, setEmergencyPhone, { keyboard: 'phone-pad' })}
            {renderChips('Relationship', ['Parent', 'Spouse', 'Sibling', 'Friend'], emergencyRelation, setEmergencyRelation)}
          </View>

          {!isCustomer && (
            <>
              <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />
              {/* Professional Section */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, dynamicStyles.text]}>Professional Details</Text>
                {renderInput('Bio / About', bio, setBio, { multiline: true, placeholder: 'Tell us about yourself...' })}
                {renderInput('Years of Experience', yearsExperience, setYearsExperience, { keyboard: 'numeric' })}
              </View>
              <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

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
        
        <View style={{height: 40}} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSaveText: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  
  scrollView: { flex: 1 },
  
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0F0F0' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  avatarRole: { fontSize: 13, textTransform: 'capitalize' },
  
  formContent: { paddingHorizontal: 0 },
  sectionContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: theme.colors.primary },
  divider: { height: 1, width: '100%', marginVertical: 0 },

  inputRow: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputField: { 
    height: 48, 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    fontSize: 15, 
    borderWidth: 1, 
    // borderColor applied dynamically
  },
  
  dateButton: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  dateButtonText: { fontSize: 15, flex: 1 },
  
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  
  datePickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  datePickerContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  datePickerTitle: { fontSize: 16, fontWeight: '600' },
  datePickerCancel: { fontSize: 15, color: theme.colors.textSecondary },
  datePickerDone: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
});
