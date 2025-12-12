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
} from "react-native";
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
  const [bio, setBio] = useState(""); // Bio is not in user data, can be fetched from API if needed
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // TODO: Implement API call to update user profile
    // Example: await api.put(`/users/${user?.id}`, { fullName, email, phone, bio });
    console.log("Saving profile:", { fullName, email, phone, bio });
    // For now, just show a message
    alert(
      "Profile update functionality will be implemented with API integration"
    );
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
    input: {
      backgroundColor: isDark ? "#3A3A3C" : theme.colors.backgroundSecondary,
      color: isDark ? "#FFFFFF" : theme.colors.text,
      borderColor: isDark ? "#48484A" : theme.colors.border,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dynamicStyles.text.color }]}>
          Personal Information
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <Image source={profileImage} style={styles.profilePicture} />
          <TouchableOpacity style={styles.editPhotoButton} activeOpacity={0.7}>
            <MaterialIcons name="add" size={20} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
          >
            Full Name
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={dynamicStyles.textSecondary.color}
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
          >
            Email
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={dynamicStyles.textSecondary.color}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
          >
            Phone
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={dynamicStyles.textSecondary.color}
            keyboardType="phone-pad"
          />
        </View>

        {/* Bio */}
        <View style={styles.inputContainer}>
          <Text
            style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
          >
            Bio
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Enter your bio"
            placeholderTextColor={dynamicStyles.textSecondary.color}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.7}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    alignItems: "center",
  },
  profilePictureContainer: {
    position: "relative",
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  inputContainer: {
    width: "100%",
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.medium,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
    width: "100%",
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: theme.spacing.sm,
  },
  saveButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: 8,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.md,
    width: "100%",
  },
  saveButtonText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
