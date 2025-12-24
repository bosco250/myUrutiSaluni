import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  iconSize?: number;
}

/**
 * Reusable Empty State Component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "inbox",
  title,
  subtitle,
  iconSize = 64,
}) => {
  return (
    <View style={styles.container}>
      <MaterialIcons
        name={icon as any}
        size={iconSize}
        color={theme.colors.textTertiary}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
