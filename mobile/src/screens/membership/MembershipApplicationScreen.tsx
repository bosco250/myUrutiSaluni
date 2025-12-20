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
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import {api} from "../../services/api";

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
  const [loadingLocation, setLoadingLocation] = useState(false);
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
      // Response IS the data directly, not response.data
      if (response && (response as any).id) {
        // User already has an application, redirect to status screen
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

  // Check if user already has an application on mount
  useEffect(() => {
    checkExistingApplication();
  }, [checkExistingApplication]);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5",
      color: isDark ? "#FFFFFF" : theme.colors.text,
      borderColor: isDark ? "#3A3A3C" : "#E0E0E0",
    },
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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
        // More flexible phone validation for Rwanda
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
    if (!validateStep()) {
      return;
    }

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
    if (!validateStep()) {
      return;
    }

    setLoading(true);
    try {
      // Submit data matching backend DTO fields exactly
      const applicationData: any = {
        businessName: formData.businessName.trim(),
        businessAddress: formData.businessAddress.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        businessDescription: formData.businessDescription.trim(),
      };

      // Add optional fields only if they have values
      if (formData.registrationNumber?.trim()) {
        applicationData.registrationNumber = formData.registrationNumber.trim();
      }
      if (formData.taxId?.trim()) {
        applicationData.taxId = formData.taxId.trim();
      }
      // Include coordinates even if they're 0 (valid coordinates)
      if (formData.latitude !== undefined && formData.latitude !== null) {
        applicationData.latitude = formData.latitude;
      }
      if (formData.longitude !== undefined && formData.longitude !== null) {
        applicationData.longitude = formData.longitude;
      }

      console.log("Submitting application...", applicationData);
      
      const response = await api.post("/memberships/apply", applicationData);
      console.log("Application submitted successfully:", response);
      
      navigation.navigate("ApplicationSuccess", { status: "pending" });
    } catch (error: any) {
      console.error("Submission error:", error);
      console.error("Error response:", error.response?.data);
      
      Alert.alert(
        "Submission Failed",
        error.response?.data?.message || error.message || "Failed to submit application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need location permission to get your current position."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          
          // Auto-fill form fields with geocoded data
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            businessAddress: `${address.street || ""} ${address.streetNumber || ""}`.trim() || prev.businessAddress,
            city: address.city || prev.city,
            district: address.subregion || address.district || prev.district,
          }));

          Alert.alert(
            "Location Set",
            "Address fields have been auto-filled. Please verify and update if needed."
          );
        } else {
          // No address found, just set coordinates
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
          }));
          Alert.alert(
            "Location Set",
            "Location captured but address not found. Please fill in manually."
          );
        }
      } catch {
        // Geocoding failed, just set coordinates
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        Alert.alert(
          "Location Set",
          "Location captured. Please fill in address details manually."
        );
      }
    } catch {
      Alert.alert("Error", "Failed to get current location. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleMapSelect = async (latitude: number, longitude: number) => {
    setLoadingLocation(true);
    try {
      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        
        // Auto-fill form fields with geocoded data
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          businessAddress: `${address.street || ""} ${address.streetNumber || ""}`.trim() || prev.businessAddress,
          city: address.city || prev.city,
          district: address.subregion || address.district || prev.district,
        }));

        setShowMap(false);
        Alert.alert(
          "Location Selected",
          "Address fields have been auto-filled. Please verify and update if needed."
        );
      } else {
        // No address found, just set coordinates
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        setShowMap(false);
        Alert.alert(
          "Location Selected",
          "Please fill in address details manually."
        );
      }
    } catch {
      // Geocoding failed, just set coordinates
      setFormData(prev => ({
        ...prev,
        latitude,
        longitude,
      }));
      setShowMap(false);
      Alert.alert(
        "Location Selected",
        "Please fill in address details manually."
      );
    } finally {
      setLoadingLocation(false);
    }
  };



  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <View key={stepNumber} style={styles.progressStepWrapper}>
            {index > 0 && (
              <View
                style={[
                  styles.progressLine,
                  isCompleted && styles.progressLineCompleted,
                ]}
              />
            )}
            <View
              style={[
                styles.progressDot,
                isActive && styles.progressDotActive,
                isCompleted && styles.progressDotCompleted,
              ]}
            >
              {isCompleted ? (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    isActive && styles.progressDotTextActive,
                  ]}
                >
                  {stepNumber}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderInputField = (
    label: string,
    field: keyof FormData,
    options: {
      placeholder?: string;
      keyboardType?: "default" | "email-address" | "phone-pad";
      multiline?: boolean;
      icon?: string;
      required?: boolean;
      helperText?: string;
    } = {}
  ) => {
    const hasError = !!errors[field];
    
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, dynamicStyles.text]}>
          {label} {options.required && <Text style={{ color: theme.colors.error }}>*</Text>}
        </Text>
        {options.helperText && !hasError && (
          <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
            {options.helperText}
          </Text>
        )}
        <View style={[
          styles.inputContainer,
          dynamicStyles.input,
          hasError && styles.inputError,
        ]}>
          {options.icon && (
            <MaterialIcons
              name={options.icon as any}
              size={20}
              color={hasError ? theme.colors.error : dynamicStyles.textSecondary.color}
              style={styles.inputIcon}
            />
          )}
          <TextInput
            style={[
              styles.input,
              options.icon && styles.inputWithIcon,
              options.multiline && styles.multilineInput,
              { color: dynamicStyles.text.color },
            ]}
            value={String(formData[field] || "")}
            onChangeText={(text) => updateFormData(field, text)}
            placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={dynamicStyles.textSecondary.color}
            keyboardType={options.keyboardType || "default"}
            multiline={options.multiline}
            numberOfLines={options.multiline ? 4 : 1}
            editable={!loading}
          />
        </View>
        {hasError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{errors[field]}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient
          colors={[theme.colors.primary + "20", theme.colors.primary + "10"]}
          style={styles.stepIconBg}
        >
          <MaterialIcons name="business" size={32} color={theme.colors.primary} />
        </LinearGradient>
        <Text style={[styles.stepTitle, dynamicStyles.text]}>
          Business Information
        </Text>
        <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
          Tell us about your salon business
        </Text>
      </View>

      {renderInputField("Business Name", "businessName", {
        placeholder: "e.g., Beauty Palace Salon",
        icon: "storefront",
        required: true,
        helperText: "The official name of your salon",
      })}
      {renderInputField("Business Description", "businessDescription", {
        placeholder: "Describe your salon services, specialties, and what makes you unique",
        multiline: true,
        icon: "description",
        required: true,
        helperText: "Provide a detailed description (minimum 20 characters)",
      })}
      {renderInputField("Registration Number", "registrationNumber", {
        placeholder: "Business registration number",
        icon: "badge",
        helperText: "Optional - if your business is registered",
      })}
      {renderInputField("Tax ID", "taxId", {
        placeholder: "Tax identification number",
        icon: "receipt",
        helperText: "Optional - if you have a tax ID",
      })}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient
          colors={[theme.colors.primary + "20", theme.colors.primary + "10"]}
          style={styles.stepIconBg}
        >
          <MaterialIcons name="location-on" size={32} color={theme.colors.primary} />
        </LinearGradient>
        <Text style={[styles.stepTitle, dynamicStyles.text]}>
          Location Details
        </Text>
        <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
          Where is your salon located?
        </Text>
      </View>

      {/* Location Buttons */}
      <View style={styles.locationButtonsContainer}>
        <TouchableOpacity
          style={[styles.locationButton, dynamicStyles.card]}
          onPress={getCurrentLocation}
          disabled={loadingLocation}
          activeOpacity={0.7}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialIcons name="my-location" size={24} color={theme.colors.primary} />
          )}
          <Text style={[styles.locationButtonText, dynamicStyles.text]}>
            Use Current Location
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locationButton, dynamicStyles.card]}
          onPress={() => setShowMap(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="map" size={24} color={theme.colors.secondary} />
          <Text style={[styles.locationButtonText, dynamicStyles.text]}>
            Select on Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Show coordinates if set */}
      {formData.latitude && formData.longitude && (
        <View style={[styles.coordinatesCard, { backgroundColor: theme.colors.success + "10", borderColor: theme.colors.success + "30" }]}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.coordinatesLabel, { color: theme.colors.success }]}>
              Location Set
            </Text>
            <Text style={[styles.coordinatesText, dynamicStyles.textSecondary]}>
              {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      )}

      {renderInputField("Business Address", "businessAddress", {
        placeholder: "Street address, building name, etc.",
        multiline: true,
        icon: "place",
        required: true,
        helperText: "Full physical address of your salon",
      })}
      {renderInputField("City", "city", {
        placeholder: "e.g., Kigali",
        icon: "location-city",
        required: true,
      })}
      {renderInputField("District", "district", {
        placeholder: "e.g., Gasabo, Kicukiro, Nyarugenge",
        icon: "map",
        required: true,
      })}

      {/* Map Modal */}
      {showMap && (
        <View style={styles.mapModal}>
          <View style={[styles.mapModalContent, dynamicStyles.card]}>
            <View style={styles.mapModalHeader}>
              <Text style={[styles.mapModalTitle, dynamicStyles.text]}>
                Select Salon Location
              </Text>
              <TouchableOpacity onPress={() => setShowMap(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color={dynamicStyles.text.color} />
              </TouchableOpacity>
            </View>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: formData.latitude || -1.9441,
                longitude: formData.longitude || 30.0619,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(e) => handleMapSelect(
                e.nativeEvent.coordinate.latitude,
                e.nativeEvent.coordinate.longitude
              )}
            >
              {formData.latitude && formData.longitude && (
                <Marker
                  coordinate={{
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  }}
                  title="Salon Location"
                />
              )}
            </MapView>
            <View style={styles.mapInstructions}>
              <MaterialIcons name="info" size={16} color={theme.colors.primary} />
              <Text style={[styles.mapInstructionsText, dynamicStyles.textSecondary]}>
                Tap on the map to set your salon's location
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient
          colors={[theme.colors.success + "20", theme.colors.success + "10"]}
          style={styles.stepIconBg}
        >
          <MaterialIcons name="contacts" size={32} color={theme.colors.success} />
        </LinearGradient>
        <Text style={[styles.stepTitle, dynamicStyles.text]}>
          Contact Information
        </Text>
        <Text style={[styles.stepSubtitle, dynamicStyles.textSecondary]}>
          How can customers reach you?
        </Text>
      </View>

      {renderInputField("Phone Number", "phone", {
        placeholder: "+250 7XX XXX XXX",
        keyboardType: "phone-pad",
        icon: "phone",
        required: true,
        helperText: "Format: +250 7XX XXX XXX or 07XX XXX XXX",
      })}
      {renderInputField("Email Address", "email", {
        placeholder: "business@example.com",
        keyboardType: "email-address",
        icon: "email",
        required: true,
        helperText: "We'll send application updates to this email",
      })}

      <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + "10", borderColor: theme.colors.primary + "30" }]}>
        <MaterialIcons name="info" size={20} color={theme.colors.primary} />
        <Text style={[styles.infoText, dynamicStyles.text]}>
          By submitting, you agree to our terms. Your application will be reviewed within 2-3 business days.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) return renderStep1();
    if (currentStep === 2) return renderStep2();
    if (currentStep === 3) return renderStep3();
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {checkingExisting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.text]}>
            Checking application status...
          </Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          disabled={loading}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Salon Owner Application
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}

          {/* Bottom Buttons - Inside ScrollView */}
          <View style={[styles.bottomBar, dynamicStyles.card]}>
            <Text style={[styles.stepIndicator, dynamicStyles.textSecondary]}>
              Step {currentStep} of {totalSteps}
            </Text>
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleNext}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={loading 
                  ? [theme.colors.border, theme.colors.borderLight] 
                  : [theme.colors.primary, theme.colors.primaryLight]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextButtonGradient}
              >
                {loading ? (
                  <Text style={styles.nextButtonText}>Submitting...</Text>
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentStep === totalSteps ? "Submit Application" : "Continue"}
                    </Text>
                    <MaterialIcons
                      name={currentStep === totalSteps ? "check" : "arrow-forward"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </LinearGradient>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  progressStepWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: -4,
  },
  progressLineCompleted: {
    backgroundColor: theme.colors.primary,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  progressDotTextActive: {
    color: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  stepContent: {
    gap: theme.spacing.md,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  stepIconBg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginTop: 4,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  inputIcon: {
    marginLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  inputWithIcon: {
    paddingLeft: theme.spacing.xs,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: theme.spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  stepIndicator: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md + 2,
    gap: theme.spacing.xs,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  locationButtonsContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  locationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: theme.spacing.xs,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  coordinatesCard: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    alignItems: "center",
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  mapModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  mapModalContent: {
    width: "100%",
    maxHeight: 500,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  map: {
    width: "100%",
    height: 350,
  },
  mapInstructions: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  mapInstructionsText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
  },
});
