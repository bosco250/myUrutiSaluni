import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api } from '../../services/api';
import { Loader } from '../../components/common';

interface LoanRepaymentScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      loanId?: string;
      amount?: number;
    };
  };
}

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

export default function LoanRepaymentScreen({ navigation, route }: LoanRepaymentScreenProps) {
  const { isDark } = useTheme();
  const { amount = 450000 } = route?.params || {};
  
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Dynamic styles for dark/light mode
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
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    dropdown: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    confirmButton: {
      backgroundColor: isDark ? theme.colors.white : '#1C1C1E',
    },
    confirmButtonText: {
      color: isDark ? theme.colors.black : theme.colors.white,
    },
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'RWF') => {
    return `${currency} ${value.toLocaleString()}`;
  };

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    try {
      const response = await api.get<any>('/wallets/me');
      setWallet({
        id: response?.id || 'wallet-1',
        balance: Number(response?.balance) || 5240500,
        currency: response?.currency || 'RWF',
      });
    } catch {
      console.log('Error fetching wallet, using mock data');
      // Mock data
      setWallet({
        id: 'wallet-mock',
        balance: 5240500,
        currency: 'RWF',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleConfirmPayment = async () => {
    if (!wallet) return;
    
    if (wallet.balance < amount) {
      Alert.alert(
        'Insufficient Balance',
        'You don\'t have enough balance in your wallet. Please top up first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Top Up', onPress: () => navigation.navigate('Payment', { type: 'wallet_topup' }) }
        ]
      );
      return;
    }

    setProcessing(true);
    
    try {
      // In real implementation, this would call the loan repayment API
      // await api.post('/loans/repay', { loanId, amount });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Payment Successful',
        `You have successfully repaid ${formatCurrency(amount)}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Payment Failed', 'Unable to process your repayment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading loan details..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Repay Loan</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Card Container */}
        <View style={[styles.card, dynamicStyles.card]}>
          {/* Repayment Amount Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>
              Repayment Amount
            </Text>
            <View style={[styles.amountContainer, dynamicStyles.input]}>
              <Text style={[styles.currencySymbol, dynamicStyles.text]}>RWF</Text>
              <Text style={[styles.amountValue, dynamicStyles.text]}>
                {amount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>
              Payment Method
            </Text>
            <TouchableOpacity
              style={[styles.dropdownButton, dynamicStyles.dropdown]}
              onPress={() => setShowDropdown(!showDropdown)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, dynamicStyles.text]}>
                Wallet Balance ({formatCurrency(wallet?.balance || 0)})
              </Text>
              <MaterialIcons
                name={showDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={dynamicStyles.textSecondary.color}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              dynamicStyles.confirmButton,
              processing && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmPayment}
            activeOpacity={0.8}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={dynamicStyles.confirmButtonText.color} />
            ) : (
              <Text style={[styles.confirmButtonText, dynamicStyles.confirmButtonText]}>
                Confirm Payment
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  card: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    marginRight: theme.spacing.sm,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },
  confirmButton: {
    borderRadius: 8,
    paddingVertical: theme.spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: theme.spacing.sm,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
});
