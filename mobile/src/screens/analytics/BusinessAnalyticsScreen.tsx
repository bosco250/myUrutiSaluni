import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { api } from '../../services/api';
import { salonService } from '../../services/salon';


interface BusinessAnalyticsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
    };
  };
}

interface AnalyticsSummary {
  summary: {
    totalRevenue: number;
    totalSales: number;
    averageSale: number;
  };
  paymentMethods: Record<string, number>;
  dailyRevenue: { date: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  topProducts: { name: string; count: number; revenue: number }[];
  topEmployees: { name: string; sales: number; revenue: number }[];
}

type TimePeriod = 'week' | 'month' | 'year' | 'all';

export default function BusinessAnalyticsScreen({ navigation, route }: BusinessAnalyticsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);

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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
  };

  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
    }

    return {
      startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
      endDate: now.toISOString().split('T')[0],
    };
  };

  const loadData = useCallback(async () => {
    try {
      if (!user?.id) return;

      // Get salon ID
      let currentSalonId = salonId;
      if (!currentSalonId) {
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          currentSalonId = salon.id;
          setSalonId(salon.id);
        }
      }

      if (!currentSalonId) {
        setLoading(false);
        return;
      }

      const { startDate, endDate } = getDateRange(selectedPeriod);
      
      const params = new URLSearchParams();
      params.append('salonId', currentSalonId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await api.get<AnalyticsSummary>(
        `/sales/analytics/summary?${params.toString()}`
      );
      
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, salonId, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return `RWF ${Math.round(amount).toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'mobile_money': return 'Mobile Money';
      case 'bank_transfer': return 'Bank Transfer';
      default: return method;
    }
  };

  const getPaymentMethodIcon = (method: string): string => {
    switch (method) {
      case 'cash': return 'payments';
      case 'card': return 'credit-card';
      case 'mobile_money': return 'phone-android';
      case 'bank_transfer': return 'account-balance';
      default: return 'payment';
    }
  };

  const getPaymentMethodColor = (method: string): string => {
    switch (method) {
      case 'cash': return theme.colors.success;
      case 'card': return theme.colors.primary;
      case 'mobile_money': return theme.colors.warning;
      case 'bank_transfer': return theme.colors.info;
      default: return theme.colors.gray500;
    }
  };

  // Calculate revenue chart max
  const maxDailyRevenue = analytics?.dailyRevenue.length
    ? Math.max(...analytics.dailyRevenue.map(d => d.revenue))
    : 0;

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      {(['week', 'month', 'year', 'all'] as TimePeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
            selectedPeriod !== period && { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 },
          ]}
          onPress={() => {
            setSelectedPeriod(period);
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.periodText,
              selectedPeriod === period
                ? { color: theme.colors.white }
                : dynamicStyles.text,
            ]}
          >
            {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <View style={[styles.summaryCard, dynamicStyles.card, styles.summaryCardLarge]}>
        <View style={[styles.summaryIcon, { backgroundColor: theme.colors.success + '20' }]}>
          <MaterialIcons name="trending-up" size={24} color={theme.colors.success} />
        </View>
        <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
          {formatCurrency(analytics?.summary.totalRevenue || 0)}
        </Text>
        <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Total Revenue</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, dynamicStyles.card, { flex: 1 }]}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <MaterialIcons name="receipt" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.summaryValueSmall, dynamicStyles.text]}>
            {formatNumber(analytics?.summary.totalSales || 0)}
          </Text>
          <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Total Sales</Text>
        </View>

        <View style={[styles.summaryCard, dynamicStyles.card, { flex: 1 }]}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <MaterialIcons name="account-balance-wallet" size={20} color={theme.colors.warning} />
          </View>
          <Text style={[styles.summaryValueSmall, dynamicStyles.text]}>
            {formatCurrency(analytics?.summary.averageSale || 0)}
          </Text>
          <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Avg. Order</Text>
        </View>
      </View>
    </View>
  );

  const renderRevenueChart = () => {
    const revenueData = analytics?.dailyRevenue.slice(-14) || []; // Last 14 days
    
    if (revenueData.length === 0) return null;

    return (
      <View style={[styles.chartCard, dynamicStyles.card]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, dynamicStyles.text]}>Revenue Trend</Text>
          <Text style={[styles.chartSubtitle, dynamicStyles.textSecondary]}>Last 14 days</Text>
        </View>

        <View style={styles.chartContainer}>
          {revenueData.map((item, index) => {
            const height = maxDailyRevenue > 0 
              ? (item.revenue / maxDailyRevenue) * 100 
              : 0;
            const date = new Date(item.date);
            const dayLabel = date.getDate().toString();
            
            return (
              <View key={item.date} style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(height, 3)}%`,
                        backgroundColor: index === revenueData.length - 1 
                          ? theme.colors.primary 
                          : theme.colors.primary + '60',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, dynamicStyles.textSecondary]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPaymentMethods = () => {
    const payments = analytics?.paymentMethods || {};
    const total = Object.values(payments).reduce((sum, val) => sum + val, 0);

    if (total === 0) return null;

    return (
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Payment Methods</Text>
        
        <View style={styles.paymentMethodsList}>
          {Object.entries(payments)
            .sort(([, a], [, b]) => b - a)
            .map(([method, amount]) => {
              const percentage = total > 0 ? (amount / total) * 100 : 0;
              const color = getPaymentMethodColor(method);
              
              return (
                <View key={method} style={styles.paymentMethodItem}>
                  <View style={styles.paymentMethodHeader}>
                    <View style={[styles.paymentMethodIcon, { backgroundColor: color + '20' }]}>
                      <MaterialIcons 
                        name={getPaymentMethodIcon(method) as any} 
                        size={18} 
                        color={color} 
                      />
                    </View>
                    <Text style={[styles.paymentMethodName, dynamicStyles.text]}>
                      {getPaymentMethodLabel(method)}
                    </Text>
                    <Text style={[styles.paymentMethodAmount, { color }]}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                  <View style={styles.paymentMethodBarContainer}>
                    <View 
                      style={[
                        styles.paymentMethodBar, 
                        { width: `${percentage}%`, backgroundColor: color }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.paymentMethodPercentage, dynamicStyles.textSecondary]}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
        </View>
      </View>
    );
  };

  const renderTopServices = () => {
    const services = analytics?.topServices?.slice(0, 5) || [];
    
    if (services.length === 0) return null;

    return (
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Top Services</Text>
          <MaterialIcons name="content-cut" size={20} color={theme.colors.primary} />
        </View>

        {services.map((service, index) => (
          <View key={index} style={styles.rankItem}>
            <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.rankNumber, { color: theme.colors.primary }]}>#{index + 1}</Text>
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, dynamicStyles.text]} numberOfLines={1}>
                {service.name}
              </Text>
              <Text style={[styles.rankMeta, dynamicStyles.textSecondary]}>
                {service.count} bookings
              </Text>
            </View>
            <Text style={[styles.rankValue, { color: theme.colors.success }]}>
              {formatCurrency(service.revenue)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopProducts = () => {
    const products = analytics?.topProducts?.slice(0, 5) || [];
    
    if (products.length === 0) return null;

    return (
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Top Products</Text>
          <MaterialIcons name="shopping-bag" size={20} color={theme.colors.info} />
        </View>

        {products.map((product, index) => (
          <View key={index} style={styles.rankItem}>
            <View style={[styles.rankBadge, { backgroundColor: theme.colors.info + '20' }]}>
              <Text style={[styles.rankNumber, { color: theme.colors.info }]}>#{index + 1}</Text>
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, dynamicStyles.text]} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={[styles.rankMeta, dynamicStyles.textSecondary]}>
                {product.count} sold
              </Text>
            </View>
            <Text style={[styles.rankValue, { color: theme.colors.success }]}>
              {formatCurrency(product.revenue)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopEmployees = () => {
    const employees = analytics?.topEmployees?.slice(0, 5) || [];
    
    if (employees.length === 0) return null;

    return (
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Staff Performance</Text>
          <MaterialIcons name="emoji-events" size={20} color={theme.colors.warning} />
        </View>

        {employees.map((employee, index) => (
          <View key={index} style={styles.rankItem}>
            <View style={[styles.rankBadge, { 
              backgroundColor: index === 0 ? '#FFD700' + '30' : theme.colors.warning + '20' 
            }]}>
              {index === 0 ? (
                <MaterialIcons name="emoji-events" size={16} color="#FFD700" />
              ) : (
                <Text style={[styles.rankNumber, { color: theme.colors.warning }]}>#{index + 1}</Text>
              )}
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, dynamicStyles.text]} numberOfLines={1}>
                {employee.name}
              </Text>
              <Text style={[styles.rankMeta, dynamicStyles.textSecondary]}>
                {employee.sales} sales
              </Text>
            </View>
            <Text style={[styles.rankValue, { color: theme.colors.success }]}>
              {formatCurrency(employee.revenue)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMonthlyTrend = () => {
    const monthlyData = analytics?.monthlyRevenue?.slice(-6) || []; // Last 6 months
    
    if (monthlyData.length === 0) return null;

    const maxMonthlyRevenue = Math.max(...monthlyData.map(d => d.revenue));

    return (
      <View style={[styles.sectionCard, dynamicStyles.card]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Monthly Trend</Text>
          <MaterialIcons name="show-chart" size={20} color={theme.colors.primary} />
        </View>

        {monthlyData.map((item, index) => {
          const percentage = maxMonthlyRevenue > 0 
            ? (item.revenue / maxMonthlyRevenue) * 100 
            : 0;
          const [year, month] = item.month.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });

          return (
            <View key={item.month} style={styles.monthlyItem}>
              <Text style={[styles.monthLabel, dynamicStyles.textSecondary]}>
                {monthName} {year}
              </Text>
              <View style={styles.monthlyBarContainer}>
                <View 
                  style={[
                    styles.monthlyBar, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: index === monthlyData.length - 1 
                        ? theme.colors.primary 
                        : theme.colors.primary + '60'
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.monthlyValue, dynamicStyles.text]}>
                {formatCurrency(item.revenue)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.loadingContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Business Analytics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Summary Cards */}
        {renderSummaryCards()}

        {/* Revenue Chart */}
        {renderRevenueChart()}

        {/* Payment Methods */}
        {renderPaymentMethods()}

        {/* Monthly Trend */}
        {renderMonthlyTrend()}

        {/* Top Services */}
        {renderTopServices()}

        {/* Top Products */}
        {renderTopProducts()}

        {/* Staff Performance */}
        {renderTopEmployees()}

        {/* Empty State */}
        {!analytics?.summary.totalSales && (
          <View style={styles.emptyState}>
            <MaterialIcons name="analytics" size={64} color={theme.colors.gray400} />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Data Available</Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              Start making sales to see your business analytics here.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  refreshButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },

  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Summary Cards
  summaryGrid: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryCardLarge: {
    paddingVertical: 24,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  summaryValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },

  // Chart Card
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  chartSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },

  // Section Card
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Payment Methods
  paymentMethodsList: {
    gap: 16,
  },
  paymentMethodItem: {
    marginBottom: 4,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  paymentMethodAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  paymentMethodBarContainer: {
    height: 6,
    backgroundColor: theme.colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  paymentMethodBar: {
    height: '100%',
    borderRadius: 3,
  },
  paymentMethodPercentage: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },

  // Rank Items
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.gray200,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  rankMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Monthly Trend
  monthlyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: {
    width: 70,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  monthlyBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.gray200,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  monthlyBar: {
    height: '100%',
    borderRadius: 4,
  },
  monthlyValue: {
    width: 90,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    textAlign: 'right',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
