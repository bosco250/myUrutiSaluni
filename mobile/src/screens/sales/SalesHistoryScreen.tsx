import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService } from '../../services/salon';
import { salesService, Sale } from '../../services/sales';
import { Loader } from '../../components/common';

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
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    tableHeader: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray50,
    },
    tableRow: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderBottomColor: isDark
        ? theme.colors.gray700
        : theme.colors.borderLight,
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
      year: 'numeric',
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

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'card':
        return 'Card';
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return 'Cash';
    }
  };

  // Render sale card
  const renderSaleCard = (sale: Sale) => {
    const itemsCount = sale.items?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.saleCard, dynamicStyles.card]}
        onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id, sale })}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.saleInfo}>
            <Text style={[styles.saleId, dynamicStyles.text]}>
              #{sale.id.slice(-8).toUpperCase()}
            </Text>
            <Text style={[styles.saleDate, dynamicStyles.textSecondary]}>
              {formatDate(sale.createdAt)} at {new Date(sale.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text
            style={[styles.saleAmount, { color: theme.colors.success }]}
          >
            RWF {Number(sale.totalAmount).toLocaleString()}
          </Text>
        </View>

        {/* Details Row */}
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons
              name="person"
              size={16}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.detailText, dynamicStyles.text]} numberOfLines={1}>
              {sale.customer?.fullName || 'Walk-in'}
            </Text>
          </View>

          <View
            style={[
              styles.paymentMethodBadge,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <MaterialIcons
              name={getPaymentIcon(sale.paymentMethod) as any}
              size={14}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.paymentMethodText, { color: theme.colors.primary }]}
            >
              {getPaymentMethodLabel(sale.paymentMethod)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <MaterialIcons
            name="shopping-bag"
            size={14}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.itemsCount, dynamicStyles.textSecondary]}>
            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
          </Text>
          {sale.customer?.phone && (
            <>
              <Text style={[styles.footerSeparator, dynamicStyles.textSecondary]}>•</Text>
              <Text style={[styles.phoneText, dynamicStyles.textSecondary]} numberOfLines={1}>
                {sale.customer.phone}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={['top']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading sales history..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
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

      {/* Sales Table */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {sales.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="receipt-long"
              size={64}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>
              No sales found
            </Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              Sales will appear here once you make transactions
            </Text>
            <TouchableOpacity
              style={[
                styles.newSaleBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => navigation.navigate('Sales')}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.newSaleBtnText}>New Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.salesList}>
            {sales.map((sale) => (
              <React.Fragment key={sale.id}>
                {renderSaleCard(sale)}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
    marginTop: 2,
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
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  salesList: {
    paddingHorizontal: theme.spacing.md,
    gap: 10,
  },
  saleCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleInfo: {
    flex: 1,
    marginRight: 10,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 3,
  },
  saleDate: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 10,
  },
  detailText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    gap: 3,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  itemsCount: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  footerSeparator: {
    fontSize: 11,
  },
  phoneText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    flex: 1,
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
    fontFamily: theme.fonts.bold,
  },
  emptyText: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 40,
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
    fontFamily: theme.fonts.medium,
  },
});
