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
      <Text style={[styles.fieldLabel, dynamicStyles.text]}>{label}</Text>
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.headerBorder]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>
            {isEditing ? 'Edit Product' : 'New Product'}
          </Text>
          <View style={{ width: 32 }} /> 
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Product Details */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Product Details</Text>
          <View style={[styles.card, dynamicStyles.card]}>
            {renderInput('Product Name *', name, setName, { 
              placeholder: 'e.g. Shampoo, Conditioner', 
            })}
            
            <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>SKU Code</Text>
                <View style={[styles.inputContainer, dynamicStyles.input]}>
                    <MaterialIcons name="qr-code" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={sku}
                      onChangeText={setSku}
                      placeholder="e.g. PRD-001"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                    />
                </View>
            </View>

            {renderInput('Description', description, setDescription, { 
              placeholder: 'Product description...', 
              multiline: true, 
            })}
          </View>

          {/* Pricing */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Pricing</Text>
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Unit Price (RWF)</Text>
                <View style={[styles.inputContainer, dynamicStyles.input]}>
                    <Text style={styles.inputPrefix}>RWF</Text>
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={unitPrice}
                      onChangeText={setUnitPrice}
                      placeholder="0"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                      keyboardType="numeric"
                    />
                </View>
              </View>
              <View style={styles.priceField}>
                <Text style={[styles.fieldLabel, dynamicStyles.text]}>Tax Rate (%)</Text>
                <View style={[styles.inputContainer, dynamicStyles.input]}>
                    <TextInput
                      style={[styles.inputFlex, { color: dynamicStyles.text.color }]}
                      value={taxRate}
                      onChangeText={setTaxRate}
                      placeholder="0"
                      placeholderTextColor={dynamicStyles.textSecondary.color}
                      keyboardType="numeric"
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Inventory Toggle */}
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Inventory</Text>
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.fieldLabel, dynamicStyles.text, { marginBottom: 2 }]}>
                  Track Inventory
                </Text>
                <Text style={[styles.subText, dynamicStyles.textSecondary]}>
                  Enable stock level tracking
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsInventoryItem(!isInventoryItem)}
                style={[styles.toggle, { backgroundColor: isInventoryItem ? theme.colors.success : '#E5E7EB' }]}
                activeOpacity={0.9}
              >
                <View style={[styles.toggleKnob, isInventoryItem ? { right: 2 } : { left: 2 }]} />
              </TouchableOpacity>
            </View>

            {isEditing && isInventoryItem && (
               <>
                 <View style={styles.divider} />
                 <View style={styles.stockRow}>
                    <View>
                      <Text style={[styles.stockLabel, dynamicStyles.textSecondary]}>In Stock</Text>
                      <Text style={[styles.stockValue, dynamicStyles.text]}>{currentStock}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={handleAddStock}
                      style={styles.addStockBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="add" size={16} color={theme.colors.primary} />
                      <Text style={styles.addStockText}>Add Stock</Text>
                    </TouchableOpacity>
                 </View>
               </>
            )}
          </View>

        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomBar, dynamicStyles.card]}>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? '#9CA3AF' : theme.colors.primary }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Add Product'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingBottom: 12,
    backgroundColor: 'transparent',
    zIndex: 10,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    flex: 1,
    textAlign: 'center',
    marginRight: 0, 
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  
  scrollContent: { padding: 12, paddingBottom: 100, gap: 16 },
  
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  
  sectionTitle: { 
      fontSize: 14, 
      fontFamily: theme.fonts.semibold, 
      marginBottom: -8, 
      opacity: 0.9,
      marginLeft: 4, 
  },
  
  inputGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: theme.fonts.medium, marginBottom: 6, opacity: 0.8 },
  
  input: { 
    height: 44, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    fontSize: 14,
    fontFamily: theme.fonts.regular 
  },
  textArea: { 
    height: 80, 
    textAlignVertical: 'top', 
    paddingTop: 10 
  },
  
  inputContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     borderWidth: 1,
     borderRadius: 10,
     paddingHorizontal: 12,
     height: 44,
  },
  inputPrefix: { marginRight: 8, fontSize: 14, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputSuffix: { marginLeft: 8, fontSize: 14, color: '#9CA3AF', fontFamily: theme.fonts.medium },
  inputFlex: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, height: '100%' },

  priceRow: { flexDirection: 'row', gap: 12 },
  priceField: { flex: 1 },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subText: { fontSize: 11, marginTop: 2 },

  toggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', position: 'absolute',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 2,
  },
  
  divider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.1)', marginVertical: 16 },

  stockRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  stockLabel: { fontSize: 11, marginBottom: 2, textTransform: 'uppercase' },
  stockValue: { fontSize: 18, fontWeight: '700' },
  addStockBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: theme.colors.primary 
  },
  addStockText: { color: theme.colors.primary, fontWeight: '600', fontSize: 12, fontFamily: theme.fonts.medium },
  
  bottomBar: { 
      padding: 12, 
      borderTopWidth: 1,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
  },
  submitBtn: { 
    borderRadius: 10, 
    paddingVertical: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 44,
  },
  submitText: { color: '#FFF', fontSize: 14, fontFamily: theme.fonts.semibold },
});
