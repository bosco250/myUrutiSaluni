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
import {
  paymentsService,
  PaymentMethod,
  PaymentType,
  Payment,
} from "../../services/payments";

const { width } = Dimensions.get('window');

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
} [] = [
  {
    method: "airtel_money",
    label: "Airtel Money",
    icon: "mobile-alt",
    color: "#E11900", // Airtel Red
    description: "Instant mobile payment",
    badge: "Fastest",
  },
  {
    method: "wallet",
    label: "URUTI Wallet",
    icon: "wallet",
    color: theme.colors.primary,
    description: "Use your balance",
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
    type === "wallet_topup" ? "airtel_money" : null
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [status, setStatus] = useState<
    "input" | "processing" | "success" | "failed"
  >("input");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status]);

  // For wallet top-up: allow user to enter amount
  const isTopUp = type === "wallet_topup";
  const [topUpAmount, setTopUpAmount] = useState<string>(
    initialAmount > 0 ? String(initialAmount) : ""
  );
  const amount = isTopUp ? Number(topUpAmount) || 0 : initialAmount;

  // Preset amounts for quick top-up
  const PRESET_AMOUNTS = [2000, 5000, 10000, 25000, 50000];

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

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 9) return /^(72|73)\d{7}$/.test(clean);
    if (clean.length === 10) return /^0(72|73)\d{7}$/.test(clean);
    return false;
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert("Selection Required", "Please choose how you'd like to pay.");
      return;
    }

    if (selectedMethod === "airtel_money") {
      if (!validatePhoneNumber(phoneNumber)) {
        Alert.alert("Invalid Number", "Please enter a valid Airtel Money number (072X or 073X).");
        return;
      }
    }

    if (isTopUp && amount < 1000) {
      Alert.alert("Minimum Amount", "The minimum top-up amount is 1,000 RWF.");
      return;
    }

    setLoading(true);
    setStatus("processing");

    try {
      const paymentResponse = await paymentsService.initiatePayment({
        amount,
        method: selectedMethod,
        type,
        phoneNumber: selectedMethod === "airtel_money" ? phoneNumber : undefined,
        appointmentId,
        salonId,
        description,
      });

      setPayment(paymentResponse);

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
      Alert.alert("Payment Error", error.message || "Something went wrong while processing your payment.");
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.headerCircleButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
      >
        <Ionicons name="chevron-back" size={24} color={dynamicStyles.text.color} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, dynamicStyles.text]}>
        {isTopUp ? "Fund Wallet" : "Complete Payment"}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (status !== "input") {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Animated.View style={[styles.resultContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          {status === "processing" && (
            <View style={styles.stateContent}>
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <View style={styles.pulseContainer}>
                   <View style={[styles.pulseCircle, { borderColor: theme.colors.primary }]} />
                </View>
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>Awaiting Approval</Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                We've sent a prompt to <Text style={{fontWeight: '700', color: theme.colors.primary}}>+250 {phoneNumber}</Text>. Please enter your PIN to authorize.
              </Text>
              <View style={styles.instructionCard}>
                 <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                 <Text style={styles.instructionText}>Do not close this screen until the payment is confirmed.</Text>
              </View>
            </View>
          )}

          {status === "success" && (
            <View style={styles.stateContent}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>Payment Confirmed!</Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                Successfully added <Text style={{fontWeight: '700', color: '#10B981'}}>{paymentsService.formatAmount(amount)}</Text> to your balance.
              </Text>
              
              <View style={[styles.detailCard, dynamicStyles.card]}>
                 <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Transaction ID</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>{payment?.id?.substring(0, 12).toUpperCase()}</Text>
                 </View>
                 <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Status</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>Success</Text>
                 </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "failed" && (
            <View style={styles.stateContent}>
              <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
              </View>
              <Text style={[styles.resultTitle, dynamicStyles.text]}>Payment Failed</Text>
              <Text style={[styles.resultMessage, dynamicStyles.textSecondary]}>
                {payment?.failureReason || "The transaction was declined or timed out. Please check your balance and try again."}
              </Text>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: '#EF4444' }]} 
                onPress={() => setStatus("input")}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.textButton} onPress={handleDone}>
                <Text style={[styles.textButtonText, dynamicStyles.textSecondary]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

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
             <Text style={[styles.cardLabel, dynamicStyles.textSecondary]}>
                {isTopUp ? "Enter Top-up Amount" : "Payable Amount"}
             </Text>
             
             {isTopUp ? (
               <View style={styles.amountInputWrapper}>
                  <Text style={[styles.currencySymbol, dynamicStyles.text]}>RWF</Text>
                  <TextInput
                    style={[styles.hugeInput, dynamicStyles.text]}
                    value={topUpAmount}
                    onChangeText={(text) => setTopUpAmount(text.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={isDark ? "#334155" : "#CBD5E1"}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoFocus={type === 'wallet_topup'}
                  />
               </View>
             ) : (
               <Text style={[styles.hugeAmount, dynamicStyles.text]}>
                  {paymentsService.formatAmount(amount)}
               </Text>
             )}

             {isTopUp && (
               <View style={styles.chipsContainer}>
                  {PRESET_AMOUNTS.map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.chip,
                        { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                        Number(topUpAmount) === val && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setTopUpAmount(String(val))}
                    >
                      <Text style={[
                        styles.chipText, 
                        dynamicStyles.textSecondary,
                        Number(topUpAmount) === val && { color: '#FFF', fontWeight: '700' }
                      ]}>
                        +{val.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>
             )}
          </View>

          {/* Payment Method Selector */}
          <View style={styles.section}>
             <Text style={[styles.sectionHeading, dynamicStyles.text]}>Select Payment Method</Text>
             {PAYMENT_METHODS.filter(pm => {
                if (type === 'wallet_topup' && pm.method === 'wallet') return false;
                return true;
             }).map((pm) => {
                const isSelected = selectedMethod === pm.method;
                return (
                  <TouchableOpacity
                    key={pm.method}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMethod(pm.method)}
                    style={[
                      styles.methodCard,
                      dynamicStyles.card,
                      isSelected && { borderColor: pm.color, borderWidth: 2, backgroundColor: pm.color + '08' }
                    ]}
                  >
                    <View style={[styles.methodIconBox, { backgroundColor: pm.color + '15' }]}>
                       <FontAwesome5 name={pm.icon} size={20} color={pm.color} />
                    </View>
                    <View style={styles.methodTextContent}>
                       <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                          <Text style={[styles.methodLabel, dynamicStyles.text]}>{pm.label}</Text>
                          {pm.badge && (
                            <View style={[styles.miniBadge, { backgroundColor: pm.color }]}>
                               <Text style={styles.miniBadgeText}>{pm.badge}</Text>
                            </View>
                          )}
                       </View>
                       <Text style={[styles.methodDesc, dynamicStyles.textSecondary]}>{pm.description}</Text>
                    </View>
                    <View style={[styles.selectorCircle, isSelected && { borderColor: pm.color }]}>
                       {isSelected && <View style={[styles.selectorInner, { backgroundColor: pm.color }]} />}
                    </View>
                  </TouchableOpacity>
                );
             })}
          </View>

          {/* Additional Details (Phone Number) */}
          {selectedMethod === 'airtel_money' && (
            <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
               <Text style={[styles.sectionHeading, dynamicStyles.text]}>Mobile Money Number</Text>
               <View style={[styles.phoneInputBox, dynamicStyles.card, validatePhoneNumber(phoneNumber) && { borderColor: '#10B981' }]}>
                  <View style={styles.countryCode}>
                     <Text style={[styles.countryCodeText, dynamicStyles.text]}>+250</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, dynamicStyles.text]}
                    placeholder="7XXXXXXXX"
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
               <Text style={[styles.hintText, dynamicStyles.textSecondary]}>
                  Enter the Airtel Money number that will receive the payment prompt.
               </Text>
            </Animated.View>
          )}

        </ScrollView>

        <View style={styles.footer}>
           <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.secureText}>End-to-end encrypted payment</Text>
           </View>
           
           <TouchableOpacity
             style={[
               styles.payButtonBig,
               (!selectedMethod || (selectedMethod === 'airtel_money' && !validatePhoneNumber(phoneNumber)) || (isTopUp && amount < 1000)) && styles.disabledButton
             ]}
             disabled={loading}
             onPress={handlePayment}
           >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payButtonTextBig}>
                     {isTopUp ? "Fund Wallet" : "Confirm Payment"}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cardLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  },
  hugeAmount: {
    fontSize: 32,
    fontFamily: theme.fonts.bold,
    fontWeight: '800',
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
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodTextContent: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  methodDesc: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 1,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  hintText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 8,
    marginLeft: 2,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  secureText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  payButtonBig: {
    backgroundColor: theme.colors.primary,
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
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  stateContent: {
    alignItems: 'center',
  },
  loaderWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  pulseContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    opacity: 0.2,
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
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
  },
  instructionText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  detailCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
  textButton: {
    marginTop: 16,
    padding: 8,
  },
  textButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
});
