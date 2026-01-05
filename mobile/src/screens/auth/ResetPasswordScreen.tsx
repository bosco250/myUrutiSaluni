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
import { LockIcon, ChevronLeftIcon } from "../../components/common/Icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { SafeAreaView } from "react-native-safe-area-context";

interface ResetPasswordScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function ResetPasswordScreen({
  navigation,
}: ResetPasswordScreenProps) {
  const { isDark } = useTheme();

  // Dynamic styles for dark/light mode support
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    backButton: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    iconBackground: {
      backgroundColor: isDark ? theme.colors.gray800 : "#F5E6D3",
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
    }
  };

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

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Header with Back Button */}
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={[styles.backButton, dynamicStyles.backButton]}
                onPress={() => navigation?.goBack()}
              >
                <ChevronLeftIcon size={28} color={isDark ? theme.colors.white : theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Lock Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, dynamicStyles.iconBackground]}>
                <LockIcon size={40} color={isDark ? theme.colors.primary : "#A67C52"} />
              </View>
            </View>

            {/* Header Text */}
            <View style={styles.header}>
              <Text style={[styles.title, dynamicStyles.text]}>Create New Password</Text>
              <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
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
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, dynamicStyles.card]}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={[styles.successIconCircle, { backgroundColor: theme.colors.success + '15' }]}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>
            </View>

            {/* Success Title */}
            <Text style={[styles.successTitle, dynamicStyles.text]}>Password Changed!</Text>

            {/* Success Message */}
            <Text style={[styles.successMessage, dynamicStyles.textSecondary]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#F5E6D3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
    opacity: 0.6,
  },
  form: {
    width: "100%",
    gap: theme.spacing.md,
  },
  buttonWrapper: {
    marginTop: theme.spacing.md,
  },
  resetButton: {
    height: 56,
    borderRadius: 16,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    borderRadius: 24,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    opacity: 0.5,
  },
  successIconContainer: {
    marginBottom: theme.spacing.lg,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successCheckmark: {
    fontSize: 40,
    color: theme.colors.success,
    fontWeight: "800",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
    opacity: 0.7,
  },
  backToLoginButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backToLoginButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});
