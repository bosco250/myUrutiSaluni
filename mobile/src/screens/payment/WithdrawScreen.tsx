import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

const { width } = Dimensions.get('window');

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

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000, 50000];

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
  const [status, setStatus] = useState<"input" | "processing" | "success" | "failed">("input");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    text: {
      color: isDark ? "#F8FAFC" : "#1E293B",
    },
    textSecondary: {
      color: isDark ? "#94A3B8" : "#64748B",
    },
    card: {
      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
      borderColor: isDark ? "#334155" : "#E2E8F0",
    },
    input: {
      backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
      borderColor: isDark ? "#334155" : "#E2E8F0",
      color: isDark ? "#F8FAFC" : "#1E293B",
    },
  };

  useEffect(() => {
    fetchWallet();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>("/wallets/me");
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
      // Fallback/Mock just in case
      setWallet({ balance: 0, currency: "RWF" });
    } finally {
      setLoading(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 9) return /^(72|73)\d{7}$/.test(clean);
    if (clean.length === 10) return /^0(72|73)\d{7}$/.test(clean);
    return false;
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount < 1000) {
      Alert.alert("Invalid Amount", "Minimum withdrawal is 1,000 RWF.");
      return;
    }

    if (wallet && numAmount > wallet.balance) {
      Alert.alert("Insufficient Balance", "You don't have enough balance for this withdrawal.");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert("Invalid Number", "Please enter a valid Airtel Money number (072X or 073X).");
      return;
    }

    setSubmitting(true);
    setStatus("processing");
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("250")
        ? cleanPhone
        : cleanPhone.startsWith("0")
          ? "250" + cleanPhone.substring(1)
          : "250" + cleanPhone;

      await api.post("/wallets/withdraw", {
        amount: numAmount,
        phoneNumber: formattedPhone,
      });

      setStatus("success");
    } catch (error: any) {
      setStatus("failed");
      Alert.alert("Withdrawal Failed", error.message || "Unable to process withdrawal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.headerCircleButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
      >
        <Ionicons name="chevron-back" size={24} color={dynamicStyles.text.color} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, dynamicStyles.text]}>Transfer Funds</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (status !== "input") {
     const isSuccess = status === "success";
     return (
       <SafeAreaView style={[styles.container, dynamicStyles.container]}>
         <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
         <View style={styles.resultContainer}>
            <View style={[styles.iconCircle, { backgroundColor: isSuccess ? '#10B98115' : '#EF444415' }]}>
               <Ionicons name={isSuccess ? "checkmark-circle" : "alert-circle"} size={80} color={isSuccess ? "#10B981" : "#EF4444"} />
            </View>
            <Text style={[styles.resultTitle, dynamicStyles.text]}>
               {isSuccess ? "Withdrawal Started!" : "Transfer Failed"}
            </Text>
            <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
               {isSuccess 
                 ? `Your request to withdraw ${parseFloat(amount).toLocaleString()} RWF reached our team. You'll receive a confirmation soon.`
                 : "We couldn't process your withdrawal. Please check your network or balance and try again."
               }
            </Text>
            <TouchableOpacity 
              style={[styles.primaryButton, !isSuccess && { backgroundColor: '#EF4444' }]} 
              onPress={() => isSuccess ? (route?.params?.onSuccess?.(), navigation.goBack()) : setStatus("input")}
            >
               <Text style={styles.primaryButtonText}>{isSuccess ? "Return to Finance" : "Try Again"}</Text>
            </TouchableOpacity>
         </View>
       </SafeAreaView>
     );
  }

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount >= 1000 && (!wallet || numAmount <= wallet.balance) && validatePhoneNumber(phoneNumber);

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {renderHeader()}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Amount Card */}
          <View style={[styles.mainAmountCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
             <View style={styles.availableBalance}>
                <Ionicons name="wallet-outline" size={14} color={theme.colors.primary} />
                <Text style={[styles.balanceText, dynamicStyles.textSecondary]}>
                   Available: <Text style={{fontWeight: '700', color: theme.colors.primary}}>{wallet?.balance.toLocaleString()} {wallet?.currency}</Text>
                </Text>
             </View>
             
             <View style={styles.amountInputWrapper}>
                <Text style={[styles.currencySymbol, dynamicStyles.text]}>RWF</Text>
                <TextInput
                  style={[styles.hugeInput, dynamicStyles.text]}
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  placeholderTextColor={isDark ? "#334155" : "#CBD5E1"}
                  keyboardType="number-pad"
                  maxLength={10}
                />
             </View>

             <View style={styles.chipsContainer}>
                {QUICK_AMOUNTS.filter(val => !wallet || val <= wallet.balance).map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.chip,
                      { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                      Number(amount) === val && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setAmount(String(val))}
                  >
                    <Text style={[
                      styles.chipText, 
                      dynamicStyles.textSecondary,
                      Number(amount) === val && { color: '#FFF', fontWeight: '700' }
                    ]}>
                      {val >= 1000 ? `${val/1000}K` : val}
                    </Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>

          {/* Receiver Info */}
          <View style={styles.section}>
             <Text style={[styles.sectionHeading, dynamicStyles.text]}>Transfer To Airtel Money</Text>
             <View style={[styles.phoneInputBox, dynamicStyles.card, validatePhoneNumber(phoneNumber) && { borderColor: '#10B981' }]}>
                <View style={styles.countryCode}>
                   <Text style={[styles.countryCodeText, dynamicStyles.text]}>+250</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, dynamicStyles.text]}
                  placeholder="72X XXX XXX"
                  placeholderTextColor={isDark ? "#475569" : "#94A3B8"}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, "");
                    setPhoneNumber(cleaned.slice(0, 9));
                  }}
                  keyboardType="phone-pad"
                  maxLength={9}
                />
                {validatePhoneNumber(phoneNumber) && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
             </View>
             <View style={styles.warningBox}>
                <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                <Text style={styles.warningText}>Funds will be sent to your Airtel Money wallet instantly.</Text>
             </View>
          </View>

          {/* Fee Summary */}
          {numAmount > 0 && (
             <View style={[styles.detailCard, dynamicStyles.card]}>
                <View style={styles.detailRow}>
                   <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Transfer Fee</Text>
                   <Text style={[styles.detailValue, { color: '#10B981' }]}>Free</Text>
                </View>
                <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
                   <Text style={[styles.detailLabel, dynamicStyles.text]}>Total Amount</Text>
                   <Text style={[styles.detailValue, dynamicStyles.text, { fontSize: 16 }]}>{numAmount.toLocaleString()} RWF</Text>
                </View>
             </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
           <TouchableOpacity
             style={[
               styles.payButtonBig,
               (!isValid || submitting) && styles.disabledButton,
               { backgroundColor: theme.colors.primary }
             ]}
             disabled={!isValid || submitting}
             onPress={handleWithdraw}
           >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payButtonTextBig}>Confirm Withdrawal</Text>
                  <Ionicons name="arrow-up" size={20} color="#FFF" />
                </>
              )}
           </TouchableOpacity>
           <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#94A3B8" />
              <Text style={styles.secureText}>Standard encrypted transaction</Text>
           </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  mainAmountCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  availableBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C89B6810',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  balanceText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencySymbol: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    opacity: 0.8,
  },
  hugeInput: {
    fontSize: 36,
    fontFamily: theme.fonts.bold,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 2,
  },
  phoneInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
  },
  countryCode: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingRight: 10,
    marginRight: 10,
  },
  countryCodeText: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  detailCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  payButtonBig: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  payButtonTextBig: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
  },
  secureText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    color: '#64748B',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
});
