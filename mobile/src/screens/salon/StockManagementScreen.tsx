import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService, SalonProduct, StockMovement } from '../../services/salon';
import { Button, Input } from '../../components';

interface StockManagementScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
    };
  };
}

type TabType = 'levels' | 'history';

export default function StockManagementScreen({ navigation, route }: StockManagementScreenProps) {
  const { salonId } = route.params;
  const { isDark } = useTheme();

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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
    modalContent: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [productsData, movementsData] = await Promise.all([
        salonService.getProducts(salonId).catch(() => []),
        salonService.getStockMovements(salonId).catch(() => []),
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
  }, [salonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    if (!selectedProduct || !adjustmentQty) return;
    
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

  const renderStockLevels = () => (
    <View style={styles.tabContent}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: isDark ? theme.colors.gray700 : theme.colors.gray200 }]}>
        <Text style={[styles.tableHeaderText, dynamicStyles.textSecondary, { flex: 4 }]}>Product</Text>
        <Text style={[styles.tableHeaderText, dynamicStyles.textSecondary, { flex: 2, textAlign: 'center' }]}>Stock</Text>
        <Text style={[styles.tableHeaderText, dynamicStyles.textSecondary, { flex: 2, textAlign: 'right' }]}>Action</Text>
      </View>

      {products.map((item, index) => (
         <View 
           key={item.id} 
           style={[
             styles.tableRow, 
             { backgroundColor: index % 2 === 0 ? (isDark ? theme.colors.gray800 : theme.colors.white) : (isDark ? theme.colors.gray900 : '#F9F9F9') }
           ]}
         >
           <View style={{ flex: 4 }}>
             <Text style={[styles.rowTitle, dynamicStyles.text]} numberOfLines={1}>{item.name}</Text>
             <Text style={[styles.rowSubtitle, dynamicStyles.textSecondary]}>{item.sku || '-'}</Text>
           </View>

           <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
             <View style={[
               styles.stockBadge, 
               { backgroundColor: item.stockLevel <= 5 ? (item.stockLevel === 0 ? theme.colors.error : theme.colors.warning) : theme.colors.success }
             ]}>
               <Text style={styles.stockBadgeText}>{item.isInventoryItem ? item.stockLevel : '∞'}</Text>
             </View>
           </View>

           <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
             <TouchableOpacity 
               onPress={() => openAdjustmentModal(item, 'consumption')}
               style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
             >
               <MaterialIcons name="remove" size={16} color={theme.colors.error} />
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => openAdjustmentModal(item, 'purchase')}
               style={[styles.actionButton, { backgroundColor: theme.colors.success + '20' }]}
             >
               <MaterialIcons name="add" size={16} color={theme.colors.success} />
             </TouchableOpacity>
           </View>
         </View>
      ))}
      <View style={{ height: 40 }} />
    </View>
  );

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

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={isDark ? theme.colors.white : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Stock Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'levels' && styles.activeTab]} 
          onPress={() => setActiveTab('levels')}
        >
          <Text style={[styles.tabText, activeTab === 'levels' && styles.activeTabText]}>Stock Levels</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
        >
          {activeTab === 'levels' ? renderStockLevels() : renderHistory()}
        </ScrollView>
      )}

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
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
  },
  rowText: {
    fontSize: 14,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  stockBadgeText: {
    color: 'white',
    maxWidth: 16,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // History Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
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
