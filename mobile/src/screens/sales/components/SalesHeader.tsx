import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface SalesHeaderProps {
  cartCount: number;
  onBack: () => void;
  onCartPress: () => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
  };
}

export const SalesHeader: React.FC<SalesHeaderProps> = React.memo(({
  cartCount,
  onBack,
  onCartPress,
  isDark,
  dynamicStyles,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={dynamicStyles.text.color}
        />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Quick Sale
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.cartButton, { backgroundColor: theme.colors.primary }]}
        onPress={onCartPress}
      >
        <MaterialIcons
          name="shopping-cart"
          size={20}
          color={theme.colors.white}
        />
        {cartCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartCount > 9 ? "9+" : cartCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

SalesHeader.displayName = 'SalesHeader';

// Senior Dev: Styles copied EXACTLY from SalesScreen.tsx (no changes)
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
});
