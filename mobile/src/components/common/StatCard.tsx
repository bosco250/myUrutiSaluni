import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  size?: "small" | "medium" | "large";
}

/**
 * Reusable Statistics Card Component
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  size = "medium",
}) => {
  const iconSize = size === "small" ? 20 : size === "large" ? 28 : 24;
  const valueSize = size === "small" ? 16 : size === "large" ? 22 : 18;
  const containerSize = size === "small" ? 40 : size === "large" ? 56 : 48;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${color}15`,
            width: containerSize,
            height: containerSize,
          },
        ]}
      >
        <MaterialIcons name={icon as any} size={iconSize} color={color} />
      </View>
      <Text style={[styles.value, { fontSize: valueSize }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: {
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
});
