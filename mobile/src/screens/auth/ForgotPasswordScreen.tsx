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
import { Button, Input } from "../../components";
import { MailIcon, LockIcon } from "../../components/common/Icons";
import { theme } from "../../theme";

interface ForgotPasswordScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email is invalid");
      return false;
    }
    setError("");
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      // Navigate to OTP verification screen after showing success
      setTimeout(() => {
        navigation?.navigate("OTPVerification");
      }, 2000);
    }, 1500);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successMessage}>
            We've sent a verification code to {email}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Padlock Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <LockIcon size={36} color="#A67C52" />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Don't worry! It happens. Please enter the email associated with
              your account.
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
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
              leftIcon={<MailIcon size={20} color={theme.colors.primary} />}
            />

            <Button
              title="Send Code"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.sendButton}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 29, // theme.spacing.lg (24) + 20% = 29
    paddingBottom: theme.spacing.xl,
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
    marginBottom: theme.spacing.lg,
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
  sendButton: {
    marginTop: theme.spacing.md,
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
});
