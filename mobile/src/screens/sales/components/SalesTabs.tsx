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
    textSecondary: { color: string };
    container?: { backgroundColor: string };
    input: { backgroundColor: string; color: string; borderColor: string };
  };
}

// Senior Dev: Premium Segment Control Styling
const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  segmentControl: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.gray100,
    borderRadius: 16,
    padding: 4,
    height: 48,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  activeTabShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
});

export const SalesTabs: React.FC<SalesTabsProps> = React.memo(({
  activeTab,
  serviceCount,
  productCount,
  onTabChange,
  isDark,
  dynamicStyles,
}) => {
  return (
    <View style={[styles.tabContainer, { backgroundColor: dynamicStyles.container?.backgroundColor || 'transparent' }]}>
      <View style={[styles.segmentControl, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "services" && [styles.activeTabShadow, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.white }]
          ]}
          onPress={() => onTabChange("services")}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="content-cut"
            size={18}
            color={
              activeTab === "services"
                ? theme.colors.primary
                : dynamicStyles.textSecondary.color
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "services"
                    ? theme.colors.primary
                    : dynamicStyles.textSecondary.color,
              },
            ]}
          >
            Services ({serviceCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "products" && [styles.activeTabShadow, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.white }]
          ]}
          onPress={() => onTabChange("products")}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="shopping-bag"
            size={18}
            color={
              activeTab === "products"
                ? theme.colors.primary
                : dynamicStyles.textSecondary.color
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "products"
                    ? theme.colors.primary
                    : dynamicStyles.textSecondary.color,
              },
            ]}
          >
            Products ({productCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

SalesTabs.displayName = 'SalesTabs';
