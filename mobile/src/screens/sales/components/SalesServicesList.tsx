import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
  imageUrl?: string;
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

// Senior Dev: Premium Grid Layout Implementation
const GAP = 12; // Reduced gap for compactness

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
      <View style={styles.imageContainer}>
        {service.imageUrl ? (
          <Image
            source={{ uri: service.imageUrl }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholderIcon,
              { backgroundColor: theme.colors.secondary + "15" },
            ]}
          >
            <MaterialIcons
              name="content-cut"
              size={24}
              color={theme.colors.secondary}
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

        <View style={styles.footer}>
          <Text
            style={[styles.itemPrice, { color: theme.colors.primary }]}
          >
            RWF {service.price.toLocaleString()}
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
      key={'services-grid'} // Force re-render when switching to grid
      data={filteredServices}
      renderItem={renderServiceCard}
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

SalesServicesList.displayName = 'SalesServicesList';

const styles = StyleSheet.create({
  itemsContent: {
    padding: 12, // Reduced padding
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
    overflow: 'hidden', // Essential for image rounding
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    height: 100, // Fixed height for image area
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
    fontSize: 14, // Compact font
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    opacity: 0.7,
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
