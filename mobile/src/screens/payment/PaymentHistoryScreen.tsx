import React, { useMemo, useState, useEffect } from "react";
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
  TextInput,
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

type WalletDirectionFilter = "all" | "in" | "out";
type WalletCategoryFilter =
  | "all"
  | "topup"
  | "commission_payment"
  | "commission_earned"
  | "withdrawal"
  | "fee"
  | "loan"
  | "refund"
  | "transfer";

type WalletListItem =
  | { kind: "header"; id: string; title: string }
  | { kind: "tx"; id: string; tx: WalletTransaction };

interface PaymentHistoryScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      highlightPaymentId?: string;
      highlightTransactionId?: string;
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
  const highlightTransactionId = route?.params?.highlightTransactionId;
  const mode = route?.params?.mode || "payment";
  const customTitle = route?.params?.title;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string>("RWF");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [didAutoOpenHighlightedTx, setDidAutoOpenHighlightedTx] =
    useState(false);

  // Wallet history UX (filters/search)
  const [walletDirection, setWalletDirection] =
    useState<WalletDirectionFilter>("all");
  const [walletCategory, setWalletCategory] =
    useState<WalletCategoryFilter>("all");
  const [walletQuery, setWalletQuery] = useState<string>("");

  // Cache for fetched user names (userId -> fullName)
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>(
    {}
  );

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
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open highlighted wallet transaction (e.g., from withdrawal notification)
  useEffect(() => {
    if (mode !== "wallet") return;
    if (!highlightTransactionId) return;
    if (didAutoOpenHighlightedTx) return;
    if (!walletTransactions || walletTransactions.length === 0) return;

    const tx = walletTransactions.find((t) => t.id === highlightTransactionId);
    if (tx) {
      setSelectedTransaction(tx);
      setShowTransactionDetail(true);
      setDidAutoOpenHighlightedTx(true);
    }
  }, [
    mode,
    highlightTransactionId,
    didAutoOpenHighlightedTx,
    walletTransactions,
  ]);

  // Fetch missing user names from API for transactions that don't have them in metadata
  // Defined early so it can be called from fetchWalletTransactions
  const fetchMissingUserNames = async (transactions: WalletTransaction[]) => {
    const userIdsToFetch = new Set<string>();

    // Collect all user IDs that need names
    for (const tx of transactions) {
      const md = tx.metadata || {};
      if (md.commissionId) {
        // For commission payments (owner's view)
        if (
          md.employeeUserId &&
          !md.employeeName &&
          !userNamesCache[md.employeeUserId]
        ) {
          userIdsToFetch.add(md.employeeUserId);
        }
        // For commission earned (employee's view)
        if (
          md.salonOwnerId &&
          !md.salonOwnerName &&
          !userNamesCache[md.salonOwnerId]
        ) {
          userIdsToFetch.add(md.salonOwnerId);
        }
      }
    }

    // Fetch names for all missing users in a single batch request
    if (userIdsToFetch.size > 0) {
      try {
        const userIdsArray = Array.from(userIdsToFetch);
        const response: any = await api.post("/users/names", {
          userIds: userIdsArray,
        });
        const users = response?.data || response || [];

        // Update cache and transactions with fetched names
        const newCache: Record<string, string> = {};
        for (const user of users) {
          if (user?.id && user?.fullName) {
            newCache[user.id] = user.fullName;
          }
        }

        if (Object.keys(newCache).length > 0) {
          setUserNamesCache((prev) => ({ ...prev, ...newCache }));

          // Update transactions with fetched names
          setWalletTransactions((prev) =>
            prev.map((tx) => {
              const md = tx.metadata || {};
              const updatedMetadata = { ...md };
              let hasChanges = false;

              if (
                md.employeeUserId &&
                newCache[md.employeeUserId] &&
                !md.employeeName
              ) {
                updatedMetadata.employeeName = newCache[md.employeeUserId];
                hasChanges = true;
              }
              if (
                md.salonOwnerId &&
                newCache[md.salonOwnerId] &&
                !md.salonOwnerName
              ) {
                updatedMetadata.salonOwnerName = newCache[md.salonOwnerId];
                hasChanges = true;
              }

              return hasChanges ? { ...tx, metadata: updatedMetadata } : tx;
            })
          );
        }
      } catch (error) {
        console.warn("Failed to fetch user names:", error);
      }
    }
  };

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
        // Ensure balance is converted to number (decimal from DB comes as string)
        const walletBalanceNum =
          wallet?.balance !== undefined && wallet?.balance !== null
            ? Number(String(wallet.balance).replace(/[^0-9.-]/g, "")) || 0
            : 0;

        setWalletBalance(walletBalanceNum);
        setWalletCurrency(wallet?.currency || "RWF");
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
          // Start with current wallet balance for the most recent transaction
          let runningBalance = walletBalanceNum;

          const transactions = transactionsData.map((t: any) => {
            // Ensure amount is converted to number (decimal from DB comes as string)
            const amount =
              Number(String(t.amount || 0).replace(/[^0-9.-]/g, "")) || 0;
            const transactionType =
              t.transactionType || t.transaction_type || "unknown";
            const isDebit = [
              "withdrawal",
              "transfer",
              "fee",
              "loan_repayment",
            ].includes(transactionType);

            // Use provided balances if available, otherwise calculate
            // Ensure all balance values are converted to numbers
            let balanceAfter: number | undefined = undefined;
            let balanceBefore: number | undefined = undefined;

            if (t.balanceAfter !== undefined && t.balanceAfter !== null) {
              balanceAfter =
                Number(String(t.balanceAfter).replace(/[^0-9.-]/g, "")) || 0;
            } else if (
              t.balance_after !== undefined &&
              t.balance_after !== null
            ) {
              balanceAfter =
                Number(String(t.balance_after).replace(/[^0-9.-]/g, "")) || 0;
            }

            if (t.balanceBefore !== undefined && t.balanceBefore !== null) {
              balanceBefore =
                Number(String(t.balanceBefore).replace(/[^0-9.-]/g, "")) || 0;
            } else if (
              t.balance_before !== undefined &&
              t.balance_before !== null
            ) {
              balanceBefore =
                Number(String(t.balance_before).replace(/[^0-9.-]/g, "")) || 0;
            }

            // If balances not provided, calculate from running balance
            // Since transactions are newest first, the first transaction's balanceAfter should equal current wallet balance
            // For subsequent transactions, we calculate backwards
            if (balanceAfter === undefined && balanceBefore === undefined) {
              // Both missing: calculate from running balance
              // balanceAfter = runningBalance (this transaction's balance after)
              balanceAfter = runningBalance;
              // balanceBefore = balanceAfter - transaction (reverse the transaction)
              balanceBefore = isDebit
                ? balanceAfter + amount // For debits, add back to get before
                : balanceAfter - amount; // For credits, subtract to get before
            } else if (
              balanceAfter === undefined &&
              balanceBefore !== undefined
            ) {
              // Only balanceAfter missing: calculate from balanceBefore
              balanceAfter = isDebit
                ? balanceBefore - amount // For debits, subtract amount
                : balanceBefore + amount; // For credits, add amount
            } else if (
              balanceAfter !== undefined &&
              balanceBefore === undefined
            ) {
              // Only balanceBefore missing: calculate from balanceAfter
              balanceBefore = isDebit
                ? balanceAfter + amount // For debits, add back to get before
                : balanceAfter - amount; // For credits, subtract to get before
            }

            // Validate: balanceAfter should equal runningBalance for the first (newest) transaction
            // For subsequent transactions, balanceAfter should equal the previous transaction's balanceBefore
            if (
              balanceAfter !== undefined &&
              Math.abs(balanceAfter - runningBalance) > 0.01
            ) {
              // If there's a discrepancy, use the calculated values
              // This handles cases where database values might be incorrect
              console.warn(
                `Balance mismatch for transaction ${t.id}: balanceAfter (${balanceAfter}) != runningBalance (${runningBalance}). Using calculated values.`
              );
            }

            // Ensure balanceBefore is defined before using it
            if (balanceBefore === undefined) {
              // Fallback: calculate from balanceAfter if available, otherwise use runningBalance
              balanceBefore =
                balanceAfter !== undefined
                  ? isDebit
                    ? balanceAfter + amount
                    : balanceAfter - amount
                  : runningBalance;
            }

            // Update running balance for next (older) transaction
            runningBalance = balanceBefore;

            // Parse metadata if it's a string (TypeORM simple-json can return as string)
            let parsedMetadata: Record<string, any> = {};
            if (t.metadata) {
              if (typeof t.metadata === "string") {
                try {
                  parsedMetadata = JSON.parse(t.metadata);
                } catch (e) {
                  console.warn("Failed to parse metadata:", e, t.metadata);
                  parsedMetadata = {};
                }
              } else if (typeof t.metadata === "object") {
                parsedMetadata = t.metadata;
              }
            }

            // Note: employeeName and salonOwnerName will be undefined for old transactions
            // created before we added name storage. New transactions will have these fields.

            return {
              id: t.id || String(Date.now()) + Math.random(),
              walletId: t.walletId || wallet.id,
              transactionType,
              amount,
              description: t.description || t.description || "",
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
              metadata: parsedMetadata,
            };
          });

          setWalletTransactions(transactions);
          setTotal(transactions.length);

          // Fetch missing employee/owner names for commission transactions (async, non-blocking)
          fetchMissingUserNames(transactions).catch((err) =>
            console.warn("Failed to fetch user names:", err)
          );
        } catch (error: any) {
          console.error("Error fetching wallet transactions:", error);
          setWalletTransactions([]);
          setTotal(0);
        }
      } else {
        setWalletBalance(null);
        setWalletTransactions([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
      setWalletBalance(null);
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

  const formatMoney = (amount: number | string | null | undefined) => {
    // Ensure amount is converted to number
    const numAmount =
      typeof amount === "number"
        ? amount
        : Number(String(amount || 0).replace(/[^0-9.-]/g, "")) || 0;
    const safe = Number.isFinite(numAmount) ? numAmount : 0;
    return `${safe.toLocaleString()} ${walletCurrency || "RWF"}`;
  };

  const getWalletDateGroupLabel = (dateString: string) => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "Unknown Date";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isDebitTransaction = (type: string): boolean => {
    // Debit transactions reduce wallet balance
    return ["withdrawal", "transfer", "fee", "loan_repayment"].includes(type);
  };

  const matchesWalletCategory = (
    tx: WalletTransaction,
    category: WalletCategoryFilter
  ) => {
    if (category === "all") return true;
    const type = (tx.transactionType || "unknown").toLowerCase();
    const md = tx.metadata || {};
    const isCommissionPayment = type === "transfer" && !!md?.commissionId;

    switch (category) {
      case "topup":
        return type === "deposit";
      case "commission_payment":
        return isCommissionPayment;
      case "commission_earned":
        return type === "commission";
      case "withdrawal":
        return type === "withdrawal";
      case "fee":
        return type === "fee";
      case "loan":
        return type.startsWith("loan_");
      case "refund":
        return type === "refund";
      case "transfer":
        return type === "transfer" && !isCommissionPayment;
      default:
        return true;
    }
  };

  const filteredWalletTransactions = useMemo(() => {
    const q = walletQuery.trim().toLowerCase();

    return walletTransactions.filter((tx) => {
      const type = (tx.transactionType || "unknown").toLowerCase();
      const isDebit = isDebitTransaction(type);
      const md = tx.metadata || {};

      if (walletDirection === "in" && isDebit) return false;
      if (walletDirection === "out" && !isDebit) return false;

      if (!matchesWalletCategory(tx, walletCategory)) return false;

      if (!q) return true;
      // Include cached names in search
      const employeeName =
        md.employeeName ||
        (md.employeeUserId ? userNamesCache[md.employeeUserId] : "");
      const salonOwnerName =
        md.salonOwnerName ||
        (md.salonOwnerId ? userNamesCache[md.salonOwnerId] : "");

      const hay = [
        tx.description || "",
        tx.referenceType || "",
        tx.referenceId || "",
        tx.transactionReference || "",
        type,
        // Most useful "counterparty" fields for search
        employeeName,
        salonOwnerName,
        md.employeeUserId || "",
        md.salonOwnerId || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    walletTransactions,
    walletDirection,
    walletCategory,
    walletQuery,
    userNamesCache,
  ]);

  const walletTotals = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const tx of filteredWalletTransactions) {
      const type = (tx.transactionType || "unknown").toLowerCase();
      // Ensure amount is converted to number (decimal from DB comes as string)
      const amt = Number(String(tx.amount || 0).replace(/[^0-9.-]/g, "")) || 0;
      if (isDebitTransaction(type)) debits += amt;
      else credits += amt;
    }
    return {
      count: filteredWalletTransactions.length,
      credits,
      debits,
      net: credits - debits,
    };
  }, [filteredWalletTransactions]);

  const walletListItems: WalletListItem[] = useMemo(() => {
    const items: WalletListItem[] = [];
    let lastGroup: string | null = null;

    for (const tx of filteredWalletTransactions) {
      const label = getWalletDateGroupLabel(tx.createdAt);
      if (label !== lastGroup) {
        lastGroup = label;
        items.push({ kind: "header", id: `h:${label}`, title: label });
      }
      items.push({ kind: "tx", id: `t:${tx.id}`, tx });
    }

    return items;
  }, [filteredWalletTransactions]);

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

  const getTransactionTypeLabel = (
    type: string,
    metadata?: Record<string, any>
  ): string => {
    // Check metadata for more specific labels
    if (type === "transfer" && metadata?.commissionId) {
      return "Commission Payment";
    }
    if (type === "transfer" && metadata?.batchPayment) {
      return "Batch Commission Payment";
    }

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
      case "loan_disbursement":
        return "Loan Disbursement";
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
        return "account-balance-wallet"; // Better icon for commission payments
      case "commission":
        return "trending-up";
      case "refund":
        return "undo";
      case "fee":
        return "money-off";
      case "loan_repayment":
        return "account-balance";
      case "loan_disbursement":
        return "account-balance-wallet";
      default:
        return "payment";
    }
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
      const isHighlighted = item.id === highlightTransactionId;
      const isDebit = isDebitTransaction(item.transactionType);
      const iconName = getTransactionTypeIcon(item.transactionType);
      const iconColor = isDebit ? theme.colors.error : theme.colors.success;
      // Ensure amount is converted to number (decimal from DB comes as string)
      const amount =
        Number(String(item.amount || 0).replace(/[^0-9.-]/g, "")) || 0;
      const md = item.metadata || {};
      // Use cached names if metadata doesn't have them
      const employeeName =
        md.employeeName ||
        (md.employeeUserId ? userNamesCache[md.employeeUserId] : null);
      const salonOwnerName =
        md.salonOwnerName ||
        (md.salonOwnerId ? userNamesCache[md.salonOwnerId] : null);
      const isCommissionPayment =
        (item.transactionType || "").toLowerCase() === "transfer" &&
        !!md?.commissionId;
      const isCommissionEarned =
        (item.transactionType || "").toLowerCase() === "commission" &&
        !!md?.commissionId;

      return (
        <TouchableOpacity
          style={[
            styles.paymentItem,
            dynamicStyles.card,
            isHighlighted && styles.highlightedItem,
          ]}
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
                {getTransactionTypeLabel(item.transactionType, item.metadata)}
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
            {isCommissionPayment && !!employeeName && (
              <Text
                style={[styles.paymentDesc, dynamicStyles.textSecondary]}
                numberOfLines={1}
              >
                Paid to: {employeeName}
              </Text>
            )}
            {isCommissionEarned && !!salonOwnerName && (
              <Text
                style={[styles.paymentDesc, dynamicStyles.textSecondary]}
                numberOfLines={1}
              >
                Paid by: {salonOwnerName}
              </Text>
            )}
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
              {formatMoney(amount)}
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

  const walletFilterChips: {
    key: WalletCategoryFilter;
    label: string;
    icon: string;
  }[] = [
    { key: "all", label: "All", icon: "list" },
    { key: "topup", label: "Top-ups", icon: "add-circle" },
    { key: "commission_payment", label: "Commission Pay", icon: "swap-horiz" },
    {
      key: "commission_earned",
      label: "Commission Earned",
      icon: "trending-up",
    },
    { key: "withdrawal", label: "Withdrawals", icon: "remove-circle" },
    { key: "fee", label: "Fees", icon: "money-off" },
    { key: "loan", label: "Loans", icon: "account-balance" },
    { key: "refund", label: "Refunds", icon: "undo" },
    { key: "transfer", label: "Transfers", icon: "swap-horiz" },
  ];

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
      {mode === "wallet" ? (
        <View style={[styles.walletSummaryCard, dynamicStyles.card]}>
          <View style={styles.walletSummaryTopRow}>
            <Text
              style={[styles.walletSummaryLabel, dynamicStyles.textSecondary]}
            >
              Current Balance
            </Text>
            <View style={styles.walletDirectionPills}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWalletDirection("all")}
                style={[
                  styles.directionPill,
                  walletDirection === "all" && styles.directionPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.directionPillText,
                    walletDirection === "all" && styles.directionPillTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWalletDirection("in")}
                style={[
                  styles.directionPill,
                  walletDirection === "in" && styles.directionPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.directionPillText,
                    walletDirection === "in" && styles.directionPillTextActive,
                  ]}
                >
                  In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWalletDirection("out")}
                style={[
                  styles.directionPill,
                  walletDirection === "out" && styles.directionPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.directionPillText,
                    walletDirection === "out" && styles.directionPillTextActive,
                  ]}
                >
                  Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.walletSummaryBalance, dynamicStyles.text]}>
            {walletBalance === null ? "—" : formatMoney(walletBalance)}
          </Text>

          <View style={styles.walletSummaryStatsRow}>
            <View style={styles.walletStat}>
              <Text
                style={[styles.walletStatLabel, dynamicStyles.textSecondary]}
              >
                Credits
              </Text>
              <Text
                style={[
                  styles.walletStatValue,
                  { color: theme.colors.success },
                ]}
              >
                +{formatMoney(walletTotals.credits)}
              </Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStat}>
              <Text
                style={[styles.walletStatLabel, dynamicStyles.textSecondary]}
              >
                Debits
              </Text>
              <Text
                style={[styles.walletStatValue, { color: theme.colors.error }]}
              >
                -{formatMoney(walletTotals.debits)}
              </Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStat}>
              <Text
                style={[styles.walletStatLabel, dynamicStyles.textSecondary]}
              >
                Count
              </Text>
              <Text style={[styles.walletStatValue, dynamicStyles.text]}>
                {walletTotals.count}
              </Text>
            </View>
          </View>

          <View style={styles.walletSearchRow}>
            <View
              style={[
                styles.walletSearchInputWrap,
                { borderColor: dynamicStyles.card.borderColor },
              ]}
            >
              <MaterialIcons
                name="search"
                size={18}
                color={dynamicStyles.textSecondary.color}
              />
              <TextInput
                value={walletQuery}
                onChangeText={setWalletQuery}
                placeholder="Search by description / reference..."
                placeholderTextColor={dynamicStyles.textSecondary.color}
                style={[styles.walletSearchInput, dynamicStyles.text]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {!!walletQuery && (
                <TouchableOpacity
                  onPress={() => setWalletQuery("")}
                  style={styles.walletSearchClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={dynamicStyles.textSecondary.color}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletChipRow}
          >
            {walletFilterChips.map((chip) => {
              const active = walletCategory === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  activeOpacity={0.85}
                  onPress={() => setWalletCategory(chip.key)}
                  style={[
                    styles.walletChip,
                    { borderColor: dynamicStyles.card.borderColor },
                    active && styles.walletChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={chip.icon as any}
                    size={16}
                    color={
                      active
                        ? theme.colors.white
                        : dynamicStyles.textSecondary.color
                    }
                  />
                  <Text
                    style={[
                      styles.walletChipText,
                      active
                        ? styles.walletChipTextActive
                        : { color: dynamicStyles.textSecondary.color },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
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
        <FlatList<WalletListItem>
          data={walletListItems}
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <View style={styles.walletGroupHeader}>
                  <Text
                    style={[
                      styles.walletGroupHeaderText,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
              );
            }
            return renderWalletTransactionItem({ item: item.tx });
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            walletListItems.length === 0 && styles.emptyListContent,
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
                  Try changing filters or clearing search
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
                      style={{ width: "100%" }}
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
                          userNamesCache={userNamesCache}
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
  userNamesCache,
}: {
  transaction: WalletTransaction;
  onClose: () => void;
  dynamicStyles: any;
  isDark: boolean;
  userNamesCache: Record<string, string>;
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
  // Ensure amount is converted to number (decimal from DB comes as string)
  const amount =
    Number(String(transaction.amount || 0).replace(/[^0-9.-]/g, "")) || 0;
  const md = transaction.metadata || {};
  // Use cached names if metadata doesn't have them
  const employeeName =
    md.employeeName ||
    (md.employeeUserId ? userNamesCache[md.employeeUserId] : null);
  const salonOwnerName =
    md.salonOwnerName ||
    (md.salonOwnerId ? userNamesCache[md.salonOwnerId] : null);
  const txTypeLower = (transaction.transactionType || "unknown").toLowerCase();
  const isCommissionPayment = txTypeLower === "transfer" && !!md?.commissionId; // owner paying employee
  const isCommissionEarned = txTypeLower === "commission" && !!md?.commissionId; // employee receiving commission
  // Ensure balance values are converted to numbers (decimal from DB comes as string)
  const balanceBefore =
    transaction.balanceBefore !== undefined &&
    transaction.balanceBefore !== null
      ? Number(String(transaction.balanceBefore).replace(/[^0-9.-]/g, "")) || 0
      : undefined;
  const balanceAfter =
    transaction.balanceAfter !== undefined && transaction.balanceAfter !== null
      ? Number(String(transaction.balanceAfter).replace(/[^0-9.-]/g, "")) || 0
      : undefined;

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

  const getTransactionTypeLabel = (
    type: string,
    metadata?: Record<string, any>
  ): string => {
    // Check metadata for more specific labels
    if (type === "transfer" && metadata?.commissionId) {
      return "Commission Payment";
    }
    if (type === "transfer" && metadata?.batchPayment) {
      return "Batch Commission Payment";
    }

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
      case "loan_disbursement":
        return "Loan Disbursement";
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

  // Build description from metadata if description is empty or generic
  const cleanDescription = (() => {
    let desc = transaction.description || "";

    // If description is empty or just contains IDs, build a better one from metadata
    if (!desc || desc.match(/Commission\s*(ID|payment)/i)) {
      // For commission payments, create a human-readable description
      if (transaction.transactionType === "transfer" && md.commissionId) {
        if (employeeName) {
          desc = `Commission payment to ${employeeName}`;
        } else {
          desc = "Commission payment to employee";
        }
      } else if (
        transaction.transactionType === "commission" &&
        md.commissionId
      ) {
        if (salonOwnerName) {
          desc = `Commission earned from ${salonOwnerName}`;
        } else {
          desc = "Commission earned";
        }
      }
    }

    // Clean up IDs from description if it exists
    if (desc) {
      desc = desc.replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        ""
      );
      desc = desc.replace(/\bID:\s*\w+\b/gi, "");
      desc = desc.replace(/\bTransaction\s*ID[:\s]*\w+/gi, "");
      desc = desc.replace(/\bCommission\s*ID[:\s]*\w+/gi, "");
      desc = desc.replace(/\bSale\s*Item[:\s]*\w+/gi, "");
      desc = desc.replace(/,\s*,/g, ",").replace(/^\s*,\s*|\s*,\s*$/g, "");
    }

    return (
      desc.trim() ||
      getTransactionTypeLabel(transaction.transactionType, transaction.metadata)
    );
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
          paddingBottom: theme.spacing.md,
          paddingHorizontal: 0,
        }}
        style={{ maxHeight: "100%" }}
        nestedScrollEnabled={true}
      >
        {/* Compact Header with Icon, Type, Amount */}
        <View style={styles.detailIconSection}>
          <View
            style={[
              styles.detailIconContainer,
              { backgroundColor: iconColor + "20" },
            ]}
          >
            <MaterialIcons name={iconName as any} size={32} color={iconColor} />
          </View>
          <Text style={[styles.detailTypeLabel, dynamicStyles.text]}>
            {getTransactionTypeLabel(
              transaction.transactionType,
              transaction.metadata
            )}
          </Text>
          <Text
            style={[
              styles.amountValue,
              { color: iconColor, marginTop: 4, fontSize: 20 },
            ]}
          >
            {isDebit ? "-" : "+"}
            {amount.toLocaleString()} RWF
          </Text>
          <Text style={[styles.detailDate, dynamicStyles.textSecondary]}>
            {formatDate(transaction.createdAt)}
          </Text>
        </View>

        {/* Compact Balance Information */}
        {(balanceBefore !== undefined || balanceAfter !== undefined) && (
          <View style={[styles.balanceSection, dynamicStyles.card]}>
            {balanceBefore !== undefined && (
              <View style={styles.balanceRow}>
                <Text
                  style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                >
                  Balance Before
                </Text>
                <Text style={[styles.balanceValue, dynamicStyles.text]}>
                  {balanceBefore.toLocaleString()} RWF
                </Text>
              </View>
            )}
            {balanceAfter !== undefined && (
              <View style={[styles.balanceRow, styles.newBalanceRow]}>
                <Text
                  style={[styles.balanceLabel, dynamicStyles.textSecondary]}
                >
                  Balance After
                </Text>
                <Text
                  style={[styles.balanceValue, { color: theme.colors.success }]}
                >
                  {balanceAfter.toLocaleString()} RWF
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Compact Transaction Info */}
        <View style={[styles.infoSection, dynamicStyles.card]}>
          {transaction.status && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Status
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(transaction.status) + "20",
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
          )}

          {/* Counterparty / commission context */}
          {isCommissionPayment && employeeName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Paid to
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  { flex: 1, textAlign: "right" },
                ]}
                numberOfLines={1}
              >
                {employeeName}
              </Text>
            </View>
          )}

          {isCommissionEarned && salonOwnerName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Paid by
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  { flex: 1, textAlign: "right" },
                ]}
                numberOfLines={1}
              >
                {salonOwnerName}
              </Text>
            </View>
          )}

          {!!md.paymentMethod && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Method
              </Text>
              <Text style={[styles.infoValue, dynamicStyles.text]}>
                {String(md.paymentMethod).replace(/_/g, " ")}
              </Text>
            </View>
          )}

          {!!md.paymentReference && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Reference
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  styles.referenceId,
                  { flex: 1, textAlign: "right" },
                ]}
                numberOfLines={1}
              >
                {String(md.paymentReference)}
              </Text>
            </View>
          )}

          {cleanDescription &&
            cleanDescription !==
              getTransactionTypeLabel(
                transaction.transactionType,
                transaction.metadata
              ) && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                  Description
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    dynamicStyles.text,
                    { flex: 1, textAlign: "right" },
                  ]}
                >
                  {cleanDescription}
                </Text>
              </View>
            )}

          {transaction.transactionReference && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                Reference
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  dynamicStyles.text,
                  styles.referenceId,
                  { flex: 1, textAlign: "right" },
                ]}
                numberOfLines={1}
              >
                {transaction.transactionReference}
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
  walletSummaryCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  walletSummaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  walletSummaryLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  walletSummaryBalance: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.xs,
  },
  walletSummaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  walletStat: {
    flex: 1,
  },
  walletStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: theme.colors.borderLight,
    opacity: 0.6,
  },
  walletStatLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  walletStatValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  walletDirectionPills: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  directionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  directionPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  directionPillText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  directionPillTextActive: {
    color: theme.colors.white,
  },
  walletSearchRow: {
    marginTop: theme.spacing.sm,
  },
  walletSearchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  walletSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    paddingVertical: 0,
  },
  walletSearchClear: {
    paddingLeft: theme.spacing.xs,
  },
  walletChipRow: {
    marginTop: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  walletChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  walletChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  walletChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  walletChipTextActive: {
    color: theme.colors.white,
  },
  walletGroupHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  walletGroupHeaderText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
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
    maxHeight: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 24,
    maxHeight: "100%",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    width: "100%",
    overflow: "hidden",
  },
  detailContainer: {
    backgroundColor: theme.colors.background,
    maxHeight: "100%",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  detailIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  detailTypeLabel: {
    fontSize: 16,
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
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  newBalanceRow: {
    borderBottomWidth: 0,
    paddingTop: 8,
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
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
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
