import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salesService, Sale } from '../../services/sales';

interface SaleDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      saleId: string;
      sale?: Sale;
    };
  };
}

export default function SaleDetailScreen({ navigation, route }: SaleDetailScreenProps) {
  const { isDark } = useTheme();
  const { saleId, sale: initialSale } = route.params;

  const [loading, setLoading] = useState(!initialSale);
  const [sale, setSale] = useState<Sale | null>(initialSale || null);
  const [commissions, setCommissions] = useState<any[]>([]);

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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  const loadSaleDetails = useCallback(async () => {
    try {
      const data = await salesService.getSaleById(saleId);
      setSale(data);
      
      // If sale has commissions, use them; otherwise fetch separately
      if (data.commissions && data.commissions.length > 0) {
        setCommissions(data.commissions);
      } else {
        // Fetch commissions for this sale
        try {
          const allCommissions = await salesService.getCommissions({});
          // Filter commissions that belong to this sale's items
          setCommissions(allCommissions.filter((c: any) => c.saleItem?.saleId === saleId));
        } catch {
          // Ignore commission fetch errors
        }
      }
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadSaleDetails();
  }, [loadSaleDetails]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'card':
        return 'Credit/Debit Card';
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return 'Cash';
    }
  };

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'card':
        return 'credit-card';
      case 'mobile_money':
        return 'phone-android';
      case 'bank_transfer':
        return 'account-balance';
      default:
        return 'payments';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.info;
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

  if (!sale) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, dynamicStyles.text]}>Sale not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subtotal = Number(sale.totalAmount) / 1.18;
  const tax = Number(sale.totalAmount) - subtotal;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Sale Details</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            #{sale.id.slice(-8).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Amount Card */}
        <View style={[styles.amountCard, dynamicStyles.card]}>
          <View style={styles.amountHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(sale.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
                {(sale.status || 'completed').toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.currencyLabel, dynamicStyles.textSecondary]}>
              {sale.currency || 'RWF'}
            </Text>
          </View>
          <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
            RWF {Number(sale.totalAmount).toLocaleString()}
          </Text>
          <Text style={[styles.dateText, dynamicStyles.textSecondary]}>
            {formatDate(sale.createdAt)}
          </Text>
        </View>

        {/* Payment Info */}
        <View style={[styles.section, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Payment</Text>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.colors.success + '15' }]}>
              <MaterialIcons
                name={getPaymentIcon(sale.paymentMethod) as any}
                size={20}
                color={theme.colors.success}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>Method</Text>
              <Text style={[styles.infoValue, dynamicStyles.text]}>
                {getPaymentMethodLabel(sale.paymentMethod)}
              </Text>
            </View>
          </View>
          {sale.paymentReference && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.info + '15' }]}>
                <MaterialIcons name="receipt" size={20} color={theme.colors.info} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>Reference</Text>
                <Text style={[styles.infoValue, dynamicStyles.text]}>
                  {sale.paymentReference}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Info */}
        {sale.customer && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Customer</Text>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialIcons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, dynamicStyles.text]}>
                  {sale.customer.fullName}
                </Text>
                {sale.customer.phone && (
                  <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                    {sale.customer.phone}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Salon Info */}
        {sale.salon && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Salon</Text>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                <MaterialIcons name="store" size={20} color={theme.colors.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, dynamicStyles.text]}>{sale.salon.name}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Items */}
        {sale.items && sale.items.length > 0 && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Items ({sale.items.length})
            </Text>
            {sale.items.map((item: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.itemRow,
                  index < sale.items!.length - 1 && styles.itemBorder,
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: theme.colors.info + '15' }]}>
                  <MaterialIcons
                    name={item.serviceId ? 'content-cut' : 'shopping-bag'}
                    size={18}
                    color={theme.colors.info}
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, dynamicStyles.text]}>
                    {item.service?.name || item.product?.name || item.name || 'Item'}
                  </Text>
                  <Text style={[styles.itemMeta, dynamicStyles.textSecondary]}>
                    {item.quantity} × RWF {Number(item.unitPrice || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: theme.colors.primary }]}>
                  RWF {Number(item.lineTotal || item.unitPrice * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Commissions */}
        {commissions.length > 0 && (
          <View style={[styles.section, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Commissions ({commissions.length})
            </Text>
            {commissions.map((commission: any, index: number) => (
              <View
                key={commission.id}
                style={[
                  styles.itemRow,
                  index < commissions.length - 1 && styles.itemBorder,
                ]}
              >
                <View style={[styles.infoIcon, { backgroundColor: commission.paid ? theme.colors.success + '15' : theme.colors.warning + '15' }]}>
                  <MaterialIcons
                    name={commission.paid ? 'check-circle' : 'pending'}
                    size={18}
                    color={commission.paid ? theme.colors.success : theme.colors.warning}
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, dynamicStyles.text]}>
                    {commission.salonEmployee?.user?.fullName || 'Employee'}
                  </Text>
                  <Text style={[styles.itemMeta, dynamicStyles.textSecondary]}>
                    {commission.commissionRate}% commission • {commission.paid ? 'Paid' : 'Unpaid'}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: commission.paid ? theme.colors.success : theme.colors.warning }]}>
                  RWF {Number(commission.amount).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.section, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={dynamicStyles.textSecondary}>Subtotal</Text>
            <Text style={dynamicStyles.text}>RWF {Math.round(subtotal).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={dynamicStyles.textSecondary}>Tax (18%)</Text>
            <Text style={dynamicStyles.text}>RWF {Math.round(tax).toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.summaryTotal, dynamicStyles.text]}>Total</Text>
            <Text style={[styles.summaryTotalValue, { color: theme.colors.primary }]}>
              RWF {Number(sale.totalAmount).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Additional Info */}
        <View style={[styles.section, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Info</Text>
          <View style={styles.detailRow}>
            <Text style={dynamicStyles.textSecondary}>Sale ID</Text>
            <Text style={[styles.detailValue, dynamicStyles.text]}>{sale.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={dynamicStyles.textSecondary}>Created</Text>
            <Text style={dynamicStyles.text}>{formatDate(sale.createdAt)}</Text>
          </View>
          {sale.updatedAt && sale.updatedAt !== sale.createdAt && (
            <View style={styles.detailRow}>
              <Text style={dynamicStyles.textSecondary}>Updated</Text>
              <Text style={dynamicStyles.text}>{formatDate(sale.updatedAt)}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
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
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
  },
  backBtn: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'android' ? 45 : 55,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  amountCard: {
    padding: theme.spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  currencyLabel: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    fontSize: 13,
  },
  section: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  totalRow: {
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: 12,
    maxWidth: '60%',
    textAlign: 'right',
  },
});
