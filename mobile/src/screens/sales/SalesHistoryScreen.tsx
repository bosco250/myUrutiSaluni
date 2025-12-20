import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService } from '../../services/salon';
import { salesService, Sale } from '../../services/sales';

interface SalesHistoryScreenProps {
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

export default function SalesHistoryScreen({ navigation, route }: SalesHistoryScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    filterActive: {
      backgroundColor: theme.colors.primary,
    },
    filterInactive: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
    },
  };

  const getDateRange = useCallback((filter: string): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Format date in local timezone (YYYY-MM-DD) without UTC conversion
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (filter) {
      case 'today':
        return { startDate: formatDate(today), endDate: formatDate(today) };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        return { startDate: formatDate(weekStart), endDate: formatDate(today) };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatDate(monthStart), endDate: formatDate(today) };
      }
      default:
        return {};
    }
  }, []);

  const loadData = useCallback(async (filter: string) => {
    try {
      let currentSalonId = salonId;
      
      if (!currentSalonId && user?.id) {
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          currentSalonId = salon.id;
          setSalonId(salon.id);
        }
      }

      if (currentSalonId) {
        const dateRange = getDateRange(filter);
        const result = await salesService.getSales(
          currentSalonId,
          1,
          50,
          dateRange.startDate,
          dateRange.endDate
        );
        setSales(result.data || []);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, salonId, getDateRange]);

  // Load data when component mounts or filter changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await loadData(selectedFilter);
    };
    fetchData();
  }, [loadData, selectedFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(selectedFilter);
    setRefreshing(false);
  }, [loadData, selectedFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const totalSales = sales.length;
    const avgOrder = totalSales > 0 ? totalRevenue / totalSales : 0;

    return { totalRevenue, totalSales, avgOrder };
  }, [sales]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'card':
        return 'credit-card';
      case 'mobile_money':
        return 'phone-android';
      default:
        return 'payments';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Sales History</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            View past transactions
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newSaleButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('Sales')}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="receipt" size={20} color={theme.colors.primary} />
          <Text style={[styles.statValue, dynamicStyles.text]}>{stats.totalSales}</Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Sales</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="trending-up" size={20} color={theme.colors.success} />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            RWF {Math.round(stats.totalRevenue).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Revenue</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="analytics" size={20} color={theme.colors.info} />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            RWF {Math.round(stats.avgOrder).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Avg Order</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'all', label: 'All Time' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id ? dynamicStyles.filterActive : dynamicStyles.filterInactive,
            ]}
            onPress={() => setSelectedFilter(filter.id as any)}
          >
            <Text
              style={[
                styles.filterText,
                { color: selectedFilter === filter.id ? theme.colors.white : dynamicStyles.text.color },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sales List */}
      <ScrollView
        style={styles.salesList}
        contentContainerStyle={styles.salesContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {sales.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={dynamicStyles.textSecondary.color} />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No sales found</Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              Sales will appear here once you make transactions
            </Text>
            <TouchableOpacity
              style={[styles.newSaleBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Sales')}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.newSaleBtnText}>New Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sales.map((sale) => (
            <TouchableOpacity
              key={sale.id}
              style={[styles.saleCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id, sale })}
              activeOpacity={0.7}
            >
              <View style={styles.saleHeader}>
                <View style={[styles.paymentBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                  <MaterialIcons
                    name={getPaymentIcon(sale.paymentMethod) as any}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.saleInfo}>
                  <Text style={[styles.saleDate, dynamicStyles.text]}>
                    {formatDate(sale.createdAt)}
                  </Text>
                  <Text style={[styles.saleId, dynamicStyles.textSecondary]}>
                    #{sale.id.slice(-8).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={[styles.saleAmount, { color: theme.colors.primary }]}>
                    RWF {Number(sale.totalAmount).toLocaleString()}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
                </View>
              </View>
              {sale.customer && (
                <View style={styles.customerRow}>
                  <MaterialIcons name="person" size={14} color={dynamicStyles.textSecondary.color} />
                  <Text style={[styles.customerName, dynamicStyles.textSecondary]}>
                    {sale.customer.fullName}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  newSaleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  salesList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  salesContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  newSaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 24,
    marginTop: theme.spacing.lg,
    gap: 6,
  },
  newSaleBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  saleCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  saleDate: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  saleId: {
    fontSize: 11,
    marginTop: 2,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 6,
  },
  customerName: {
    fontSize: 12,
  },
});
