import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input } from "../../components";
import { MailIcon, LockIcon, ChevronLeftIcon } from "../../components/common/Icons";
import { useTheme } from "../../context";
import { theme } from "../../theme";
import { authService } from "../../services/auth";

interface ForgotPasswordScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
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
  };

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      setGeneralError("");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email is invalid");
      setGeneralError("");
      return false;
    }
    setError("");
    setGeneralError("");
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError("");

    try {
      const response = await authService.requestPasswordReset(email.trim());
      setSuccess(true);
      setSuccessMessage(response.message);
    } catch (apiError: any) {
      setGeneralError(apiError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successMessage}>
            {successMessage || `We've sent password reset instructions to ${email}. Please check your inbox for the token.`}
          </Text>
          <Button
            title="Open Reset Form"
            onPress={() => navigation?.navigate("ResetPassword")}
            style={styles.resetEntryButton}
          />
          <TouchableOpacity onPress={() => navigation?.navigate("Login")}
            style={styles.backToLoginLink}
          >
            <Text style={styles.backToLoginText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

            {/* Padlock Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, dynamicStyles.iconBackground]}>
                <LockIcon size={40} color={isDark ? theme.colors.primary : "#A67C52"} />
              </View>
            </View>

            {/* Header Text */}
            <View style={styles.header}>
              <Text style={[styles.title, dynamicStyles.text]}>Forgot Password?</Text>
              <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
                Enter the email associated with your account and we’ll send you a
                secure reset link containing your token.
              </Text>
            </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="example@email.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError("");
                setGeneralError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
              leftIcon={<MailIcon size={20} color={theme.colors.primary} />}
            />

            {generalError ? (
              <Text style={styles.generalErrorText}>{generalError}</Text>
            ) : null}

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.sendButton}
            />
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  form: {
    width: "100%",
    gap: theme.spacing.md,
  },
  sendButton: {
    marginTop: theme.spacing.md,
    height: 56,
    borderRadius: 16,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  successIcon: {
    fontSize: 64,
    color: theme.colors.success,
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  successMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
    fontFamily: theme.fonts.regular,
  },
  resetEntryButton: {
    width: "100%",
    marginTop: theme.spacing.lg,
  },
  backToLoginLink: {
    marginTop: theme.spacing.md,
  },
  backToLoginText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
    fontSize: 16,
  },
  generalErrorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
});
