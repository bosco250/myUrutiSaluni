import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Button, Input } from "../../components";
import { LockIcon } from "../../components/common/Icons";
import { theme } from "../../theme";

interface ResetPasswordScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function ResetPasswordScreen({
  navigation,
}: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validate = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true);
    }, 1500);
  };

  const handleBackToLogin = () => {
    setShowSuccessModal(false);
    navigation?.navigate("Login");
  };

  const Wrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const wrapperProps =
    Platform.OS === "ios"
      ? {
          style: styles.container,
          behavior: "padding" as const,
          keyboardVerticalOffset: 0,
        }
      : { style: styles.container };

  return (
    <>
      <Wrapper {...wrapperProps}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => navigation?.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {/* Lock Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <LockIcon size={36} color="#A67C52" />
              </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Your new password must be unique from those previously used.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="New Password"
                placeholder="Enter your new password"
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (errors.newPassword) {
                    setErrors((prev) => ({ ...prev, newPassword: "" }));
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                error={errors.newPassword}
                leftIcon={<LockIcon size={20} color={theme.colors.primary} />}
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                error={errors.confirmPassword}
                leftIcon={<LockIcon size={20} color={theme.colors.primary} />}
              />

              <View style={styles.buttonWrapper}>
                <Button
                  title="Reset Password"
                  onPress={handleResetPassword}
                  loading={loading}
                  style={styles.resetButton}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </Wrapper>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>
            </View>

            {/* Success Title */}
            <Text style={styles.successTitle}>Password Changed!</Text>

            {/* Success Message */}
            <Text style={styles.successMessage}>
              Your password has been changed successfully.
            </Text>

            {/* Back to Login Button */}
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={handleBackToLogin}
              activeOpacity={0.7}
            >
              <Text style={styles.backToLoginButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: 29, // theme.spacing.lg (24) + 20% = 29
    paddingBottom: theme.spacing.xl * 3,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  backButtonContainer: {
    alignSelf: "flex-start",
    marginBottom: theme.spacing.md,
    padding: theme.spacing.xs,
    paddingLeft: 0,
  },
  backButtonText: {
    fontSize: 28,
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: "#F5E6D3",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  form: {
    width: "100%",
  },
  buttonWrapper: {
    marginTop: theme.spacing.lg,
  },
  resetButton: {
    marginTop: 0,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    fontWeight: "300",
  },
  successIconContainer: {
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E6F7EA",
    alignItems: "center",
    justifyContent: "center",
  },
  successCheckmark: {
    fontSize: 48,
    color: "#34C759",
    fontWeight: "bold",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
    fontFamily: theme.fonts.regular,
  },
  backToLoginButton: {
    width: "100%",
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  backToLoginButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
