import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

interface WithdrawScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      onSuccess?: () => void;
    };
  };
}

interface WalletInfo {
  balance: number;
  currency: string;
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

export default function WithdrawScreen({
  navigation,
  route,
}: WithdrawScreenProps) {
  const { isDark } = useTheme();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

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

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>("/wallets/me");
      // Ensure proper number conversion (decimal from DB comes as string)
      const balance =
        response?.balance !== undefined && response?.balance !== null
          ? Number(String(response.balance).replace(/[^0-9.-]/g, "")) || 0
          : 0;
      setWallet({
        balance,
        currency: response?.currency || "RWF",
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      // Use mock data for now
      setWallet({ balance: 25000, currency: "RWF" });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (numAmount < 1000) {
      Alert.alert("Minimum Amount", "Minimum withdrawal is 1,000 RWF");
      return;
    }

    if (wallet && numAmount > wallet.balance) {
      Alert.alert(
        "Insufficient Balance",
        "You don't have enough balance for this withdrawal"
      );
      return;
    }

    // Validate Airtel Money phone number (72X or 73X)
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      Alert.alert(
        "Phone Required",
        "Please enter a valid Airtel Money number (072X or 073X)"
      );
      return;
    }

    // Validate phone number format
    if (!/^(72|73)\d{7}$/.test(cleanPhone)) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid Airtel Money number starting with 72 or 73"
      );
      return;
    }

    setSubmitting(true);
    try {
      // Format phone number to international format (25072XXXXXXX)
      const formattedPhone = cleanPhone.startsWith("250")
        ? cleanPhone
        : cleanPhone.startsWith("0")
          ? "250" + cleanPhone.substring(1)
          : "250" + cleanPhone;

      // Call withdraw API
      const res: any = await api.post("/wallets/withdraw", {
        amount: numAmount,
        phoneNumber: formattedPhone,
      });
      const transactionId = res?.transaction?.id;

      Alert.alert(
        "Withdrawal Requested",
        `${numAmount.toLocaleString()} RWF will be sent to ${formattedPhone}. This may take a few minutes.`,
        [
          ...(transactionId
            ? [
                {
                  text: "Track Status",
                  onPress: () => {
                    // Refresh wallet if onSuccess callback is provided
                    if (route?.params?.onSuccess) {
                      route.params.onSuccess();
                    }
                    navigation.navigate("PaymentHistory", {
                      mode: "wallet",
                      title: "Wallet History",
                      highlightTransactionId: transactionId,
                    });
                  },
                },
              ]
            : []),
          {
            text: "OK",
            onPress: () => {
              // Refresh wallet if onSuccess callback is provided
              if (route?.params?.onSuccess) {
                route.params.onSuccess();
              }
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Withdrawal Failed",
        error.message || "Unable to process withdrawal. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount =
    numAmount >= 1000 && (!wallet || numAmount <= wallet.balance);

  return (
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Withdraw</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, dynamicStyles.card]}>
          <Text style={[styles.balanceLabel, dynamicStyles.textSecondary]}>
            Available Balance
          </Text>
          <Text style={[styles.balanceAmount, dynamicStyles.text]}>
            {wallet?.balance.toLocaleString()} {wallet?.currency}
          </Text>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Amount to Withdraw
          </Text>
          <View style={[styles.amountInputContainer, dynamicStyles.input]}>
            <Text style={[styles.currencyPrefix, dynamicStyles.text]}>RWF</Text>
            <TextInput
              style={[styles.amountInput, { color: dynamicStyles.text.color }]}
              placeholder="0"
              placeholderTextColor={theme.colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
          <Text style={[styles.hint, dynamicStyles.textSecondary]}>
            Minimum: 1,000 RWF
          </Text>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  dynamicStyles.card,
                  amount === value.toString() && styles.quickAmountActive,
                ]}
                onPress={() => handleQuickAmount(value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === value.toString()
                      ? styles.quickAmountTextActive
                      : dynamicStyles.text,
                  ]}
                >
                  {(value / 1000).toFixed(0)}K
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Send to Phone Number
          </Text>
          <View style={[styles.phoneInputContainer, dynamicStyles.input]}>
            <Text style={[styles.phonePrefix, dynamicStyles.text]}>+250</Text>
            <TextInput
              style={[styles.phoneInput, { color: dynamicStyles.text.color }]}
              placeholder="72X XXX XXX"
              placeholderTextColor={theme.colors.textTertiary}
              value={phoneNumber}
              onChangeText={(text) => {
                // Remove all non-digits and limit to 9 digits
                const cleaned = text.replace(/\D/g, "");
                const limited = cleaned.slice(0, 9);
                setPhoneNumber(limited);
              }}
              keyboardType="phone-pad"
              maxLength={9}
            />
          </View>
          <Text style={[styles.hint, dynamicStyles.textSecondary]}>
            Enter your Airtel Money number (072X or 073X)
          </Text>
        </View>

        {/* Summary */}
        {numAmount > 0 && (
          <View style={[styles.summaryCard, dynamicStyles.card]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>
                Withdrawal Amount
              </Text>
              <Text style={[styles.summaryValue, dynamicStyles.text]}>
                {numAmount.toLocaleString()} RWF
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>
                Fee
              </Text>
              <Text
                style={[styles.summaryValue, { color: theme.colors.success }]}
              >
                Free
              </Text>
            </View>
            <View style={[styles.divider, dynamicStyles.card]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, dynamicStyles.text]}>
                You'll Receive
              </Text>
              <Text style={[styles.totalValue, dynamicStyles.text]}>
                {numAmount.toLocaleString()} RWF
              </Text>
            </View>
          </View>
        )}

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!isValidAmount || !phoneNumber) && styles.withdrawButtonDisabled,
          ]}
          onPress={handleWithdraw}
          activeOpacity={0.7}
          disabled={!isValidAmount || !phoneNumber || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" />
              <Text style={styles.withdrawButtonText}>
                Withdraw{" "}
                {numAmount > 0 ? `${numAmount.toLocaleString()} RWF` : ""}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  balanceCard: {
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginRight: theme.spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
  },
  hint: {
    fontSize: 12,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  quickAmountActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  quickAmountTextActive: {
    color: "#FFFFFF",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  phonePrefix: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginRight: theme.spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  withdrawButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    gap: theme.spacing.sm,
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
