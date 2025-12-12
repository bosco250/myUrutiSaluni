import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";

interface ServiceCardProps {
  image: any; // Kept for compatibility but not used
  title: string;
  author: string;
  likes: number;
  onPress?: () => void;
  onLike?: () => void;
  variant?: "grid" | "list"; // New prop for grid/list view
}

export default function ServiceCard({
  title,
  author,
  likes,
  onPress,
  onLike,
  variant = "grid",
}: ServiceCardProps) {
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

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    title: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    author: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    likes: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  if (variant === "list") {
    return (
      <TouchableOpacity
        style={[styles.listCard, dynamicStyles.card]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.listImage, { backgroundColor: theme.colors.primaryLight }]}>
          <View style={styles.listInitialsContainer}>
            <Text style={styles.listInitials}>{getInitials(title)}</Text>
          </View>
        </View>
        <View style={styles.listContent}>
          <Text style={[styles.listTitle, dynamicStyles.title]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.listFooter}>
            <Text style={[styles.listAuthor, dynamicStyles.author]}>{author}</Text>
            <TouchableOpacity
              style={styles.likesContainer}
              onPress={onLike}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="favorite"
                size={16}
                color={theme.colors.error}
              />
              <Text style={[styles.likes, dynamicStyles.likes]}>{likes}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, dynamicStyles.card]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.placeholderImage, { backgroundColor: theme.colors.primaryLight }]}>
        <View style={styles.initialsContainer}>
          <Text style={styles.initials}>{getInitials(title)}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.author, dynamicStyles.author]}>{author}</Text>
          <TouchableOpacity
            style={styles.likesContainer}
            onPress={onLike}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="favorite"
              size={14}
              color={theme.colors.error}
            />
            <Text style={[styles.likes, dynamicStyles.likes]}>{likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderImage: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  content: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likes: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  // List view styles
  listCard: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listImage: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  listInitialsContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  listInitials: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  listContent: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: "space-between",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  listFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listAuthor: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
});

