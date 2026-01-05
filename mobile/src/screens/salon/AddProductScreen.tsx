import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService, SalonProduct } from '../../services/salon';

interface AddProductScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      product?: SalonProduct;
    };
  };
}

export default function AddProductScreen({ navigation, route }: AddProductScreenProps) {
  const { salonId, product } = route.params;
  const { isDark } = useTheme();
  
  const isEditing = !!product;

  // Form State
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [description, setDescription] = useState(product?.description || '');
  const [unitPrice, setUnitPrice] = useState(product?.unitPrice?.toString() || '');
  const [taxRate, setTaxRate] = useState(product?.taxRate?.toString() || '');
  const [isInventoryItem, setIsInventoryItem] = useState(product?.isInventoryItem ?? true);
  
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product?.stockLevel || 0);

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' },
    text: { color: isDark ? '#FFFFFF' : '#1A1A2E' },
    textSecondary: { color: isDark ? '#8E8E93' : '#6B7280' },
    card: { 
      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
      borderColor: isDark ? '#3A3A3C' : '#E8E8E8',
    },
    input: {
      backgroundColor: isDark ? '#3A3A3C' : '#F9F9F9',
      color: isDark ? '#FFFFFF' : '#1A1A2E',
      borderColor: isDark ? '#4A4A4C' : '#E0E0E0',
    },
    headerBorder: { borderBottomColor: isDark ? '#3A3A3C' : '#E8E8E8' },
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        salonId,
        name,
        sku: sku || undefined,
        description: description || undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        taxRate: taxRate ? parseFloat(taxRate) : undefined,
        isInventoryItem,
      };

      if (isEditing && product) {
        await salonService.updateProduct(product.id, payload);
        Alert.alert('Success', 'Product updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await salonService.createProduct(payload);
        Alert.alert('Success', 'Product created!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = () => {
    if (!product) return;
    Alert.prompt(
      'Add Stock',
      'Enter quantity to add:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (qty?: string) => {
            if (!qty || isNaN(parseFloat(qty))) return;
            try {
              setLoading(true);
              await salonService.addStockMovement({
                salonId,
                productId: product.id,
                movementType: 'purchase',
                quantity: parseFloat(qty),
                notes: 'Added from mobile app',
              });
              Alert.alert('Success', 'Stock added!');
              setCurrentStock(prev => prev + parseFloat(qty));
            } catch {
              Alert.alert('Error', 'Failed to add stock');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      'plain-text',
      '1'
    );
  };

  const renderInput = (
    label: string, 
    value: string, 
    onChangeText: (t: string) => void, 
    options: { placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric'; icon?: string } = {}
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.fieldRow}>
        {options.icon && <MaterialIcons name={options.icon as any} size={16} color={theme.colors.primary} />}
        <Text style={[styles.fieldLabel, dynamicStyles.text]}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.input, 
          dynamicStyles.input, 
          options.multiline && styles.textArea
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options.placeholder}
        placeholderTextColor={dynamicStyles.textSecondary.color}
        multiline={options.multiline}
        numberOfLines={options.multiline ? 3 : 1}
        keyboardType={options.keyboardType || 'default'}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {isEditing ? 'Edit Product' : 'Add Product'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Product Details */}
          <View style={[styles.card, dynamicStyles.card]}>
            {renderInput('Product Name *', name, setName, { 
              placeholder: 'e.g. Shampoo, Conditioner', 
              icon: 'inventory-2' 
            })}
            {renderInput('SKU Code', sku, setSku, { 
              placeholder: 'e.g. PRD-001', 
              icon: 'qr-code' 
            })}
            {renderInput('Description', description, setDescription, { 
              placeholder: 'Product description...', 
              multiline: true, 
              icon: 'notes' 
            })}
          </View>

          {/* Pricing */}
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Pricing</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="attach-money" size={16} color={theme.colors.primary} />
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Unit Price (RWF)</Text>
                </View>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="0"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="percent" size={16} color={theme.colors.primary} />
                  <Text style={[styles.fieldLabel, dynamicStyles.text]}>Tax Rate (%)</Text>
                </View>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  placeholder="0"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Inventory Toggle */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 2 }]}>
                  Track Inventory
                </Text>
                <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
                  Enable stock level tracking
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsInventoryItem(!isInventoryItem)}
                style={[styles.toggle, { backgroundColor: isInventoryItem ? theme.colors.success : '#CCC' }]}
              >
                <View style={[styles.toggleKnob, isInventoryItem ? { right: 2 } : { left: 2 }]} />
              </TouchableOpacity>
            </View>

            {isEditing && isInventoryItem && (
              <View style={[styles.stockRow, dynamicStyles.headerBorder]}>
                <View>
                  <Text style={[styles.stockLabel, dynamicStyles.textSecondary]}>Current Stock</Text>
                  <Text style={[styles.stockValue, dynamicStyles.text]}>{currentStock}</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleAddStock}
                  style={styles.addStockBtn}
                >
                  <MaterialIcons name="add" size={18} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Add Stock</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomBar, dynamicStyles.card]}>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? '#9CA3AF' : theme.colors.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.submitContent}>
                <MaterialIcons name={isEditing ? 'save' : 'add-circle'} size={20} color="#FFF" />
                <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Add Product'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 12 },
  
  content: { padding: 14, paddingBottom: 100, gap: 12 },
  
  card: { borderRadius: 14, padding: 14, borderWidth: 1 },
  
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  
  inputGroup: { marginBottom: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  textArea: { height: 70, textAlignVertical: 'top', paddingTop: 10 },
  
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', position: 'absolute',
  },
  helperText: { fontSize: 12 },
  
  stockRow: { 
    marginTop: 14, 
    paddingTop: 14, 
    borderTopWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  stockLabel: { fontSize: 11, marginBottom: 2, textTransform: 'uppercase' },
  stockValue: { fontSize: 22, fontWeight: '700' },
  addStockBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: theme.colors.primary 
  },
  
  bottomBar: { padding: 14, paddingBottom: Platform.OS === 'ios' ? 10 : 14, borderTopWidth: 1 },
  submitBtn: { 
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
