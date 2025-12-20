import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";
import { Salon } from "../../../services/explore";

interface SalonCardProps {
  salon: Salon;
  onPress?: () => void;
  width?: number; // Optional width for flexibility
}

// Placeholder - using a colored view instead of image
// In production, use actual salon images from API

export default function SalonCard({ salon, onPress, width }: SalonCardProps) {
  const { isDark } = useTheme();
  
  // Calculate card width - use provided width or default to grid width
  const cardWidth = useMemo(() => {
    if (width) return width;
    try {
      return (Dimensions.get("window").width - theme.spacing.md * 2 - theme.spacing.sm) / 2;
    } catch {
      return 160; // Fallback width
    }
  }, [width]);

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    title: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    text: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
  };

  // Get salon initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={[styles.card, dynamicStyles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <View
          style={[
            styles.placeholderImage,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <View style={styles.initialsContainer}>
            <Text style={styles.initials}>{getInitials(salon.name)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
          {salon.name}
        </Text>
        {salon.description && (
          <Text
            style={[styles.description, dynamicStyles.text]}
            numberOfLines={2}
          >
            {salon.description}
          </Text>
        )}
        <View style={styles.footer}>
          {(salon.address || salon.city || salon.district) && (
            <View style={styles.locationContainer}>
              <MaterialIcons
                name="location-on"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.locationText, dynamicStyles.text]}
                numberOfLines={1}
              >
                {salon.address || `${salon.city || ""}${salon.city && salon.district ? ", " : ""}${salon.district || ""}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  imageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  description: {
    fontSize: 12,
    marginBottom: theme.spacing.sm,
    lineHeight: 16,
    fontFamily: theme.fonts.regular,
  },
  footer: {
    marginTop: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
});
