import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTheme } from '../context';
import { api } from '../services/api';

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
}

export default function CommissionPaymentModal({
  visible,
  onClose,
  commission,
  onSuccess,
}: CommissionPaymentModalProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money'>('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const commissionAmount = Number(commission.amount);
  const newBalance = walletBalance !== null ? walletBalance - commissionAmount : null;
  const hasInsufficientBalance = walletBalance !== null && walletBalance < commissionAmount;

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
      const response: any = await api.get('/wallets/me');
      setWalletBalance(Number(response?.balance) || 0);
    } catch (error: any) {
      console.error('Error fetching wallet balance:', error);
      Alert.alert('Error', 'Failed to load wallet balance. Please try again.');
      setWalletBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePayment = async () => {
    if (hasInsufficientBalance) {
      Alert.alert(
        'Insufficient Balance',
        `You don't have enough balance in your wallet. Current balance: RWF ${walletBalance?.toLocaleString()}, Required: RWF ${commissionAmount.toLocaleString()}`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay commission of RWF ${commissionAmount.toLocaleString()} to ${commission.salonEmployee?.user?.fullName || 'employee'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Payment',
          onPress: async () => {
            setLoading(true);
            try {
              await api.post(`/commissions/${commission.id}/mark-paid`, {
                paymentMethod: paymentMethod,
                paymentReference: paymentReference || undefined,
              });

              // Refresh wallet balance after successful payment
              await fetchWalletBalance();

              Alert.alert(
                'Payment Successful',
                `Commission of RWF ${commissionAmount.toLocaleString()} has been paid successfully.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onSuccess();
                      onClose();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Payment error:', error);
              const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Failed to process payment. Please try again.';
              
              Alert.alert('Payment Failed', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, dynamicStyles.card]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={[styles.headerTitle, dynamicStyles.text]}>
                  Pay Commission
                </Text>
                <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                  {commission.salonEmployee?.user?.fullName || 'Employee'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={loading}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Wallet Balance Card */}
              <View style={[styles.balanceCard, dynamicStyles.card]}>
                <View style={styles.balanceHeader}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.balanceLabel, dynamicStyles.textSecondary]}>
                    Your Wallet Balance
                  </Text>
                </View>
                {loadingBalance ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
                      Loading balance...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.balanceAmount, { color: theme.colors.primary }]}>
                    {formatCurrency(walletBalance || 0)}
                  </Text>
                )}
              </View>

              {/* Commission Amount Card */}
              <View style={[styles.amountCard, dynamicStyles.card]}>
                <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
                  Commission Amount
                </Text>
                <Text style={[styles.amountValue, { color: theme.colors.error }]}>
                  - {formatCurrency(commissionAmount)}
                </Text>
              </View>

              {/* New Balance Preview */}
              {newBalance !== null && (
                <View
                  style={[
                    styles.newBalanceCard,
                    dynamicStyles.card,
                    hasInsufficientBalance && styles.insufficientBalanceCard,
                  ]}
                >
                  <View style={styles.newBalanceHeader}>
                    <MaterialIcons
                      name={hasInsufficientBalance ? 'error-outline' : 'check-circle'}
                      size={20}
                      color={hasInsufficientBalance ? theme.colors.error : theme.colors.success}
                    />
                    <Text
                      style={[
                        styles.newBalanceLabel,
                        {
                          color: hasInsufficientBalance
                            ? theme.colors.error
                            : dynamicStyles.textSecondary.color,
                        },
                      ]}
                    >
                      {hasInsufficientBalance
                        ? 'Insufficient Balance'
                        : 'Balance After Payment'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.newBalanceAmount,
                      {
                        color: hasInsufficientBalance
                          ? theme.colors.error
                          : theme.colors.success,
                      },
                    ]}
                  >
                    {formatCurrency(newBalance)}
                  </Text>
                  {hasInsufficientBalance && (
                    <Text style={[styles.insufficientText, dynamicStyles.textSecondary]}>
                      You need {formatCurrency(commissionAmount - (walletBalance || 0))} more to complete this payment
                    </Text>
                  )}
                </View>
              )}

              {/* Payment Method Selection */}
              <View style={[styles.section, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Payment Method
                </Text>
                <View style={styles.paymentMethodContainer}>
                  {[
                    { value: 'cash', label: 'Cash', icon: 'money' },
                    { value: 'bank_transfer', label: 'Bank Transfer', icon: 'account-balance' },
                    { value: 'mobile_money', label: 'Mobile Money', icon: 'phone-android' },
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === method.value && styles.paymentMethodButtonActive,
                        dynamicStyles.card,
                      ]}
                      onPress={() => setPaymentMethod(method.value as any)}
                      disabled={loading}
                    >
                      <MaterialIcons
                        name={method.icon as any}
                        size={20}
                        color={
                          paymentMethod === method.value
                            ? theme.colors.white
                            : dynamicStyles.text.color
                        }
                      />
                      <Text
                        style={[
                          styles.paymentMethodText,
                          {
                            color:
                              paymentMethod === method.value
                                ? theme.colors.white
                                : dynamicStyles.text.color,
                          },
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Reference (Optional) */}
              <View style={[styles.section, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                  Payment Reference (Optional)
                </Text>
                <Text style={[styles.sectionSubtitle, dynamicStyles.textSecondary]}>
                  Add a reference number or note for this payment
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    dynamicStyles.card,
                    { color: dynamicStyles.text.color },
                  ]}
                  placeholder="Enter reference number or note"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                  editable={!loading}
                />
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, dynamicStyles.card]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, dynamicStyles.text]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  {
                    backgroundColor: hasInsufficientBalance
                      ? theme.colors.gray400
                      : theme.colors.primary,
                  },
                ]}
                onPress={handlePayment}
                disabled={loading || hasInsufficientBalance || loadingBalance}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <MaterialIcons name="payment" size={20} color={theme.colors.white} />
                    <Text style={styles.payButtonText}>
                      Pay {formatCurrency(commissionAmount)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  balanceCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  amountCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  newBalanceCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  insufficientBalanceCard: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}10`,
  },
  newBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  newBalanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  newBalanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  insufficientText: {
    fontSize: 12,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  section: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: theme.spacing.xs,
  },
  paymentMethodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  payButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  payButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  textInput: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
});

