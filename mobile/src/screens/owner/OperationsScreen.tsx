import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService, SalonProduct } from '../../services/salon';
import { Loader } from '../../components/common';

interface OperationsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

// Mock data for services (replace with real API data)
interface ServiceItem {
  id: string;
  name: string;
  duration: number; // in minutes
  commission: number; // percentage
  price: number;
}

// Mock data for check-ins
interface CheckInItem {
  id: string;
  time: string;
  customerName: string;
  service: string;
  status: 'checked_in' | 'in_progress' | 'completed' | 'no_show';
}

export default function OperationsScreen({ navigation }: OperationsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<SalonProduct[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);

  // Dynamic styles for dark/light mode (matching AddProductScreen)
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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    divider: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    // Button with primary color
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    outlineButtonBorder: {
      borderColor: isDark ? theme.colors.gray600 : theme.colors.border,
    },
    outlineButtonText: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
  };

  const loadData = useCallback(async () => {
    try {
      if (!user?.id) return;

      // Get salon for this owner
      const salon = await salonService.getSalonByOwnerId(String(user.id));
      if (salon?.id) {
        setSalonId(salon.id);

        // Load products/inventory from API
        const productsData = await salonService.getProducts(salon.id).catch(() => []);
        setProducts(productsData);

        // Load services from API
        const servicesData = await salonService.getServices(salon.id).catch(() => []);
        const mappedServices = servicesData.map((service: any) => ({
          id: service.id,
          name: service.name,
          duration: service.duration || service.durationMinutes || 30,
          commission: service.commissionRate || 0,
          price: service.price || service.basePrice || 0,
        }));
        setServices(mappedServices);

        // Load today's appointments from API
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const appointmentsData = await salonService.getSalonAppointments(
          salon.id,
          undefined, // all statuses
          todayStr,
          todayStr
        ).catch(() => []);

        // Map appointments to check-ins format
        const mappedCheckIns = appointmentsData.map((apt: any) => {
          const aptTime = new Date(apt.scheduledStart);
          const hours = aptTime.getHours();
          const minutes = aptTime.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          const timeStr = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          
          // Map appointment status to check-in status
          let status: 'checked_in' | 'in_progress' | 'completed' | 'no_show' = 'checked_in';
          if (apt.status === 'in_progress') status = 'in_progress';
          else if (apt.status === 'completed') status = 'completed';
          else if (apt.status === 'no_show' || apt.status === 'cancelled') status = 'no_show';
          else if (apt.status === 'confirmed' || apt.status === 'pending') status = 'checked_in';

          return {
            id: apt.id,
            time: timeStr,
            customerName: apt.customer?.fullName || apt.customerName || 'Customer',
            service: apt.service?.name || apt.serviceName || 'Service',
            status,
          };
        });
        setCheckIns(mappedCheckIns);
      }
    } catch (error) {
      console.error('Error loading operations data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: CheckInItem['status']) => {
    switch (status) {
      case 'checked_in':
        return theme.colors.success;
      case 'in_progress':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.textSecondary;
      case 'no_show':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: CheckInItem['status']) => {
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const isLowStock = (stockLevel: number) => stockLevel <= 5;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <Loader fullscreen message="Loading operations..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { borderBottomColor: dynamicStyles.header.borderBottomColor }]}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Operations Management</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Service Menu Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service Menu</Text>
            <TouchableOpacity
              style={[styles.addButton, dynamicStyles.primaryButton]}
              onPress={() => navigation.navigate('AddService', { salonId })}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={16} color={theme.colors.white} />
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, dynamicStyles.card]}>
            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No services added yet
                </Text>
              </View>
            ) : (
              services.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceRow,
                    index < services.length - 1 && [styles.serviceRowBorder, { borderBottomColor: dynamicStyles.divider.backgroundColor }],
                  ]}
                  onPress={() => navigation.navigate('EditService', { salonId, serviceId: service.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, dynamicStyles.text]}>{service.name}</Text>
                    <Text style={[styles.serviceDetails, dynamicStyles.textSecondary]}>
                      {service.duration} min • Commission: {service.commission}%
                    </Text>
                  </View>
                  <Text style={[styles.servicePrice, dynamicStyles.text]}>RWF {service.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Inventory Levels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Inventory Levels</Text>
            <TouchableOpacity
              style={[styles.outlineButton, dynamicStyles.outlineButtonBorder]}
              onPress={() => navigation.navigate('StockManagement', { salonId })}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineButtonText, dynamicStyles.outlineButtonText]}>Purchase Order</Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={[styles.card, dynamicStyles.card, styles.emptyState]}>
              <MaterialIcons name="inventory-2" size={32} color={dynamicStyles.textSecondary.color} />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary, { marginTop: 10 }]}>
                No inventory items
              </Text>
              <TouchableOpacity
                style={[styles.addProductButton, { marginTop: 16 }]}
                onPress={() => navigation.navigate('AddProduct', { salonId })}
              >
                <Text style={styles.addProductButtonText}>+ Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            products.slice(0, 3).map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.inventoryCard,
                  dynamicStyles.card,
                  isLowStock(product.stockLevel) && styles.lowStockCard,
                ]}
                onPress={() => navigation.navigate('AddProduct', { salonId, product })}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.inventoryIcon,
                  { backgroundColor: isLowStock(product.stockLevel) ? theme.colors.error + '20' : theme.colors.primary + '15' }
                ]}>
                  <MaterialIcons
                    name="inventory-2"
                    size={18}
                    color={isLowStock(product.stockLevel) ? theme.colors.error : theme.colors.primary}
                  />
                </View>
                <View style={styles.inventoryInfo}>
                  <Text style={[styles.inventoryName, dynamicStyles.text]}>{product.name}</Text>
                  <Text style={[
                    styles.inventoryStock,
                    isLowStock(product.stockLevel)
                      ? { color: theme.colors.error }
                      : dynamicStyles.textSecondary
                  ]}>
                    {isLowStock(product.stockLevel)
                      ? `Low Stock: ${product.stockLevel} units left`
                      : `Stock: ${product.stockLevel} units`
                    }
                  </Text>
                </View>
                {isLowStock(product.stockLevel) && (
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => navigation.navigate('StockManagement', { salonId })}
                  >
                    <Text style={styles.orderButtonText}>Order</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}

          {products.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllLink}
              onPress={() => navigation.navigate('StockManagement', { salonId })}
            >
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View all {products.length} items
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Check-ins Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Today's Check-ins</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SalonAppointments', { salonId })}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, dynamicStyles.card]}>
            {checkIns.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-available" size={32} color={dynamicStyles.textSecondary.color} />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary, { marginTop: 10 }]}>
                  No check-ins today
                </Text>
              </View>
            ) : (
              checkIns.map((checkIn, index) => (
                <View
                  key={checkIn.id}
                  style={[
                    styles.checkInRow,
                    index < checkIns.length - 1 && [styles.serviceRowBorder, { borderBottomColor: dynamicStyles.divider.backgroundColor }],
                  ]}
                >
                  <View style={styles.checkInTime}>
                    <Text style={[styles.timeText, dynamicStyles.text]}>
                      {checkIn.time.split(' ')[0]}
                    </Text>
                    <Text style={[styles.timePeriod, dynamicStyles.textSecondary]}>
                      {checkIn.time.split(' ')[1]}
                    </Text>
                  </View>
                  <View style={styles.checkInInfo}>
                    <Text style={[styles.customerName, dynamicStyles.text]}>{checkIn.customerName}</Text>
                    <Text style={[styles.checkInService, dynamicStyles.textSecondary]}>
                      {checkIn.service}
                    </Text>
                  </View>
                  <Text style={[styles.checkInStatus, { color: getStatusColor(checkIn.status) }]}>
                    {getStatusLabel(checkIn.status)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('SalonList')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialIcons name="store" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>My Salons</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('StaffManagement', { salonId })}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.info + '15' }]}>
                <MaterialIcons name="people" size={20} color={theme.colors.info} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Staff</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('BusinessAnalytics', { salonId })}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                <MaterialIcons name="bar-chart" size={20} color={theme.colors.secondary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('Sales')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.success + '15' }]}>
                <MaterialIcons name="point-of-sale" size={20} color={theme.colors.success} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('Commissions')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialIcons name="payments" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Commissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, dynamicStyles.card]}
              onPress={() => navigation.navigate('MoreMenu')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.warning + '15' }]}>
                <MaterialIcons name="settings" size={20} color={theme.colors.warning} />
              </View>
              <Text style={[styles.quickActionLabel, dynamicStyles.text]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginLeft: 4,
  },
  outlineButton: {
    borderWidth: 1.5,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 16,
  },
  outlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  card: {
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
  },
  serviceInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  serviceDetails: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: theme.spacing.xs + 2,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  lowStockCard: {
    backgroundColor: theme.colors.error + '0C',
    borderColor: theme.colors.error + '40',
  },
  inventoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  inventoryStock: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  orderButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: 12,
  },
  orderButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs + 2,
    marginTop: theme.spacing.xs,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  checkInTime: {
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    minWidth: 44,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  timePeriod: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 1,
  },
  checkInInfo: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  checkInService: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  checkInStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
    marginHorizontal: -theme.spacing.xs / 2,
  },
  quickActionCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: theme.spacing.xs + 2,
    padding: theme.spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  addProductButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 16,
  },
  addProductButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.semibold,
  },
});
