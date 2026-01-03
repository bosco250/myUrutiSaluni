import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
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
  description?: string;
  isActive?: boolean;
  metadata?: any;
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

  // Dynamic styles for premium flat design
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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    iconBg: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
    },
    border: {
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    primaryText: {
        color: theme.colors.primary,
    }
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
          description: service.description,
          isActive: service.isActive,
          metadata: service.metadata,
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
        return 'Check In';
      case 'in_progress':
        return 'Active';
      case 'completed':
        return 'Done';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const isLowStock = (stockLevel: number) => stockLevel <= 5;

  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading operations..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header (Flat) */}
        <View style={[styles.header, dynamicStyles.border]}>
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <MaterialIcons name="chevron-left" size={28} color={dynamicStyles.text.color} />
            </TouchableOpacity>
            <View>
                <Text style={[styles.headerTitle, dynamicStyles.text]}>Operations</Text>
                <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>Salon Management</Text>
            </View>
            <View style={{ width: 40 }} /> 
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Service Menu Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="content-cut" size={20} color={theme.colors.primary} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service Menu</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddService', { salonId })}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
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
                      index < services.length - 1 && [styles.serviceRowBorder, dynamicStyles.border],
                    ]}
                    onPress={() => navigation.navigate('EditService', { salonId, service, mode: 'edit' })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, dynamicStyles.text]}>{service.name}</Text>
                      <Text style={[styles.serviceDetails, dynamicStyles.textSecondary]}>
                        {service.duration} min • {service.commission}% comm
                      </Text>
                    </View>
                    <Text style={[styles.servicePrice, dynamicStyles.primaryText]}>
                        RWF {service.price.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {/* Quick Actions Grid (Flat) */}
           <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 12 }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                {[
                    { label: 'My Salons', icon: 'store', screen: 'SalonList', color: theme.colors.primary },
                    { label: 'Staff', icon: 'people', screen: 'StaffManagement', color: '#007AFF' },
                    { label: 'Reports', icon: 'bar-chart', screen: 'BusinessAnalytics', color: '#5856D6' },
                    { label: 'New Sale', icon: 'point-of-sale', screen: 'Sales', color: '#34C759' },
                    { label: 'Commissions', icon: 'payments', screen: 'Commissions', color: '#FF9500' },
                    { label: 'Settings', icon: 'settings', screen: 'MoreMenu', color: '#8E8E93' },
                ].map((action, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.quickActionCard, dynamicStyles.card]}
                        onPress={() => navigation.navigate(action.screen, { salonId })}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: isDark ? `${action.color}20` : `${action.color}15` }]}>
                            <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                        </View>
                        <Text style={[styles.quickActionLabel, dynamicStyles.text]}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Inventory Levels Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="inventory-2" size={20} color={theme.colors.primary} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Inventory</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('StockManagement', { salonId })}
                activeOpacity={0.7}
              >
                  <Text style={styles.viewAllText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {products.length === 0 ? (
              <View style={[styles.card, dynamicStyles.card, styles.emptyState]}>
                <View style={[styles.emptyIconContainer, dynamicStyles.iconBg]}>
                  <MaterialIcons name="inventory-2" size={32} color={dynamicStyles.textSecondary.color} />
                </View>
                <Text style={[styles.emptyText, dynamicStyles.textSecondary, { marginTop: 12 }]}>
                  No inventory items
                </Text>
                <TouchableOpacity
                  style={styles.addProductButton}
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
                    isLowStock(product.stockLevel) && [styles.lowStockCard, { borderColor: theme.colors.error + '60' }],
                  ]}
                  onPress={() => navigation.navigate('AddProduct', { salonId, product })}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.inventoryIcon,
                    dynamicStyles.iconBg,
                    isLowStock(product.stockLevel) && { backgroundColor: theme.colors.error + '15' }
                  ]}>
                    <MaterialIcons
                      name="inventory-2"
                      size={20}
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
                        ? `Low Stock: ${product.stockLevel} left`
                        : `${product.stockLevel} in stock`
                      }
                    </Text>
                  </View>
                  {isLowStock(product.stockLevel) && (
                    <View style={[styles.orderButton, { borderColor: theme.colors.error }]}>
                      <Text style={styles.orderButtonText}>Restock</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Today's Check-ins Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="event-available" size={20} color={theme.colors.primary} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Check-ins</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('SalonAppointments', { salonId })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>Calendar</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
              {checkIns.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconContainer, dynamicStyles.iconBg]}>
                    <MaterialIcons name="event-available" size={32} color={dynamicStyles.textSecondary.color} />
                  </View>
                  <Text style={[styles.emptyText, dynamicStyles.textSecondary, { marginTop: 12 }]}>
                    No check-ins today
                  </Text>
                </View>
              ) : (
                checkIns.map((checkIn, index) => (
                  <View
                    key={checkIn.id}
                    style={[
                      styles.checkInRow,
                      index < checkIns.length - 1 && [styles.serviceRowBorder, dynamicStyles.border],
                    ]}
                  >
                    <View style={[styles.checkInTime, dynamicStyles.iconBg]}>
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
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(checkIn.status) + '15' }]}>
                      <Text style={[styles.checkInStatus, { color: getStatusColor(checkIn.status) }]}>
                        {getStatusLabel(checkIn.status)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12, // Reduced height
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  // Service Rows
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceDetails: {
    fontSize: 13,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Inventory
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  lowStockCard: {
    backgroundColor: theme.colors.error + '0C',
    borderColor: theme.colors.error + '40',
  },
  inventoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  inventoryStock: {
    fontSize: 13,
  },
  orderButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderButtonText: {
    color: theme.colors.error,
    fontSize: 11,
    fontWeight: '700',
  },
  addProductButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addProductButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  // Check-ins
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkInTime: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 56,
    height: 48,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timePeriod: {
    fontSize: 10,
    marginTop: 1,
  },
  checkInInfo: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  checkInService: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkInStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '31%', // 3 columns approx
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 4, // subtle gap adjustment
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
