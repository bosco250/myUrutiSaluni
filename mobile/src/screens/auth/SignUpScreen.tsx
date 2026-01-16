import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, SegmentedControl } from "../../components";
import { MailIcon, LockIcon, PersonIcon, PhoneIcon, ChevronLeftIcon } from "../../components/common/Icons";
import { theme } from "../../theme";
import { useAuth, useTheme } from "../../context";

interface SignUpScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
    goBack: () => void;
  };
}

type AccountType = "Customer" | "Employee" | "Owner";

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { register } = useAuth();
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
    inputBackground: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    border: {
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    backButton: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
  };

  const [accountType, setAccountType] = useState<AccountType>("Customer");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
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
    setErrors({});

    try {
      // Map account type to backend role
      const roleMap: Record<AccountType, string> = {
        Customer: 'customer',
        Employee: 'salon_employee',
        Owner: 'salon_owner',
      };

      // Call register through auth context (which handles storage automatically)
      const response = await register({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        role: roleMap[accountType],
      });

      console.log("Sign up successful:", response.user);

      // Registration automatically authenticates the user via AuthContext
      // Navigate back to login as a fallback, though App-level routing should switch to the app shell
      navigation?.navigate("Login");
    } catch (error: any) {
      // Handle errors
      const errorMessage = error.message || "Registration failed. Please try again.";
      
      // Check if it's a validation error
      if (errorMessage.toLowerCase().includes('email')) {
        setErrors({
          email: errorMessage,
        });
      } else if (errorMessage.toLowerCase().includes('password')) {
        setErrors({
          password: errorMessage,
        });
      } else {
        // Show alert for other errors
        Alert.alert("Registration Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
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
            <View style={styles.header}>
              <TouchableOpacity
                style={[styles.backButton, dynamicStyles.backButton]}
                onPress={() => navigation?.goBack()}
              >
                <ChevronLeftIcon size={28} color={isDark ? theme.colors.white : theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, dynamicStyles.text]}>Join Uruti</Text>
              <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
                Start your journey with us today
              </Text>
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
              label="Phone Number (Optional)"
              placeholder="+250 7XX XXX XXX"
              value={formData.phone}
              onChangeText={(value) => updateField("phone", value)}
              keyboardType="phone-pad"
              autoCapitalize="none"
              error={errors.phone}
              leftIcon={<PhoneIcon size={20} color={theme.colors.primary} />}
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
              <Text style={[styles.termsText, dynamicStyles.textSecondary]}>
                By signing up, you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={[styles.signInText, dynamicStyles.textSecondary]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
                <Text style={styles.signInLink}>Sign In</Text>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    paddingTop: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: "flex-start",
  },
  backButton: {
    marginBottom: theme.spacing.lg,
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
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.bold,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    opacity: 0.6,
  },
  form: {
    width: "100%",
    gap: theme.spacing.sm,
  },
  createButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    height: 56,
    borderRadius: 16,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  termsContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  termsText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
    opacity: 0.6,
  },
  termsLink: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  signInText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    opacity: 0.8,
  },
  signInLink: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
});
