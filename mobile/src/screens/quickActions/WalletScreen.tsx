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
import { useTheme, useAuth } from "../../context";
import { api } from "../../services/api";
import { canAccessScreen, Screen } from "../../constants/permissions";
import CommissionTransactionModal from "../../components/CommissionTransactionModal";

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
  transactionType?: string;
  description?: string;
  createdAt?: string;
  referenceType?: string;
  referenceId?: string;
  transactionReference?: string;
  status?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, any>;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

  // Role-based access control: Only employees and owners can access wallet
  const hasAccess = user?.role && canAccessScreen(user.role, Screen.WALLET);
  
  // If customer tries to access, redirect them back
  useEffect(() => {
    if (user && !hasAccess) {
      // Customer trying to access wallet - redirect to home
      navigation.goBack();
    }
  }, [user, hasAccess, navigation]);

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
      const walletResponse: any = await api.get("/wallets/me");
      // Handle response structure: could be direct or wrapped in data
      const wallet = walletResponse?.data || walletResponse;
      
      // Fetch transactions if wallet exists
      let transactions: Transaction[] = [];
      if (wallet?.id) {
        try {
          const transactionsResponse: any = await api.get(`/wallets/${wallet.id}/transactions`);
          // Handle response structure: could be direct array or wrapped in data
          const transactionsData = transactionsResponse?.data || transactionsResponse || [];
          const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
          
          transactions = transactionsArray.slice(0, 5).map((t: any) => {
            // Clean description to remove any IDs or technical data
            let cleanDescription = t.description || "";
            // Remove any UUIDs or IDs from description
            cleanDescription = cleanDescription.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "");
            cleanDescription = cleanDescription.replace(/\bID:\s*\w+\b/gi, "");
            cleanDescription = cleanDescription.replace(/\bTransaction\s*ID[:\s]*\w+/gi, "");
            cleanDescription = cleanDescription.trim();
            
            return {
              id: t.id,
              title: cleanDescription || getTransactionTitle(t.transactionType),
              date: formatTransactionDate(t.createdAt),
              amount: Number(t.amount),
              type: isDebit(t.transactionType) ? "debit" : "credit",
              transactionType: t.transactionType,
              description: t.description,
              createdAt: t.createdAt || t.created_at,
              referenceType: t.referenceType || t.reference_type,
              referenceId: t.referenceId || t.reference_id,
              transactionReference: t.transactionReference || t.transaction_reference,
              status: t.status,
              balanceBefore: t.balanceBefore || t.balance_before,
              balanceAfter: t.balanceAfter || t.balance_after,
              metadata: t.metadata || {},
            };
          });
        } catch (error) {
          console.log("No transactions found", error);
        }
      }

      setWalletData({
        balance: Number(wallet?.balance) || 0,
        currency: wallet?.currency || "RWF",
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
    navigation.navigate("PaymentHistory", {
      mode: 'wallet',
      title: 'Wallet History'
    });
  };

  const handleApplyForLoan = () => {
    // TODO: Navigate to loan application
    console.log("Apply for Loan pressed");
  };

  // Show access denied for customers
  if (user && !hasAccess) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <MaterialIcons name="lock" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, dynamicStyles.text]}>
            Access Denied
          </Text>
          <Text style={[styles.errorSubtext, dynamicStyles.textSecondary]}>
            Wallet is only available for employees and salon owners
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: theme.colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              Get up to RWF 7,500,000 instantly
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

          {walletData?.transactions.map((transaction) => {
            const isDebit = transaction.type === "debit";
            const getTransactionIcon = (title: string) => {
              const lowerTitle = title.toLowerCase();
              if (lowerTitle.includes("top-up") || lowerTitle.includes("deposit")) return "add-circle";
              if (lowerTitle.includes("withdrawal") || lowerTitle.includes("withdraw")) return "remove-circle";
              if (lowerTitle.includes("commission")) return "trending-up";
              if (lowerTitle.includes("transfer")) return "swap-horiz";
              if (lowerTitle.includes("refund")) return "undo";
              if (lowerTitle.includes("fee")) return "money-off";
              return isDebit ? "arrow-downward" : "arrow-upward";
            };
            
            const iconName = getTransactionIcon(transaction.title);
            const iconColor = isDebit ? theme.colors.error : theme.colors.success;
            const iconBgColor = isDebit 
              ? (isDark ? theme.colors.error + "20" : theme.colors.error + "15")
              : (isDark ? theme.colors.success + "20" : theme.colors.success + "15");

            return (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionItem, dynamicStyles.card]}
                onPress={() => {
                  setSelectedTransaction(transaction);
                  setShowTransactionDetail(true);
                }}
                activeOpacity={0.7}
              >
                {/* Transaction Icon */}
                <View style={[styles.transactionIconContainer, { backgroundColor: iconBgColor }]}>
                  <MaterialIcons
                    name={iconName as any}
                    size={20}
                    color={iconColor}
                  />
                </View>

                {/* Transaction Details */}
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionTitle, dynamicStyles.text]} numberOfLines={1}>
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
                <View style={styles.amountContainer}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      isDebit ? styles.debitAmount : styles.creditAmount,
                    ]}
                  >
                    {isDebit ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

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

      {/* Commission Transaction Modal */}
      {selectedTransaction && (() => {
        const transactionTypeLower = (
          selectedTransaction.transactionType || ""
        ).toLowerCase();
        const descriptionLower = (selectedTransaction.description || "").toLowerCase();
        const referenceTypeLower = (selectedTransaction.referenceType || "").toLowerCase();
        const isDebitCheck = ["withdrawal", "transfer", "fee", "loan_repayment"].includes(
          selectedTransaction.transactionType || ""
        );
        const isCommissionCheck =
          !isDebitCheck &&
          (transactionTypeLower === "commission" ||
            transactionTypeLower === "commission_earned" ||
            transactionTypeLower.includes("commission") ||
            descriptionLower.includes("commission") ||
            referenceTypeLower.includes("commission"));

        if (isCommissionCheck) {
          return (
            <CommissionTransactionModal
              transaction={selectedTransaction}
              visible={showTransactionDetail}
              onClose={() => {
                setShowTransactionDetail(false);
                setSelectedTransaction(null);
              }}
              isDark={isDark}
            />
          );
        }
        return null;
      })()}
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
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  debitAmount: {
    color: theme.colors.error,
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
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.error,
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
});
