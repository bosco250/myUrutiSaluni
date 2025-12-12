import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import { Button, Input, Checkbox, SocialButton } from "../../components";
import { MailIcon, LockIcon } from "../../components/common/Icons";
import { theme } from "../../theme";
import { useAuth } from "../../context";

// Import logo
const logo = require("../../../assets/Logo.png");

interface LoginScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    onLoginSuccess?: () => void;
  };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email or phone is required";
    } else if (!/\S+@\S+\.\S+/.test(email) && !/^\+?[\d\s-()]+$/.test(email)) {
      newErrors.email = "Please enter a valid email or phone number";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      // Call login through auth context (which handles storage automatically)
      const response = await login(email.trim(), password);

      console.log("Login successful:", response.user);

      // Show success modal
      setShowSuccessModal(true);
    } catch (error: any) {
      // Handle errors
      const errorMessage = error.message || "Login failed. Please try again.";

      // Check if it's a validation error from backend
      if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("password")
      ) {
        setErrors({
          email: errorMessage,
          password: errorMessage,
        });
      } else {
        // Show alert for other errors
        Alert.alert("Login Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Navigate to home screen when user clicks Continue
    navigation?.onLoginSuccess?.();
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    console.log(`${provider} login`);
    // Implement social login
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Please log in to your account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email or Phone"
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
                leftIcon={<MailIcon size={20} color={theme.colors.primary} />}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                error={errors.password}
                leftIcon={<LockIcon size={20} color={theme.colors.primary} />}
              />

              {/* Remember Me & Forgot Password */}
              <View style={styles.rememberForgotContainer}>
                <Checkbox
                  checked={rememberMe}
                  onToggle={() => setRememberMe(!rememberMe)}
                  label="Remember me"
                />
                <TouchableOpacity
                  onPress={() => navigation?.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              {/* Social Login Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Buttons */}
              <View style={styles.socialButtonsContainer}>
                <SocialButton
                  provider="google"
                  onPress={() => handleSocialLogin("google")}
                  style={styles.socialButton}
                />
                <View style={styles.socialButtonSpacer} />
                <SocialButton
                  provider="facebook"
                  onPress={() => handleSocialLogin("facebook")}
                  style={styles.socialButton}
                />
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate("SignUp")}
                >
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
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
            <Text style={styles.successTitle}>Login Successful!</Text>

            {/* Success Message */}
            <Text style={styles.successMessage}>
              Welcome back! You have successfully logged in to your account.
            </Text>

            {/* Continue Button */}
            <View style={styles.continueButtonContainer}>
              <Button
                title="Continue"
                onPress={handleSuccessClose}
                style={styles.continueButton}
                textStyle={{ color: theme.colors.textInverse }}
              />
            </View>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 120,
    height: 120,
    maxWidth: "100%",
  },
  header: {
    marginBottom: theme.spacing.lg,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  form: {
    width: "100%",
  },
  rememberForgotContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  loginButton: {
    marginBottom: theme.spacing.md,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.5,
  },
  socialButtonsContainer: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
  },
  socialButton: {
    flex: 1,
  },
  socialButtonSpacer: {
    width: theme.spacing.sm,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  signUpText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  signUpLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
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
  continueButtonContainer: {
    width: "100%",
  },
  continueButton: {
    width: "100%",
    backgroundColor: theme.colors.primary,
  },
});
