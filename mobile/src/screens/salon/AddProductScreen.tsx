import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Dynamic styles based on theme (dark/light mode)
  // Colors matched with OwnerDashboardScreen for consistency
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#1C1C1E' : theme.colors.background,
    },
    header: {
      backgroundColor: isDark ? '#1C1C1E' : theme.colors.background,
      borderBottomColor: isDark ? '#3A3A3C' : theme.colors.borderLight,
    },
    text: {
      color: isDark ? '#FFFFFF' : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? '#8E8E93' : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? '#2C2C2E' : theme.colors.white,
      borderColor: isDark ? '#3A3A3C' : theme.colors.borderLight,
    },
    iconColor: isDark ? '#FFFFFF' : theme.colors.text,
    divider: {
      borderTopColor: isDark ? '#3A3A3C' : theme.colors.borderLight,
    },
    // Button styles with primary gold color
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.iconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Product Details Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Product Details</Text>
          
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
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Pricing & Tax</Text>
          
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
              <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 4 }]}>
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
            <View style={[styles.stockContainer, dynamicStyles.divider]}>
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
            style={dynamicStyles.primaryButton}
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: theme.spacing.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
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
    fontFamily: theme.fonts.regular,
  },
  stockContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'column',
  },
  stockLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  stockValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
});
