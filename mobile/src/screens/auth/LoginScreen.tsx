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
} from "react-native";
import { Button, Input, Checkbox, SocialButton } from "../../components";
import { MailIcon, LockIcon } from "../../components/common/Icons";
import { theme } from "../../theme";
import { useAuth } from "../../context";

// Import logo
const logo = require("../../../assets/Logo.png");

// Error types for better categorization
type ErrorType = 
  | "network" 
  | "credentials" 
  | "account_locked" 
  | "account_inactive"
  | "rate_limit" 
  | "server" 
  | "validation"
  | "unknown";

interface LoginError {
  type: ErrorType;
  message: string;
  field?: "email" | "password" | "general";
}

interface LoginScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    onLoginSuccess?: () => void;
  };
}

// Error Banner Component for displaying general errors
const ErrorBanner = ({ 
  error, 
  onDismiss 
}: { 
  error: LoginError | null; 
  onDismiss: () => void;
}) => {
  if (!error || error.field !== "general") return null;

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case "network":
        return "📡";
      case "rate_limit":
        return "⏱️";
      case "account_locked":
        return "🔒";
      case "account_inactive":
        return "⚠️";
      case "server":
        return "🔧";
      default:
        return "❌";
    }
  };

  const getErrorColor = (type: ErrorType) => {
    switch (type) {
      case "network":
        return "#FFA500"; // Orange for network issues
      case "rate_limit":
        return "#FF6B6B"; // Red for rate limiting
      case "account_locked":
      case "account_inactive":
        return "#9B59B6"; // Purple for account issues
      case "server":
        return "#3498DB"; // Blue for server issues
      default:
        return theme.colors.error;
    }
  };

  return (
    <View style={[styles.errorBanner, { borderLeftColor: getErrorColor(error.type) }]}>
      <View style={styles.errorBannerContent}>
        <Text style={styles.errorBannerIcon}>{getErrorIcon(error.type)}</Text>
        <View style={styles.errorBannerTextContainer}>
          <Text style={styles.errorBannerTitle}>
            {error.type === "network" ? "Connection Error" :
             error.type === "rate_limit" ? "Too Many Attempts" :
             error.type === "account_locked" ? "Account Locked" :
             error.type === "account_inactive" ? "Account Inactive" :
             error.type === "server" ? "Server Error" :
             "Login Failed"}
          </Text>
          <Text style={styles.errorBannerMessage}>{error.message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.errorBannerClose}>
          <Text style={styles.errorBannerCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<LoginError | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Parse and categorize errors from the backend or network
  const parseError = (error: any): LoginError => {
    const message = error.message?.toLowerCase() || "";
    const statusCode = error.statusCode || error.status;

    // Network errors
    if (
      message.includes("network") || 
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("econnrefused")
    ) {
      return {
        type: "network",
        message: "Unable to connect to the server. Please check your internet connection and try again.",
        field: "general",
      };
    }

    // Rate limiting
    if (
      message.includes("too many") || 
      message.includes("rate limit") ||
      message.includes("try again later") ||
      statusCode === 429
    ) {
      return {
        type: "rate_limit",
        message: "Too many login attempts. Please wait a few minutes before trying again.",
        field: "general",
      };
    }

    // Account locked
    if (
      message.includes("locked") || 
      message.includes("suspended") ||
      message.includes("blocked")
    ) {
      return {
        type: "account_locked",
        message: "Your account has been locked. Please contact support for assistance.",
        field: "general",
      };
    }

    // Account inactive
    if (
      message.includes("inactive") || 
      message.includes("disabled") ||
      message.includes("not activated") ||
      message.includes("verify your email")
    ) {
      return {
        type: "account_inactive",
        message: "Your account is not active. Please verify your email or contact support.",
        field: "general",
      };
    }

    // Invalid credentials (401)
    if (
      message.includes("invalid") ||
      message.includes("incorrect") ||
      message.includes("wrong") ||
      message.includes("unauthorized") ||
      message.includes("401") ||
      statusCode === 401
    ) {
      return {
        type: "credentials",
        message: "Invalid email or password. Please check your credentials and try again.",
        field: "general",
      };
    }

    // User not found
    if (
      message.includes("not found") ||
      message.includes("no user") ||
      message.includes("doesn't exist") ||
      message.includes("does not exist")
    ) {
      return {
        type: "credentials",
        message: "No account found with this email. Please check your email or sign up.",
        field: "email",
      };
    }

    // Server errors
    if (
      message.includes("server") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      statusCode >= 500
    ) {
      return {
        type: "server",
        message: "Our servers are experiencing issues. Please try again in a few moments.",
        field: "general",
      };
    }

    // Email-specific errors
    if (message.includes("email")) {
      return {
        type: "validation",
        message: error.message || "Please enter a valid email address.",
        field: "email",
      };
    }

    // Password-specific errors
    if (message.includes("password")) {
      return {
        type: "validation",
        message: error.message || "Invalid password.",
        field: "password",
      };
    }

    // Unknown/default error
    return {
      type: "unknown",
      message: error.message || "Something went wrong. Please try again.",
      field: "general",
    };
  };

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

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear email error when user starts typing
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    }
    // Clear general error when user modifies input
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear password error when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }));
    }
    // Clear general error when user modifies input
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    clearErrors();

    try {
      // Call login through auth context (which handles storage automatically)
      const response = await login(email.trim(), password);

      console.log("Login successful:", response.user);

      // Show success modal
      setShowSuccessModal(true);
    } catch (error: any) {
      console.log("Login error:", error);
      
      // Parse and categorize the error
      const parsedError = parseError(error);
      
      // Handle error based on its field
      if (parsedError.field === "email") {
        setFieldErrors({ email: parsedError.message });
      } else if (parsedError.field === "password") {
        setFieldErrors({ password: parsedError.message });
      } else {
        // General errors go to the banner
        setGeneralError(parsedError);
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

            {/* Error Banner for general errors */}
            <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email or Phone"
                placeholder="example@email.com"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={fieldErrors.email}
                leftIcon={<MailIcon size={20} color={theme.colors.primary} />}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                error={fieldErrors.password}
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
  // Error Banner Styles
  errorBanner: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  errorBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: theme.spacing.md,
  },
  errorBannerIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  errorBannerTextContainer: {
    flex: 1,
  },
  errorBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  errorBannerMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  errorBannerClose: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
    marginTop: -4,
  },
  errorBannerCloseText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontWeight: "300",
  },
});
