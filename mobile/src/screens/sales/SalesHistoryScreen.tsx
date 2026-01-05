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

  // Render table row
  const renderTableRow = (sale: Sale) => {
    const itemsCount = sale.items?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.tableRow, dynamicStyles.tableRow]}
        onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id, sale })}
        activeOpacity={0.7}
      >
        {/* Date */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {formatDate(sale.createdAt)}
          </Text>
          <Text
            style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {new Date(sale.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Sale ID */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            #{sale.id.slice(-8).toUpperCase()}
          </Text>
        </View>

        {/* Customer */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {sale.customer?.fullName || 'Walk-in'}
          </Text>
          {sale.customer?.phone && (
            <Text
              style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              {sale.customer.phone}
            </Text>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.tableCell}>
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

        {/* Items Count */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.tableCellAmount}>
          <Text
            style={[
              styles.tableCellAmountText,
              { color: theme.colors.primary },
            ]}
            numberOfLines={1}
          >
            RWF {Number(sale.totalAmount).toLocaleString()}
          </Text>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableScrollContainer}
            contentContainerStyle={styles.tableContainer}
          >
            <View style={styles.tableContent}>
              {/* Table Header */}
              <View style={[styles.tableHeaderRow, dynamicStyles.tableHeader]}>
                <View style={styles.tableCell}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Date
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Sale ID
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Customer
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Payment
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Items
                  </Text>
                </View>
                <View style={styles.tableCellAmount}>
                  <Text
                    style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
                  >
                    Amount
                  </Text>
                </View>
              </View>

              {/* Table Rows */}
              {sales.map((sale) => (
                <React.Fragment key={sale.id}>
                  {renderTableRow(sale)}
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
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
  tableScrollContainer: {
    marginHorizontal: theme.spacing.md,
  },
  tableContainer: {
    paddingVertical: theme.spacing.xs,
  },
  tableContent: {
    minWidth: 900, // Minimum width to enable horizontal scrolling
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
    minWidth: 900,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    gap: theme.spacing.xs,
    minWidth: 900,
  },
  tableCell: {
    flex: 1,
    minWidth: 120,
  },
  tableCellAmount: {
    width: 140,
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  tableCellSubtext: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  tableCellAmountText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
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
