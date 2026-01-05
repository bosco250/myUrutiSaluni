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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { api } from '../../services/api';
import { Loader } from '../../components/common';

interface CustomerDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      customerId: string;
      salonId: string;
      customer?: any;
    };
  };
}

interface CustomerData {
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

interface TimelineItem {
  type: 'sale' | 'appointment';
  id: string;
  date: Date;
  title: string;
  description: string;
  data?: any;
}

export default function CustomerDetailScreen({ navigation, route }: CustomerDetailScreenProps) {
  const { customerId, salonId, customer: initialCustomer } = route.params;
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(!initialCustomer);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(initialCustomer || null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

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

  const loadData = useCallback(async () => {
    try {
      // Fetch customer details if not provided
      if (!initialCustomer) {
        const customerData = await api.get<CustomerData>(
          `/salons/${salonId}/customers/${customerId}`
        );
        setCustomer(customerData);
      }

      // Fetch timeline
      setLoadingTimeline(true);
      const timelineData = await api.get<TimelineItem[]>(
        `/salons/${salonId}/customers/${customerId}/timeline`
      ).catch(() => []);
      
      // Parse dates and sort
      const parsedTimeline = (Array.isArray(timelineData) ? timelineData : []).map(item => ({
        ...item,
        date: new Date(item.date),
      })).sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTimeline(parsedTimeline);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingTimeline(false);
    }
  }, [customerId, salonId, initialCustomer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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

  const handleCall = () => {
    if (customer?.customer?.phone) {
      Linking.openURL(`tel:${customer.customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.customer?.email) {
      Linking.openURL(`mailto:${customer.customer.email}`);
    }
  };

  const handleMessage = () => {
    if (customer?.customer?.phone) {
      Linking.openURL(`sms:${customer.customer.phone}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading customer details..." />
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, dynamicStyles.text]}>Customer not found</Text>
          <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Customer Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Profile Card */}
        <View style={[styles.profileCard, dynamicStyles.card]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {getInitials(customer.customer?.fullName)}
            </Text>
          </View>
          
          <Text style={[styles.customerName, dynamicStyles.text]}>
            {customer.customer?.fullName || 'Unknown Customer'}
          </Text>
          
          {customer.customer?.phone && (
            <Text style={[styles.customerContact, dynamicStyles.textSecondary]}>
              {customer.customer.phone}
            </Text>
          )}
          
          {customer.customer?.email && (
            <Text style={[styles.customerEmail, dynamicStyles.textSecondary]}>
              {customer.customer.email}
            </Text>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {customer.customer?.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <MaterialIcons name="call" size={22} color={theme.colors.success} />
                <Text style={[styles.actionLabel, { color: theme.colors.success }]}>Call</Text>
              </TouchableOpacity>
            )}
            {customer.customer?.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                <MaterialIcons name="sms" size={22} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Message</Text>
              </TouchableOpacity>
            )}
            {customer.customer?.email && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <MaterialIcons name="email" size={22} color={theme.colors.warning} />
                <Text style={[styles.actionLabel, { color: theme.colors.warning }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons name="repeat" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, dynamicStyles.text]}>{customer.visitCount}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Total Visits</Text>
          </View>
          
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons name="payments" size={24} color={theme.colors.success} />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {formatCurrency(customer.totalSpent || 0)}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Total Spent</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons name="trending-up" size={24} color={theme.colors.warning} />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {customer.averageOrderValue 
                ? formatCurrency(customer.averageOrderValue) 
                : '-'}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Avg. Order</Text>
          </View>
          
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons name="schedule" size={24} color={theme.colors.error} />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {customer.daysSinceLastVisit !== undefined 
                ? `${customer.daysSinceLastVisit}d` 
                : '-'}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Since Last Visit</Text>
          </View>
        </View>

        {/* Tags */}
        {customer.tags && customer.tags.length > 0 && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Tags</Text>
            <View style={styles.tagsContainer}>
              {customer.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {customer.notes && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Notes</Text>
            <Text style={[styles.notesText, dynamicStyles.textSecondary]}>{customer.notes}</Text>
          </View>
        )}

        {/* Visit Dates */}
        <View style={[styles.section, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Visit History</Text>
          <View style={styles.visitDates}>
            <View style={styles.visitDateRow}>
              <Text style={[styles.visitDateLabel, dynamicStyles.textSecondary]}>First Visit:</Text>
              <Text style={[styles.visitDateValue, dynamicStyles.text]}>
                {formatDate(customer.firstVisitDate)}
              </Text>
            </View>
            <View style={styles.visitDateRow}>
              <Text style={[styles.visitDateLabel, dynamicStyles.textSecondary]}>Last Visit:</Text>
              <Text style={[styles.visitDateValue, dynamicStyles.text]}>
                {formatDate(customer.lastVisitDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Recent Activity</Text>
          
          {loadingTimeline ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <MaterialIcons name="history" size={40} color={theme.colors.gray400} />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No activity history yet
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.slice(0, 10).map((item, index) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot}>
                    <MaterialIcons 
                      name={item.type === 'sale' ? 'receipt' : 'event'} 
                      size={16} 
                      color={item.type === 'sale' ? theme.colors.success : theme.colors.primary} 
                    />
                  </View>
                  {index < timeline.slice(0, 10).length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray300 }]} />
                  )}
                  <View style={[styles.timelineContent, dynamicStyles.card]}>
                    <Text style={[styles.timelineTitle, dynamicStyles.text]}>{item.title}</Text>
                    <Text style={[styles.timelineDesc, dynamicStyles.textSecondary]}>{item.description}</Text>
                    <Text style={[styles.timelineDate, dynamicStyles.textSecondary]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  errorText: {
    fontSize: 16,
    marginTop: 12,
    fontFamily: theme.fonts.medium,
  },
  backButtonAlt: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Profile Card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  customerContact: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    marginTop: 4,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 4,
  },

  // Section
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 12,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // Notes
  notesText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },

  // Visit Dates
  visitDates: {
    gap: 8,
  },
  visitDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitDateLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  visitDateValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },

  // Timeline
  timelineSection: {
    marginTop: 8,
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 8,
  },
  timeline: {
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: '100%',
  },
  timelineContent: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
});
