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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { useTheme, useAuth, useRefresh } from '../../context';
import { usePermissions } from '../../context/PermissionContext';
import { accountingService, FinancialSummary } from '../../services/accounting';
import { salesService } from '../../services/sales';
import { salonService } from '../../services/salon';
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
  const { user } = useAuth();
  const { activeSalon } = usePermissions();
  const { refreshKey } = useRefresh(); // Global refresh trigger
  
  // State for salonId with fallback loading
  const [salonId, setSalonId] = useState(route?.params?.salonId || activeSalon?.salonId || '');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    salesCount: 0,
    expenseCount: 0,
  });
  const [commissionStats, setCommissionStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    count: 0,
  });
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [showFilterModal, setShowFilterModal] = useState(false);

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
      // Try to get salon ID using getMySalons (same as FinancialReportsScreen)
      try {
        const salons = await salonService.getMySalons();
        const mySalonId = salons[0]?.id;
        if (mySalonId) {
          setSalonId(mySalonId);
          // Will re-run with new salonId
          return;
        }
      } catch (e) {
        console.log('Could not fetch salons:', e);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      const { startDate, endDate } = getDateRange();
      
      // Use salesService.getSalesAnalytics (same as FinancialReportsScreen - proven to work)
      // Also fetch commissions - they count as expenses (cost of paying employees)
      const [salesAnalytics, expenseSummary, commissions] = await Promise.all([
        salesService.getSalesAnalytics(salonId, startDate, endDate).catch(() => ({
          summary: { totalRevenue: 0, totalSales: 0, averageSale: 0 },
        })),
        accountingService.getExpenseSummary(salonId, startDate, endDate).catch(() => ({
          totalExpenses: 0,
          expenseCount: 0,
        })),
        salesService.getCommissions({ startDate, endDate }).catch(() => []),
      ]);
      
      const totalRevenue = Number(salesAnalytics?.summary?.totalRevenue) || 0;
      
      // Manual expenses from expenses table
      const manualExpenses = Number(expenseSummary?.totalExpenses) || 0;
      
      // Calculate commission stats (paid vs unpaid)
      let paidCommissions = 0;
      let unpaidCommissions = 0;
      if (Array.isArray(commissions)) {
        commissions.forEach(commission => {
          const amount = Number(commission.amount || 0);
          if (commission.paid) {
            paidCommissions += amount;
          } else {
            unpaidCommissions += amount;
          }
        });
      }
      const totalCommissions = paidCommissions + unpaidCommissions;
      
      // Update commission stats
      setCommissionStats({
        total: totalCommissions,
        paid: paidCommissions,
        unpaid: unpaidCommissions,
        count: Array.isArray(commissions) ? commissions.length : 0,
      });
      
      // Total expenses = manual expenses + commissions
      const totalExpenses = manualExpenses + totalCommissions;
      const netIncome = totalRevenue - totalExpenses;
      const salesCount = Number(salesAnalytics?.summary?.totalSales) || 0;
      const expenseCount = Number(expenseSummary?.expenseCount) || 0;
      
      setSummary({
        totalRevenue,
        totalExpenses,
        netIncome,
        salesCount,
        expenseCount,
      });
    } catch (err) {
      console.error('Error loading financial summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, getDateRange]);

  // Fallback: Load salon if salonId is not available from context
  useEffect(() => {
    const loadSalonFallback = async () => {
      if (salonId || !user?.id) return;
      
      try {
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          setSalonId(salon.id);
        }
      } catch (error) {
        console.log('Could not load salon fallback:', error);
      }
    };
    
    loadSalonFallback();
  }, [salonId, user?.id]);

  // Sync salonId when activeSalon changes
  useEffect(() => {
    if (!salonId && activeSalon?.salonId) {
      setSalonId(activeSalon.salonId);
    }
  }, [salonId, activeSalon?.salonId]);

  // Load data when salonId, period, or refreshKey changes
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => `RWF ${Math.abs(value).toLocaleString()}`;
  
  const getPeriodLabel = (p: string) => {
    switch (p) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
      default: return 'This Month';
    }
  };

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
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Accounting</Text>
          
          <TouchableOpacity 
             onPress={() => setShowFilterModal(true)}
             style={[
               styles.dateSelectBtn, 
               { 
                 backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                 borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
               }
             ]}
          >
             <Text style={[styles.dateSelectText, dynamicStyles.text]}>{getPeriodLabel(period)}</Text>
             <MaterialIcons name="keyboard-arrow-down" size={20} color={dynamicStyles.textSecondary.color} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Commission Breakdown */}
        {commissionStats.count > 0 && (
          <View style={[styles.commissionCard, dynamicStyles.card]}>
            <View style={styles.commissionHeader}>
              <View style={[styles.commissionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <MaterialIcons name="payments" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={[styles.commissionTitle, dynamicStyles.text]}>Commission Breakdown</Text>
                <Text style={[styles.commissionSubtitle, dynamicStyles.textSecondary]}>
                  {commissionStats.count} commission{commissionStats.count !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            
            <View style={styles.commissionRow}>
              <View style={styles.commissionItem}>
                <View style={[styles.commissionDot, { backgroundColor: theme.colors.success }]} />
                <Text style={[styles.commissionLabel, dynamicStyles.textSecondary]}>Paid</Text>
                <Text style={[styles.commissionValue, { color: theme.colors.success }]}>
                  {formatCurrency(commissionStats.paid)}
                </Text>
              </View>
              
              <View style={styles.commissionItem}>
                <View style={[styles.commissionDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.commissionLabel, dynamicStyles.textSecondary]}>Unpaid</Text>
                <Text style={[styles.commissionValue, { color: '#F59E0B' }]}>
                  {formatCurrency(commissionStats.unpaid)}
                </Text>
              </View>
              
              <View style={styles.commissionItem}>
                <View style={[styles.commissionDot, { backgroundColor: '#6366F1' }]} />
                <Text style={[styles.commissionLabel, dynamicStyles.textSecondary]}>Total</Text>
                <Text style={[styles.commissionValue, dynamicStyles.text]}>
                  {formatCurrency(commissionStats.total)}
                </Text>
              </View>
            </View>
          </View>
        )}

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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, dynamicStyles.card]}>
                <Text style={[styles.modalTitle, dynamicStyles.text]}>Select Period</Text>
                
                {(['today', 'week', 'month', 'all'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.modalOption,
                      period === p && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    ]}
                    onPress={() => {
                      setPeriod(p);
                      setShowFilterModal(false);
                    }}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: period === p ? theme.colors.primary : dynamicStyles.textSecondary.color }
                    ]}>
                      {period === p && <View style={[styles.radioDot, { backgroundColor: theme.colors.primary }]} />}
                    </View>
                    <Text style={[
                      styles.modalOptionText, 
                      dynamicStyles.text,
                      period === p && { color: theme.colors.primary, fontWeight: '600' }
                    ]}>
                      {p === 'today' ? 'Today' : 
                       p === 'week' ? 'This Week' : 
                       p === 'month' ? 'This Month' : 'All Time'}
                    </Text>
                    {period === p && <MaterialIcons name="check" size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                  style={styles.modalCancelBtn}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.modalCancelText, dynamicStyles.textSecondary]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  headerContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dateSelectBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dateSelectText: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  
  // Net Income Card
  netIncomeCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  netIncomeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  netIncomeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  netIncomeLabel: { fontSize: 15, fontWeight: '600' },
  netIncomePeriod: { fontSize: 12, marginTop: 2 },
  netIncomeValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  marginBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  marginText: { fontSize: 13, fontWeight: '600' },
  
  // Stats Row
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  statCount: { fontSize: 12 },
  
  // Section Title
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  
  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { width: (width - 44) / 2, padding: 16, borderRadius: 14, borderWidth: 1 },
  quickIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  quickSubtitle: { fontSize: 12 },
  
  // Commission Breakdown
  commissionCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  commissionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  commissionIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commissionTitle: { fontSize: 15, fontWeight: '600' },
  commissionSubtitle: { fontSize: 12, marginTop: 2 },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  commissionItem: { flex: 1, alignItems: 'center' },
  commissionDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  commissionLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  commissionValue: { fontSize: 14, fontWeight: '700' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 320, borderRadius: 24, padding: 24, borderWidth: 1, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, marginBottom: 8 },
  modalOptionText: { fontSize: 16, flex: 1, marginLeft: 12, fontWeight: '500' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  modalCancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
});
