import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
}

interface WalletData {
  balance: number;
  currency: string;
  transactions: Transaction[];
}

interface WalletScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function WalletScreen({ navigation }: WalletScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

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
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    borderLight: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    iconBackground: {
      backgroundColor: isDark ? "rgba(142, 142, 147, 0.2)" : "rgba(142, 142, 147, 0.1)",
    },
  };

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch wallet from real API
      const walletResponse = await api.get<any>("/wallets/me");
      
      // Fetch transactions if wallet exists
      let transactions: Transaction[] = [];
      if (walletResponse?.id) {
        try {
          const transactionsResponse = await api.get<any[]>(`/wallets/${walletResponse.id}/transactions`);
          transactions = (transactionsResponse || []).slice(0, 5).map((t: any) => ({
            id: t.id,
            title: t.description || getTransactionTitle(t.transactionType),
            date: formatTransactionDate(t.createdAt),
            amount: Number(t.amount),
            type: isDebit(t.transactionType) ? "debit" : "credit",
          }));
        } catch {
          console.log("No transactions found");
        }
      }

      setWalletData({
        balance: Number(walletResponse?.balance) || 0,
        currency: walletResponse?.currency || "RWF",
        transactions,
      });
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      // Set default wallet data on error
      setWalletData({
        balance: 0,
        currency: "RWF",
        transactions: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionTitle = (type: string): string => {
    switch (type) {
      case "deposit": return "Wallet Top-up";
      case "withdrawal": return "Withdrawal";
      case "transfer": return "Transfer";
      case "commission": return "Commission Earned";
      case "refund": return "Refund";
      case "fee": return "Fee";
      default: return "Transaction";
    }
  };

  const isDebit = (type: string): boolean => {
    return ["withdrawal", "transfer", "fee", "loan_repayment"].includes(type);
  };

  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffHours < 48) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} RWF`;
  };

  const handleTopUp = () => {
    // Navigate to payment screen for wallet top-up
    navigation.navigate("Payment", {
      amount: 10000, // Default top-up amount
      type: "wallet_topup",
      description: "Wallet Top-up",
      onSuccess: () => {
        // Refresh wallet data after successful top-up
        fetchWalletData();
      },
    });
  };

  const handleWithdraw = () => {
    navigation.navigate("Withdraw");
  };

  const handleViewHistory = () => {
    navigation.navigate("PaymentHistory");
  };

  const handleApplyForLoan = () => {
    // TODO: Navigate to loan application
    console.log("Apply for Loan pressed");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle="light-content" />

      {/* Dark Header Section */}
      <View style={styles.headerSection}>
        <SafeAreaView>
          {/* Header Row */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(walletData?.balance || 0)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.topUpButton}
              onPress={handleTopUp}
              activeOpacity={0.8}
            >
              <Text style={styles.topUpButtonText}>Top Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={handleWithdraw}
              activeOpacity={0.8}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Content Section */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Apply for Loan Card */}
        <TouchableOpacity
          style={[styles.loanCard, dynamicStyles.card]}
          onPress={handleApplyForLoan}
          activeOpacity={0.7}
        >
          <View style={styles.loanIconContainer}>
            <MaterialIcons
              name="account-balance-wallet"
              size={24}
              color="#9B59B6"
            />
          </View>
          <View style={styles.loanDetails}>
            <Text style={[styles.loanTitle, dynamicStyles.text]}>
              Apply for Loan
            </Text>
            <Text style={[styles.loanSubtitle, dynamicStyles.textSecondary]}>
              Get up to $5,000 instantly
            </Text>
          </View>
          <MaterialIcons
            name="north-east"
            size={20}
            color={dynamicStyles.textSecondary.color}
          />
        </TouchableOpacity>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={handleViewHistory} activeOpacity={0.7}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {walletData?.transactions.map((transaction) => (
            <View
              key={transaction.id}
              style={[styles.transactionItem, dynamicStyles.borderLight]}
            >
              {/* Transaction Icon */}
              <View style={[styles.transactionIconContainer, dynamicStyles.iconBackground]}>
                <MaterialIcons
                  name="history"
                  size={22}
                  color={dynamicStyles.textSecondary.color}
                />
              </View>

              {/* Transaction Details */}
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionTitle, dynamicStyles.text]}>
                  {transaction.title}
                </Text>
                <Text
                  style={[
                    styles.transactionDate,
                    dynamicStyles.textSecondary,
                  ]}
                >
                  {transaction.date}
                </Text>
              </View>

              {/* Transaction Amount */}
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === "debit"
                    ? styles.debitAmount
                    : styles.creditAmount,
                ]}
              >
                {transaction.type === "debit" ? "-" : "+"}
                {formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}

          {(!walletData?.transactions ||
            walletData.transactions.length === 0) && (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="receipt-long"
                size={48}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No transactions yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    backgroundColor: "#000000",
    paddingBottom: theme.spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  balanceSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  topUpButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: "#2C2C2E",
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loanIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(155, 89, 182, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  loanDetails: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  loanSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(142, 142, 147, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  transactionDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  debitAmount: {
    color: theme.colors.text,
  },
  creditAmount: {
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
  },
});
