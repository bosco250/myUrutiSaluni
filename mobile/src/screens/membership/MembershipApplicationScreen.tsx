import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { api } from "../../services/api";
import { OpenStreetMapView } from "../owner/components/OpenStreetMapView";

interface MembershipApplicationScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

interface FormData {
  businessName: string;
  businessAddress: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  businessDescription: string;
  registrationNumber: string;
  taxId: string;
  latitude?: number;
  longitude?: number;
}

interface FormErrors {
  [key: string]: string;
}

export default function MembershipApplicationScreen({
  navigation,
}: MembershipApplicationScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showMap, setShowMap] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessAddress: "",
    city: "",
    district: "",
    phone: user?.phone || "",
    email: user?.email || "",
    businessDescription: "",
    registrationNumber: "",
    taxId: "",
    latitude: undefined,
    longitude: undefined,
  });

  const totalSteps = 3;

  const checkExistingApplication = useCallback(async () => {
    try {
      const response = await api.get("/memberships/applications/my");
      if (response && (response as any).id) {
        Alert.alert(
          "Application Exists",
          "You already have a submitted application. Redirecting to status...",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("ApplicationSuccess", { 
                  status: (response as any).status 
                });
              }
            }
          ]
        );
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error("Error checking application:", error);
      }
    } finally {
      setCheckingExisting(false);
    }
  }, [navigation]);

  useEffect(() => {
    checkExistingApplication();
  }, [checkExistingApplication]);

  const dynamic = {
    bg: isDark ? theme.colors.gray900 : theme.colors.background,
    text: isDark ? "#FFFFFF" : theme.colors.text,
    subtext: isDark ? "#8E8E93" : theme.colors.textSecondary,
    cardBg: isDark ? theme.colors.gray800 : "#FFFFFF",
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    inputBg: isDark ? theme.colors.gray800 : "#FAFAFA",
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (): boolean => {
    const newErrors: FormErrors = {};

    if (currentStep === 1) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = "Business name is required";
      } else if (formData.businessName.length < 3) {
        newErrors.businessName = "Business name must be at least 3 characters";
      }
      if (!formData.businessDescription.trim()) {
        newErrors.businessDescription = "Business description is required";
      } else if (formData.businessDescription.length < 20) {
        newErrors.businessDescription = "Please provide a detailed description (min 20 characters)";
      }
    } else if (currentStep === 2) {
      if (!formData.businessAddress.trim()) {
        newErrors.businessAddress = "Business address is required";
      }
      if (!formData.city.trim()) {
        newErrors.city = "City is required";
      }
      if (!formData.district.trim()) {
        newErrors.district = "District is required";
      }
    } else if (currentStep === 3) {
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else {
        const phoneClean = formData.phone.replace(/[\s-]/g, "");
        const isValid = /^(\+?250|0)?7[0-9]{8}$/.test(phoneClean);
        if (!isValid) {
          newErrors.phone = "Format: 0782345678 or +250782345678";
        }
      }
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const applicationData: any = {
        businessName: formData.businessName.trim(),
        businessAddress: formData.businessAddress.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        businessDescription: formData.businessDescription.trim(),
      };

      if (formData.registrationNumber?.trim()) {
        applicationData.registrationNumber = formData.registrationNumber.trim();
      }
      if (formData.taxId?.trim()) {
        applicationData.taxId = formData.taxId.trim();
      }
      if (formData.latitude !== undefined && formData.latitude !== null) {
        applicationData.latitude = formData.latitude;
      }
      if (formData.longitude !== undefined && formData.longitude !== null) {
        applicationData.longitude = formData.longitude;
      }
      
      await api.post("/memberships/apply", applicationData);
      navigation.navigate("ApplicationSuccess", { status: "pending" });
    } catch (error: any) {
      Alert.alert(
        "Submission Failed",
        error.response?.data?.message || error.message || "Failed to submit application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need location permission to get your current position.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses?.[0]) {
          const address = addresses[0];
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            businessAddress: `${address.street || ""} ${address.streetNumber || ""}`.trim() || prev.businessAddress,
            city: address.city || prev.city,
            district: address.subregion || address.district || prev.district,
          }));
          Alert.alert("Location Set", "Address fields have been auto-filled. Please verify and update if needed.");
        } else {
          setFormData(prev => ({ ...prev, latitude, longitude }));
          Alert.alert("Location Set", "Location captured but address not found. Please fill in manually.");
        }
      } catch {
        setFormData(prev => ({ ...prev, latitude, longitude }));
        Alert.alert("Location Set", "Location captured. Please fill in address details manually.");
      }
    } catch {
      Alert.alert("Error", "Failed to get current location. Please try again.");
    }
  };

  const handleMapLocationSelected = (lat: number, lng: number, address?: string, city?: string, district?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      businessAddress: address || prev.businessAddress,
      city: city || prev.city,
      district: district || prev.district,
    }));
    setShowMap(false);
    Alert.alert("Location Selected", "Address fields have been auto-filled. Please verify and update if needed.");
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
       <View style={[styles.progressBar, { backgroundColor: dynamic.border }]}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%`, backgroundColor: theme.colors.primary }]} />
       </View>
       <Text style={[styles.progressText, { color: dynamic.subtext }]}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );

  const renderInputField = (label: string, field: keyof FormData, options: any = {}) => {
    const hasError = !!errors[field];
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: dynamic.text }]}>
          {label} {options.required && <Text style={{ color: theme.colors.error }}>*</Text>}
        </Text>
        <View style={[
          styles.inputContainer,
          options.multiline && styles.multilineContainer,
          { backgroundColor: dynamic.inputBg, borderColor: dynamic.border },
          hasError && styles.inputError,
        ]}>
          {options.icon && (
            <MaterialIcons 
                name={options.icon as any} 
                size={20} 
                color={hasError ? theme.colors.error : dynamic.subtext} 
                style={[styles.inputIcon, options.multiline && { marginTop: 12 }]} 
            />
          )}
          <TextInput
            style={[
                styles.input, 
                options.icon && styles.inputWithIcon, 
                options.multiline && styles.multilineInput, 
                { color: dynamic.text }
            ]}
            value={String(formData[field] || "")}
            onChangeText={(text) => updateFormData(field, text)}
            placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={dynamic.subtext}
            keyboardType={options.keyboardType || "default"}
            multiline={options.multiline}
            numberOfLines={options.multiline ? 4 : 1}
            editable={!loading}
          />
        </View>
        {options.helperText && !hasError && <Text style={[styles.helperText, { color: dynamic.subtext }]}>{options.helperText}</Text>}
        {hasError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{errors[field]}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStepHeader = (icon: string, title: string, subtitle: string, color: string) => (
    <View style={styles.stepHeader}>
      <View style={[styles.stepIconBg, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon as any} size={32} color={color} />
      </View>
      <Text style={[styles.stepTitle, { color: dynamic.text }]}>{title}</Text>
      <Text style={[styles.stepSubtitle, { color: dynamic.subtext }]}>{subtitle}</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {renderStepHeader("business", "Business Information", "Tell us about your salon business", theme.colors.primary)}
      {renderInputField("Business Name", "businessName", { placeholder: "e.g., Beauty Palace Salon", icon: "storefront", required: true })}
      {renderInputField("Business Description", "businessDescription", { placeholder: "Describe your salon services...", multiline: true, icon: "description", required: true, helperText: "Min 20 characters" })}
      {renderInputField("Registration Number", "registrationNumber", { placeholder: "Registered Business Number (RDB)", icon: "badge", helperText: "Optional" })}
      {renderInputField("Tax ID / TIN", "taxId", { placeholder: "Tax Identification Number", icon: "receipt", helperText: "Optional" })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      {renderStepHeader("location-on", "Location Details", "Where is your salon located?", theme.colors.primary)}
      <View style={styles.locationButtonsContainer}>
        <TouchableOpacity 
          style={[styles.locationButton, { backgroundColor: dynamic.cardBg, borderColor: theme.colors.primary }]} 
          onPress={getCurrentLocation} 
          activeOpacity={0.7}
        >
          <MaterialIcons name="my-location" size={24} color={theme.colors.primary} />
          <Text style={[styles.locationButtonText, { color: theme.colors.primary }]}>Current Location</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.locationButton, { backgroundColor: dynamic.cardBg, borderColor: dynamic.border }]} 
          onPress={() => setShowMap(true)} 
          activeOpacity={0.7}
        >
          <MaterialIcons name="map" size={24} color={theme.colors.secondary} />
          <Text style={[styles.locationButtonText, { color: dynamic.text }]}>Select on Map</Text>
        </TouchableOpacity>
      </View>
      {formData.latitude && formData.longitude && (
        <View style={[styles.coordinatesCard, { backgroundColor: theme.colors.success + "10", borderColor: theme.colors.success + "30" }]}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.coordinatesLabel, { color: theme.colors.success }]}>Location Captured</Text>
            <Text style={[styles.coordinatesText, { color: dynamic.subtext }]}>{formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</Text>
          </View>
        </View>
      )}
      {renderInputField("Business Address", "businessAddress", { placeholder: "Street address, building name", multiline: true, icon: "place", required: true })}
      <View style={{ flexDirection: 'row', gap: 12 }}>
         <View style={{ flex: 1 }}>{renderInputField("City", "city", { placeholder: "Kigali", required: true })}</View>
         <View style={{ flex: 1 }}>{renderInputField("District", "district", { placeholder: "Gasabo", required: true })}</View>
      </View>
      {showMap && (
        <View style={styles.mapModal}>
          <View style={[styles.mapModalContent, { backgroundColor: dynamic.cardBg }]}>
            <View style={[styles.mapModalHeader, { borderBottomColor: dynamic.border }]}>
              <Text style={[styles.mapModalTitle, { color: dynamic.text }]}>Select Salon Location</Text>
              <TouchableOpacity onPress={() => setShowMap(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color={dynamic.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <OpenStreetMapView
                latitude={formData.latitude || -1.9441}
                longitude={formData.longitude || 30.0619}
                onLocationSelected={handleMapLocationSelected}
                isDark={isDark}
              />
            </View>
            <View style={[styles.mapInstructions, { borderTopColor: dynamic.border }]}>
              <MaterialIcons name="info" size={16} color={theme.colors.primary} />
              <Text style={[styles.mapInstructionsText, { color: dynamic.subtext }]}>Tap on the map to set location</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      {renderStepHeader("contacts", "Contact Information", "How can customers reach you?", theme.colors.success)}
      {renderInputField("Phone Number", "phone", { placeholder: "+250 7XX XXX XXX", keyboardType: "phone-pad", icon: "phone", required: true, helperText: "Format: 07XX XXX XXX" })}
      {renderInputField("Email Address", "email", { placeholder: "business@example.com", keyboardType: "email-address", icon: "email", required: true })}
      <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + "10", borderColor: theme.colors.primary + "30" }]}>
        <MaterialIcons name="info" size={20} color={theme.colors.primary} />
        <Text style={[styles.infoText, { color: dynamic.text }]}>By submitting, you agree to our terms. Your application will be reviewed within 2-3 business days.</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamic.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {checkingExisting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: dynamic.text }]}>Checking application status...</Text>
        </View>
      ) : (
        <>
          <View style={[styles.header, { borderBottomColor: dynamic.border }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7} disabled={loading}>
              <MaterialIcons name="arrow-back" size={24} color={dynamic.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: dynamic.text }]}>Membership Application</Text>
            <View style={styles.placeholder} />
          </View>
          {renderProgressBar()}
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {currentStep === 1 ? renderStep1() : currentStep === 2 ? renderStep2() : renderStep3()}
              <View style={[styles.bottomBar, { borderTopColor: dynamic.border }]}>
                <TouchableOpacity
                  style={[styles.nextButton, { backgroundColor: loading ? theme.colors.border : theme.colors.primary }, loading && styles.nextButtonDisabled]}
                  onPress={handleNext}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                    {loading ? <Text style={styles.nextButtonText}>Processing...</Text> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         <Text style={styles.nextButtonText}>{currentStep === totalSteps ? "Submit Application" : "Continue"}</Text>
                        <MaterialIcons name={currentStep === totalSteps ? "check" : "arrow-forward"} size={20} color="#FFFFFF" />
                      </View>
                    )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", textAlign: "center" },
  placeholder: { width: 40 },
  progressContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 13, fontWeight: '600' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  stepContent: { gap: 24 },
  stepHeader: { alignItems: "center", marginBottom: 8 },
  stepIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  stepTitle: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 15, textAlign: "center", maxWidth: '80%', lineHeight: 20 },
  inputGroup: { gap: 8, marginBottom: 4 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  helperText: { fontSize: 12, marginTop: 4 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, minHeight: 54, backgroundColor: '#FAFAFA' },
  multilineContainer: { alignItems: "flex-start" },
  inputError: { borderColor: theme.colors.error },
  inputIcon: { marginLeft: 16, marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16, paddingRight: 16, minHeight: 54 },
  inputWithIcon: { paddingLeft: 0 },
  multilineInput: { height: 120, textAlignVertical: "top", paddingTop: 16, paddingBottom: 16 },
  errorContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  errorText: { fontSize: 12, color: theme.colors.error, fontWeight: '500' },
  infoCard: { flexDirection: "row", padding: 16, borderRadius: 12, gap: 12, marginTop: 8, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  bottomBar: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  nextButton: { borderRadius: 50, height: 56, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  locationButtonsContainer: { flexDirection: "row", gap: 12 },
  locationButton: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 8, height: 100 },
  locationButtonText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  coordinatesCard: { flexDirection: "row", padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, alignItems: "center" },
  coordinatesLabel: { fontSize: 14, fontWeight: "700" },
  coordinatesText: { fontSize: 13, marginTop: 2 },
  mapModal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  mapModalContent: { width: "100%", maxHeight: 600, borderRadius: 24, overflow: "hidden", elevation: 10 },
  mapModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  mapModalTitle: { fontSize: 18, fontWeight: "700" },
  mapContainer: { height: 400, padding: 16 },
  mapInstructions: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderTopWidth: 1 },
  mapInstructionsText: { fontSize: 13, flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { fontSize: 16, marginTop: 16 },
});
