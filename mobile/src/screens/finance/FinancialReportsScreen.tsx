import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { usePermissions } from '../../context/PermissionContext';
import { accountingService, FinancialSummary } from '../../services/accounting';
import { Loader } from '../../components/common';

interface FinancialReportsScreenProps {
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

export default function FinancialReportsScreen({ navigation, route }: FinancialReportsScreenProps) {
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
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#0D0D0F' : '#F8F9FA' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#8E8E93' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? 'rgba(44, 44, 46, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? 'rgba(58, 58, 60, 0.5)' : 'rgba(0, 0, 0, 0.06)',
    },
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: string;
    
    switch (period) {
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
      case 'quarter':
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        startDate = quarterAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, getDateRange, fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => `RWF ${Math.abs(value).toLocaleString()}`;
  const profitMargin = summary.totalRevenue > 0 
    ? ((summary.netIncome / summary.totalRevenue) * 100).toFixed(1) 
    : '0';
  const isProfit = summary.netIncome >= 0;

  const reportCards = [
    {
      id: 'pnl',
      title: 'Profit & Loss',
      subtitle: 'Income statement overview',
      icon: 'assessment',
      color: '#6366F1',
    },
    {
      id: 'sales',
      title: 'Sales by Staff',
      subtitle: 'Employee performance',
      icon: 'people',
      color: '#10B981',
    },
    {
      id: 'expenses',
      title: 'Expense Report',
      subtitle: 'Category breakdown',
      icon: 'receipt-long',
      color: '#F59E0B',
    },
    {
      id: 'tax',
      title: 'Tax Summary',
      subtitle: 'Tax liability overview',
      icon: 'account-balance',
      color: '#8B5CF6',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading reports..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={[styles.backBtnBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialIcons name="arrow-back" size={20} color={dynamicStyles.text.color} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Reports</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <MaterialIcons name="file-download" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={[styles.periodContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p ? styles.periodTextActive : { color: dynamicStyles.textSecondary.color }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* P&L Summary Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[styles.pnlCard, dynamicStyles.card]}>
            <Text style={[styles.pnlTitle, dynamicStyles.text]}>Profit & Loss Summary</Text>
            <Text style={[styles.pnlSubtitle, dynamicStyles.textSecondary]}>
              {period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 30 days' : period === 'quarter' ? 'Last 3 months' : 'Last 12 months'}
            </Text>
            
            {/* Revenue Row */}
            <View style={styles.pnlRow}>
              <View style={styles.pnlRowLeft}>
                <View style={[styles.pnlDot, { backgroundColor: theme.colors.success }]} />
                <Text style={[styles.pnlLabel, dynamicStyles.text]}>Revenue</Text>
              </View>
              <Text style={[styles.pnlValue, { color: theme.colors.success }]}>
                +{formatCurrency(summary.totalRevenue)}
              </Text>
            </View>
            
            {/* Expenses Row */}
            <View style={styles.pnlRow}>
              <View style={styles.pnlRowLeft}>
                <View style={[styles.pnlDot, { backgroundColor: theme.colors.error }]} />
                <Text style={[styles.pnlLabel, dynamicStyles.text]}>Expenses</Text>
              </View>
              <Text style={[styles.pnlValue, { color: theme.colors.error }]}>
                -{formatCurrency(summary.totalExpenses)}
              </Text>
            </View>
            
            {/* Divider */}
            <View style={[styles.pnlDivider, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            
            {/* Net Income */}
            <View style={styles.pnlRow}>
              <View style={styles.pnlRowLeft}>
                <MaterialIcons 
                  name={isProfit ? 'trending-up' : 'trending-down'} 
                  size={18} 
                  color={isProfit ? theme.colors.success : theme.colors.error} 
                />
                <Text style={[styles.pnlLabel, dynamicStyles.text, { fontWeight: '700' }]}>Net Income</Text>
              </View>
              <Text style={[styles.pnlValueLarge, { color: isProfit ? theme.colors.success : theme.colors.error }]}>
                {isProfit ? '+' : '-'}{formatCurrency(summary.netIncome)}
              </Text>
            </View>
            
            {/* Margin Badge */}
            <View style={[styles.marginBadge, { backgroundColor: isProfit ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)' }]}>
              <Text style={[styles.marginText, { color: isProfit ? theme.colors.success : theme.colors.error }]}>
                {profitMargin}% profit margin
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>{summary.salesCount}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Transactions</Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>{summary.expenseCount}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Expenses</Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {summary.salesCount > 0 ? formatCurrency(summary.totalRevenue / summary.salesCount).replace('RWF ', '') : '0'}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Avg Sale</Text>
          </View>
        </View>

        {/* Report Cards */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Available Reports</Text>
        <View style={styles.reportGrid}>
          {reportCards.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportCard, dynamicStyles.card]}
              activeOpacity={0.7}
            >
              <View style={[styles.reportIcon, { backgroundColor: report.color + '15' }]}>
                <MaterialIcons name={report.icon as any} size={24} color={report.color} />
              </View>
              <Text style={[styles.reportTitle, dynamicStyles.text]}>{report.title}</Text>
              <Text style={[styles.reportSubtitle, dynamicStyles.textSecondary]}>{report.subtitle}</Text>
              <View style={styles.reportArrow}>
                <MaterialIcons name="arrow-forward" size={16} color={dynamicStyles.textSecondary.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {},
  backBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  exportBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: { padding: 16, paddingBottom: 40 },
  
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodChipActive: { 
    backgroundColor: theme.colors.primary,
  },
  periodText: { 
    fontSize: 13, 
    fontWeight: '600',
  },
  periodTextActive: { 
    color: '#FFFFFF',
  },
  
  // P&L Card
  pnlCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  pnlTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  pnlSubtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pnlRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pnlDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pnlLabel: {
    fontSize: 14,
  },
  pnlValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  pnlValueLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  pnlDivider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  marginBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  marginText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  
  // Section Title
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  
  // Report Cards
  reportGrid: {
    gap: 12,
  },
  reportCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  reportSubtitle: {
    fontSize: 12,
    position: 'absolute',
    left: 78,
    top: 38,
  },
  reportArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(150,150,150,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
