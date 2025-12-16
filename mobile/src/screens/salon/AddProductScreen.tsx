import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { Input, Button } from '../../components';
import { salonService, SalonProduct } from '../../services/salon';

interface AddProductScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      product?: SalonProduct; // If present, we are in Edit Mode
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
  
  // Loading State
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product?.stockLevel || 0);

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
    input: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.gray100,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray300,
    },
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    }
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
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await salonService.createProduct(payload);
        Alert.alert('Success', 'Product created successfully');
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStock = () => {
     // TODO: Implement a modal to add stock (Purchase)
     // For now, simpler flow: navigate to a dedicated Stock Adjustment screen if needed, 
     // or just use a simple prompt for now. 
     // Let's implement a simple prompt for "Add Stock"
     Alert.prompt(
      'Add Stock',
      'Enter quantity to add (Purchase):',
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
                productId: product!.id,
                movementType: 'purchase',
                quantity: parseFloat(qty),
                notes: 'Quick add from mobile app',
              });
              // Refresh product to get new stock level
              // In a real app we might refetch, but here we can just update local state optimistically or refetch
              Alert.alert('Success', 'Stock added successfully');
              setCurrentStock(prev => prev + parseFloat(qty));
            } catch (err: any) {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.gray200 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? theme.colors.white : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Product Details Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Product Details</Text>
          
          <View style={styles.inputContainer}>
            <Input
              label="Product Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Shampoo, Conditioner"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="SKU (Stock Keeping Unit)"
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. PRD-001"
            />
          </View>

          <View style={styles.inputContainer}>
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Product description..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Pricing Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Pricing & Tax</Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="Unit Price"
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="0.00"
                keyboardType="numeric"
                leftIcon={<Text style={{ color: theme.colors.gray500, marginLeft: 8 }}>FRW</Text>}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                label="Tax Rate (%)"
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Inventory Settings Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle, { marginBottom: 4 }]}>
                Track Inventory
              </Text>
              <Text style={[styles.helperText, dynamicStyles.textSecondary]}>
                Enable stock tracking for this item
              </Text>
            </View>
            <Switch
              value={isInventoryItem}
              onValueChange={setIsInventoryItem}
              trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }}
              thumbColor={'white'}
            />
          </View>

          {isEditing && isInventoryItem && (
            <View style={styles.stockContainer}>
              <View style={styles.stockInfo}>
                <Text style={[styles.stockLabel, dynamicStyles.textSecondary]}>Current Stock</Text>
                <Text style={[styles.stockValue, dynamicStyles.text]}>{currentStock}</Text>
              </View>
              <Button
                variant="outline"
                title="+ Add Stock"
                onPress={handleCreateStock}
                style={{ borderColor: theme.colors.primary }}
                textStyle={{ color: theme.colors.primary }}
              />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            title={loading ? 'Saving...' : 'Save Product'}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
  },
  stockContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'column',
  },
  stockLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 8,
  },
});
