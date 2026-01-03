import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";
import { Salon } from "../../../services/explore";
import { BUSINESS_TYPES } from "../../../constants/business";

interface SalonCardProps {
  salon: Salon;
  onPress?: () => void;
  width?: number;
}

// Business type lookup with memoization
const BUSINESS_TYPE_MAP = new Map(
  BUSINESS_TYPES.map((t) => [t.value, t.label])
);

const getBusinessTypeLabel = (type?: string): string =>
  BUSINESS_TYPE_MAP.get(type || "") || "Salon";

const getClienteleIcon = (clientele?: string): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    men: "male",
    women: "female",
    both: "people",
  };
  return icons[clientele || ""] || "people";
};

const getInitials = (name: string): string =>
  name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");

export default function SalonCard({ salon, onPress, width }: SalonCardProps) {
  const { isDark } = useTheme();

  const cardWidth = useMemo(() => {
    if (width) return width;
    const screenWidth = Dimensions.get("window").width;
    return (screenWidth - theme.spacing.md * 2 - theme.spacing.sm) / 2;
  }, [width]);

  const colors = useMemo(
    () => ({
      cardBg: isDark ? theme.colors.gray800 : "#FFFFFF",
      border: isDark ? theme.colors.gray700 : "#E5E7EB",
      title: isDark ? theme.colors.white : "#111827",
      subtitle: isDark ? theme.colors.gray400 : "#6B7280",
      badgeBg: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
      badgeText: isDark ? "#E5E7EB" : "#374151",
    }),
    [isDark]
  );

  const initials = useMemo(() => getInitials(salon.name), [salon.name]);
  const businessType = useMemo(
    () => getBusinessTypeLabel(salon.businessType),
    [salon.businessType]
  );
  const location = salon.district || salon.city || salon.address;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Image / Avatar Section */}
      <View style={styles.imageSection}>
        {salon.images && salon.images.length > 0 ? (
           <Image source={{ uri: salon.images[0] }} style={styles.salonImage} resizeMode="cover" />
        ) : (
           <View style={styles.avatarContainer}>
             <Text style={styles.avatarText}>{initials}</Text>
           </View>
        )}

        {/* Category Tag */}
        <View style={[styles.categoryTag, { backgroundColor: colors.badgeBg }]}>
          <Text style={[styles.categoryText, { color: colors.badgeText }]}>
            {businessType}
          </Text>
        </View>

        {/* Clientele Indicator */}
        {salon.targetClientele && (
          <View style={styles.clienteleTag}>
            <Ionicons
              name={getClienteleIcon(salon.targetClientele)}
              size={12}
              color="#FFFFFF"
            />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.title }]}
          numberOfLines={1}
        >
          {salon.name}
        </Text>

        {salon.description && (
          <Text
            style={[styles.description, { color: colors.subtitle }]}
            numberOfLines={2}
          >
            {salon.description}
          </Text>
        )}

        {/* Meta Info */}
        <View style={styles.metaRow}>
          {salon.employeeCount !== undefined && salon.employeeCount > 0 && (
            <View style={styles.metaItem}>
              <MaterialIcons name="people" size={12} color={theme.colors.primary} />
              <Text style={[styles.metaText, { color: colors.subtitle }]}>
                {salon.employeeCount}
              </Text>
            </View>
          )}

          {location && (
            <View style={[styles.metaItem, styles.locationItem]}>
              <MaterialIcons name="place" size={12} color={theme.colors.primary} />
              <Text
                style={[styles.metaText, { color: colors.subtitle }]}
                numberOfLines={1}
              >
                {location}
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
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageSection: {
    height: 120,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  salonImage: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  categoryTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
  },
  clienteleTag: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.semibold,
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationItem: {
    flex: 1,
  },
  metaText: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
  },
});
