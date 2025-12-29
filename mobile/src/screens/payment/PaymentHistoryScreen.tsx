import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { paymentsService, Payment } from "../../services/payments";
import { api } from "../../services/api";
import CommissionTransactionModal from "../../components/CommissionTransactionModal";

interface WalletTransaction {
  id: string;
  walletId: string;
  transactionType: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  referenceType?: string;
  referenceId?: string;
  transactionReference?: string;
  status?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, any>;
}

interface PaymentHistoryScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      highlightPaymentId?: string;
      mode?: "wallet" | "payment";
      title?: string;
    };
  };
}

export default function PaymentHistoryScreen({
  navigation,
  route,
}: PaymentHistoryScreenProps) {
  const { isDark } = useTheme();
  const highlightPaymentId = route?.params?.highlightPaymentId;
  const mode = route?.params?.mode || "payment";
  const customTitle = route?.params?.title;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

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
  };

  useEffect(() => {
    if (mode === "wallet") {
      fetchWalletTransactions();
    } else {
      fetchPayments();
    }
  }, [mode]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const result = await paymentsService.getPaymentHistory(50, 0);
      setPayments(result.payments);
      setTotal(result.total);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletTransactions = async () => {
    try {
      setLoading(true);
      const walletResponse: any = await api.get("/wallets/me");

      // Handle different response structures
      let wallet: any = null;
      if (walletResponse?.data) {
        wallet = walletResponse.data;
      } else if (walletResponse?.id) {
        wallet = walletResponse;
      } else if (Array.isArray(walletResponse) && walletResponse.length > 0) {
        wallet = walletResponse[0];
      }

      if (wallet?.id) {
        try {
          const transactionsResponse: any = await api.get(
            `/wallets/${wallet.id}/transactions`
          );

          // Handle different response structures
          let transactionsData: any[] = [];
          if (Array.isArray(transactionsResponse)) {
            transactionsData = transactionsResponse;
          } else if (transactionsResponse?.data) {
            transactionsData = Array.isArray(transactionsResponse.data)
              ? transactionsResponse.data
              : [];
          } else if (transactionsResponse?.transactions) {
            transactionsData = Array.isArray(transactionsResponse.transactions)
              ? transactionsResponse.transactions
              : [];
          }

          // Transactions are ordered newest first (DESC), so we work backwards
          // Calculate balances if not provided
          let runningBalance = Number(wallet.balance) || 0;

          const transactions = transactionsData.map((t: any) => {
            const amount = Number(t.amount) || 0;
            const transactionType =
              t.transactionType || t.transaction_type || "unknown";
            const isDebit = [
              "withdrawal",
              "transfer",
              "fee",
              "loan_repayment",
            ].includes(transactionType);

            // Use provided balances if available, otherwise calculate
            let balanceAfter: number | null = null;
            let balanceBefore: number | null = null;

            if (t.balanceAfter !== undefined && t.balanceAfter !== null) {
              balanceAfter = Number(t.balanceAfter);
            } else if (
              t.balance_after !== undefined &&
              t.balance_after !== null
            ) {
              balanceAfter = Number(t.balance_after);
            }

            if (t.balanceBefore !== undefined && t.balanceBefore !== null) {
              balanceBefore = Number(t.balanceBefore);
            } else if (
              t.balance_before !== undefined &&
              t.balance_before !== null
            ) {
              balanceBefore = Number(t.balance_before);
            }

            // If balances not provided, calculate from running balance
            // Since transactions are newest first, balanceAfter should equal runningBalance
            if (balanceAfter === null) {
              balanceAfter = runningBalance;
            }

            if (balanceBefore === null) {
              // Calculate: balanceBefore = balanceAfter - transaction (reverse the transaction)
              balanceBefore = isDebit
                ? balanceAfter + amount // For debits, add back to get before
                : balanceAfter - amount; // For credits, subtract to get before
            }

            // Update running balance for next (older) transaction
            runningBalance = balanceBefore;

            return {
              id: t.id || String(Date.now()) + Math.random(),
              walletId: t.walletId || wallet.id,
              transactionType,
              amount,
              description: t.description || "",
              createdAt:
                t.createdAt || t.created_at || new Date().toISOString(),
              updatedAt: t.updatedAt || t.updated_at,
              referenceType: t.referenceType || t.reference_type,
              referenceId: t.referenceId || t.reference_id,
              transactionReference:
                t.transactionReference || t.transaction_reference,
              status: t.status,
              balanceBefore,
              balanceAfter,
              metadata: t.metadata || {},
            };
          });

          setWalletTransactions(transactions);
          setTotal(transactions.length);
        } catch (error: any) {
          console.error("Error fetching wallet transactions:", error);
          setWalletTransactions([]);
          setTotal(0);
        }
      } else {
        setWalletTransactions([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
      setWalletTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (mode === "wallet") {
      await fetchWalletTransactions();
    } else {
      await fetchPayments();
    }
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Unknown date";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const getTypeIcon = (type: Payment["type"]): string => {
    switch (type) {
      case "wallet_topup":
        return "add-circle";
      case "appointment":
        return "content-cut";
      case "product_purchase":
        return "shopping-bag";
      case "tip":
        return "favorite";
      default:
        return "payment";
    }
  };

  const getTypeLabel = (type: Payment["type"]): string => {
    switch (type) {
      case "wallet_topup":
        return "Wallet Top-up";
      case "appointment":
        return "Appointment";
      case "product_purchase":
        return "Product";
      case "tip":
        return "Tip";
      default:
        return "Payment";
    }
  };

  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case "deposit":
        return "Wallet Top-up";
      case "withdrawal":
        return "Withdrawal";
      case "transfer":
        return "Transfer";
      case "commission":
        return "Commission Earned";
      case "refund":
        return "Refund";
      case "fee":
        return "Fee";
      case "loan_repayment":
        return "Loan Repayment";
      default:
        return "Transaction";
    }
  };

  const getTransactionTypeIcon = (type: string): string => {
    switch (type) {
      case "deposit":
        return "add-circle";
      case "withdrawal":
        return "remove-circle";
      case "transfer":
        return "swap-horiz";
      case "commission":
        return "trending-up";
      case "refund":
        return "undo";
      case "fee":
        return "money-off";
      case "loan_repayment":
        return "account-balance";
      default:
        return "payment";
    }
  };

  const isDebitTransaction = (type: string): boolean => {
    return ["withdrawal", "transfer", "fee", "loan_repayment"].includes(type);
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const statusInfo = paymentsService.getStatusDisplay(item.status);
    const isHighlighted = item.id === highlightPaymentId;
    const isTopUp = item.type === "wallet_topup";

    return (
      <View
        style={[
          styles.paymentItem,
          dynamicStyles.card,
          isHighlighted && styles.highlightedItem,
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: statusInfo.color + "20" },
          ]}
        >
          <MaterialIcons
            name={getTypeIcon(item.type) as any}
            size={24}
            color={statusInfo.color}
          />
        </View>

        <View style={styles.paymentDetails}>
          <Text style={[styles.paymentType, dynamicStyles.text]}>
            {getTypeLabel(item.type)}
          </Text>
          <Text style={[styles.paymentDate, dynamicStyles.textSecondary]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.description && (
            <Text
              style={[styles.paymentDesc, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.paymentAmount,
              {
                color: isTopUp
                  ? theme.colors.success
                  : dynamicStyles.text.color,
              },
            ]}
          >
            {isTopUp ? "+" : "-"}
            {paymentsService.formatAmount(item.amount)}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Status helper functions (shared with TransactionDetailView)
  const getStatusLabel = (status?: string): string => {
    if (!status) return "Unknown";
    switch (status.toLowerCase()) {
      case "completed":
        return "Completed";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return theme.colors.text;
    switch (status.toLowerCase()) {
      case "completed":
        return theme.colors.success;
      case "pending":
        return theme.colors.warning || "#FF9500";
      case "failed":
        return theme.colors.error;
      case "cancelled":
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  };

  const renderWalletTransactionItem = ({
    item,
  }: {
    item: WalletTransaction;
  }) => {
    try {
      const isDebit = isDebitTransaction(item.transactionType);
      const iconName = getTransactionTypeIcon(item.transactionType);
      const iconColor = isDebit ? theme.colors.error : theme.colors.success;
      const amount = Number(item.amount) || 0;

      return (
        <TouchableOpacity
          style={[styles.paymentItem, dynamicStyles.card]}
          onPress={() => {
            setSelectedTransaction(item);
            setShowTransactionDetail(true);
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColor + "20" },
            ]}
          >
            <MaterialIcons name={iconName as any} size={24} color={iconColor} />
          </View>

          <View style={styles.paymentDetails}>
            <View style={styles.paymentTypeRow}>
              <Text style={[styles.paymentType, dynamicStyles.text]}>
                {getTransactionTypeLabel(item.transactionType)}
              </Text>
              {item.status && (
                <View
                  style={[
                    styles.statusBadgeSmall,
                    {
                      backgroundColor: getStatusColor(item.status) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTextSmall,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.paymentDate, dynamicStyles.textSecondary]}>
              {formatDate(item.createdAt)}
            </Text>
            {item.description && (
              <Text
                style={[styles.paymentDesc, dynamicStyles.textSecondary]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
          </View>

          <View style={styles.amountContainer}>
            <Text
              style={[
                styles.paymentAmount,
                { color: isDebit ? theme.colors.error : theme.colors.success },
              ]}
            >
              {isDebit ? "-" : "+"}
              {amount.toLocaleString()} RWF
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={dynamicStyles.textSecondary.color}
              style={{ marginLeft: theme.spacing.xs }}
            />
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error("Error rendering wallet transaction item:", error, item);
      return (
        <View style={[styles.paymentItem, dynamicStyles.card]}>
          <Text style={[styles.paymentType, dynamicStyles.text]}>
            Error displaying transaction
          </Text>
        </View>
      );
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

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {customTitle ||
            (mode === "wallet" ? "Wallet History" : "Payment History")}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Summary */}
      {mode !== "wallet" && (
        <View style={[styles.summaryCard, dynamicStyles.card]}>
          <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>
            Total Transactions
          </Text>
          <Text style={[styles.summaryValue, dynamicStyles.text]}>
            {total.toString()}
          </Text>
        </View>
      )}

      {/* Payment/Transaction List */}
      {mode === "wallet" ? (
        <FlatList<WalletTransaction>
          data={walletTransactions}
          renderItem={renderWalletTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            walletTransactions.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={64}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No transactions yet
                </Text>
                <Text
                  style={[styles.emptySubtext, dynamicStyles.textSecondary]}
                >
                  Your wallet transactions will appear here
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList<Payment>
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            payments.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="receipt-long"
                  size={64}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No payments yet
                </Text>
                <Text
                  style={[styles.emptySubtext, dynamicStyles.textSecondary]}
                >
                  Your payment history will appear here
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Commission Transaction Modal */}
      {selectedTransaction &&
        (() => {
          const transactionTypeLower = (
            selectedTransaction.transactionType || ""
          ).toLowerCase();
          const descriptionLower = (
            selectedTransaction.description || ""
          ).toLowerCase();
          const referenceTypeLower = (
            selectedTransaction.referenceType || ""
          ).toLowerCase();
          const isDebitCheck = [
            "withdrawal",
            "transfer",
            "fee",
            "loan_repayment",
          ].includes(selectedTransaction.transactionType || "");
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

      {/* Regular Transaction Detail Modal */}
      {selectedTransaction &&
        (() => {
          const transactionTypeLower = (
            selectedTransaction.transactionType || ""
          ).toLowerCase();
          const descriptionLower = (
            selectedTransaction.description || ""
          ).toLowerCase();
          const referenceTypeLower = (
            selectedTransaction.referenceType || ""
          ).toLowerCase();
          const isDebitCheck = [
            "withdrawal",
            "transfer",
            "fee",
            "loan_repayment",
          ].includes(selectedTransaction.transactionType || "");
          const isCommissionCheck =
            !isDebitCheck &&
            (transactionTypeLower === "commission" ||
              transactionTypeLower === "commission_earned" ||
              transactionTypeLower.includes("commission") ||
              descriptionLower.includes("commission") ||
              referenceTypeLower.includes("commission"));

          if (!isCommissionCheck) {
            return (
              <Modal
                visible={showTransactionDetail}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                  setShowTransactionDetail(false);
                  setSelectedTransaction(null);
                }}
              >
                <View style={styles.modalOverlay}>
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                      setShowTransactionDetail(false);
                      setSelectedTransaction(null);
                    }}
                  />
                  <View style={styles.modalContainer}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <View
                        style={[
                          styles.modalContent,
                          {
                            backgroundColor: isDark
                              ? "#2C2C2E"
                              : theme.colors.background,
                            borderColor: isDark
                              ? "#3A3A3C"
                              : theme.colors.borderLight,
                            borderWidth: 1,
                          },
                        ]}
                        onStartShouldSetResponder={() => true}
                      >
                        <TransactionDetailView
                          transaction={selectedTransaction}
                          onClose={() => {
                            setShowTransactionDetail(false);
                            setSelectedTransaction(null);
                          }}
                          dynamicStyles={dynamicStyles}
                          isDark={isDark}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            );
          }
          return null;
        })()}
    </SafeAreaView>
  );
}

// Transaction Detail Component
function TransactionDetailView({
  transaction,
  onClose,
  dynamicStyles,
  isDark,
}: {
  transaction: WalletTransaction;
  onClose: () => void;
  dynamicStyles: any;
  isDark: boolean;
}) {
  if (!transaction) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={[styles.detailTitle, dynamicStyles.text]}>
            Transaction Details
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons
              name="close"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, dynamicStyles.text]}>
            No transaction data available
          </Text>
        </View>
      </View>
    );
  }

  const isDebit = ["withdrawal", "transfer", "fee", "loan_repayment"].includes(
    transaction.transactionType || ""
  );
  const iconName = (() => {
    switch (transaction.transactionType) {
      case "deposit":
        return "add-circle";
      case "withdrawal":
        return "remove-circle";
      case "transfer":
        return "swap-horiz";
      case "commission":
        return "trending-up";
      case "refund":
        return "undo";
      case "fee":
        return "money-off";
      case "loan_repayment":
        return "account-balance";
      default:
        return "payment";
    }
  })();
  const iconColor = isDebit ? theme.colors.error : theme.colors.success;
  const amount = Number(transaction.amount) || 0;
  const balanceBefore = transaction.balanceBefore
    ? Number(transaction.balanceBefore)
    : null;
  const balanceAfter = transaction.balanceAfter
    ? Number(transaction.balanceAfter)
    : null;

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Unknown date";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case "deposit":
        return "Wallet Top-up";
      case "withdrawal":
        return "Withdrawal";
      case "transfer":
        return "Transfer";
      case "commission":
        return "Commission Earned";
      case "refund":
        return "Refund";
      case "fee":
        return "Fee";
      case "loan_repayment":
        return "Loan Repayment";
      default:
        return "Transaction";
    }
  };

  const getStatusLabel = (status?: string): string => {
    if (!status) return "Unknown";
    switch (status.toLowerCase()) {
      case "completed":
        return "Completed";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return theme.colors.text;
    switch (status.toLowerCase()) {
      case "completed":
        return theme.colors.success;
      case "pending":
        return theme.colors.warning || "#FF9500";
      case "failed":
        return theme.colors.error;
      case "cancelled":
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  };

  // Clean description to remove IDs
  const cleanDescription = (() => {
    let desc = transaction.description || "";
    desc = desc.replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      ""
    );
    desc = desc.replace(/\bID:\s*\w+\b/gi, "");
    desc = desc.replace(/\bTransaction\s*ID[:\s]*\w+/gi, "");
    desc = desc.replace(/\bCommission\s*ID[:\s]*\w+/gi, "");
    desc = desc.replace(/\bSale\s*Item[:\s]*\w+/gi, "");
    return desc.trim() || getTransactionTypeLabel(transaction.transactionType);
  })();

  // For other transaction types, show full details
  return (
    <View style={styles.detailContainer}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <Text style={[styles.detailTitle, dynamicStyles.text]}>
          Transaction Details
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons
            name="close"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingBottom: theme.spacing.xl * 2,
          paddingHorizontal: 0,
        }}
        style={{ flex: 1 }}
      >
        {/* Transaction Icon & Type */}
        <View style={styles.detailIconSection}>
          <View
            style={[
              styles.detailIconContainer,
              { backgroundColor: iconColor + "20" },
            ]}
          >
            <MaterialIcons name={iconName as any} size={48} color={iconColor} />
          </View>
          <Text style={[styles.detailTypeLabel, dynamicStyles.text]}>
            {getTransactionTypeLabel(transaction.transactionType)}
          </Text>
          <Text style={[styles.detailDate, dynamicStyles.textSecondary]}>
            {formatDate(transaction.createdAt)}
          </Text>
        </View>

        {/* Amount Card */}
        <View
          style={[styles.amountCard, { backgroundColor: iconColor + "10" }]}
        >
          <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>
            Transaction Amount
          </Text>
          <Text style={[styles.amountValue, { color: iconColor }]}>
            {isDebit ? "-" : "+"}
            {amount.toLocaleString()} RWF
          </Text>
        </View>

        {/* Balance Information */}
        {(balanceBefore !== null || balanceAfter !== null) && (
          <View style={[styles.balanceSection, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Balance Information
            </Text>

            {balanceBefore !== null && (
              <View style={styles.balanceRow}>
                <View style={styles.balanceLabelContainer}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={20}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text
                    style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                  >
                    Balance Before
                  </Text>
                </View>
                <Text style={[styles.balanceValue, dynamicStyles.text]}>
                  {balanceBefore.toLocaleString()} RWF
                </Text>
              </View>
            )}

            <View style={styles.balanceRow}>
              <View style={styles.balanceLabelContainer}>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color={iconColor}
                />
                <Text
                  style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                >
                  Transaction
                </Text>
              </View>
              <Text style={[styles.balanceValue, { color: iconColor }]}>
                {isDebit ? "-" : "+"}
                {amount.toLocaleString()} RWF
              </Text>
            </View>

            {balanceAfter !== null && (
              <View style={[styles.balanceRow, styles.newBalanceRow]}>
                <View style={styles.balanceLabelContainer}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: theme.colors.success, fontWeight: "600" },
                    ]}
                  >
                    New Balance
                  </Text>
                </View>
                <Text
                  style={[
                    styles.balanceValue,
                    styles.newBalanceValue,
                    { color: theme.colors.success },
                  ]}
                >
                  {balanceAfter.toLocaleString()} RWF
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        {cleanDescription && (
          <View style={[styles.descriptionSection, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Description
            </Text>
            <Text style={[styles.descriptionText, dynamicStyles.textSecondary]}>
              {cleanDescription}
            </Text>
          </View>
        )}

        {/* Transaction Info */}
        <View style={[styles.infoSection, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Transaction Information
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
              Type
            </Text>
            <Text style={[styles.infoValue, dynamicStyles.text]}>
              {getTransactionTypeLabel(transaction.transactionType)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
              Date & Time
            </Text>
            <Text style={[styles.infoValue, dynamicStyles.text]}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>

          {transaction.status && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Status
              </Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        getStatusColor(transaction.status) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(transaction.status) },
                    ]}
                  >
                    {getStatusLabel(transaction.status)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {transaction.referenceType && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Reference Type
              </Text>
              <Text style={[styles.infoValue, dynamicStyles.text]}>
                {transaction.referenceType}
              </Text>
            </View>
          )}

          {transaction.referenceId && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Reference ID
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  styles.referenceId,
                ]}
                numberOfLines={1}
              >
                {transaction.referenceId}
              </Text>
            </View>
          )}

          {transaction.transactionReference && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Transaction Reference
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  styles.referenceId,
                ]}
                numberOfLines={1}
              >
                {transaction.transactionReference}
              </Text>
            </View>
          )}

          {transaction.updatedAt &&
            transaction.updatedAt !== transaction.createdAt && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                  Last Updated
                </Text>
                <Text style={[styles.infoValue, dynamicStyles.text]}>
                  {formatDate(transaction.updatedAt)}
                </Text>
              </View>
            )}

          {transaction.id && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Transaction ID
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  styles.referenceId,
                ]}
                numberOfLines={1}
              >
                {transaction.id}
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
    paddingVertical: theme.spacing.sm,
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
  summaryCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginTop: 4,
  },
  summarySubLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  highlightedItem: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap",
  },
  paymentType: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  paymentDate: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  paymentDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  statusContainer: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  referenceId: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 500,
    height: "90%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: theme.spacing.md,
  },
  modalContent: {
    borderRadius: 24,
    height: "100%",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    width: "100%",
    overflow: "hidden",
  },
  detailContainer: {
    flex: 1,
    height: "100%",
    backgroundColor: theme.colors.background,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  detailIconSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  detailTypeLabel: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  detailDate: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  amountCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 16,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  balanceSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  newBalanceRow: {
    borderBottomWidth: 0,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.success + "40",
  },
  balanceLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  newBalanceValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  descriptionSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  infoSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    textAlign: "right",
    flex: 1,
    marginLeft: theme.spacing.md,
  },
});
