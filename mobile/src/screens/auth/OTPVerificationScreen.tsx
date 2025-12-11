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
import { Button } from "../../components";
import OTPInput from "../../components/common/OTPInput";
import { SecurityIcon } from "../../components/common/Icons";
import { theme } from "../../theme";

interface OTPVerificationScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function OTPVerificationScreen({ navigation }: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOTPComplete = (code: string) => {
    setOtp(code);
    setError("");
  };

  const validate = () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the complete verification code");
      return false;
    }
    setError("");
    return true;
  };

  const handleVerify = async () => {
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Navigate to reset password screen
      console.log("OTP verified:", otp);
      navigation?.navigate("ResetPassword");
    }, 1500);
  };

  const handleResendCode = () => {
    setOtp("");
    setError("");
    // Implement resend logic
    console.log("Resending code...");
  };

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

          {/* Security Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <SecurityIcon size={36} color="#A67C52" />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>OTP Verification</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to your email. Please enter the code below.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <OTPInput
              length={6}
              onComplete={handleOTPComplete}
              error={error}
            />

            <Button
              title="Verify Code"
              onPress={handleVerify}
              loading={loading}
              style={styles.verifyButton}
            />

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResendCode}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </View>
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
  verifyButton: {
    marginTop: theme.spacing.md,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
  },
  resendText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  resendLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});

