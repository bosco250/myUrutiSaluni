import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
}

interface SalesServicesListProps {
  services: ServiceItem[];
  searchQuery: string;
  onAddToCart: (service: ServiceItem) => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    textSecondary: { color: string };
    card: { backgroundColor: string; borderColor: string };
  };
}

export const SalesServicesList: React.FC<SalesServicesListProps> = React.memo(({
  services,
  searchQuery,
  onAddToCart,
  isDark,
  dynamicStyles,
}) => {
  // Senior Dev: Filter logic preserved EXACTLY from original
  const filteredServices = React.useMemo(() => {
    return services.filter((service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const renderServiceCard = React.useCallback(({ item: service }: { item: ServiceItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, dynamicStyles.card]}
      onPress={() => onAddToCart(service)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: theme.colors.secondary + "15" },
        ]}
      >
        <MaterialIcons
          name="content-cut"
          size={22}
          color={theme.colors.secondary}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text
          style={[styles.itemName, dynamicStyles.text]}
          numberOfLines={1}
        >
          {service.name}
        </Text>
        {service.duration && (
          <Text
            style={[styles.itemMeta, dynamicStyles.textSecondary]}
          >
            {service.duration} min
          </Text>
        )}
      </View>
      <Text
        style={[styles.itemPrice, { color: theme.colors.primary }]}
      >
        RWF {service.price.toLocaleString()}
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
        name="content-cut"
        size={48}
        color={dynamicStyles.textSecondary.color}
      />
      <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
        No services found
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filteredServices}
      renderItem={renderServiceCard}
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

SalesServicesList.displayName = 'SalesServicesList';

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
