import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import { useTheme } from "../context";
import { api } from "../services/api";
import { paymentSecurityService } from "../services/paymentSecurity";
import PaymentAuthModal from "./PaymentAuthModal";
import PINSetupModal from "./PINSetupModal";

interface CommissionPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  commission: {
    id: string;
    amount: number;
    salonEmployee?: {
      user?: {
        fullName: string;
      };
    };
  };
  onSuccess: () => void;
  navigation?: any;
}

export default function CommissionPaymentModal({
  visible,
  onClose,
  commission,
  onSuccess,
  navigation,
}: CommissionPaymentModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  const commissionAmount = Number(commission.amount);
  const newBalance =
    walletBalance !== null ? walletBalance - commissionAmount : null;
  const hasInsufficientBalance =
    walletBalance !== null && walletBalance < commissionAmount;
  const shortfall = hasInsufficientBalance
    ? commissionAmount - (walletBalance || 0)
    : 0;

  // Handle Top Up navigation
  const handleTopUp = () => {
    if (navigation) {
      onClose();
      navigation.navigate("Payment", {
        amount: shortfall > 0 ? shortfall : 10000,
        type: "wallet_topup",
        description: "Wallet Top-up for Commission Payment",
      });
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  useEffect(() => {
    if (visible) {
      fetchWalletBalance();
    }
  }, [visible]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const response: any = await api.get("/wallets/me");
      // Ensure balance is converted to number (decimal from DB comes as string)
      const balance =
        response?.balance !== undefined && response?.balance !== null
          ? Number(String(response.balance).replace(/[^0-9.-]/g, "")) || 0
          : 0;
      setWalletBalance(balance);
    } catch (error: any) {
      console.error("Error fetching wallet balance:", error);
      setWalletBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePayment = async () => {
    if (hasInsufficientBalance) {
      Alert.alert(
        "Insufficient Balance",
        `You need RWF ${shortfall.toLocaleString()} more to complete this payment.`,
        [
          { text: "Cancel", style: "cancel" },
          ...(navigation
            ? [
                {
                  text: "Top Up Wallet",
                  onPress: handleTopUp,
                },
              ]
            : []),
        ]
      );
      return;
    }

    // Check if PIN is set up
    const hasPIN = await paymentSecurityService.hasPIN();
    if (!hasPIN) {
      setShowPinSetup(true);
      return;
    }

    // Show authentication modal
    setShowAuthModal(true);
  };

  const processPayment = async () => {
    setLoading(true);
    try {
      await api.post(`/commissions/${commission.id}/mark-paid`, {
        paymentMethod: "wallet",
      });

      Alert.alert("Payment Successful! ✓", `Commission paid successfully.`, [
        {
          text: "Done",
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error("Payment error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to process payment. Please try again.";

      Alert.alert("Payment Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Ensure amount is converted to number
    const numAmount =
      typeof amount === "number"
        ? amount
        : Number(String(amount || 0).replace(/[^0-9.-]/g, "")) || 0;
    return `RWF ${numAmount.toLocaleString()}`;
  };

  const employeeName = commission.salonEmployee?.user?.fullName || "Employee";
  const initials = employeeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <React.Fragment>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.modalContent, dynamicStyles.card]}>
            {/* Handle Bar */}
            <View style={styles.handleBar}>
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor: isDark
                      ? theme.colors.gray600
                      : theme.colors.gray300,
                  },
                ]}
              />
            </View>

            {/* Employee Avatar & Amount Header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
              <Text style={[styles.employeeName, dynamicStyles.text]}>
                {employeeName}
              </Text>
              <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
                Commission Amount
              </Text>
              <Text style={styles.mainAmount}>
                {formatCurrency(commissionAmount)}
              </Text>
            </View>

            {/* Balance Summary */}
            <View
              style={[
                styles.balanceSummary,
                { backgroundColor: isDark ? theme.colors.gray900 : "#F8F9FA" },
              ]}
            >
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                  >
                    Current
                  </Text>
                  {loadingBalance ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : (
                    <Text style={[styles.balanceValue, dynamicStyles.text]}>
                      {formatCurrency(walletBalance || 0)}
                    </Text>
                  )}
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <MaterialIcons
                    name={
                      hasInsufficientBalance ? "error-outline" : "arrow-forward"
                    }
                    size={18}
                    color={
                      hasInsufficientBalance
                        ? theme.colors.error
                        : theme.colors.success
                    }
                  />
                  <Text
                    style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                  >
                    After
                  </Text>
                  <Text
                    style={[
                      styles.balanceValue,
                      {
                        color: hasInsufficientBalance
                          ? theme.colors.error
                          : theme.colors.success,
                      },
                    ]}
                  >
                    {newBalance !== null
                      ? formatCurrency(Math.max(0, newBalance))
                      : "..."}
                  </Text>
                </View>
              </View>
              {hasInsufficientBalance && (
                <View style={styles.warningBanner}>
                  <MaterialIcons
                    name="warning"
                    size={16}
                    color={theme.colors.white}
                  />
                  <Text style={styles.warningText}>
                    Need {formatCurrency(shortfall)} more
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {hasInsufficientBalance && navigation ? (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: theme.colors.warning },
                  ]}
                  onPress={handleTopUp}
                  disabled={loading}
                >
                  <MaterialIcons
                    name="add-circle-outline"
                    size={20}
                    color={theme.colors.warning}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: theme.colors.warning },
                    ]}
                  >
                    Top Up Wallet
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: dynamicStyles.textSecondary.color },
                  ]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  hasInsufficientBalance && styles.primaryButtonDisabled,
                ]}
                onPress={handlePayment}
                disabled={loading || hasInsufficientBalance || loadingBalance}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={theme.colors.white}
                    />
                    <Text style={styles.primaryButtonText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security Modals */}
      <PaymentAuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          processPayment();
        }}
        amount={commissionAmount}
        recipientName={employeeName}
      />

      <PINSetupModal
        visible={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onSuccess={() => {
          setShowPinSetup(false);
          setShowAuthModal(true);
        }}
      />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    paddingBottom: theme.spacing.lg,
    borderWidth: 1,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.white,
    fontFamily: theme.fonts.bold,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  mainAmount: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  balanceSummary: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.sm,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: theme.spacing.sm,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.white,
    fontFamily: theme.fonts.medium,
  },
  paymentMethodSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  methodButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  methodButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  methodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  primaryButton: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.gray400,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.colors.white,
    fontFamily: theme.fonts.bold,
  },
});
