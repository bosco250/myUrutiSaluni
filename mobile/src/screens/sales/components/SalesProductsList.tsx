import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
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

export const SalesProductsList: React.FC<SalesProductsListProps> = React.memo(({
  products,
  searchQuery,
  onAddToCart,
  isDark,
  dynamicStyles,
}) => {
  // Senior Dev: Filter logic preserved EXACTLY from original
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const renderProductCard = React.useCallback(({ item: product }: { item: SalonProduct }) => (
    <TouchableOpacity
      style={[styles.itemCard, dynamicStyles.card]}
      onPress={() => onAddToCart(product)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: theme.colors.info + "15" },
        ]}
      >
        <MaterialIcons
          name="shopping-bag"
          size={22}
          color={theme.colors.info}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text
          style={[styles.itemName, dynamicStyles.text]}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text
          style={[
            styles.itemMeta,
            {
              color:
                product.stockLevel <= 5
                  ? theme.colors.error
                  : theme.colors.success,
            },
          ]}
        >
          {product.stockLevel} in stock
        </Text>
      </View>
      <Text
        style={[styles.itemPrice, { color: theme.colors.primary }]}
      >
        RWF {(product.unitPrice || 0).toLocaleString()}
      </Text>
      <View style={styles.addIcon}>
        <MaterialIcons
          name="add-circle"
          size={28}
          color={theme.colors.success}
        />
      </View>
    </TouchableOpacity>
  ), [onAddToCart, dynamicStyles]);

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
      data={filteredProducts}
      renderItem={renderProductCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.itemsContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmptyState}
      // Senior Dev: Performance optimizations
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      initialNumToRender={10}
    />
  );
});

SalesProductsList.displayName = 'SalesProductsList';

// Senior Dev: Styles copied EXACTLY from SalesScreen.tsx (no changes)
const styles = StyleSheet.create({
  itemsContent: {
    padding: theme.spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginRight: theme.spacing.sm,
  },
  addIcon: {
    width: 32,
    height: 32,
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
