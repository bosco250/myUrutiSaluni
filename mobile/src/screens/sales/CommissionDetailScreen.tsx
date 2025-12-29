import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { Loader } from '../../components/common';
import { salesService, Commission } from '../../services/sales';
import { UserRole } from '../../constants/roles';
import { api } from '../../services/api';
import { exploreService } from '../../services/explore';
import CommissionPaymentModal from '../../components/CommissionPaymentModal';

interface CommissionDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      commissionId: string;
      commission?: Commission;
    };
  };
}

export default function CommissionDetailScreen({
  navigation,
  route,
}: CommissionDetailScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isEmployee = user?.role === UserRole.SALON_EMPLOYEE || user?.role === 'salon_employee';
  const { commissionId, commission: initialCommission } = route.params;

  const [loading, setLoading] = useState(!initialCommission);
  const [commission, setCommission] = useState<Commission | null>(initialCommission || null);
  const [error, setError] = useState<string | null>(null);
  const [serviceData, setServiceData] = useState<{ name: string; type: 'service' | 'product' } | null>(null);
  const [loadingServiceData, setLoadingServiceData] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

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
  };

  const loadCommissionDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all commissions and find the one with matching ID
      const allCommissions = await salesService.getCommissions({});
      const foundCommission = allCommissions.find((c) => c.id === commissionId);

      if (!foundCommission) {
        setError('Commission not found');
        return;
      }

      // Security check: If employee, verify this commission belongs to them
      if (isEmployee && user?.id) {
        const commissionEmployeeUserId = foundCommission.salonEmployee?.user?.id;
        const commissionEmployeeId = foundCommission.salonEmployee?.id;
        
        // Check if commission's employee user ID matches current user ID
        if (commissionEmployeeUserId && String(commissionEmployeeUserId) !== String(user.id)) {
          setError('Access denied: This commission does not belong to you');
          return;
        }
        
        // Additional check: verify employee record exists for current user
        if (commissionEmployeeId && !commissionEmployeeUserId) {
          // If we have employee ID but no user ID, try to verify via salon employees
          try {
            const salonsResponse = await api.get('/salons');
            const salons = Array.isArray(salonsResponse) ? salonsResponse : salonsResponse?.data || [];
            
            let found = false;
            for (const salon of salons) {
              try {
                const empResponse = await api.get(`/salons/${salon.id}/employees`);
                const employees = Array.isArray(empResponse) ? empResponse : empResponse?.data || [];
                const userEmployee = employees.find(
                  (emp: any) => emp.id === commissionEmployeeId && String(emp.userId) === String(user.id)
                );
                if (userEmployee) {
                  found = true;
                  break;
                }
              } catch {
                // Continue to next salon
              }
            }
            
            if (!found) {
              setError('Access denied: This commission does not belong to you');
              return;
            }
          } catch {
            // If verification fails, still allow access since backend already filtered
            // This is a fallback - backend should have already filtered correctly
          }
        }
      }

      setCommission(foundCommission);
      
      // Fetch service/product data if needed
      await fetchServiceOrProductData(foundCommission);
    } catch (err: any) {
      console.error('Error loading commission:', err);
      setError(err.message || 'Failed to load commission details');
    } finally {
      setLoading(false);
    }
  }, [commissionId, isEmployee, user?.id, fetchServiceOrProductData]);

  const fetchServiceOrProductData = useCallback(async (commissionData: Commission) => {
    // If we already have service/product name from saleItem, use it
    if (commissionData.saleItem?.service?.name) {
      setServiceData({ name: commissionData.saleItem.service.name, type: 'service' });
      return;
    }
    if (commissionData.saleItem?.product?.name) {
      setServiceData({ name: commissionData.saleItem.product.name, type: 'product' });
      return;
    }

    // Otherwise, fetch from metadata
    const serviceId = commissionData.metadata?.serviceId;
    const productId = commissionData.metadata?.productId;

    if (!serviceId && !productId) {
      return;
    }

    try {
      setLoadingServiceData(true);
      
      if (serviceId) {
        const service = await exploreService.getServiceById(serviceId);
        setServiceData({ name: service.name, type: 'service' });
      } else if (productId) {
        const product = await api.get(`/inventory/products/${productId}`);
        const productData = product?.data || product;
        setServiceData({ name: productData?.name || 'Product', type: 'product' });
      }
    } catch (err: any) {
      console.error('Error fetching service/product:', err);
      // Don't set error, just leave serviceData as null
    } finally {
      setLoadingServiceData(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCommission) {
      loadCommissionDetails();
    } else {
      // Security check for initial commission
      if (isEmployee && user?.id) {
        const commissionEmployeeUserId = initialCommission.salonEmployee?.user?.id;
        if (commissionEmployeeUserId && String(commissionEmployeeUserId) !== String(user.id)) {
          setError('Access denied: This commission does not belong to you');
        } else {
          setCommission(initialCommission);
          fetchServiceOrProductData(initialCommission);
        }
      } else {
        setCommission(initialCommission);
        fetchServiceOrProductData(initialCommission);
      }
    }
  }, [initialCommission, isEmployee, user?.id, loadCommissionDetails, fetchServiceOrProductData]);

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

  const formatCurrency = (amount: number) => {
    return `RWF ${Number(amount).toLocaleString()}`;
  };

  const handleViewSource = () => {
    if (!commission) return;

    const source = commission.metadata?.source;
    const saleId = commission.metadata?.saleId;
    const appointmentId = commission.metadata?.appointmentId;

    if (source === 'sale' && saleId) {
      navigation.navigate('SaleDetail', { saleId });
    } else if (source === 'appointment' && appointmentId) {
      navigation.navigate('AppointmentDetail', { appointmentId });
    } else {
      Alert.alert('Information', 'Source details not available for this commission');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading commission details..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, dynamicStyles.card]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Commission Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={56} color={theme.colors.error} />
          <Text style={[styles.errorTitle, dynamicStyles.text]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadCommissionDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!commission) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, dynamicStyles.card]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Commission Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="info-outline" size={56} color={dynamicStyles.textSecondary.color} />
          <Text style={[styles.errorTitle, dynamicStyles.text]}>Commission not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const source = commission.metadata?.source || 'unknown';
  const isFromSale = source === 'sale';
  const isFromAppointment = source === 'appointment';

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.card]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Commission Details</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
            {formatDate(commission.createdAt)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={[styles.statusCard, dynamicStyles.card]}>
          <View style={[styles.statusBadge, {
            backgroundColor: commission.paid
              ? (isDark ? `${theme.colors.success}20` : '#E8F5E9')
              : (isDark ? `${theme.colors.warning}20` : '#FFF3E0'),
          }]}>
            <MaterialIcons
              name={commission.paid ? 'check-circle' : 'pending'}
              size={20}
              color={commission.paid ? theme.colors.success : theme.colors.warning}
            />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusLabel, dynamicStyles.textSecondary]}>Status</Text>
            <Text style={[styles.statusValue, {
              color: commission.paid ? theme.colors.success : theme.colors.warning,
            }]}>
              {commission.paid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={[styles.amountCard, dynamicStyles.card]}>
          <Text style={[styles.amountLabel, dynamicStyles.textSecondary]}>Commission Amount</Text>
          <Text style={[styles.amountValue, { color: theme.colors.primary }]}>
            {formatCurrency(commission.amount)}
          </Text>
          <View style={styles.amountBreakdown}>
            <Text style={[styles.breakdownText, dynamicStyles.textSecondary]}>
              {commission.commissionRate}% of {formatCurrency(commission.saleAmount)}
            </Text>
          </View>
        </View>

        {/* Source Information */}
        <View style={[styles.section, dynamicStyles.card]}>
          <View style={styles.sectionHeader}>
              <MaterialIcons
                name={isFromSale ? 'shopping-cart' : isFromAppointment ? 'event' : 'info'}
                size={18}
                color={theme.colors.primary}
              />
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Source</Text>
          </View>
          <View style={[styles.sourceBadge, {
            backgroundColor: isFromSale
              ? (isDark ? `${theme.colors.info}20` : '#E3F2FD')
              : isFromAppointment
              ? (isDark ? `${theme.colors.success}20` : '#E8F5E9')
              : (isDark ? theme.colors.gray800 : theme.colors.gray100),
          }]}>
            <Text style={[styles.sourceBadgeText, {
              color: isFromSale
                ? (isDark ? theme.colors.info : '#2196F3')
                : isFromAppointment
                ? (isDark ? theme.colors.success : '#4CAF50')
                : dynamicStyles.textSecondary.color,
            }]}>
              {isFromSale ? 'Sale' : isFromAppointment ? 'Appointment' : 'Unknown'}
            </Text>
          </View>
          {(commission.metadata?.saleId || commission.metadata?.appointmentId) && (
            <TouchableOpacity
              style={styles.viewSourceButton}
              onPress={handleViewSource}
              activeOpacity={0.7}
            >
              <MaterialIcons name="visibility" size={16} color={theme.colors.primary} />
              <Text style={[styles.viewSourceText, { color: theme.colors.primary }]}>
                View {isFromSale ? 'Sale' : 'Appointment'} Details
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Service/Product Information */}
        {(serviceData || commission.saleItem || commission.metadata?.serviceId || commission.metadata?.productId) && (
          <View style={[styles.section, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name={
                  serviceData?.type === 'service' ||
                  commission.saleItem?.service ||
                  commission.metadata?.serviceId
                    ? 'content-cut'
                    : 'shopping-bag'
                }
                size={18}
                color={theme.colors.primary}
              />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                {serviceData?.type === 'service' ||
                commission.saleItem?.service ||
                commission.metadata?.serviceId
                  ? 'Service'
                  : 'Product'}
              </Text>
            </View>
            {loadingServiceData ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
                  Loading {serviceData?.type || 'item'} details...
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.itemName, dynamicStyles.text]}>
                  {serviceData?.name ||
                    commission.saleItem?.service?.name ||
                    commission.saleItem?.product?.name ||
                    'N/A'}
                </Text>
                <Text style={[styles.itemAmount, dynamicStyles.textSecondary]}>
                  Amount: {formatCurrency(
                    commission.saleItem?.lineTotal || commission.saleAmount || 0
                  )}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Employee Information (only for owners) */}
        {!isEmployee && commission.salonEmployee && (
          <View style={[styles.section, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={18} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Employee</Text>
            </View>
            <Text style={[styles.employeeName, dynamicStyles.text]}>
              {commission.salonEmployee.user?.fullName || 'Unknown Employee'}
            </Text>
            {commission.salonEmployee.roleTitle && (
              <Text style={[styles.employeeRole, dynamicStyles.textSecondary]}>
                {commission.salonEmployee.roleTitle}
              </Text>
            )}
          </View>
        )}

        {/* Pay Commission Button (for unpaid commissions, salon owners only) */}
        {!commission.paid && !isEmployee && (
          <View style={[styles.section, dynamicStyles.card]}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setPaymentModalVisible(true)}
            >
              <MaterialIcons name="payment" size={20} color={theme.colors.white} />
              <Text style={styles.payButtonText}>
                Pay Commission ({formatCurrency(commission.amount)})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Information */}
        {commission.paid && (
          <View style={[styles.section, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="payment" size={18} color={theme.colors.success} />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Payment Details</Text>
            </View>
            {commission.paidAt && (
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, dynamicStyles.textSecondary]}>Paid On:</Text>
                <Text style={[styles.paymentValue, dynamicStyles.text]}>
                  {formatDate(commission.paidAt)}
                </Text>
              </View>
            )}
            {commission.paymentMethod && (
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, dynamicStyles.textSecondary]}>Method:</Text>
                <Text style={[styles.paymentValue, dynamicStyles.text]}>
                  {commission.paymentMethod.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
            {commission.paymentReference && (
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, dynamicStyles.textSecondary]}>Reference:</Text>
                <Text style={[styles.paymentValue, dynamicStyles.text]}>
                  {commission.paymentReference}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Metadata (if available) - Only show non-ID fields */}
        {commission.metadata && Object.keys(commission.metadata).length > 1 && (
          <View style={[styles.section, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info" size={18} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Additional Information</Text>
            </View>
            {Object.entries(commission.metadata)
              .filter(([key]) => {
                // Filter out all ID fields and source
                const lowerKey = key.toLowerCase();
                return (
                  key !== 'source' &&
                  !lowerKey.endsWith('id') &&
                  !lowerKey.endsWith('_id') &&
                  key !== 'saleId' &&
                  key !== 'appointmentId' &&
                  key !== 'serviceId' &&
                  key !== 'productId' &&
                  key !== 'employeeId' &&
                  key !== 'salonEmployeeId'
                );
              })
              .map(([key, value]) => {
                // Format key for display
                const displayKey = key
                  .charAt(0)
                  .toUpperCase() + key.slice(1)
                  .replace(/([A-Z])/g, ' $1')
                  .trim();
                
                // Format value - if it's a boolean, show Yes/No
                let displayValue = String(value);
                if (typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                }
                
                return (
                  <View key={key} style={styles.metadataRow}>
                    <Text style={[styles.metadataLabel, dynamicStyles.textSecondary]}>
                      {displayKey}:
                    </Text>
                    <Text style={[styles.metadataValue, dynamicStyles.text]}>
                      {displayValue}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Commission Payment Modal */}
      {commission && !commission.paid && !isEmployee && (
        <CommissionPaymentModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          commission={commission}
          onSuccess={() => {
            setPaymentModalVisible(false);
            loadCommissionDetails();
          }}
        />
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  amountCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  amountBreakdown: {
    marginTop: 2,
  },
  breakdownText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  section: {
    padding: theme.spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  sourceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  viewSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs / 2,
  },
  viewSourceText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  itemAmount: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  paymentLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  metadataLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  metadataValue: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: 'right',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 10,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  payButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
});

