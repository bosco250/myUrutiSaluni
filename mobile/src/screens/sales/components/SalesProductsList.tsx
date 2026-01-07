import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { SalonProduct } from '../../../services/salon';

interface SalesProductsListProps {
  products: SalonProduct[];
  searchQuery: string;
  onAddToCart: (product: SalonProduct) => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    card: { backgroundColor: string; borderColor: string };
  };
}

// Senior Dev: Same compact grid layout as Services
const GAP = 12;

export const SalesProductsList: React.FC<SalesProductsListProps> = React.memo(({
  products,
  searchQuery,
  onAddToCart,
  isDark,
  dynamicStyles,
}) => {
  // Senior Dev: Filter logic preserved
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const renderProductCard = React.useCallback(({ item: product }: { item: SalonProduct }) => {
    // Cast to any to access imageUrl if it exists but isn't in interface
    const productWithImage = product as any;
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, dynamicStyles.card]}
        onPress={() => onAddToCart(product)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {productWithImage.imageUrl ? (
            <Image
              source={{ uri: productWithImage.imageUrl }}
              style={styles.serviceImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.placeholderIcon,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <MaterialIcons
                name="shopping-bag"
                size={24}
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, dynamicStyles.text]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <View style={styles.stockContainer}>
              <Text style={[styles.itemMeta, dynamicStyles.textSecondary]}>
                Stock: {product.stockLevel}
              </Text>
              {product.stockLevel <= 5 && (
                 <View style={styles.lowStockBadge}>
                   <Text style={styles.lowStockText}>Low</Text>
                 </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text
              style={[styles.itemPrice, { color: theme.colors.primary }]}
            >
              RWF {(product.unitPrice || 0).toLocaleString()}
            </Text>
            <View style={styles.addButton}>
              <MaterialIcons
                name="add"
                size={18}
                color={theme.colors.white}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [onAddToCart, dynamicStyles]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="shopping-bag"
        size={48}
        color={dynamicStyles.textSecondary.color}
      />
      <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
        No products found
      </Text>
    </View>
  );

  return (
    <FlatList
      key={'products-grid'}
      data={filteredProducts}
      renderItem={renderProductCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.itemsContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmptyState}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      // Senior Dev: Performance optimizations
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
    />
  );
});

SalesProductsList.displayName = 'SalesProductsList';

const styles = StyleSheet.create({
  itemsContent: {
    padding: 12,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: GAP,
  },
  itemCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: GAP,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    height: 100,
    width: '100%',
    backgroundColor: '#f5f5f5',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderIcon: {
    width: '100%',
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  itemInfo: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: 4,
    lineHeight: 18,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    opacity: 0.7,
  },
  lowStockBadge: {
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lowStockText: {
    color: theme.colors.error,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
  },
});
