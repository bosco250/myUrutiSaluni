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
import { Button, Input, SegmentedControl } from "../../components";
import { MailIcon, LockIcon, PersonIcon } from "../../components/common/Icons";
import { theme } from "../../theme";

interface SignUpScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

type AccountType = "Customer" | "Employee" | "Owner";

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [accountType, setAccountType] = useState<AccountType>("Customer");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const accountTypes: AccountType[] = ["Customer", "Employee", "Owner"];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log("Sign up successful");
      navigation?.navigate("OTPVerification");
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const accountTypeIndex = accountTypes.indexOf(accountType);

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
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Isimbi to start your journey</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Account Type Selector */}
            <SegmentedControl
              options={accountTypes}
              selectedIndex={accountTypeIndex}
              onSelect={(index) => setAccountType(accountTypes[index])}
            />

            {/* Form Fields */}
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChangeText={(value) => updateField("name", value)}
              autoCapitalize="words"
              error={errors.name}
              leftIcon={<PersonIcon size={20} color={theme.colors.primary} />}
            />

            <Input
              label="Email Address"
              placeholder="example@email.com"
              value={formData.email}
              onChangeText={(value) => updateField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              leftIcon={<MailIcon size={20} color={theme.colors.primary} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => updateField("password", value)}
              secureTextEntry
              autoCapitalize="none"
              error={errors.password}
              leftIcon={<LockIcon size={20} color={theme.colors.primary} />}
            />

            {/* Create Account Button */}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              style={styles.createButton}
            />

            {/* Terms and Privacy */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
                <Text style={styles.signInLink}>Sign In</Text>
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
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  header: {
    marginBottom: theme.spacing.lg,
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
  createButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  termsContainer: {
    marginBottom: theme.spacing.md,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
  },
  termsLink: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  signInText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  signInLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
