import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { usePermissions } from '../../context/PermissionContext';
import { accountingService, FinancialSummary } from '../../services/accounting';
import { Loader } from '../../components/common';

const { width } = Dimensions.get('window');

interface AccountingScreenProps {
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

export default function AccountingScreen({ navigation, route }: AccountingScreenProps) {
  const { isDark } = useTheme();
  const { activeSalon } = usePermissions();
  const salonId = route?.params?.salonId || activeSalon?.salonId || '';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    salesCount: 0,
    expenseCount: 0,
  });
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#0D0D0F' : '#F5F5F5' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#8E8E93' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#2C2C2E' : '#E8E8E8',
    },
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: string | undefined;
    
    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      default:
        startDate = undefined;
    }
    
    return { startDate, endDate: now.toISOString().split('T')[0] };
  }, [period]);

  const loadData = useCallback(async () => {
    if (!salonId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { startDate, endDate } = getDateRange();
      const data = await accountingService.getFinancialSummary(salonId, startDate, endDate).catch(() => ({
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        salesCount: 0,
        expenseCount: 0,
      }));
      
      setSummary(data);
    } catch (err) {
      console.error('Error loading financial summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => `RWF ${Math.abs(value).toLocaleString()}`;

  const isProfit = summary.netIncome >= 0;
  const profitMargin = summary.totalRevenue > 0 
    ? ((summary.netIncome / summary.totalRevenue) * 100).toFixed(1) 
    : '0';

  const quickLinks = [
    { id: 'expenses', title: 'Expenses', subtitle: 'Track spending', icon: 'receipt-long', color: theme.colors.error, screen: 'Expenses' },
    { id: 'sales', title: 'Sales', subtitle: 'Transactions', icon: 'point-of-sale', color: theme.colors.success, screen: 'SalesHistory' },
    { id: 'commissions', title: 'Commissions', subtitle: 'Staff earnings', icon: 'payments', color: theme.colors.primary, screen: 'Commissions' },
    { id: 'reports', title: 'Reports', subtitle: 'Analytics', icon: 'assessment', color: '#6366F1', screen: 'FinancialReports' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading finances..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Finance</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={[styles.periodContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          {(['today', 'week', 'month', 'all'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && { backgroundColor: theme.colors.primary }]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p ? { color: '#FFF' } : dynamicStyles.textSecondary]}>
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Net Income Card */}
        <View style={[styles.netIncomeCard, dynamicStyles.card, { 
          backgroundColor: isDark 
            ? (isProfit ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)')
            : (isProfit ? '#F0FDF4' : '#FEF2F2')
        }]}>
          <View style={styles.netIncomeHeader}>
            <View style={[styles.netIncomeIcon, { backgroundColor: isProfit ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
              <MaterialIcons 
                name={isProfit ? 'trending-up' : 'trending-down'} 
                size={24} 
                color={isProfit ? theme.colors.success : theme.colors.error} 
              />
            </View>
            <View>
              <Text style={[styles.netIncomeLabel, dynamicStyles.textSecondary]}>Net Income</Text>
              <Text style={[styles.netIncomePeriod, dynamicStyles.textSecondary]}>
                {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </View>
          </View>
          <Text style={[styles.netIncomeValue, { color: isProfit ? theme.colors.success : theme.colors.error }]}>
            {isProfit ? '+' : '-'}{formatCurrency(summary.netIncome)}
          </Text>
          <View style={[styles.marginBadge, { backgroundColor: isProfit ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)' }]}>
            <Text style={[styles.marginText, { color: isProfit ? theme.colors.success : theme.colors.error }]}>
              {profitMargin}% profit margin
            </Text>
          </View>
        </View>

        {/* Revenue & Expenses Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
              <MaterialIcons name="arrow-upward" size={20} color={theme.colors.success} />
            </View>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Revenue</Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {formatCurrency(summary.totalRevenue)}
            </Text>
            <Text style={[styles.statCount, dynamicStyles.textSecondary]}>
              {summary.salesCount} transactions
            </Text>
          </View>

          <View style={[styles.statCard, dynamicStyles.card]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 59, 48, 0.12)' }]}>
              <MaterialIcons name="arrow-downward" size={20} color={theme.colors.error} />
            </View>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Expenses</Text>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {formatCurrency(summary.totalExpenses)}
            </Text>
            <Text style={[styles.statCount, dynamicStyles.textSecondary]}>
              {summary.expenseCount} records
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={[styles.quickCard, dynamicStyles.card]}
              onPress={() => navigation.navigate(link.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickIcon, { backgroundColor: link.color + '15' }]}>
                <MaterialIcons name={link.icon as any} size={24} color={link.color} />
              </View>
              <Text style={[styles.quickTitle, dynamicStyles.text]}>{link.title}</Text>
              <Text style={[styles.quickSubtitle, dynamicStyles.textSecondary]}>{link.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700',
  },
  headerRight: { width: 40 },
  
  content: { 
    paddingHorizontal: 16, 
    paddingBottom: 40,
  },
  
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodText: { 
    fontSize: 13, 
    fontWeight: '600',
  },
  
  // Net Income Card
  netIncomeCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  netIncomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  netIncomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  netIncomeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  netIncomePeriod: {
    fontSize: 12,
    marginTop: 2,
  },
  netIncomeValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 12,
  },
  marginBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  marginText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Stats Row
  statsRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: { 
    fontSize: 13, 
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: { 
    fontSize: 18, 
    fontWeight: '700',
    marginBottom: 6,
  },
  statCount: { 
    fontSize: 12,
  },
  
  // Section Title
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: '700',
    marginBottom: 14,
  },
  
  // Quick Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickSubtitle: {
    fontSize: 12,
  },
});
