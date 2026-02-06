import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { useTheme, useAuth, useRefresh } from '../../context';
import { usePermissions } from '../../context/PermissionContext';
import { accountingService, Expense, CreateExpenseDto, ExpenseCategory } from '../../services/accounting';
import { salonService } from '../../services/salon';
import { Loader } from '../../components/common';

// Dimensions used for layout calculations
Dimensions.get('window');

interface ExpensesScreenProps {
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

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'payments' },
  { value: 'mobile_money', label: 'Mobile Money', icon: 'phone-android' },
  { value: 'bank_transfer', label: 'Bank', icon: 'account-balance' },
  { value: 'card', label: 'Card', icon: 'credit-card' },
  { value: 'other', label: 'Other', icon: 'more-horiz' },
];

// Default fallback categories with icons (using theme colors)
const DEFAULT_CATEGORY_ICONS: Record<string, { icon: string; colorKey: keyof typeof theme.colors }> = {
  rent: { icon: 'home', colorKey: 'secondary' },
  utilities: { icon: 'bolt', colorKey: 'warning' },
  supplies: { icon: 'inventory-2', colorKey: 'success' },
  products: { icon: 'shopping-bag', colorKey: 'error' },
  equipment: { icon: 'construction', colorKey: 'primary' },
  marketing: { icon: 'campaign', colorKey: 'info' },
  wages: { icon: 'people', colorKey: 'infoDark' },
  other: { icon: 'more-horiz', colorKey: 'textSecondary' },
};

export default function ExpensesScreen({ navigation, route }: ExpensesScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { activeSalon } = usePermissions();
  const { triggerRefresh } = useRefresh(); // Global refresh trigger
  
  // State for salonId with fallback loading
  const [salonId, setSalonId] = useState(route?.params?.salonId || activeSalon?.salonId || '');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ totalExpenses: 0, expenseCount: 0 });
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  const fadeAnim = useState(new Animated.Value(0))[0];

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'cash', label: 'Cash' },
    { id: 'mobile_money', label: 'Mobile' },
    { id: 'bank_transfer', label: 'Bank' },
    { id: 'card', label: 'Card' },
  ];

  const dynamicStyles = {
    container: { backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background },
    text: { color: isDark ? theme.colors.white : theme.colors.text },
    textSecondary: { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
      borderColor: isDark ? theme.colors.gray600 : theme.colors.gray300,
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    searchContainer: {
      backgroundColor: isDark ? theme.colors.white + '14' : theme.colors.black + '0A',
    },
    filterChipInactive: {
      backgroundColor: isDark ? theme.colors.white + '14' : theme.colors.black + '0A',
    },
    modalBg: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
    },
    amountRow: {
      backgroundColor: theme.colors.error + (isDark ? '1A' : '14'),
    },
    chipInactive: {
      backgroundColor: isDark ? theme.colors.white + '14' : theme.colors.black + '0D',
    },
    categoryBadge: {
      backgroundColor: isDark ? theme.colors.white + '14' : theme.colors.black + '0A',
    },
    emptyIconBg: {
      backgroundColor: isDark ? theme.colors.white + '14' : theme.colors.black + '0A',
    },
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => {
      if (activeFilter !== 'all' && ex.paymentMethod !== activeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = ex.description.toLowerCase().includes(q);
        const matchVendor = ex.vendorName?.toLowerCase().includes(q) || false;
        const matchAmount = ex.amount.toString().includes(q);
        return matchDesc || matchVendor || matchAmount;
      }
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.expenseDate).getTime();
      const dateB = new Date(b.expenseDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdB - createdA;
    });
  }, [expenses, activeFilter, searchQuery]);

  const loadData = useCallback(async () => {
    if (!salonId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const fetchData = async () => {
        const [expensesRes, summaryRes, categoriesRes] = await Promise.all([
          accountingService.getExpenses({ salonId, limit: 50 }).catch(() => ({ data: [], total: 0 })),
          accountingService.getExpenseSummary(salonId).catch(() => ({ totalExpenses: 0, expenseCount: 0 })),
          accountingService.getExpenseCategories(salonId).catch(() => []),
        ]);
        return { expensesRes, summaryRes, categoriesRes };
      };
      
      const result = await Promise.race([fetchData(), timeout]) as any;
      
      setExpenses(result.expensesRes?.data || []);
      setSummary({ 
        totalExpenses: result.summaryRes?.totalExpenses || 0, 
        expenseCount: result.summaryRes?.expenseCount || 0 
      });
      setCategories(result.categoriesRes || []);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Error loading expenses:', err);
      setExpenses([]);
      setSummary({ totalExpenses: 0, expenseCount: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId, fadeAnim]);

  // Fallback: Load salon if salonId is not available from context
  useEffect(() => {
    const loadSalonFallback = async () => {
      if (salonId || !user?.id) return; // Already have salonId or no user
      
      try {
        // Try to get salon from owner's salons
        const salon = await salonService.getSalonByOwnerId(String(user.id));
        if (salon?.id) {
          setSalonId(salon.id);
        }
      } catch (error) {
        console.log('Could not load salon fallback:', error);
      }
    };
    
    loadSalonFallback();
  }, [salonId, user?.id]);

  // Also update salonId when activeSalon changes
  useEffect(() => {
    if (!salonId && activeSalon?.salonId) {
      setSalonId(activeSalon.salonId);
    }
  }, [salonId, activeSalon?.salonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setVendorName('');
    setPaymentMethod('cash');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setSelectedCategoryId(undefined);
    setSelectedExpense(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setVendorName(expense.vendorName || '');
    setPaymentMethod(expense.paymentMethod);
    setExpenseDate(expense.expenseDate.split('T')[0]);
    setSelectedCategoryId(expense.categoryId || expense.category?.id);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!salonId) {
      Alert.alert('Error', 'Salon information is missing.');
      return;
    }
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a description and valid amount');
      return;
    }

    setSaving(true);
    try {
      const data: CreateExpenseDto = {
        salonId,
        description: description.trim(),
        amount: parseFloat(amount),
        expenseDate,
        paymentMethod,
        vendorName: vendorName.trim() || undefined,
        categoryId: selectedCategoryId,
      };

      if (modalMode === 'add') {
        await accountingService.createExpense(data);
        Alert.alert('Success', 'Expense added');
      } else if (selectedExpense) {
        await accountingService.updateExpense(selectedExpense.id, data);
        Alert.alert('Success', 'Expense updated');
      }
      
      setShowModal(false);
      resetForm();
      loadData();
      triggerRefresh(); // Notify other screens to refresh
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await accountingService.deleteExpense(expense.id);
            Alert.alert('Deleted', 'Expense removed');
            loadData();
            triggerRefresh(); // Notify other screens to refresh
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const formatCurrency = (value: number) => `RWF ${value.toLocaleString()}`;
  
  const getCategoryInfo = (expense: Expense) => {
    const catName = expense.category?.name?.toLowerCase() || 'other';
    const iconInfo = DEFAULT_CATEGORY_ICONS[catName] || DEFAULT_CATEGORY_ICONS['other'];
    return {
      name: expense.category?.name || 'Other',
      icon: iconInfo.icon,
      color: iconInfo.color,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Loader fullscreen message="Loading expenses..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={[styles.backBtnBg, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
            <MaterialIcons name="arrow-back" size={20} color={dynamicStyles.text.color} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Expenses</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn} accessibilityLabel="Add expense" accessibilityRole="button">
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
            style={styles.addBtnGradient}
          >
            <MaterialIcons name="add" size={22} color={theme.colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <Animated.View style={[styles.summaryRow, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={isDark ? [theme.colors.error + '30', theme.colors.error + '20'] : [theme.colors.error + '15', theme.colors.error + '10']}
            style={styles.summaryCard}
          >
            <View style={[styles.summaryIconBg, { backgroundColor: theme.colors.error + '26' }]}>
              <MaterialIcons name="trending-down" size={20} color={theme.colors.error} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
              {formatCurrency(summary.totalExpenses)}
            </Text>
            <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>Total Spent</Text>
          </LinearGradient>

          <View style={[styles.summaryCardSmall, dynamicStyles.card]}>
            <View style={[styles.summaryIconBgSmall, { backgroundColor: theme.colors.primary + '15' }]}>
              <MaterialIcons name="receipt-long" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.summaryValueSmall, dynamicStyles.text]}>{summary.expenseCount}</Text>
            <Text style={[styles.summaryLabelSmall, dynamicStyles.textSecondary]}>Records</Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
          <MaterialIcons name="search" size={20} color={dynamicStyles.textSecondary.color} />
          <TextInput
            placeholder="Search expenses..."
            placeholderTextColor={dynamicStyles.textSecondary.color}
            style={[styles.searchInput, dynamicStyles.text]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              style={[
                styles.filterChip,
                activeFilter === tab.id
                  ? styles.filterChipActive
                  : dynamicStyles.filterChipInactive
              ]}
              accessibilityLabel={`Filter by ${tab.label}`}
              accessibilityRole="button"
            >
              <Text style={[
                styles.filterChipText,
                activeFilter === tab.id ? { color: theme.colors.white } : dynamicStyles.textSecondary
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            {activeFilter === 'all' ? 'Recent Activity' : `${filteredExpenses.length} Results`}
          </Text>
          <Text style={[styles.resultsTotal, { color: theme.colors.error }]}>
            {formatCurrency(filteredExpenses.reduce((sum, ex) => sum + Number(ex.amount || 0), 0))}
          </Text>
        </View>
        
        {/* Expense List */}
        {filteredExpenses.length === 0 ? (
          <View style={[styles.emptyState, dynamicStyles.card]}>
            <View style={[styles.emptyIconBg, dynamicStyles.emptyIconBg]}>
              <MaterialIcons name="receipt-long" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Expenses Yet</Text>
            <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
              Track your salon spending by adding your first expense.
            </Text>
            <TouchableOpacity onPress={openAddModal} accessibilityLabel="Add first expense" accessibilityRole="button">
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                style={styles.emptyBtn}
              >
                <MaterialIcons name="add" size={20} color={theme.colors.white} />
                <Text style={styles.emptyBtnText}>Add Expense</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {(() => {
              const groups: { [key: string]: Expense[] } = {};
              filteredExpenses.forEach(ex => {
                const dateKey = new Date(ex.expenseDate).toDateString();
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(ex);
              });
              
              return Object.entries(groups).map(([dateStr, groupExpenses]) => (
                <View key={dateStr} style={styles.dateGroup}>
                  <Text style={[styles.dateHeader, dynamicStyles.textSecondary]}>
                    {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  {groupExpenses.map((expense) => {
                    const catInfo = getCategoryInfo(expense);
                    return (
                      <TouchableOpacity
                        key={expense.id}
                        style={[styles.expenseCard, dynamicStyles.card]}
                        onPress={() => openEditModal(expense)}
                        onLongPress={() => handleDelete(expense)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.categoryIndicator, { backgroundColor: catInfo.color }]} />
                        <View style={[styles.expenseIcon, { backgroundColor: catInfo.color + '15' }]}>
                          <MaterialIcons name={catInfo.icon as any} size={20} color={catInfo.color} />
                        </View>
                        <View style={styles.expenseContent}>
                          <View style={styles.expenseRow}>
                            <Text style={[styles.expenseDesc, dynamicStyles.text]} numberOfLines={1}>
                              {expense.description}
                            </Text>
                            <Text style={[styles.expenseAmount, { color: theme.colors.error }]}>
                              -{formatCurrency(expense.amount)}
                            </Text>
                          </View>
                          <View style={styles.expenseMetaRow}>
                            <View style={[styles.categoryBadge, dynamicStyles.categoryBadge]}>
                              <Text style={[styles.categoryBadgeText, dynamicStyles.textSecondary]}>
                                {expense.category?.name || 'Uncategorized'}
                              </Text>
                            </View>
                            <Text style={[styles.expenseMeta, dynamicStyles.textSecondary]}>
                              {expense.paymentMethod.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}
          </Animated.View>
        )}
      </ScrollView>

      {/* Add/Edit Modal - Compact Design */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg]}>
            <View style={styles.modalHandle} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.text]}>
                {modalMode === 'add' ? 'Add Expense' : 'Edit Expense'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={dynamicStyles.textSecondary.color} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <View style={[styles.amountRow, dynamicStyles.amountRow]}>
                <Text style={[styles.amountCurrency, { color: theme.colors.error }]}>RWF</Text>
                <TextInput
                  style={[styles.amountField, { color: theme.colors.error }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.error + (isDark ? '66' : '4D')}
                />
              </View>

              {/* Description */}
              <Text style={[styles.fieldLabel, dynamicStyles.textSecondary]}>Description *</Text>
              <TextInput
                style={[styles.fieldInput, dynamicStyles.input]}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this expense for?"
                placeholderTextColor={dynamicStyles.textSecondary.color}
              />

              {/* Date & Vendor Row */}
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, dynamicStyles.textSecondary]}>Date</Text>
                  <TextInput
                    style={[styles.fieldInput, dynamicStyles.input]}
                    value={expenseDate}
                    onChangeText={setExpenseDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={dynamicStyles.textSecondary.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, dynamicStyles.textSecondary]}>Vendor</Text>
                  <TextInput
                    style={[styles.fieldInput, dynamicStyles.input]}
                    value={vendorName}
                    onChangeText={setVendorName}
                    placeholder="Optional"
                    placeholderTextColor={dynamicStyles.textSecondary.color}
                  />
                </View>
              </View>

              {/* Category */}
              <Text style={[styles.fieldLabel, dynamicStyles.textSecondary]}>Category</Text>
              <View style={styles.chipGrid}>
                {categories.map((cat) => {
                  const iconInfo = DEFAULT_CATEGORY_ICONS[cat.name.toLowerCase()] || DEFAULT_CATEGORY_ICONS['other'];
                  const categoryColor = theme.colors[iconInfo.colorKey];
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: categoryColor, borderColor: categoryColor }
                          : { ...dynamicStyles.chipInactive, borderColor: 'transparent' }
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      accessibilityLabel={`Select ${cat.name} category`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons
                        name={iconInfo.icon as any}
                        size={14}
                        color={isSelected ? theme.colors.white : categoryColor}
                      />
                      <Text style={[
                        styles.chipText,
                        isSelected ? { color: theme.colors.white } : dynamicStyles.text
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment Method */}
              <Text style={[styles.fieldLabel, dynamicStyles.textSecondary]}>Payment</Text>
              <View style={styles.chipGrid}>
                {PAYMENT_METHODS.map((pm) => {
                  const isActive = paymentMethod === pm.value;
                  return (
                    <TouchableOpacity
                      key={pm.value}
                      style={[
                        styles.chip,
                        isActive
                          ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          : { ...dynamicStyles.chipInactive, borderColor: 'transparent' }
                      ]}
                      onPress={() => setPaymentMethod(pm.value)}
                      accessibilityLabel={`Select ${pm.label} payment method`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons
                        name={pm.icon as any}
                        size={14}
                        color={isActive ? theme.colors.white : dynamicStyles.textSecondary.color}
                      />
                      <Text style={[
                        styles.chipText,
                        isActive ? { color: theme.colors.white } : dynamicStyles.text
                      ]}>
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel={modalMode === 'add' ? 'Add expense' : 'Save changes'}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
                style={styles.saveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {modalMode === 'add' ? 'Add Expense' : 'Save Changes'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {},
  backBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addBtn: {},
  addBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: { padding: 16, paddingBottom: 40 },
  
  // Summary
  summaryRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16,
  },
  summaryCard: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  summaryIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: { 
    fontSize: 24, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: { 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '500',
  },
  summaryCardSmall: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryIconBgSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValueSmall: { 
    fontSize: 20, 
    fontWeight: '700',
  },
  summaryLabelSmall: { 
    fontSize: 11, 
    marginTop: 2,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  
  // Filters
  filterScroll: { marginBottom: 16 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  resultsTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Date Groups
  dateGroup: { marginBottom: 16 },
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Expense Cards
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  expenseIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  expenseContent: { 
    flex: 1, 
    marginLeft: 12,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseDesc: { 
    fontSize: 15, 
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  expenseAmount: { 
    fontSize: 15, 
    fontWeight: '700',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  expenseMeta: { 
    fontSize: 12,
    textTransform: 'capitalize',
  },
  
  // Empty State
  emptyState: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 15,
  }, 
  
  // Modal - Compact Design
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.black + '80',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.gray500 + '4D',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray500 + '26',
  },
  modalTitle: { 
    fontSize: 17, 
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { 
    paddingHorizontal: 16, 
    paddingTop: 12,
    paddingBottom: 16,
  },
  
  // Compact Amount Row
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  amountField: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
  },
  
  // Compact Fields
  fieldLabel: { 
    fontSize: 11, 
    fontWeight: '600',
    marginBottom: 6, 
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  
  // Compact Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Save Button
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  saveBtnGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
