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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salesService } from '../../services/sales';
import { salonService } from '../../services/salon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RevenueByServiceScreenProps {
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

interface RevenueItem {
  name: string;
  revenue: number;
  count: number;
  percentage: number;
  type: 'service' | 'product';
  color: string;
}

export default function RevenueByServiceScreen({ navigation, route }: RevenueByServiceScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<RevenueItem[]>([]);
  const [products, setProducts] = useState<RevenueItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [period, setPeriod] = useState({ startDate: '', endDate: '' });
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');

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

      // Fetch analytics
      const analytics = await salesService.getSalesAnalytics(currentSalonId, startDate, endDate);

      const total = Number(analytics?.summary?.totalRevenue) || 0;
      setTotalRevenue(total);

      // Process services
      const serviceItems: RevenueItem[] = (analytics?.topServices || []).map((service: any, index: number) => {
        const revenue = Number(service.revenue || 0);
        return {
          name: service.name || 'Unknown Service',
          revenue,
          count: Number(service.count || 0),
          percentage: total > 0 ? (revenue / total) * 100 : 0,
          type: 'service' as const,
          color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5],
        };
      });

      // Process products
      const productItems: RevenueItem[] = (analytics?.topProducts || []).map((product: any, index: number) => {
        const revenue = Number(product.revenue || 0);
        return {
          name: product.name || 'Unknown Product',
          revenue,
          count: Number(product.count || 0),
          percentage: total > 0 ? (revenue / total) * 100 : 0,
          type: 'product' as const,
          color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5],
        };
      });

      setServices(serviceItems);
      setProducts(productItems);
    } catch (error: any) {
      console.error('Error fetching revenue by service:', error);
      Alert.alert(
        'Error',
        `Failed to fetch revenue data: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [salonId, route?.params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderRevenueItem = (item: RevenueItem, index: number) => {
    const barWidth = (item.percentage / 100) * (SCREEN_WIDTH - 64 - 32);
    const avgRevenue = item.count > 0 ? item.revenue / item.count : 0;
    
    return (
      <View key={index} style={[styles.revenueItem, dynamicStyles.card]}>
        <View style={styles.revenueHeader}>
          <View style={[styles.revenueIcon, { backgroundColor: item.color + '20' }]}>
            <MaterialIcons 
              name={item.type === 'service' ? 'content-cut' : 'shopping-bag'} 
              size={24} 
              color={item.color} 
            />
          </View>
          <View style={styles.revenueInfo}>
            <Text style={[styles.revenueName, dynamicStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.revenueStats}>
              <Text style={[styles.revenueCount, dynamicStyles.textSecondary]}>
                {item.count} {item.type === 'service' ? 'services' : 'sales'}
              </Text>
              <Text style={[styles.revenuePercentage, dynamicStyles.textSecondary]}>
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.revenueAmountContainer}>
            <Text style={[styles.revenueAmount, dynamicStyles.text]}>
              {formatCurrency(item.revenue)}
            </Text>
            {item.count > 0 && (
              <Text style={[styles.revenueAvg, dynamicStyles.textSecondary]}>
                Avg: {formatCurrency(avgRevenue)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.revenueBarContainer}>
          <View style={[styles.revenueBar, { width: barWidth, backgroundColor: item.color }]} />
        </View>
      </View>
    );
  };

  const currentItems = activeTab === 'services' ? services : products;
  const tabTotal = currentItems.reduce((sum, item) => sum + item.revenue, 0);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
            Loading revenue data...
          </Text>
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Revenue by Service</Text>
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

        {/* Total Revenue Card */}
        <View style={[styles.totalCard, dynamicStyles.card]}>
          <Text style={[styles.totalLabel, dynamicStyles.textSecondary]}>Total Revenue</Text>
          <Text style={[styles.totalValue, { color: '#10B981' }]}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, dynamicStyles.card]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'services' && styles.tabActive,
              activeTab === 'services' && { backgroundColor: '#10B981' }
            ]}
            onPress={() => setActiveTab('services')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="content-cut" 
              size={20} 
              color={activeTab === 'services' ? '#FFFFFF' : dynamicStyles.textSecondary.color} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'services' ? '#FFFFFF' : dynamicStyles.textSecondary.color }
            ]}>
              Services ({services.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'products' && styles.tabActive,
              activeTab === 'products' && { backgroundColor: '#10B981' }
            ]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="shopping-bag" 
              size={20} 
              color={activeTab === 'products' ? '#FFFFFF' : dynamicStyles.textSecondary.color} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'products' ? '#FFFFFF' : dynamicStyles.textSecondary.color }
            ]}>
              Products ({products.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Total */}
        <View style={[styles.tabTotalCard, dynamicStyles.card]}>
          <Text style={[styles.tabTotalLabel, dynamicStyles.textSecondary]}>
            Total {activeTab === 'services' ? 'Services' : 'Products'} Revenue
          </Text>
          <Text style={[styles.tabTotalValue, { color: '#10B981' }]}>
            {formatCurrency(tabTotal)}
          </Text>
        </View>

        {/* Revenue Items */}
        {currentItems.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Top {activeTab === 'services' ? 'Services' : 'Products'}
            </Text>
            {currentItems.map((item, index) => renderRevenueItem(item, index))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons 
              name={activeTab === 'services' ? 'content-cut' : 'shopping-bag'} 
              size={64} 
              color={dynamicStyles.textSecondary.color} 
            />
            <Text style={[styles.emptyText, dynamicStyles.text]}>
              No {activeTab === 'services' ? 'services' : 'products'} recorded
            </Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              {activeTab === 'services' ? 'Services' : 'Products'} will appear here once sales are recorded.
            </Text>
          </View>
        )}

        {/* Summary */}
        {currentItems.length > 0 && (
          <View style={[styles.summaryCard, dynamicStyles.card]}>
            <Text style={[styles.summaryTitle, dynamicStyles.text]}>Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Items</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {currentItems.length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Total Sales</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {currentItems.reduce((sum, item) => sum + item.count, 0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Avg/Item</Text>
                <Text style={[styles.summaryValue, dynamicStyles.text]}>
                  {formatCurrency(tabTotal / currentItems.length)}
                </Text>
              </View>
            </View>
          </View>
        )}

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
  totalCard: {
    padding: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    marginLeft: theme.spacing.xs,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  tabTotalCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabTotalLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  tabTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  revenueItem: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  revenuePercentage: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  revenueAmountContainer: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  revenueAvg: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  revenueBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  revenueBar: {
    height: '100%',
    borderRadius: 4,
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: theme.spacing.md,
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
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  emptySubtext: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});

