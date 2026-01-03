import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";
import { salesService } from "../../services/sales";
import { salonService } from "../../services/salon";
import { Loader } from "../../components/common";

interface FinanceScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

interface WalletData {
  balance: number;
  currency: string;
  pendingBalance?: number;
}

interface LoanData {
  id: string;
  totalAmount: number;
  remainingAmount: number;
  nextPaymentAmount: number;
  nextPaymentDate: string;
  daysUntilDue: number;
  progress: number; // 0-100
}

interface FinancialSummary {
  totalRevenue: number;
  pendingPayouts: number;
  outstandingPayments: number;
  revenueChange: number; // percentage
}

interface PaymentMethodStat {
  method: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface TopItem {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

interface EmployeePerformance {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

type TimePeriod = "today" | "week" | "month";

export default function FinanceScreen({ navigation }: FinanceScreenProps) {
  const { isDark } = useTheme();
  // const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");

  // Data states
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([]);
  const [topServices, setTopServices] = useState<TopItem[]>([]);
  // const [topProducts, setTopProducts] = useState<TopItem[]>([]);
  const [topEmployees, setTopEmployees] = useState<EmployeePerformance[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);

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
      shadowColor: isDark ? "transparent" : theme.colors.black,
    },
    cardDark: {
      backgroundColor: isDark ? "#1C1C1E" : "#1C1C1E",
    },
    border: {
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    quickActionCard: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    periodButton: {
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    metricCard: {
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
  };

  // Format currency
  const formatCurrency = (
    amount: number | string | null | undefined,
    currency: string = "RWF"
  ) => {
    // Ensure amount is converted to number
    const numAmount =
      typeof amount === "number"
        ? amount
        : Number(String(amount || 0).replace(/[^0-9.-]/g, "")) || 0;
    return `${currency} ${numAmount.toLocaleString()}`;
  };

  // Get date range based on period
  const getDateRange = useCallback((period: TimePeriod) => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    };
  }, []);

  // Fetch salon ID
  const fetchSalonId = useCallback(async () => {
    try {
      const salons = await salonService.getMySalons();
      if (salons && salons.length > 0) {
        setSalonId(salons[0].id);
        return salons[0].id;
      }
    } catch (error) {
      console.error("Error fetching salon:", error);
    }
    return null;
  }, []);

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    try {
      const response = await api.get<any>("/wallets/me");
      // Ensure all numeric values are properly converted (decimal from DB comes as string)
      const balance =
        response?.balance !== undefined && response?.balance !== null
          ? Number(String(response.balance).replace(/[^0-9.-]/g, "")) || 0
          : 0;
      const pendingBalance =
        response?.pendingBalance !== undefined &&
        response?.pendingBalance !== null
          ? Number(String(response.pendingBalance).replace(/[^0-9.-]/g, "")) ||
            0
          : 0;

      setWallet({
        balance,
        currency: response?.currency || "RWF",
        pendingBalance,
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      // Mock data for development
      setWallet({
        balance: 5240500,
        currency: "RWF",
        pendingBalance: 350000,
      });
    }
  }, []);

  // Fetch active loan data - using static demo data for now
  const fetchLoan = useCallback(async () => {
    // Static demo data - backend integration will be done later
    setLoan({
      id: "loan-demo",
      totalAmount: 1500000,
      remainingAmount: 450000,
      nextPaymentAmount: 450000,
      nextPaymentDate: "2024-12-25",
      daysUntilDue: 5,
      progress: 70,
    });
  }, []);

  // Fetch financial summary
  const fetchSummary = useCallback(
    async (currentSalonId: string | null) => {
      try {
        const { startDate, endDate } = getDateRange(timePeriod);

        // Fetch sales analytics
        const analytics = await salesService.getSalesAnalytics(
          currentSalonId || undefined,
          startDate,
          endDate
        );

        // Fetch pending commissions for payouts
        const commissions = await salesService.getCommissions({ paid: false });
        const pendingPayouts = commissions.reduce(
          (sum, c) => sum + Number(c.amount),
          0
        );

        setSummary({
          totalRevenue: analytics?.summary?.totalRevenue || 0,
          pendingPayouts,
          outstandingPayments: 0, // From unpaid invoices if available
          revenueChange: 12.5, // Would need previous period data for real calculation
        });

        // Set top services and products
        if (analytics?.topServices) {
          setTopServices(
            analytics.topServices.slice(0, 3).map((s: any) => ({
              id: s.serviceId,
              name: s.serviceName,
              count: s.count,
              revenue: s.revenue,
            }))
          );
        }

        /*
      if (analytics?.topProducts) {
        setTopProducts(analytics.topProducts.slice(0, 3).map((p: any) => ({
          id: p.productId,
          name: p.productName,
          count: p.count,
          revenue: p.revenue,
        })));
      }
      */
      } catch (error: any) {
        console.error("Error fetching summary:", error);
        Alert.alert(
          "Connection Error",
          `Failed to fetch dashboard data: ${error.message || "Unknown error"}`,
          [{ text: "OK" }]
        );
        // Mock data
        setSummary({
          totalRevenue: 2450000,
          pendingPayouts: 320000,
          outstandingPayments: 150000,
          revenueChange: 12.5,
        });
        setTopServices([
          { id: "1", name: "Hair Styling", count: 45, revenue: 675000 },
          { id: "2", name: "Manicure", count: 38, revenue: 380000 },
          { id: "3", name: "Facial Treatment", count: 22, revenue: 440000 },
        ]);
        /*
      setTopProducts([
        { id: '1', name: 'Hair Oil', count: 28, revenue: 140000 },
        { id: '2', name: 'Shampoo', count: 22, revenue: 88000 },
        { id: '3', name: 'Conditioner', count: 18, revenue: 72000 },
      ]);
      */
      }
    },
    [timePeriod, getDateRange]
  );

  // Fetch payment method stats
  const fetchPaymentMethods = useCallback(async () => {
    try {
      // Would fetch from analytics endpoint
      // Using mock data for now
      // const total = 2450000;
      setPaymentMethods([
        {
          method: "mobile_money",
          label: "Mobile Money",
          amount: 1470000,
          percentage: 60,
          color: "#FFD700",
          icon: "phone-android",
        },
        {
          method: "cash",
          label: "Cash",
          amount: 612500,
          percentage: 25,
          color: "#4CAF50",
          icon: "payments",
        },
        {
          method: "card",
          label: "Card",
          amount: 367500,
          percentage: 15,
          color: "#2196F3",
          icon: "credit-card",
        },
      ]);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  }, []);

  // Fetch employee performance
  const fetchEmployeePerformance = useCallback(async () => {
    try {
      // Would fetch from analytics endpoint
      setTopEmployees([
        { id: "1", name: "Marie Claire", sales: 45, revenue: 675000 },
        { id: "2", name: "Jean Baptiste", sales: 38, revenue: 570000 },
        { id: "3", name: "Alice Uwimana", sales: 32, revenue: 480000 },
      ]);
    } catch (error) {
      console.error("Error fetching employee performance:", error);
    }
  }, []);

  // Load all data with progressive loading
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // PERFORMANCE: Load critical data first, then secondary data
      const currentSalonId = await fetchSalonId();
      
      // Step 1: Load critical data (wallet, summary) - show UI faster
      await Promise.all([
        fetchWallet(),
        fetchSummary(currentSalonId),
      ]);
      
      setLoading(false); // Show UI with critical data
      
      // Step 2: Load secondary data in background (non-blocking)
      Promise.all([
        fetchLoan(),
        fetchPaymentMethods(),
        fetchEmployeePerformance(),
      ]).catch((error) => {
        console.error("Error loading secondary finance data:", error);
      });
    } catch (error) {
      console.error("Error loading finance data:", error);
      setLoading(false);
    }
  }, [
    fetchSalonId,
    fetchWallet,
    fetchLoan,
    fetchSummary,
    fetchPaymentMethods,
    fetchEmployeePerformance,
  ]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when period changes
  useEffect(() => {
    if (!loading) {
      fetchSummary(salonId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Quick action cards data
  const quickActions = [
    {
      id: "sales",
      label: "New Sale",
      icon: "point-of-sale",
      screen: "Sales",
      color: theme.colors.primary,
    },
    {
      id: "history",
      label: "Sales History",
      icon: "receipt-long",
      screen: "SalesHistory",
      color: "#4CAF50",
    },
    {
      id: "commissions",
      label: "Commissions",
      icon: "people",
      screen: "Commissions",
      color: "#9C27B0",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "analytics",
      screen: "BusinessAnalytics",
      color: "#2196F3",
    },
    {
      id: "reports",
      label: "Reports",
      icon: "assessment",
      screen: "FinancialReports",
      color: "#00BFA5",
    },
    {
      id: "payments",
      label: "Payments",
      icon: "history",
      screen: "PaymentHistory",
      color: "#607D8B",
    },
  ];

  // Render period selector
  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(["today", "week", "month"] as TimePeriod[]).map((period) => {
        const isActive = timePeriod === period;
        return (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              dynamicStyles.periodButton,
              isActive ? dynamicStyles.periodButtonActive : null,
            ]}
            onPress={() => setTimePeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                isActive
                  ? styles.periodButtonTextActive
                  : dynamicStyles.textSecondary,
              ]}
            >
              {period === "today"
                ? "Today"
                : period === "week"
                  ? "This Week"
                  : "This Month"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render wallet card
  const renderWalletCard = () => (
    <View style={[styles.walletCard, dynamicStyles.cardDark]}>
      <View style={styles.walletHeader}>
        <View style={styles.walletIconContainer}>
          <MaterialIcons
            name="account-balance-wallet"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.walletActionButtons}>
          <TouchableOpacity
            style={[styles.walletActionButton, styles.withdrawButton]}
            onPress={() =>
              navigation.navigate("Withdraw", {
                onSuccess: () => {
                  // Refresh wallet balance after successful withdrawal
                  fetchWallet();
                },
              })
            }
          >
            <MaterialIcons
              name="arrow-upward"
              size={16}
              color={theme.colors.error}
            />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.walletActionButton, styles.topUpButton]}
            onPress={() =>
              navigation.navigate("Payment", {
                type: "wallet_topup",
                onSuccess: () => {
                  // Refresh wallet balance after successful top-up
                  fetchWallet();
                },
              })
            }
          >
            <MaterialIcons
              name="arrow-downward"
              size={16}
              color={theme.colors.white}
            />
            <Text style={styles.topUpButtonText}>Top Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.walletLabel}>Wallet Balance</Text>
      <Text style={styles.walletBalance}>
        {formatCurrency(wallet?.balance || 0, wallet?.currency)}
      </Text>

      <TouchableOpacity
        style={styles.viewTransactionsButton}
        onPress={() =>
          navigation.navigate("PaymentHistory", {
            mode: "wallet",
            title: "Wallet History",
          })
        }
      >
        <Text style={styles.viewTransactionsText}>View Transactions</Text>
      </TouchableOpacity>
    </View>
  );

  // Render active loan card
  const renderLoanCard = () => {
    if (!loan) return null;

    return (
      <View style={[styles.loanCard, dynamicStyles.card]}>
        <View style={styles.loanHeader}>
          <View style={styles.loanIconContainer}>
            <MaterialIcons
              name="credit-score"
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <Text style={[styles.loanTitle, dynamicStyles.text]}>
            Active Loan
          </Text>
        </View>

        <View style={styles.loanDetails}>
          <Text style={[styles.loanLabel, dynamicStyles.textSecondary]}>
            Next Repayment
          </Text>
          <View style={styles.loanAmountRow}>
            <Text style={[styles.loanAmount, dynamicStyles.text]}>
              {formatCurrency(loan.nextPaymentAmount, "RWF")}
            </Text>
            <Text
              style={[
                styles.loanDueDate,
                loan.daysUntilDue <= 5
                  ? styles.loanDueSoon
                  : dynamicStyles.textSecondary,
              ]}
            >
              Due in {loan.daysUntilDue} days
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, dynamicStyles.border]}>
            <View
              style={[styles.progressFill, { width: `${loan.progress}%` }]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.repayButton}
          onPress={() =>
            navigation.navigate("LoanRepayment", {
              loanId: loan.id,
              amount: loan.nextPaymentAmount,
            })
          }
        >
          <Text style={styles.repayButtonText}>Repay Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render financial summary
  const renderSummary = () => (
    <View style={styles.summarySection}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>
        Financial Summary
      </Text>
      {renderPeriodSelector()}

      <View style={styles.summaryCards}>
        {[
          {
            key: "revenue",
            icon: "trending-up",
            iconColor: "#4CAF50",
            label: "Total Revenue",
            value: summary?.totalRevenue || 0,
            change: summary?.revenueChange,
          },
          {
            key: "payouts",
            icon: "schedule",
            iconColor: "#FF9800",
            label: "Pending Payouts",
            value: summary?.pendingPayouts || 0,
          },
          {
            key: "outstanding",
            icon: "warning",
            iconColor: "#F44336",
            label: "Outstanding",
            value: summary?.outstandingPayments || 0,
          },
        ].map((card) => (
          <View
            key={card.key}
            style={[styles.summaryCard, dynamicStyles.metricCard]}
          >
            <MaterialIcons
              name={card.icon as any}
              size={24}
              color={card.iconColor}
            />
            <Text
              style={[styles.summaryCardLabel, dynamicStyles.textSecondary]}
            >
              {card.label}
            </Text>
            <Text style={[styles.summaryCardValue, dynamicStyles.text]}>
              {formatCurrency(card.value)}
            </Text>
            {card.change !== undefined && (
              <View style={styles.changeIndicator}>
                <MaterialIcons
                  name={card.change >= 0 ? "arrow-upward" : "arrow-downward"}
                  size={12}
                  color={card.change >= 0 ? "#4CAF50" : "#F44336"}
                />
                <Text
                  style={[
                    styles.changeText,
                    { color: card.change >= 0 ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {Math.abs(card.change).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>
        Quick Actions
      </Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, dynamicStyles.quickActionCard]}
            onPress={() =>
              navigation.navigate(
                action.screen,
                salonId ? { salonId } : undefined
              )
            }
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: `${action.color}20` },
              ]}
            >
              <MaterialIcons
                name={action.icon as any}
                size={24}
                color={action.color}
              />
            </View>
            <Text style={[styles.quickActionLabel, dynamicStyles.text]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render payment methods breakdown
  const renderPaymentMethods = () => (
    <View style={styles.metricsSection}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>
        Revenue by Payment Method
      </Text>
      <View style={[styles.metricsCard, dynamicStyles.card]}>
        {paymentMethods.map((method, index) => {
          const isLast = index >= paymentMethods.length - 1;
          return (
            <View
              key={method.method}
              style={[
                styles.paymentMethodRow,
                !isLast && styles.paymentMethodBorder,
                !isLast && dynamicStyles.border,
              ]}
            >
              <View style={styles.paymentMethodInfo}>
                <View
                  style={[
                    styles.paymentMethodIcon,
                    { backgroundColor: `${method.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={method.icon as any}
                    size={20}
                    color={method.color}
                  />
                </View>
                <View>
                  <Text style={[styles.paymentMethodLabel, dynamicStyles.text]}>
                    {method.label}
                  </Text>
                  <Text
                    style={[
                      styles.paymentMethodAmount,
                      dynamicStyles.textSecondary,
                    ]}
                  >
                    {formatCurrency(method.amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentMethodPercentage}>
                <Text style={[styles.percentageText, { color: method.color }]}>
                  {method.percentage}%
                </Text>
                <View style={styles.percentageBar}>
                  <View
                    style={[
                      styles.percentageFill,
                      {
                        width: `${method.percentage}%`,
                        backgroundColor: method.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  // Render top performers section
  const renderTopPerformers = () => (
    <View style={styles.metricsSection}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>
        Top Performers
      </Text>

      {/* Top Services */}
      <View
        style={[styles.metricsCard, dynamicStyles.card, styles.topItemsCard]}
      >
        <View style={styles.topItemsHeader}>
          <MaterialIcons name="spa" size={20} color={theme.colors.primary} />
          <Text style={[styles.topItemsTitle, dynamicStyles.text]}>
            Top Services
          </Text>
        </View>
        {topServices.map((service, index) => (
          <View key={service.id || `service-${index}`} style={styles.topItemRow}>
            <View style={styles.topItemRank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.topItemInfo}>
              <Text style={[styles.topItemName, dynamicStyles.text]}>
                {service.name}
              </Text>
              <Text style={[styles.topItemCount, dynamicStyles.textSecondary]}>
                {service.count} bookings
              </Text>
            </View>
            <Text style={[styles.topItemRevenue, dynamicStyles.text]}>
              {formatCurrency(service.revenue)}
            </Text>
          </View>
        ))}
      </View>

      {/* Top Employees */}
      <View
        style={[styles.metricsCard, dynamicStyles.card, styles.topItemsCard]}
      >
        <View style={styles.topItemsHeader}>
          <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
          <Text style={[styles.topItemsTitle, dynamicStyles.text]}>
            Top Employees
          </Text>
        </View>
        {topEmployees.map((employee, index) => {
          const isFirst = index === 0;
          return (
            <View key={employee.id || `employee-${index}`} style={styles.topItemRow}>
              <View
                style={[
                  styles.topItemRank,
                  isFirst ? styles.topItemRankGold : null,
                ]}
              >
                <Text
                  style={[
                    styles.rankText,
                    isFirst ? styles.rankTextGold : null,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={styles.topItemInfo}>
                <Text style={[styles.topItemName, dynamicStyles.text]}>
                  {employee.name}
                </Text>
                <Text
                  style={[styles.topItemCount, dynamicStyles.textSecondary]}
                >
                  {employee.sales} sales
                </Text>
              </View>
              <Text style={[styles.topItemRevenue, dynamicStyles.text]}>
                {formatCurrency(employee.revenue)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading financial data..." />
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Financial Center
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Wallet Balance Card */}
        <View key="wallet-card">{renderWalletCard()}</View>

        {/* Active Loan Card */}
        {loan && <View key="loan-card">{renderLoanCard()}</View>}

        {/* Financial Summary */}
        <View key="summary">{renderSummary()}</View>

        {/* Quick Actions */}
        <View key="quick-actions">{renderQuickActions()}</View>

        {/* Payment Methods Breakdown */}
        <View key="payment-methods">{renderPaymentMethods()}</View>

        {/* Top Performers */}
        <View key="top-performers">{renderTopPerformers()}</View>

        {/* Bottom spacing */}
        <View key="bottom-spacing" style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    // paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },

  // Wallet Card Styles
  walletCard: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(200, 155, 104, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletActionButtons: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  walletActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    gap: 4,
  },
  withdrawButton: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  withdrawButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  topUpButton: {
    backgroundColor: "#3A3A3C",
  },
  topUpButtonText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  walletLabel: {
    color: "#8E8E93",
    fontSize: 14,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  walletBalance: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.lg,
  },
  viewTransactionsButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: "center",
  },
  viewTransactionsText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },

  // Loan Card Styles
  loanCard: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loanHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  loanIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(200, 155, 104, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  loanTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  loanDetails: {
    marginBottom: theme.spacing.sm,
  },
  loanLabel: {
    fontSize: 13,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  loanAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loanAmount: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  loanDueDate: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  loanDueSoon: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  progressContainer: {
    marginVertical: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5EA",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  repayButton: {
    backgroundColor: "#1C1C1E",
    borderRadius: 25,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: "center",
  },
  repayButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },

  // Section Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },

  // Period Selector
  periodSelector: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    alignItems: "center",
  },
  periodButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  periodButtonTextActive: {
    color: theme.colors.white,
    fontWeight: "600",
  },

  // Summary Cards
  summarySection: {
    marginBottom: theme.spacing.lg,
  },
  summaryCards: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  summaryCardLabel: {
    fontSize: 11,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
  summaryCardValue: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
    fontFamily: theme.fonts.medium,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: theme.spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickActionCard: {
    width: "31%",
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  quickActionLabel: {
    fontSize: 11,
    textAlign: "center",
    fontFamily: theme.fonts.medium,
  },

  // Metrics Section
  metricsSection: {
    marginBottom: theme.spacing.lg,
  },
  metricsCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  paymentMethodBorder: {
    borderBottomWidth: 1,
  },
  paymentMethodInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  paymentMethodAmount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  paymentMethodPercentage: {
    alignItems: "flex-end",
    width: 80,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
  },
  percentageBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5EA",
    marginTop: 4,
    overflow: "hidden",
  },
  percentageFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Top Items
  topItemsCard: {
    marginBottom: theme.spacing.md,
  },
  topItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  topItemsTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  topItemRankGold: {
    backgroundColor: "#FFD700",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.bold,
  },
  rankTextGold: {
    color: "#7B6C00",
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
  },
  topItemCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  topItemRevenue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
  },

  bottomSpacing: {
    height: 100,
  },
});
