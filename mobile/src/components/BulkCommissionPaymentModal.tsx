import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import { useTheme } from "../context";
import { api } from "../services/api";
import { salesService, Commission } from "../services/sales";
import { paymentSecurityService } from "../services/paymentSecurity";
import PaymentAuthModal from "./PaymentAuthModal";
import PINSetupModal from "./PINSetupModal";

interface BulkCommissionPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  commissions: Commission[];
  onSuccess: () => void;
  navigation?: any;
}

export default function BulkCommissionPaymentModal({
  visible,
  onClose,
  commissions,
  onSuccess,
  navigation,
}: BulkCommissionPaymentModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  // Calculate totals
  const totalAmount = commissions.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0
  );
  const newBalance =
    walletBalance !== null ? walletBalance - totalAmount : null;
  const hasInsufficientBalance =
    walletBalance !== null && walletBalance < totalAmount;
  const shortfall = hasInsufficientBalance ? totalAmount - walletBalance : 0;

  // Group by employee for display
  const employeeTotals = commissions.reduce(
    (acc, c) => {
      const name = c.salonEmployee?.user?.fullName || "Unknown";
      if (!acc[name]) {
        acc[name] = { count: 0, amount: 0 };
      }
      acc[name].count += 1;
      acc[name].amount += Number(c.amount || 0);
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  const dynamicStyles = {
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
                  onPress: () => {
                    onClose();
                    navigation.navigate("Payment", {
                      amount: shortfall,
                      type: "wallet_topup",
                    });
                  },
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
      const commissionIds = commissions.map((c) => c.id);
      await salesService.markMultipleCommissionsPaid(commissionIds, "wallet");

      Alert.alert(
        "Payment Successful! ✓",
        `${commissions.length} commission${commissions.length > 1 ? "s" : ""} paid successfully.`,
        [
          {
            text: "Done",
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Bulk payment error:", error);
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message ||
          error.message ||
          "Failed to process payment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = () => {
    if (navigation) {
      onClose();
      navigation.navigate("Payment", {
        amount: shortfall > 0 ? shortfall : 10000,
        type: "wallet_topup",
      });
    }
  };

  const formatCurrency = (amount: number) => `RWF ${amount.toLocaleString()}`;

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

            {/* Header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={[theme.colors.success, theme.colors.primary]}
                style={styles.iconBadge}
              >
                <MaterialIcons
                  name="payments"
                  size={28}
                  color={theme.colors.white}
                />
              </LinearGradient>
              <Text style={[styles.headerTitle, dynamicStyles.text]}>
                Bulk Payment
              </Text>
              <Text
                style={[styles.headerSubtitle, dynamicStyles.textSecondary]}
              >
                {commissions.length} commission
                {commissions.length > 1 ? "s" : ""} selected
              </Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(totalAmount)}
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

            {/* Employee Breakdown */}
            <ScrollView
              style={styles.employeeList}
              contentContainerStyle={styles.employeeListContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>
                Payment Breakdown
              </Text>
              {Object.entries(employeeTotals).map(([name, data]) => {
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <View
                    key={name}
                    style={[styles.employeeRow, dynamicStyles.card]}
                  >
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.employeeInitials}>{initials}</Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text
                        style={[styles.employeeName, dynamicStyles.text]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text
                        style={[
                          styles.employeeCount,
                          dynamicStyles.textSecondary,
                        ]}
                      >
                        {data.count} commission{data.count > 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.employeeAmount,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {formatCurrency(data.amount)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

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
                    Top Up
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
                    <Text style={styles.primaryButtonText}>Pay All</Text>
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
        amount={totalAmount}
        recipientName={`${commissions.length} employee${commissions.length > 1 ? "s" : ""}`}
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
    maxWidth: 400,
    maxHeight: "80%",
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
    paddingBottom: theme.spacing.md,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  balanceSummary: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
  employeeList: {
    maxHeight: 150,
    marginHorizontal: theme.spacing.lg,
  },
  employeeListContent: {
    paddingBottom: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.xs,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  employeeInitials: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  employeeCount: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  employeeAmount: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  paymentMethodSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
    paddingVertical: theme.spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  methodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodLabel: {
    fontSize: 11,
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
