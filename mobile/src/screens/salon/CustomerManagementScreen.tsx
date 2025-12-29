import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService } from '../../services/salon';
import { api } from '../../services/api';
import { Loader } from '../../components/common';

interface CustomerManagementScreenProps {
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

interface SalonCustomer {
  id: string;
  customerId: string;
  salonId: string;
  visitCount: number;
  totalSpent: number;
  lastVisitDate: string | null;
  firstVisitDate: string | null;
  tags: string[];
  notes?: string;
  customer: {
    id: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  averageOrderValue?: number;
  daysSinceLastVisit?: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  averageCLV: number;
  averageVisitFrequency: number;
  topCustomers: SalonCustomer[];
}

export default function CustomerManagementScreen({ navigation, route }: CustomerManagementScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<SalonCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<SalonCustomer[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'new' | 'inactive'>('all');

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
    searchBox: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray300,
    },
  };

  const loadData = useCallback(async () => {
    try {
      let currentSalonId = salonId;

      // If no salonId provided, get salon from user
      if (!currentSalonId && user?.id) {
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          currentSalonId = salon.id;
          setSalonId(salon.id);
        }
      }

      if (!currentSalonId) {
        console.log('No salon ID available');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch customers and analytics in parallel
      const [customersResponse, analyticsResponse] = await Promise.all([
        api.get<any>(`/salons/${currentSalonId}/customers`).catch(() => ({ data: [] })),
        api.get<CustomerAnalytics>(`/salons/${currentSalonId}/customers/analytics`).catch(() => null),
      ]);

      // Handle the response format
      const customersData = Array.isArray(customersResponse) 
        ? customersResponse 
        : (customersResponse?.data || []);
      
      setCustomers(customersData);
      setFilteredCustomers(customersData);
      
      if (analyticsResponse) {
        setAnalytics(analyticsResponse as CustomerAnalytics);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterCustomers = useCallback(() => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.customer?.fullName?.toLowerCase().includes(query) ||
        c.customer?.phone?.includes(query) ||
        c.customer?.email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(c => 
          c.lastVisitDate && new Date(c.lastVisitDate) >= thirtyDaysAgo
        );
        break;
      case 'new':
        filtered = filtered.filter(c => 
          c.firstVisitDate && new Date(c.firstVisitDate) >= thirtyDaysAgo
        );
        break;
      case 'inactive':
        filtered = filtered.filter(c => 
          !c.lastVisitDate || new Date(c.lastVisitDate) < ninetyDaysAgo
        );
        break;
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, activeFilter, customers]);

  useEffect(() => {
    filterCustomers();
  }, [filterCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (customer: SalonCustomer) => {
    if (!customer.lastVisitDate) return theme.colors.gray400;
    const daysSince = customer.daysSinceLastVisit || 0;
    if (daysSince <= 30) return theme.colors.success;
    if (daysSince <= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, dynamicStyles.card]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, dynamicStyles.text]}>{value}</Text>
      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>{title}</Text>
    </View>
  );

  const renderFilterChip = (filter: 'all' | 'active' | 'new' | 'inactive', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        activeFilter === filter && styles.filterChipActive,
        activeFilter !== filter && { borderColor: isDark ? theme.colors.gray600 : theme.colors.gray300 },
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterChipText,
          activeFilter === filter 
            ? styles.filterChipTextActive 
            : dynamicStyles.text,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCustomerCard = (customer: SalonCustomer) => (
    <TouchableOpacity
      key={customer.id}
      style={[styles.customerCard, dynamicStyles.card]}
      onPress={() => navigation.navigate('CustomerDetail', { 
        customerId: customer.customerId,
        salonId: salonId,
        customer 
      })}
      activeOpacity={0.7}
    >
      <View style={styles.customerCardContent}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
            {getInitials(customer.customer?.fullName)}
          </Text>
        </View>
        
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, dynamicStyles.text]} numberOfLines={1}>
            {customer.customer?.fullName || 'Unknown Customer'}
          </Text>
          <Text style={[styles.customerContact, dynamicStyles.textSecondary]} numberOfLines={1}>
            {customer.customer?.phone || customer.customer?.email || 'No contact info'}
          </Text>
        </View>

        <View style={styles.customerStats}>
          <View style={styles.statRow}>
            <MaterialIcons name="repeat" size={14} color={dynamicStyles.textSecondary.color} />
            <Text style={[styles.statText, dynamicStyles.textSecondary]}>{customer.visitCount} visits</Text>
          </View>
          <View style={styles.statRow}>
            <MaterialIcons name="payments" size={14} color={dynamicStyles.textSecondary.color} />
            <Text style={[styles.statText, dynamicStyles.textSecondary]}>
              {formatCurrency(customer.totalSpent || 0)}
            </Text>
          </View>
        </View>

        <View style={[styles.statusDot, { backgroundColor: getStatusColor(customer) }]} />
      </View>

      {customer.tags && customer.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {customer.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {customer.tags.length > 3 && (
            <Text style={[styles.moreTagsText, dynamicStyles.textSecondary]}>
              +{customer.tags.length - 3} more
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Customer Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <Loader fullscreen message="Loading customers..." />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Analytics Stats */}
          {analytics && (
            <View style={styles.statsGrid}>
              {renderStatCard('Total', analytics.totalCustomers, 'people', theme.colors.primary)}
              {renderStatCard('Active', analytics.activeCustomers, 'check-circle', theme.colors.success)}
              {renderStatCard('New', analytics.newCustomers, 'person-add', theme.colors.warning)}
              {renderStatCard('At Risk', analytics.churnedCustomers, 'warning', theme.colors.error)}
            </View>
          )}

          {/* Search Box */}
          <View style={[styles.searchBox, dynamicStyles.searchBox]}>
            <MaterialIcons name="search" size={20} color={dynamicStyles.textSecondary.color} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.text]}
              placeholder="Search by name, phone, email..."
              placeholderTextColor={dynamicStyles.textSecondary.color}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={dynamicStyles.textSecondary.color} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContainer}
          >
            {renderFilterChip('all', 'All')}
            {renderFilterChip('active', 'Active')}
            {renderFilterChip('new', 'New')}
            {renderFilterChip('inactive', 'Inactive')}
          </ScrollView>

          {/* Customer Count */}
          <View style={styles.resultHeader}>
            <Text style={[styles.resultCount, dynamicStyles.textSecondary]}>
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
            </Text>
          </View>

          {/* Customer List */}
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={64} color={theme.colors.gray400} />
              <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Customers Found</Text>
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                {searchQuery || activeFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Customers will appear here as they make purchases or appointments'}
              </Text>
            </View>
          ) : (
            <View style={styles.customerList}>
              {filteredCustomers.map(renderCustomerCard)}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  scrollContent: {
    padding: 16,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },

  // Search Box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },

  // Filters
  filtersScroll: {
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Result Header
  resultHeader: {
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },

  // Customer List
  customerList: {
    gap: 12,
  },
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  customerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  customerContact: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  customerStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  moreTagsText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
