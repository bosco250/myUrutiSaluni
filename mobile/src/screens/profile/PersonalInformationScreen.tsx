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

// Helper to format image URL (handles relative URLs and localhost from backend)
const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  
  // Get the server base URL (without /api)
  const baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
  
  // If URL starts with http/https, check if it uses localhost and fix it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Replace localhost or 127.0.0.1 with actual server IP
    const fixedUrl = url
      .replace(/^https?:\/\/localhost(:\d+)?/, baseUrl)
      .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, baseUrl);
    return fixedUrl;
  }
  
  // Handle file:// URLs as-is
  if (url.startsWith('file:')) return url;
  
  // Prepend server base URL for relative paths
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

interface PersonalInformationScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

type SectionKey = 'basic' | 'address' | 'emergency' | 'professional' | 'banking';

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
  const [district, setDistrict] = useState(user?.district || "");
  const [sector, setSector] = useState(user?.sector || "");
  const [cell, setCell] = useState(user?.cell || "");
  
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
  const [activeSection, setActiveSection] = useState<SectionKey>('basic');
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
      setDistrict(user.district || "");
      setSector(user.sector || "");
      setCell(user.cell || "");
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
    container: { backgroundColor: isDark ? "#0D0D0F" : "#F5F5F5" },
    text: { color: isDark ? "#FFFFFF" : "#1A1A2E" },
    textSecondary: { color: isDark ? "#8E8E93" : "#6B7280" },
    card: { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", borderColor: isDark ? "#2C2C2E" : "#E8E8E8" },
    input: { backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5", color: isDark ? "#FFFFFF" : "#1A1A2E" },
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
      district: district || undefined,
      sector: sector || undefined,
      cell: cell || undefined,
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

      if (pickerResult.canceled) {
        return;
      }

      if (pickerResult.assets && pickerResult.assets.length > 0) {
        const selectedImage = pickerResult.assets[0];
        await handleUploadAvatar(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUploadAvatar = async (uri: string) => {
    setLoading(true);
    try {
        const response = await uploadService.uploadAvatar(uri);
        
        if (response.url) {
            // Save avatar AND form data
            const profileData = {
              ...getProfileData(),
              avatarUrl: response.url 
            };
            
            await updateUser(profileData);
            Alert.alert("Success", "Profile photo updated!");
        }
    } catch (error: any) {
        console.error("Upload error:", error);
        Alert.alert("Error", "Failed to upload photo");
    } finally {
        setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(formatDate(selectedDate));
    }
  };

  // Check if user is a customer
  const isCustomer = user?.role === "customer" || user?.role === "CUSTOMER";

  const allSections: { key: SectionKey; label: string; icon: string }[] = [
    { key: 'basic', label: 'Basic', icon: 'person' },
    { key: 'address', label: 'Address', icon: 'location-on' },
    { key: 'emergency', label: 'Emergency', icon: 'emergency' },
    { key: 'professional', label: 'Work', icon: 'work' },
    { key: 'banking', label: 'Banking', icon: 'account-balance' },
  ];

  // Filter sections for customers
  const sections = isCustomer 
    ? allSections.filter(s => ['basic', 'address'].includes(s.key))
    : allSections;

  const renderInput = (label: string, value: string, onChange: (t: string) => void, opts?: {
    placeholder?: string;
    keyboard?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
    multiline?: boolean;
  }) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>{label}</Text>
      <TextInput
        style={[styles.inputField, dynamicStyles.input, opts?.multiline && { height: 60, textAlignVertical: 'top' }]}
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
      <TouchableOpacity 
        style={[styles.dateButton, dynamicStyles.input]}
        onPress={() => setShowDatePicker(true)}
      >
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
              <Text style={[styles.chipText, isSelected && { color: '#FFF' }, !isSelected && dynamicStyles.text]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <>
            {renderInput('Full Name', fullName, setFullName)}
            {renderInput('Email', email, setEmail, { keyboard: 'email-address' })}
            {renderInput('Phone', phone, setPhone, { keyboard: 'phone-pad', placeholder: '+250 7XX XXX XXX' })}
            {renderDatePicker()}
            {renderChips('Gender', ['Male', 'Female', 'Other'], gender, setGender)}
            
            {/* Extended info only for employees */}
            {!isCustomer && (
              <>
                {renderInput('National ID', nationalId, setNationalId)}
                {renderInput('Nationality', nationality, setNationality)}
                {renderChips('Marital Status', ['Single', 'Married', 'Divorced'], maritalStatus, setMaritalStatus)}
              </>
            )}
          </>
        );
      case 'address':
        return (
          <>
            {renderInput('Street Address', address, setAddress, { placeholder: 'House number, street' })}
            {renderInput('District', district, setDistrict)}
            {renderInput('Sector', sector, setSector)}
            {renderInput('Cell', cell, setCell)}
          </>
        );
      case 'emergency':
        return (
          <>
            {renderInput('Contact Name', emergencyName, setEmergencyName)}
            {renderInput('Contact Phone', emergencyPhone, setEmergencyPhone, { keyboard: 'phone-pad' })}
            {renderChips('Relationship', ['Parent', 'Spouse', 'Sibling', 'Friend'], emergencyRelation, setEmergencyRelation)}
          </>
        );
      case 'professional':
        return (
          <>
            {renderInput('Bio / About', bio, setBio, { multiline: true, placeholder: 'Tell us about yourself...' })}
            {renderInput('Years of Experience', yearsExperience, setYearsExperience, { keyboard: 'numeric' })}
          </>
        );
      case 'banking':
        return (
          <>
            {renderInput('Bank Name', bankName, setBankName, { placeholder: 'e.g., Bank of Kigali' })}
            {renderInput('Account Number', bankAccount, setBankAccount, { keyboard: 'numeric' })}
            {renderInput('MoMo Number', momoNumber, setMomoNumber, { keyboard: 'phone-pad', placeholder: '+250 7XX XXX XXX' })}
          </>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Personal Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
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
          <TouchableOpacity onPress={handlePickImage} disabled={loading}>
            <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.key}
              style={[styles.tab, activeSection === sec.key && { backgroundColor: theme.colors.primary }]}
              onPress={() => setActiveSection(sec.key)}
            >
              <MaterialIcons 
                name={sec.icon as any} 
                size={16} 
                color={activeSection === sec.key ? '#FFF' : dynamicStyles.textSecondary.color} 
              />
              <Text style={[styles.tabText, activeSection === sec.key && { color: '#FFF' }, activeSection !== sec.key && dynamicStyles.textSecondary]}>
                {sec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Form Content */}
        <View style={[styles.formCard, dynamicStyles.card]}>
          {renderSection()}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <View style={[styles.datePickerContainer, dynamicStyles.card]}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerCancel, dynamicStyles.textSecondary]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, dynamicStyles.text]}>Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerDone, { color: theme.colors.primary }]}>Done</Text>
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

      {/* Date Picker for Android */}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  
  scrollView: { flex: 1 },
  
  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 12 },
  avatarContainer: { position: 'relative', marginBottom: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  changePhotoText: { fontSize: 13, fontWeight: '600' },
  
  // Tabs
  tabsScroll: { maxHeight: 40 },
  tabsContent: { paddingHorizontal: 12, gap: 6 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  
  // Form
  formCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 0,
  },
  inputRow: { marginBottom: 10 },
  inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputField: { height: 40, borderRadius: 8, paddingHorizontal: 10, fontSize: 14 },
  
  // Date Button
  dateButton: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
    flex: 1,
  },
  
  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  
  // Save Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    elevation: 0,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  
  // Date Picker Modal (iOS)
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  datePickerTitle: { fontSize: 16, fontWeight: '600' },
  datePickerCancel: { fontSize: 15 },
  datePickerDone: { fontSize: 15, fontWeight: '600' },
});
