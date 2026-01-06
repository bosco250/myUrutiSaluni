import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface SalesTabsProps {
  activeTab: 'services' | 'products';
  serviceCount: number;
  productCount: number;
  onTabChange: (tab: 'services' | 'products') => void;
  isDark: boolean;
  dynamicStyles: {
    text: { color: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
}

export const SalesTabs: React.FC<SalesTabsProps> = React.memo(({
  activeTab,
  serviceCount,
  productCount,
  onTabChange,
  isDark,
  dynamicStyles,
}) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "services"
            ? { backgroundColor: theme.colors.primary }
            : dynamicStyles.input,
        ]}
        onPress={() => onTabChange("services")}
      >
        <MaterialIcons
          name="content-cut"
          size={18}
          color={
            activeTab === "services"
              ? theme.colors.white
              : dynamicStyles.text.color
          }
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "services"
                  ? theme.colors.white
                  : dynamicStyles.text.color,
            },
          ]}
        >
          Services ({serviceCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "products"
            ? { backgroundColor: theme.colors.primary }
            : dynamicStyles.input,
        ]}
        onPress={() => onTabChange("products")}
      >
        <MaterialIcons
          name="shopping-bag"
          size={18}
          color={
            activeTab === "products"
              ? theme.colors.white
              : dynamicStyles.text.color
          }
        />
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "products"
                  ? theme.colors.white
                  : dynamicStyles.text.color,
            },
          ]}
        >
          Products ({productCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
});

SalesTabs.displayName = 'SalesTabs';

// Senior Dev: Styles copied EXACTLY from SalesScreen.tsx (no changes)
const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.xs,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
});
