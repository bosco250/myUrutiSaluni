import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salesService } from '../../services/sales';
import { salonService } from '../../services/salon';

interface ProfitLossReportScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
      startDate?: string;
      endDate?: string;
    };
  };
}

interface ProfitLossData {
  revenue: {
    total: number;
    services: number;
    products: number;
  };
  expenses: {
    total: number;
    commissions: number;
    other: number;
  };
  profit: {
    gross: number;
    net: number;
  };
}

export default function ProfitLossReportScreen({ navigation, route }: ProfitLossReportScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [period, setPeriod] = useState({ startDate: '', endDate: '' });

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
  };

  const formatCurrency = (value: number) => {
    return `RWF ${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get salon ID if not provided
      let currentSalonId = salonId;
      if (!currentSalonId) {
        const salons = await salonService.getMySalons();
        currentSalonId = salons[0]?.id || null;
        setSalonId(currentSalonId);
      }

      if (!currentSalonId) {
        throw new Error('No salon found. Please ensure you are associated with a salon.');
      }

      // Get date range
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29); // Default to last 30 days
      
      const startDate = route?.params?.startDate || start.toISOString().split('T')[0];
      const endDate = route?.params?.endDate || end.toISOString().split('T')[0];
      setPeriod({ startDate, endDate });

      // Fetch analytics and commissions
      const [analytics, commissions] = await Promise.all([
        salesService.getSalesAnalytics(currentSalonId, startDate, endDate),
        salesService.getCommissions({
          salonEmployeeId: undefined,
          startDate,
          endDate,
        }),
      ]);

      // Calculate revenue breakdown
      const totalRevenue = Number(analytics?.summary?.totalRevenue) || 0;
      
      // Calculate service and product revenue from topServices and topProducts
      const serviceRevenue = analytics?.topServices?.reduce(
        (sum: number, service: any) => sum + Number(service.revenue || 0),
        0
      ) || 0;
      
      const productRevenue = analytics?.topProducts?.reduce(
        (sum: number, product: any) => sum + Number(product.revenue || 0),
        0
      ) || 0;

      // Calculate expenses
      const totalCommissions = Array.isArray(commissions)
        ? commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0)
        : 0;

      const grossProfit = totalRevenue - totalCommissions;
      const netProfit = grossProfit; // For now, commissions are the only expense tracked

      setData({
        revenue: {
          total: totalRevenue,
          services: serviceRevenue,
          products: productRevenue,
        },
        expenses: {
          total: totalCommissions,
          commissions: totalCommissions,
          other: 0, // Other expenses not tracked yet
        },
        profit: {
          gross: grossProfit,
          net: netProfit,
        },
      });
    } catch (error: any) {
      console.error('Error fetching profit & loss data:', error);
      Alert.alert(
        'Error',
        `Failed to fetch profit & loss data: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [salonId, route?.params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderSection = (
    title: string,
    items: { label: string; value: number; indent?: boolean }[],
    total: number,
    isPositive: boolean = true
  ) => (
    <View style={[styles.section, dynamicStyles.card]}>
      <Text style={[styles.sectionTitle, dynamicStyles.text]}>{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.sectionRow}>
          <Text style={[
            styles.sectionLabel,
            dynamicStyles.textSecondary,
            item.indent && styles.indentedLabel
          ]}>
            {item.label}
          </Text>
          <Text style={[styles.sectionValue, dynamicStyles.text]}>
            {formatCurrency(item.value)}
          </Text>
        </View>
      ))}
      <View style={[styles.sectionTotal, { borderTopColor: isDark ? theme.colors.gray700 : theme.colors.border }]}>
        <Text style={[styles.sectionTotalLabel, dynamicStyles.text, { fontWeight: '700' }]}>
          {title.includes('Revenue') ? 'Total Revenue' : title.includes('Expenses') ? 'Total Expenses' : 'Net Profit'}
        </Text>
        <Text style={[
          styles.sectionTotalValue,
          { color: isPositive ? '#10B981' : '#EF4444', fontWeight: '700' }
        ]}>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
            Loading profit & loss statement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { 
          backgroundColor: isDark ? 'transparent' : theme.colors.white,
          borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.border,
        }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Profit & Loss</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="description" size={64} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.emptyText, dynamicStyles.text]}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDark ? 'transparent' : theme.colors.white,
        borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.border,
      }]}>
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Profit & Loss Statement</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Info */}
        <View style={[styles.periodCard, dynamicStyles.card]}>
          <MaterialIcons name="calendar-today" size={20} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.periodText, dynamicStyles.textSecondary]}>
            {formatDate(period.startDate)} - {formatDate(period.endDate)}
          </Text>
        </View>

        {/* Revenue Section */}
        {renderSection(
          'Revenue',
          [
            { label: 'Services', value: data.revenue.services },
            { label: 'Products', value: data.revenue.products },
          ],
          data.revenue.total,
          true
        )}

        {/* Expenses Section */}
        {renderSection(
          'Expenses',
          [
            { label: 'Employee Commissions', value: data.expenses.commissions, indent: false },
            { label: 'Other Expenses', value: data.expenses.other, indent: false },
          ],
          data.expenses.total,
          false
        )}

        {/* Profit Section */}
        <View style={[styles.section, dynamicStyles.card, styles.profitSection]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Profit</Text>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, dynamicStyles.textSecondary]}>Gross Profit</Text>
            <Text style={[styles.sectionValue, dynamicStyles.text]}>
              {formatCurrency(data.profit.gross)}
            </Text>
          </View>
          <View style={[styles.sectionTotal, { borderTopColor: isDark ? theme.colors.gray700 : theme.colors.border }]}>
            <Text style={[styles.sectionTotalLabel, dynamicStyles.text, { fontWeight: '700', fontSize: 18 }]}>
              Net Profit
            </Text>
            <Text style={[
              styles.sectionTotalValue,
              { 
                color: data.profit.net >= 0 ? '#10B981' : '#EF4444',
                fontWeight: '700',
                fontSize: 18
              }
            ]}>
              {formatCurrency(data.profit.net)}
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, dynamicStyles.card]}>
          <Text style={[styles.summaryTitle, dynamicStyles.text]}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Revenue</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(data.revenue.total)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(data.expenses.total)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Profit Margin</Text>
              <Text style={[styles.summaryValue, { 
                color: data.profit.net >= 0 ? '#10B981' : '#EF4444' 
              }]}>
                {data.revenue.total > 0 
                  ? `${((data.profit.net / data.revenue.total) * 100).toFixed(1)}%`
                  : '0%'
                }
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  periodText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  section: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  indentedLabel: {
    marginLeft: theme.spacing.md,
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  sectionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
  },
  sectionTotalLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  sectionTotalValue: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  profitSection: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});

