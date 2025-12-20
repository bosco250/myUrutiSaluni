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
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salesService, Commission } from '../../services/sales';
import { UserRole } from '../../constants/roles';

interface CommissionsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function CommissionsScreen({ navigation }: CommissionsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isEmployee = user?.role === UserRole.SALON_EMPLOYEE || user?.role === 'salon_employee';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

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
  };

  const loadData = useCallback(async () => {
    try {
      const options: { paid?: boolean } = {};
      if (statusFilter === 'paid') options.paid = true;
      if (statusFilter === 'unpaid') options.paid = false;

      const data = await salesService.getCommissions(options);
      setCommissions(data);
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMarkPaid = async (commission: Commission) => {
    Alert.alert(
      'Mark as Paid',
      `Mark commission of RWF ${Number(commission.amount).toLocaleString()} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setMarkingPaid(commission.id);
            try {
              await salesService.markCommissionPaid(commission.id, 'cash');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark as paid');
            } finally {
              setMarkingPaid(null);
            }
          },
        },
      ]
    );
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const paid = commissions.filter((c) => c.paid).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const unpaid = total - paid;
    const unpaidCount = commissions.filter((c) => !c.paid).length;

    return { total, paid, unpaid, unpaidCount };
  }, [commissions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Commissions</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            {isEmployee ? 'Your earnings' : 'Track employee earnings'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="account-balance-wallet" size={20} color={theme.colors.primary} />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            RWF {Math.round(stats.total).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Total</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            RWF {Math.round(stats.paid).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Paid</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="pending" size={20} color={theme.colors.warning} />
          <Text style={[styles.statValue, { color: theme.colors.warning }]}>
            RWF {Math.round(stats.unpaid).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Unpaid ({stats.unpaidCount})
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { id: 'all', label: 'All' },
          { id: 'unpaid', label: 'Unpaid' },
          { id: 'paid', label: 'Paid' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              statusFilter === filter.id
                ? { backgroundColor: theme.colors.primary }
                : { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 },
            ]}
            onPress={() => setStatusFilter(filter.id as any)}
          >
            <Text
              style={[
                styles.filterText,
                { color: statusFilter === filter.id ? theme.colors.white : dynamicStyles.text.color },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Commissions List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {commissions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="payments" size={64} color={dynamicStyles.textSecondary.color} />
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No commissions found</Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              Commissions will appear when sales are made
            </Text>
          </View>
        ) : (
          commissions.map((commission) => (
            <TouchableOpacity
              key={commission.id}
              style={[styles.commissionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('CommissionDetail', { commissionId: commission.id, commission })}
              activeOpacity={0.7}
            >
              <View style={styles.commissionHeader}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: commission.paid
                        ? theme.colors.success + '15'
                        : theme.colors.warning + '15',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={commission.paid ? 'check-circle' : 'pending'}
                    size={18}
                    color={commission.paid ? theme.colors.success : theme.colors.warning}
                  />
                </View>
                <View style={styles.commissionInfo}>
                  {!isEmployee && (
                    <Text style={[styles.employeeName, dynamicStyles.text]}>
                      {commission.salonEmployee?.user?.fullName || 'Employee'}
                    </Text>
                  )}
                  <Text style={[styles.commissionDate, dynamicStyles.textSecondary]}>
                    {formatDate(commission.createdAt)}
                  </Text>
                  {commission.metadata?.source && (
                    <View style={[styles.sourceBadge, {
                      backgroundColor: commission.metadata.source === 'sale' 
                        ? (isDark ? `${theme.colors.info}20` : '#E3F2FD')
                        : (isDark ? `${theme.colors.success}20` : '#E8F5E9')
                    }]}>
                      <Text style={[styles.sourceBadgeText, {
                        color: commission.metadata.source === 'sale' 
                          ? (isDark ? theme.colors.info : '#2196F3')
                          : (isDark ? theme.colors.success : '#4CAF50')
                      }]}>
                        {commission.metadata.source === 'sale' ? 'Sale' : 'Appointment'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={[styles.commissionAmount, { color: theme.colors.primary }]}>
                    RWF {Number(commission.amount).toLocaleString()}
                  </Text>
                  <Text style={[styles.commissionRate, dynamicStyles.textSecondary]}>
                    {Number(commission.commissionRate || 0)}% of RWF {Number(commission.saleAmount || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              {commission.saleItem && (
                <View style={styles.serviceRow}>
                  <MaterialIcons
                    name={commission.saleItem.service ? 'content-cut' : 'shopping-bag'}
                    size={14}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.serviceName, dynamicStyles.textSecondary]}>
                    {commission.saleItem.service?.name || commission.saleItem.product?.name || 'Item'}
                  </Text>
                </View>
              )}

              {!commission.paid && !isEmployee && (
                <TouchableOpacity
                  style={[styles.markPaidButton, { backgroundColor: theme.colors.success }]}
                  onPress={() => handleMarkPaid(commission)}
                  disabled={markingPaid === commission.id}
                >
                  {markingPaid === commission.id ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={16} color={theme.colors.white} />
                      <Text style={styles.markPaidText}>Mark as Paid</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {commission.paid && commission.paidAt && (
                <Text style={[styles.paidDate, dynamicStyles.textSecondary]}>
                  Paid on {formatDate(commission.paidAt)}
                </Text>
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
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  list: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  listContent: {
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
  commissionCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commissionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  commissionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  commissionRate: {
    fontSize: 10,
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 6,
  },
  serviceName: {
    fontSize: 12,
    flex: 1,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    marginTop: theme.spacing.md,
    gap: 6,
  },
  markPaidText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  paidDate: {
    fontSize: 11,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sourceBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
});
