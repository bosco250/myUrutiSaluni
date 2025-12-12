import React from "react";
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
}

// Placeholder - using a colored view instead of image
// In production, use actual salon images from API

export default function SalonCard({ salon, onPress }: SalonCardProps) {
  const { isDark } = useTheme();

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
      style={[styles.card, dynamicStyles.card]}
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
          {salon.address && (
            <View style={styles.locationContainer}>
              <MaterialIcons
                name="location-on"
                size={14}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.locationText, dynamicStyles.text]}
                numberOfLines={1}
              >
                {salon.address}
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
    width:
      (Dimensions.get("window").width -
        theme.spacing.md * 2 -
        theme.spacing.sm) /
      2,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: theme.spacing.sm,
  },
  imageContainer: {
    width: "100%",
    height: 120,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  content: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.bold,
  },
  description: {
    fontSize: 11,
    marginBottom: theme.spacing.xs,
    lineHeight: 14,
    fontFamily: theme.fonts.regular,
  },
  footer: {
    marginTop: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
});
