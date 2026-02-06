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
import { SalonRequirementGuard } from '../../components/SalonRequirementGuard';

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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
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
    <SalonRequirementGuard navigation={navigation}>
      <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header (Unified Design) */}
        <View style={[styles.headerContainer, dynamicStyles.card]}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <MaterialIcons name="arrow-back" size={22} color={dynamicStyles.text.color} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, dynamicStyles.text]}>Operations</Text>
                <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>Salon Management</Text>
            </View>
            <MaterialIcons name="tune" size={22} color={theme.colors.primary} />
          </View>
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
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Service Menu</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {services.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ServiceList', { salonId })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => navigation.navigate('AddService', { salonId })}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={16} color="#FFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {services.length === 0 ? (
               <View style={[styles.emptyContainer, dynamicStyles.card]}>
                 <MaterialIcons
                   name="content-cut"
                   size={48}
                   color={dynamicStyles.textSecondary.color}
                   style={{ opacity: 0.5 }}
                 />
                 <Text style={[styles.emptyText, dynamicStyles.text]}>
                   No Services
                 </Text>
                 <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
                   Add services to your menu
                 </Text>
               </View>
             ) : (
              <View style={styles.servicesList}>
                {services.slice(0, 3).map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceCard, dynamicStyles.card]}
                    onPress={() => navigation.navigate('EditService', { salonId, service, mode: 'edit' })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceLeftContent}>
                        <View style={[styles.serviceIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                            <MaterialIcons name="content-cut" size={20} color={theme.colors.primary} />
                        </View>
                        <View style={styles.serviceTextContent}>
                            <Text style={[styles.serviceName, dynamicStyles.text]}>{service.name}</Text>
                            <View style={styles.serviceMetaRow}>
                                <MaterialIcons name="schedule" size={12} color={dynamicStyles.textSecondary.color} />
                                <Text style={[styles.serviceMetaText, dynamicStyles.textSecondary]}>{service.duration} min</Text>
                                <View style={[styles.dotSeparator, { backgroundColor: dynamicStyles.textSecondary.color }]} />
                                <Text style={[styles.serviceMetaText, dynamicStyles.textSecondary]}>{service.commission}% comm</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.serviceRightContent}>
                        <Text style={[styles.servicePrice, { color: theme.colors.primary }]}>
                            RWF {service.price.toLocaleString()}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
             )}
          </View>

          {/* Quick Actions Grid */}
           <View style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Quick Actions</Text>
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
                        <View style={[styles.quickActionIcon, { backgroundColor: isDark ? `${action.color}20` : `${action.color}10` }]}>
                            <MaterialIcons name={action.icon as any} size={22} color={action.color} />
                        </View>
                        <Text style={[styles.quickActionLabel, dynamicStyles.text]} numberOfLines={1}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Inventory Levels Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Inventory</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('StockManagement', { salonId })}
                  activeOpacity={0.7}
                >
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => navigation.navigate('AddProduct', { salonId })}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {products.length === 0 ? (
              <View style={[styles.emptyContainer, dynamicStyles.card]}>
                  <MaterialIcons
                    name="inventory-2"
                    size={40}
                    color={dynamicStyles.textSecondary.color}
                    style={{ opacity: 0.5 }}
                  />
                  <Text style={[styles.emptyText, dynamicStyles.text]}>
                    No Inventory
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => navigation.navigate('AddProduct', { salonId })}
                  >
                    <Text style={styles.emptyActionText}>Add Product</Text>
                  </TouchableOpacity>
              </View>
            ) : (
              products.slice(0, 3).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.inventoryCard,
                    dynamicStyles.card,
                    isLowStock(product.stockLevel) && { borderColor: theme.colors.error + '40', backgroundColor: theme.colors.error + '05' },
                  ]}
                  onPress={() => navigation.navigate('AddProduct', { salonId, product })}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.inventoryIcon,
                    { backgroundColor: isLowStock(product.stockLevel) ? theme.colors.error + '15' : theme.colors.primary + '10' }
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
                        ? { color: theme.colors.error, fontWeight: '600' }
                        : dynamicStyles.textSecondary
                    ]}>
                      {isLowStock(product.stockLevel) ? 'Low Stock' : 'In Stock'} • {product.stockLevel} units
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Today's Check-ins Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Review Check-ins</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SalonAppointments', { salonId })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>Calendar</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, dynamicStyles.card, { paddingVertical: 4 }]}>
              {checkIns.length === 0 ? (
                 <View style={{ padding: 20, alignItems: 'center' }}>
                   <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>No check-ins today</Text>
                 </View>
              ) : (
                checkIns.map((checkIn, index) => (
                  <View
                    key={checkIn.id}
                    style={[
                      styles.checkInRow,
                      index < checkIns.length - 1 && [styles.separator, dynamicStyles.border],
                    ]}
                  >
                    <View style={styles.timeColumn}>
                        <Text style={[styles.timeText, dynamicStyles.text]}>
                            {checkIn.time.split(' ')[0]}
                        </Text>
                        <Text style={[styles.timePeriod, dynamicStyles.textSecondary]}>
                            {checkIn.time.split(' ')[1]}
                        </Text>
                    </View>
                    
                    <View style={styles.checkInInfo}>
                      <Text style={[styles.customerName, dynamicStyles.text]}>{checkIn.customerName}</Text>
                      <Text style={[styles.checkInService, dynamicStyles.textSecondary]} numberOfLines={1}>
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
    </SalonRequirementGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  scrollContent: {
    paddingHorizontal: 16, // Matching list screens
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    letterSpacing: -0.3,
  },
  actionIconBtn: {
      padding: 4,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  viewAllText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  
  // Cards
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  
  // Service List
  servicesList: {
    gap: 8,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  serviceLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
  },
  serviceIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
  },
  serviceTextContent: {
      flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  serviceMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  serviceMetaText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  dotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      opacity: 0.5,
  },
  serviceRightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  servicePrice: {
    fontSize: 13,
    fontFamily: theme.fonts.semibold,
  },
  
  // Empty States
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyActionBtn: {
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 8,
  },
  emptyActionText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
  },

  // Inventory
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  inventoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  inventoryStock: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },

  // Check-ins
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  timeText: {
    fontSize: 13,
    fontFamily: theme.fonts.semibold,
  },
  timePeriod: {
    fontSize: 10,
    marginTop: 2,
  },
  checkInInfo: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  checkInService: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkInStatus: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    textTransform: 'uppercase',
  },
  separator: {
    borderBottomWidth: 1,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCard: {
    width: '31%', 
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
});
