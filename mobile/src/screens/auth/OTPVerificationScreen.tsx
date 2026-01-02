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
import { SecurityIcon, ChevronLeftIcon } from "../../components/common/Icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { SafeAreaView } from "react-native-safe-area-context";

interface OTPVerificationScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

export default function OTPVerificationScreen({ navigation }: OTPVerificationScreenProps) {
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

            {/* Security Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, dynamicStyles.iconBackground]}>
                <SecurityIcon size={40} color={isDark ? theme.colors.primary : "#A67C52"} />
              </View>
            </View>

            {/* Header Text */}
            <View style={styles.header}>
              <Text style={[styles.title, dynamicStyles.text]}>OTP Verification</Text>
              <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
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
  },
  verifyButton: {
    marginTop: theme.spacing.xl,
    height: 56,
    borderRadius: 16,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  resendText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    opacity: 0.6,
  },
  resendLink: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});

