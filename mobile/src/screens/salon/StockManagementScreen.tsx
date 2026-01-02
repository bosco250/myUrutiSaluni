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

  // Render table row
  const renderTableRow = (product: SalonProduct) => {
    const isLowStock = product.isInventoryItem && product.stockLevel <= 5;
    const isOutOfStock = product.isInventoryItem && product.stockLevel === 0;
    const stockColor = isOutOfStock 
      ? theme.colors.error 
      : isLowStock 
        ? theme.colors.warning 
        : theme.colors.success;

    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          dynamicStyles.tableRow,
        ]}
        onPress={() => navigation.navigate('ProductDetail', { productId: product.id, salonId })}
        activeOpacity={0.7}
      >
        {/* Product Name & SKU */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <Text
            style={[styles.tableCellSubtext, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {product.sku || 'No SKU'}
          </Text>
        </View>

        {/* Price */}
        <View style={styles.tableCell}>
          <Text
            style={[styles.tableCellText, dynamicStyles.text]}
            numberOfLines={1}
          >
            {product.unitPrice ? `RWF ${Number(product.unitPrice).toLocaleString()}` : 'N/A'}
          </Text>
        </View>

        {/* Stock Level */}
        <View style={styles.tableCellStock}>
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
                    : 'check-circle'
              }
              size={14}
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
          {isLowStock && product.isInventoryItem && (
            <Text
              style={[styles.lowStockText, { color: stockColor }]}
              numberOfLines={1}
            >
              Low stock
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.tableCellAction}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.error + '20' },
            ]}
            onPress={() => openAdjustmentModal(product, 'consumption')}
          >
            <MaterialIcons name="remove" size={16} color={theme.colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.success + '20' },
            ]}
            onPress={() => openAdjustmentModal(product, 'purchase')}
          >
            <MaterialIcons name="add" size={16} color={theme.colors.success} />
          </TouchableOpacity>
        </View>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.tableScrollContainer}
        contentContainerStyle={styles.tableContainer}
      >
        <View style={styles.tableContent}>
          {/* Table Header */}
          <View style={[styles.tableHeaderRow, dynamicStyles.tableHeader]}>
            <View style={styles.tableCell}>
              <Text
                style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
              >
                Product
              </Text>
            </View>
            <View style={styles.tableCell}>
              <Text
                style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
              >
                Price
              </Text>
            </View>
            <View style={styles.tableCellStock}>
              <Text
                style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
              >
                Stock
              </Text>
            </View>
            <View style={styles.tableCellAction}>
              <Text
                style={[styles.tableHeaderText, dynamicStyles.textSecondary]}
              >
                Actions
              </Text>
            </View>
          </View>

          {/* Table Rows */}
          {products.map((product) => (
            <React.Fragment key={product.id}>
              {renderTableRow(product)}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: theme.fonts.regular,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.lg,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  tabContent: {
    paddingHorizontal: theme.spacing.md,
  },
  tableScrollContainer: {
    marginHorizontal: theme.spacing.md,
  },
  tableContainer: {
    paddingVertical: theme.spacing.xs,
  },
  tableContent: {
    minWidth: 800, // Minimum width to enable horizontal scrolling
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.xs,
    minWidth: 800,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    gap: theme.spacing.xs,
    minWidth: 800,
  },
  tableCell: {
    flex: 1,
    minWidth: 150,
  },
  tableCellStock: {
    width: 120,
    alignItems: 'center',
  },
  tableCellAction: {
    width: 120,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
  },
  tableCellText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
  tableCellSubtext: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  lowStockText: {
    fontSize: 9,
    fontFamily: theme.fonts.medium,
    marginTop: 2,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // History Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  emptyText: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    paddingHorizontal: 40,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  addProductButtonText: {
    color: theme.colors.white,
    fontSize: 16,
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
    marginRight: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  historySubtitle: {
    fontSize: 12,
  },
  historyNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  historyQty: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyType: {
    fontSize: 11,
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
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
