import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService, SalonProduct, StockMovement } from '../../services/salon';
import { Button, Input, Loader } from '../../components';
import { EmployeePermissionGate } from '../../components/permissions/EmployeePermissionGate';
import { EmployeePermission } from '../../constants/employeePermissions';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';

interface StockManagementScreenProps {
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

type TabType = 'levels' | 'history';

export default function StockManagementScreen({ navigation, route }: StockManagementScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [currentSalonId, setCurrentSalonId] = useState<string | undefined>(route?.params?.salonId);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | undefined>(undefined);

  // Load employee ID for permission checks
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
        try {
          const employees = await salonService.getEmployeeRecordsByUserId(String(user.id));
          if (employees && employees.length > 0) {
            setCurrentSalonId(employees[0].salonId);
            setCurrentEmployeeId(employees[0].id);
          }
        } catch (error) {
          console.error('Error loading employee data:', error);
        }
      }
    };
    loadEmployeeData();
  }, [user?.id, user?.role]);

  useEmployeePermissionCheck({
    salonId: currentSalonId,
    employeeId: currentEmployeeId,
    autoFetch: false,
  });

  const [salonId, setSalonId] = useState<string | null>(route?.params?.salonId || null);
  const [activeTab, setActiveTab] = useState<TabType>('levels');
  const [products, setProducts] = useState<SalonProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SalonProduct | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'purchase' | 'consumption' | 'adjustment'>('adjustment');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
    modalContent: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
    },
  };

  const loadData = useCallback(async () => {
    try {
      let salonIdToUse = salonId;

      // If no salonId provided, get salon from user
      if (!salonIdToUse && user?.id) {
        if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
          // For employees, use salonId from employee record
          if (currentSalonId) {
            salonIdToUse = currentSalonId;
            setSalonId(currentSalonId);
          }
        } else {
          // For owners, get salon by owner ID
          const salon = await salonService.getSalonByOwnerId(String(user.id));
          if (salon?.id) {
            salonIdToUse = salon.id;
            setSalonId(salon.id);
          }
        }
      }

      if (!salonIdToUse) {
        console.log('No salon ID available');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [productsData, movementsData] = await Promise.all([
        salonService.getProducts(salonIdToUse).catch(() => []),
        salonService.getStockMovements(salonIdToUse).catch(() => []),
      ]);
      setProducts(productsData);
      setMovements(movementsData);
    } catch (error) {
      console.error('Error loading stock data:', error);
      Alert.alert('Error', 'Failed to load stock data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, user?.id, user?.role, currentSalonId]);

  useEffect(() => {
    // For employees, wait for salon ID to be loaded; for owners, load immediately
    if (user?.role === 'salon_employee' || user?.role === 'SALON_EMPLOYEE') {
      if (currentSalonId) {
        loadData();
      }
    } else if (user?.id) {
      loadData();
    }
  }, [loadData, user?.id, user?.role, currentSalonId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openAdjustmentModal = (product: SalonProduct, type: 'purchase' | 'consumption' | 'adjustment') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setAdjustmentQty('');
    setAdjustmentNotes('');
    setAdjustmentModalVisible(true);
  };

  const handleAdjustmentSubmit = async () => {
    if (!selectedProduct || !adjustmentQty || !salonId) return;
    
    setActionLoading(true);
    try {
      await salonService.addStockMovement({
        salonId,
        productId: selectedProduct.id,
        movementType: adjustmentType,
        quantity: parseFloat(adjustmentQty),
        notes: adjustmentNotes,
      });
      
      Alert.alert('Success', 'Stock adjusted successfully');
      setAdjustmentModalVisible(false);
      loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to adjust stock');
    } finally {
      setActionLoading(false);
    }
  };

  // Render product card
  const renderProductCard = (product: SalonProduct) => {
    const isLowStock = product.isInventoryItem && product.stockLevel <= 5;
    const isOutOfStock = product.isInventoryItem && product.stockLevel === 0;
    const stockColor = isOutOfStock
      ? theme.colors.error
      : isLowStock
        ? theme.colors.warning
        : theme.colors.success;

    return (
      <TouchableOpacity
        style={[styles.productCard, dynamicStyles.card]}
        onPress={() => navigation.navigate('ProductDetail', { productId: product.id, salonId })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, dynamicStyles.text]}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            <Text
              style={[styles.productSKU, dynamicStyles.textSecondary]}
              numberOfLines={1}
            >
              SKU: {product.sku || 'N/A'}
            </Text>
          </View>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: product.isInventoryItem
                  ? stockColor + '20'
                  : theme.colors.primary + '20',
              },
            ]}
          >
            <MaterialIcons
              name={
                isOutOfStock
                  ? 'error-outline'
                  : isLowStock
                    ? 'warning'
                    : product.isInventoryItem
                      ? 'check-circle'
                      : 'all-inclusive'
              }
              size={16}
              color={product.isInventoryItem ? stockColor : theme.colors.primary}
            />
            <Text
              style={[
                styles.stockBadgeText,
                {
                  color: product.isInventoryItem ? stockColor : theme.colors.primary,
                },
              ]}
            >
              {product.isInventoryItem ? product.stockLevel : '∞'}
            </Text>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons
              name="payments"
              size={16}
              color={dynamicStyles.textSecondary.color}
            />
            <Text style={[styles.detailText, dynamicStyles.text]}>
              {product.unitPrice ? `RWF ${Number(product.unitPrice).toLocaleString()}` : 'N/A'}
            </Text>
          </View>

          {isLowStock && product.isInventoryItem && (
            <View style={[styles.warningBadge, { backgroundColor: stockColor + '15' }]}>
              <MaterialIcons name="warning" size={14} color={stockColor} />
              <Text style={[styles.warningText, { color: stockColor }]}>
                Low stock
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {product.isInventoryItem && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.actionButtonLarge,
                { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '30' },
              ]}
              onPress={() => openAdjustmentModal(product, 'consumption')}
            >
              <MaterialIcons name="remove" size={20} color={theme.colors.error} />
              <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                Remove
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButtonLarge,
                { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success + '30' },
              ]}
              onPress={() => openAdjustmentModal(product, 'purchase')}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.success} />
              <Text style={[styles.actionButtonText, { color: theme.colors.success }]}>
                Add Stock
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStockLevels = () => {
    // Empty state when no products
    if (products.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="inventory-2"
            size={64}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyTitle, dynamicStyles.text]}>
            No Products Yet
          </Text>
          <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
            Add your first product to start managing inventory
          </Text>
          <TouchableOpacity
            style={[styles.addProductButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('AddProduct', { salonId })}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.white} />
            <Text style={styles.addProductButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.productList}>
        {products.map((product) => (
          <React.Fragment key={product.id}>
            {renderProductCard(product)}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderHistory = () => (
    <View style={styles.tabContent}>
      {movements.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>No history yet</Text>
        </View>
      ) : (
        movements.map((move) => (
          <View key={move.id} style={[styles.historyCard, dynamicStyles.card]}>
            <View style={styles.historyIconContainer}>
               <MaterialIcons 
                 name={move.movementType === 'purchase' ? 'add-circle' : move.movementType === 'consumption' ? 'remove-circle' : 'swap-horiz'} 
                 size={24} 
                 color={move.movementType === 'purchase' ? theme.colors.success : move.movementType === 'consumption' ? theme.colors.error : theme.colors.warning} 
               />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyTitle, dynamicStyles.text]}>
                {move.product?.name || 'Unknown Product'}
              </Text>
              <Text style={[styles.historySubtitle, dynamicStyles.textSecondary]}>
                {new Date(move.createdAt).toLocaleDateString()} at {new Date(move.createdAt).toLocaleTimeString()}
              </Text>
              {move.notes && (
                <Text style={[styles.historyNotes, dynamicStyles.textSecondary]}>{move.notes}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[
                styles.historyQty, 
                { color: move.movementType === 'purchase' ? theme.colors.success : theme.colors.error }
              ]}>
                {move.movementType === 'purchase' || move.movementType === 'return' ? '+' : '-'}{move.quantity}
              </Text>
              <Text style={[styles.historyType, dynamicStyles.textSecondary]}>{move.movementType}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={['top']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading stock data..." />
      </SafeAreaView>
    );
  }

  return (
    <EmployeePermissionGate
      requiredPermission={EmployeePermission.MANAGE_INVENTORY}
      salonId={currentSalonId}
      employeeId={currentEmployeeId}
      showUnauthorizedMessage={true}
    >
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={['top']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>
              Stock Management
            </Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
              {products.length} product{products.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduct', { salonId })}
          >
            <MaterialIcons
              name="add"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons
              name="inventory-2"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.statValue, dynamicStyles.text]}>
              {products.length}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
              Total Products
            </Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons
              name="warning"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {products.filter((p) => p.isInventoryItem && p.stockLevel <= 5 && p.stockLevel > 0).length}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
              Low Stock
            </Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.card]}>
            <MaterialIcons
              name="error-outline"
              size={20}
              color={theme.colors.error}
            />
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {products.filter((p) => p.isInventoryItem && p.stockLevel === 0).length}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
              Out of Stock
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'levels' && styles.activeTab]}
            onPress={() => setActiveTab('levels')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'levels' && styles.activeTabText,
              ]}
            >
              Stock Levels
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'history' && styles.activeTabText,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
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
          {activeTab === 'levels' ? renderStockLevels() : renderHistory()}
        </ScrollView>

      {/* Adjustment Modal */}
      <Modal
        visible={adjustmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjustmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>
              {adjustmentType === 'purchase' ? 'Add Stock' : adjustmentType === 'consumption' ? 'Reduce Stock' : 'Adjust Stock'}
            </Text>
            <Text style={[styles.modalSubtitle, dynamicStyles.textSecondary]}>
              {selectedProduct?.name} (Current: {selectedProduct?.stockLevel})
            </Text>

            <Input 
              label="Quantity"
              value={adjustmentQty}
              onChangeText={setAdjustmentQty}
              keyboardType="numeric"
              placeholder="0"
            />
            
            <Input 
              label="Notes (Optional)"
              value={adjustmentNotes}
              onChangeText={setAdjustmentNotes}
              placeholder="Reason for adjustment..."
            />

            <View style={styles.modalActions}>
              <Button 
                title="Cancel" 
                variant="outline" 
                onPress={() => setAdjustmentModalVisible(false)} 
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button 
                title={actionLoading ? 'Saving...' : 'Confirm'} 
                onPress={handleAdjustmentSubmit} 
                disabled={actionLoading}
                loading={actionLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </EmployeePermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    paddingVertical: 10,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  tabContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  productList: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
  },
  productCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 3,
  },
  productSKU: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    gap: 3,
  },
  warningText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  // History Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    fontFamily: theme.fonts.bold,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 40,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 16,
  },
  addProductButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  historyCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  historyIconContainer: {
    marginRight: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySubtitle: {
    fontSize: 11,
  },
  historyNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
  historyQty: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyType: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
