import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  paymentsService,
  PaymentMethod,
  PaymentType,
  Payment,
} from "../../services/payments";

interface PaymentScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      amount: number;
      type: PaymentType;
      appointmentId?: string;
      salonId?: string;
      description?: string;
      onSuccess?: () => void;
    };
  };
}

const PAYMENT_METHODS: {
  method: PaymentMethod;
  label: string;
  icon: string;
  color: string;
  description: string;
  badge?: string;
}[] = [
  {
    method: "airtel_money",
    label: "Airtel Money",
    icon: "phone-android",
    color: "#FFCC00",
    description: "Fast & secure mobile money",
    badge: "Recommended",
  },
  {
    method: "wallet",
    label: "URUTI Wallet",
    icon: "account-balance-wallet",
    color: theme.colors.primary,
    description: "Use existing wallet balance",
  },
];

export default function PaymentScreen({
  navigation,
  route,
}: PaymentScreenProps) {
  const { isDark } = useTheme();
  const {
    amount: initialAmount = 0,
    type = "appointment",
    appointmentId,
    salonId,
    description,
  } = route?.params || {};

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [status, setStatus] = useState<
    "input" | "processing" | "success" | "failed"
  >("input");

  // For wallet top-up: allow user to enter amount
  const isTopUp = type === "wallet_topup";
  const [topUpAmount, setTopUpAmount] = useState<string>(
    initialAmount > 0 ? String(initialAmount) : ""
  );
  const amount = isTopUp ? Number(topUpAmount) || 0 : initialAmount;

  // Preset amounts for quick top-up
  const PRESET_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone || phone.trim().length === 0) return false;
    const clean = phone.replace(/\D/g, "");
    // Rwanda Airtel Money: 072, 073
    // User can enter 9 digits: 72XXXXXXX or 73XXXXXXX (without leading 0)
    // Or 10 digits: 072XXXXXXX or 073XXXXXXX (with leading 0)
    if (clean.length === 9) {
      // Format: 72XXXXXXX or 73XXXXXXX (9 digits, starts with 72 or 73)
      return /^(72|73)\d{7}$/.test(clean);
    }
    if (clean.length === 10) {
      // Format: 072XXXXXXX or 073XXXXXXX (10 digits with leading 0)
      return /^0(72|73)\d{7}$/.test(clean);
    }
    return false;
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert("Select Method", "Please select a payment method");
      return;
    }

    if (selectedMethod === "airtel_money") {
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        Alert.alert(
          "Phone Number Required",
          "Please enter your Airtel Money phone number"
        );
        return;
      }
      if (!validatePhoneNumber(phoneNumber)) {
        Alert.alert(
          "Invalid Number",
          "Please enter a valid Airtel Money number (072X or 073X)"
        );
        return;
      }
    }

    setLoading(true);
    setStatus("processing");

    try {
      const paymentResponse = await paymentsService.initiatePayment({
        amount,
        method: selectedMethod,
        type,
        phoneNumber:
          selectedMethod === "airtel_money" ? phoneNumber : undefined,
        appointmentId,
        salonId,
        description,
      });

      setPayment(paymentResponse);

      // If Airtel Money, poll for status
      if (selectedMethod === "airtel_money") {
        try {
          const finalPayment = await paymentsService.pollStatus(
            paymentResponse.id,
            (updated) => setPayment(updated),
            20,
            3000
          );

          if (finalPayment.status === "completed") {
            setStatus("success");
          } else {
            setStatus("failed");
          }
        } catch {
          setStatus("failed");
        }
      } else if (paymentResponse.status === "completed") {
        setStatus("success");
      }
    } catch (error: any) {
      Alert.alert(
        "Payment Failed",
        error.message || "Unable to process payment"
      );
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (status === "success" && route?.params?.onSuccess) {
      route.params.onSuccess();
    }
    navigation.goBack();
  };

  // Processing/Result Screen
  if (status !== "input") {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <View style={styles.resultContainer}>
          {status === "processing" && (
            <>
              <View style={styles.processingIcon}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>
                Processing Payment
              </Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                Please approve the payment on your phone...
              </Text>
              <Text style={[styles.phonePrompt, dynamicStyles.textSecondary]}>
                Check your phone for Airtel Money prompt
              </Text>
            </>
          )}

          {status === "success" && (
            <>
              <View
                style={[styles.successIcon, { backgroundColor: "#E6F7EA" }]}
              >
                <MaterialIcons
                  name="check"
                  size={48}
                  color={theme.colors.success}
                />
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>
                Payment Successful!
              </Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                Your payment of {paymentsService.formatAmount(amount)} has been
                processed.
              </Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
                activeOpacity={0.7}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {status === "failed" && (
            <>
              <View style={[styles.failedIcon, { backgroundColor: "#FFE5E5" }]}>
                <MaterialIcons
                  name="close"
                  size={48}
                  color={theme.colors.error}
                />
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>
                Payment Failed
              </Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                {payment?.failureReason ||
                  "Unable to complete payment. Please try again."}
              </Text>
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  { backgroundColor: theme.colors.error },
                ]}
                onPress={() => setStatus("input")}
                activeOpacity={0.7}
              >
                <Text style={styles.doneButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Payment</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top-Up Header with Icon */}
          {isTopUp && (
            <View style={styles.topUpHeader}>
              <View
                style={[
                  styles.topUpIconContainer,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <MaterialIcons
                  name="account-balance-wallet"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.topUpTitle, dynamicStyles.text]}>
                Top Up Wallet
              </Text>
            </View>
          )}

          {/* Amount Display / Input */}
          {isTopUp ? (
            <View style={styles.amountSection}>
              <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
                Amount
              </Text>
              <View
                style={[
                  styles.amountInputContainer,
                  dynamicStyles.input,
                  amount >= 1000 && styles.amountInputContainerValid,
                ]}
              >
                <Text style={[styles.currencyPrefix, dynamicStyles.text]}>
                  RWF
                </Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    { color: dynamicStyles.text.color },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={topUpAmount}
                  onChangeText={(text) =>
                    setTopUpAmount(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  maxLength={9}
                />
                {amount >= 1000 && (
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color={theme.colors.success}
                    style={styles.validIcon}
                  />
                )}
              </View>

              {/* Preset Amount Buttons */}
              <View style={styles.presetAmountsContainer}>
                {PRESET_AMOUNTS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      dynamicStyles.card,
                      Number(topUpAmount) === preset &&
                        styles.presetButtonActive,
                    ]}
                    onPress={() => setTopUpAmount(String(preset))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        Number(topUpAmount) === preset
                          ? styles.presetButtonTextActive
                          : dynamicStyles.textSecondary,
                      ]}
                    >
                      {preset.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.minAmountHint, dynamicStyles.textSecondary]}>
                Min: 1,000 RWF
              </Text>
            </View>
          ) : (
            <View style={styles.amountSection}>
              <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
                Amount to Pay
              </Text>
              <Text style={[styles.amountValue, dynamicStyles.text]}>
                {paymentsService.formatAmount(amount)}
              </Text>
              {description && (
                <Text
                  style={[
                    styles.amountDescription,
                    dynamicStyles.textSecondary,
                  ]}
                >
                  {description}
                </Text>
              )}
            </View>
          )}

          {/* Payment Methods */}
          <View style={styles.methodsSection}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Payment Method
            </Text>

            {PAYMENT_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm.method}
                style={[
                  styles.methodCard,
                  dynamicStyles.card,
                  selectedMethod === pm.method && styles.methodCardSelected,
                  pm.method === "airtel_money" && styles.airtelCard,
                ]}
                onPress={() => setSelectedMethod(pm.method)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.methodIcon,
                    { backgroundColor: pm.color + "20" },
                  ]}
                >
                  <MaterialIcons
                    name={pm.icon as any}
                    size={24}
                    color={pm.color}
                  />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodHeader}>
                    <Text style={[styles.methodLabel, dynamicStyles.text]}>
                      {pm.label}
                    </Text>
                    {pm.badge && (
                      <View
                        style={[styles.badge, { backgroundColor: pm.color }]}
                      >
                        <Text style={styles.badgeText}>{pm.badge}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    selectedMethod === pm.method && { borderColor: pm.color },
                  ]}
                >
                  {selectedMethod === pm.method && (
                    <View
                      style={[styles.radioInner, { backgroundColor: pm.color }]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phone Number Input (Airtel Money) */}
          {selectedMethod === "airtel_money" && (
            <View style={styles.phoneSection}>
              <View style={styles.phoneHeader}>
                <MaterialIcons name="phone-android" size={20} color="#FFCC00" />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Airtel Money Number
                </Text>
              </View>
              <View
                style={[
                  styles.phoneInputContainer,
                  dynamicStyles.input,
                  validatePhoneNumber(phoneNumber) &&
                    styles.phoneInputContainerValid,
                ]}
              >
                <View style={styles.phonePrefixContainer}>
                  <Text style={[styles.phonePrefix, dynamicStyles.text]}>
                    +250
                  </Text>
                  <View style={styles.phoneDivider} />
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      color: isDark ? "#FFFFFF" : "#000000",
                    },
                  ]}
                  placeholder="72X XXX XXX"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    // Remove all non-digits
                    const cleaned = text.replace(/\D/g, "");
                    // Limit to 9 digits (Rwanda phone number without country code)
                    const limited = cleaned.slice(0, 9);
                    setPhoneNumber(limited);
                  }}
                  keyboardType="phone-pad"
                  maxLength={9}
                  autoFocus={false}
                  selectionColor={theme.colors.primary}
                />
                {validatePhoneNumber(phoneNumber) && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                    style={styles.validIcon}
                  />
                )}
              </View>
              <View style={styles.phoneHintContainer}>
                <MaterialIcons
                  name="info-outline"
                  size={14}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.phoneHint, dynamicStyles.textSecondary]}>
                  Enter your registered Airtel Money number (072X or 073X)
                </Text>
              </View>
            </View>
          )}

          {/* Pay Button */}
          <TouchableOpacity
            style={[
              styles.payButton,
              (!selectedMethod ||
                (selectedMethod === "airtel_money" && !phoneNumber) ||
                (isTopUp && amount < 1000)) &&
                styles.payButtonDisabled,
            ]}
            onPress={handlePayment}
            activeOpacity={0.7}
            disabled={
              !selectedMethod ||
              loading ||
              (selectedMethod === "airtel_money" && !phoneNumber) ||
              (isTopUp && amount < 1000)
            }
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>
                  {isTopUp
                    ? `Top Up ${paymentsService.formatAmount(amount)}`
                    : `Pay ${paymentsService.formatAmount(amount)}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <MaterialIcons
              name="verified-user"
              size={14}
              color={theme.colors.success}
            />
            <Text style={[styles.securityText, dynamicStyles.textSecondary]}>
              Secured with encryption
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  amountDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    height: 56,
    marginBottom: theme.spacing.sm,
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    fontWeight: "600",
    marginRight: theme.spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    fontWeight: "700",
  },
  presetAmountsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  presetButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetButtonActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${theme.colors.primary}10`,
  },
  presetButtonText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  presetButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  minAmountHint: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
  },
  amountInputContainerValid: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  validIcon: {
    marginLeft: theme.spacing.sm,
  },
  topUpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  topUpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topUpTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  methodsSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  methodCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${theme.colors.primary}05`,
  },
  airtelCard: {
    borderColor: "#FFCC00",
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  phoneSection: {
    marginBottom: theme.spacing.md,
  },
  phoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 50,
  },
  phoneInputContainerValid: {
    borderColor: theme.colors.success,
    borderWidth: 2,
  },
  phonePrefixContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  phonePrefix: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    minHeight: 40,
    textAlign: "left",
  },
  phoneHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  phoneHint: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  payButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  securityText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  processingIcon: {
    marginBottom: theme.spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  failedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  resultMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  phonePrompt: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
  doneButton: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
