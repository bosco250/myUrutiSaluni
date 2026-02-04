import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";
import { Salon } from "../../../services/explore";
import { BUSINESS_TYPES } from "../../../constants/business";
import { getImageUrl } from "../../../utils";

interface SalonCardProps {
  salon: Salon;
  onPress?: () => void;
  width?: number;
  userLocation?: { latitude: number; longitude: number };
}

// Business type lookup with memoization
const BUSINESS_TYPE_MAP = new Map(
  BUSINESS_TYPES.map((t) => [t.value, t.label])
);

const getBusinessTypeLabel = (type?: string): string =>
  BUSINESS_TYPE_MAP.get(type || "") || "Salon";

const getClienteleLabel = (clientele?: string): string => {
  const labels: Record<string, string> = {
    men: "Men",
    women: "Women",
    both: "Unisex",
  };
  return labels[clientele || ""] || "All";
};

const getInitials = (name: string): string =>
  name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");

// Premium gradient backgrounds when no image
const GRADIENT_PALETTES = [
  ["#1A1A2E", "#16213E"],
  ["#2D3436", "#000000"],
  ["#1E3A5F", "#0F2027"],
  ["#2C3E50", "#1A1A2E"],
  ["#434343", "#000000"],
];

// Helper to calculate distance
const calculateDistance = (
  lat1?: number, 
  lon1?: number, 
  lat2?: number, 
  lon2?: number
): string | null => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  
  if (d < 1) return "<1 km";
  return `${d.toFixed(1)} km`;
};

export default function SalonCard({ salon, onPress, width, userLocation }: SalonCardProps) {
  const { isDark } = useTheme();

  const cardWidth = useMemo(() => {
    if (width) return width;
    const screenWidth = Dimensions.get("window").width;
    return (screenWidth - theme.spacing.md * 2 - theme.spacing.sm) / 2;
  }, [width]);

  const colors = useMemo(
    () => ({
      cardBg: isDark ? theme.colors.gray800 : "#FFFFFF",
      border: isDark ? theme.colors.gray700 : "rgba(0,0,0,0.08)",
      title: "#FFFFFF", // On image overlay
      text: isDark ? theme.colors.gray300 : theme.colors.textSecondary,
      primary: theme.colors.primary,
    }),
    [isDark]
  );

  const initials = useMemo(() => getInitials(salon.name), [salon.name]);
  const businessType = useMemo(
    () => getBusinessTypeLabel(salon.businessType),
    [salon.businessType]
  );
  const location = salon.district || salon.city || salon.address;
  
  const gradientIndex = useMemo(() => {
    const charCode = salon.id?.charCodeAt(0) || 0;
    return charCode % GRADIENT_PALETTES.length;
  }, [salon.id]);
  
  const distance = useMemo(() => {
    if (!userLocation) return null;
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      salon.latitude,
      salon.longitude
    );
  }, [userLocation, salon.latitude, salon.longitude]);

  const hasImage = salon.images && salon.images.length > 0;
  const isOpen = salon.status === 'active';

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
      activeOpacity={0.9}
    >
      {/* ─── Image Section ─── */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image 
            source={{ uri: getImageUrl(salon.images![0]) || '' }} 
            style={styles.image} 
            resizeMode="cover" 
          />
        ) : (
          <LinearGradient
            colors={GRADIENT_PALETTES[gradientIndex] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderGradient}
          >
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.6, 1]}
          style={styles.gradientOverlay}
        />

        {/* Top Badges */}
        <View style={styles.topBadges}>
          {isOpen && (
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeText}>OPEN</Text>
            </View>
          )}
        </View>

        {/* Favorite Icon */}
        <View style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={16} color="#FFF" />
        </View>

        {/* Bottom Content on Image */}
        <View style={styles.imageContent}>
          <Text style={styles.salonName} numberOfLines={1}>
            {salon.name}
          </Text>
          
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {location || "Location unavailable"}
            </Text>
            
            {/* Distance Indicator */}
            {distance && (
              <>
                <View style={styles.dotSeparator} />
                <MaterialCommunityIcons name="map-marker-distance" size={12} color="#FFF" />
                <Text style={[styles.locationText, { fontFamily: theme.fonts.bold, marginLeft: 2 }]}>
                  {distance}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ─── Body Section ─── */}
      <View style={styles.body}>
        {/* Description (max 1 line) */}
        {salon.description ? (
          <Text 
            style={[styles.description, { color: colors.text }]} 
            numberOfLines={1}
          >
            {salon.description}
          </Text>
        ) : null}

        {/* Tags / Pills */}
        <View style={styles.pillsContainer}>
          <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
            <Text style={[styles.pillText, { color: colors.text }]}>
              {businessType}
            </Text>
          </View>
          {salon.targetClientele && (
            <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>
                {getClienteleLabel(salon.targetClientele)}
              </Text>
            </View>
          )}
           <View style={[styles.pill, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                {salon.employeeCount || 0} Staff
              </Text>
            </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Footer */}
        <View style={styles.footer}>
          {salon.phone ? (
             <View style={styles.phoneContainer}>
               <MaterialIcons name="phone" size={12} color={colors.text} />
               <Text style={[styles.phoneText, { color: colors.text }]}>{salon.phone}</Text>
             </View>
          ) : <View />}

          <View style={styles.exploreButton}>
            <Text style={styles.exploreText}>Explore</Text>
            <MaterialIcons name="arrow-forward" size={12} color={theme.colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 120, // Reduced height for compactness
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.gray200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  initialsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  topBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeSuccess: {
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  salonName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontFamily: theme.fonts.medium,
    flex: 0,
    maxWidth: '65%', // Prevent overlap with distance
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 2,
  },
  body: {
    padding: 10,
    paddingTop: 8,
  },
  description: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: 8,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    height: 20, // Constrain height to 1 row
    overflow: 'hidden',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 9,
    fontFamily: theme.fonts.medium,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 9,
    fontFamily: theme.fonts.medium,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  exploreText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
});
