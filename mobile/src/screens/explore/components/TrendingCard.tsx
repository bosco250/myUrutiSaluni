import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";

interface TrendingCardProps {
  image: any; // Kept for compatibility but not used
  category: string;
  title: string;
  onPress?: () => void;
}

export default function TrendingCard({
  category,
  title,
  onPress,
}: TrendingCardProps) {
  const { isDark } = useTheme();

  // Get initials from title for placeholder
  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          styles.placeholderImage,
          { backgroundColor: theme.colors.primaryLight },
        ]}
      >
        <MaterialIcons name="spa" size={48} color={theme.colors.primary} />
      </View>
      <View style={styles.overlay}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 200,
    borderRadius: 16,
    marginRight: theme.spacing.md,
    marginTop: theme.spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.overlayLight,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    marginBottom: theme.spacing.xs,
  },
  categoryText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
});
