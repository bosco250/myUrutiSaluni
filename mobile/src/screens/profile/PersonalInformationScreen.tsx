import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";

// Placeholder profile image - in production, use actual user image
const profileImage = require("../../../assets/Logo.png");

interface PersonalInformationScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export default function PersonalInformationScreen({
  navigation,
}: PersonalInformationScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Initialize form fields with user data from auth context
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to update user profile
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert("Success", "Profile updated successfully!");
    } catch {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

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
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      color: isDark ? "#FFFFFF" : theme.colors.text,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    headerBorder: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    iconBg: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.gray200,
    },
  };

  const renderInputField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    icon: string,
    options: {
      placeholder?: string;
      keyboardType?: "default" | "email-address" | "phone-pad";
      multiline?: boolean;
      autoCapitalize?: "none" | "sentences" | "words";
    } = {}
  ) => (
    <View style={[styles.inputCard, dynamicStyles.card]}>
      <View style={[styles.inputIconContainer, dynamicStyles.iconBg]}>
        <MaterialIcons
          name={icon as any}
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.inputContent}>
        <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>
          {label}
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: dynamicStyles.text.color },
            options.multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={options.placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={dynamicStyles.textSecondary.color}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "sentences"}
          multiline={options.multiline}
          numberOfLines={options.multiline ? 3 : 1}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Personal Information
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePictureContainer}>
            <View style={[styles.profileImageBorder, { borderColor: theme.colors.primary }]}>
              <Image source={profileImage} style={styles.profilePicture} />
            </View>
            <TouchableOpacity
              style={[styles.editPhotoButton, { borderColor: dynamicStyles.container.backgroundColor }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.changePhotoLink} activeOpacity={0.7}>
            <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>
              Change Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {renderInputField("Full Name", fullName, setFullName, "person", {
            placeholder: "Enter your full name",
            autoCapitalize: "words",
          })}

          {renderInputField("Email Address", email, setEmail, "email", {
            placeholder: "Enter your email",
            keyboardType: "email-address",
            autoCapitalize: "none",
          })}

          {renderInputField("Phone Number", phone, setPhone, "phone", {
            placeholder: "+250 7XX XXX XXX",
            keyboardType: "phone-pad",
          })}

          {renderInputField("Bio", bio, setBio, "edit", {
            placeholder: "Tell us about yourself...",
            multiline: true,
          })}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          activeOpacity={0.7}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  profilePictureContainer: {
    position: "relative",
    marginBottom: theme.spacing.sm,
  },
  profileImageBorder: {
    padding: 3,
    borderRadius: 55,
    borderWidth: 2,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  changePhotoLink: {
    paddingVertical: theme.spacing.xs,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  formContainer: {
    gap: theme.spacing.md,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    padding: 0,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
