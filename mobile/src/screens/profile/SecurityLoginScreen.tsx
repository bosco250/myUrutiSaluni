import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";

interface SecurityLoginScreenProps {
  navigation?: {
    goBack?: () => void;
  };
}

export default function SecurityLoginScreen({
  navigation,
}: SecurityLoginScreenProps) {
  const { isDark } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    dangerCard: {
      backgroundColor: isDark ? "rgba(255, 59, 48, 0.15)" : theme.colors.errorLight,
    },
  };

  const handleUpdatePassword = () => {
    // Validation: Check if all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Validation: Check password length
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    // Validation: Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    // Validation: Check if new password is different from current password
    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    // Here you would call your API to change the password
    Alert.alert("Success", "Password updated successfully", [
      {
        text: "OK",
        onPress: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    // Here you would call your API to delete the account
    Alert.alert("Account Deleted", "Your account has been deleted.");
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

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
          Security & Login
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Update Password Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, dynamicStyles.iconBg]}>
            <MaterialIcons
              name="lock"
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <Text style={[styles.sectionHeaderText, dynamicStyles.text]}>
            Update Password
          </Text>
        </View>

        <View style={[styles.sectionCard, dynamicStyles.card]}>
          {/* Current Password */}
          <View style={styles.inputContainer}>
            <Text
              style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
            >
              Current Password
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, dynamicStyles.input]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showCurrentPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text
              style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
            >
              New Password
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, dynamicStyles.input]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showNewPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text
              style={[styles.label, { color: dynamicStyles.textSecondary.color }]}
            >
              Confirm Password
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, dynamicStyles.input]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updatePasswordButton}
            onPress={handleUpdatePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.updatePasswordButtonText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
            <MaterialIcons
              name="warning"
              size={18}
              color={theme.colors.error}
            />
          </View>
          <Text style={[styles.sectionHeaderText, dynamicStyles.text]}>
            Danger Zone
          </Text>
        </View>

        <View style={[styles.dangerCard, dynamicStyles.dangerCard]}>
          <Text style={[styles.dangerTitle, { color: dynamicStyles.text.color }]}>
            Delete Account
          </Text>
          <Text
            style={[
              styles.dangerDescription,
              { color: dynamicStyles.textSecondary.color },
            ]}
          >
            Once you delete your account, there is no going back. Please be certain.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.card]}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <MaterialIcons
                name="warning"
                size={32}
                color={theme.colors.error}
              />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: dynamicStyles.text.color }]}>
              Delete Account
            </Text>

            {/* Message */}
            <Text
              style={[
                styles.modalMessage,
                { color: dynamicStyles.textSecondary.color },
              ]}
            >
              Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.
            </Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelDelete}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelButtonText, { color: dynamicStyles.text.color }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDeleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.medium,
  },
  passwordInputContainer: {
    position: "relative",
  },
  passwordInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    paddingRight: 50,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  eyeIcon: {
    position: "absolute",
    right: theme.spacing.md,
    top: 12,
    padding: theme.spacing.xs,
  },
  updatePasswordButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  updatePasswordButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  dangerCard: {
    backgroundColor: theme.colors.errorLight,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  dangerDescription: {
    fontSize: 14,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  deleteAccountButton: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  deleteAccountButtonText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  warningIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
  modalButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.white,
  },
});
