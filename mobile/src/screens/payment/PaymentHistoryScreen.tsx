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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { paymentsService, Payment, PaymentStatus } from "../../services/payments";

interface PaymentHistoryScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      highlightPaymentId?: string;
    };
  };
}

export default function PaymentHistoryScreen({ navigation, route }: PaymentHistoryScreenProps) {
  const { isDark } = useTheme();
  const highlightPaymentId = route?.params?.highlightPaymentId;
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

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
    fetchPayments();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTypeIcon = (type: Payment['type']): string => {
    switch (type) {
      case 'wallet_topup': return 'add-circle';
      case 'appointment': return 'content-cut';
      case 'product_purchase': return 'shopping-bag';
      case 'tip': return 'favorite';
      default: return 'payment';
    }
  };

  const getTypeLabel = (type: Payment['type']): string => {
    switch (type) {
      case 'wallet_topup': return 'Wallet Top-up';
      case 'appointment': return 'Appointment';
      case 'product_purchase': return 'Product';
      case 'tip': return 'Tip';
      default: return 'Payment';
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const statusInfo = paymentsService.getStatusDisplay(item.status);
    const isHighlighted = item.id === highlightPaymentId;
    const isTopUp = item.type === 'wallet_topup';

    return (
      <View
        style={[
          styles.paymentItem,
          dynamicStyles.card,
          isHighlighted && styles.highlightedItem,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: statusInfo.color + '20' }]}>
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
            <Text style={[styles.paymentDesc, dynamicStyles.textSecondary]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.amountContainer}>
          <Text style={[
            styles.paymentAmount,
            { color: isTopUp ? theme.colors.success : dynamicStyles.text.color }
          ]}>
            {isTopUp ? '+' : '-'}{paymentsService.formatAmount(item.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>
    );
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
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
          Payment History
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, dynamicStyles.card]}>
        <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>
          Total Transactions
        </Text>
        <Text style={[styles.summaryValue, dynamicStyles.text]}>
          {total}
        </Text>
      </View>

      {/* Payment List */}
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
          <View style={styles.emptyState}>
            <MaterialIcons
              name="receipt-long"
              size={64}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              No payments yet
            </Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              Your payment history will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    paddingVertical: theme.spacing.md,
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
  listContent: {
    padding: theme.spacing.md,
    paddingTop: 0,
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
  paymentType: {
    fontSize: 16,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
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
});
