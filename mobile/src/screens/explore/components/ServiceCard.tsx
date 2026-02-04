import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";
import { Service } from "../../../services/explore";
import { SERVICE_CATEGORIES } from "../../../constants/business";
import { getImageUrl } from "../../../utils";

interface ServiceCardProps {
  service?: Service;
  // Fallback props for backward compatibility
  title?: string;
  author?: string;
  likes?: number;
  image?: any;
  onPress?: () => void;
  onLike?: () => void;
  variant?: "grid" | "list";
}

// Consistent with SalonCard palettes
const GRADIENT_PALETTES = [
  ["#1A1A2E", "#16213E"],
  ["#2D3436", "#000000"],
  ["#1E3A5F", "#0F2027"],
  ["#2C3E50", "#1A1A2E"],
  ["#434343", "#000000"],
];

export default function ServiceCard({
  service,
  title,
  author,
  likes = 0,
  image,
  onPress,
  onLike,
  variant = "grid",
}: ServiceCardProps) {
  const { isDark } = useTheme();

  // Resolve values
  const resolvedTitle = service?.name || title || "Service";
  const resolvedAuthor = service?.salon?.name || author || "Salon";
  const resolvedPrice = service?.basePrice !== undefined ? Number(service.basePrice) : undefined;
  const resolvedDuration = service?.durationMinutes;
  
  // Resolve Image
  const rawImage = 
    (service?.images && service.images.length > 0 ? service.images[0] : null) || 
    service?.imageUrl || 
    image;
  const resolvedImage = typeof rawImage === 'string' ? getImageUrl(rawImage) : rawImage;

  // Resolve Category
  const categoryValue = service?.category || service?.metadata?.category || "Other";
  const categoryOption = SERVICE_CATEGORIES.find(c => c.value === categoryValue);
  const categoryLabel = categoryOption?.label || categoryValue;

  // Gradient Index
  const gradientIndex = React.useMemo(() => {
    const charCode = (service?.id || resolvedTitle).charCodeAt(0) || 0;
    return charCode % GRADIENT_PALETTES.length;
  }, [service?.id, resolvedTitle]);

  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const colors = {
    cardBg: isDark ? theme.colors.gray800 : theme.colors.background,
    text: isDark ? theme.colors.white : theme.colors.text,
    textSecondary: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    border: isDark ? theme.colors.gray700 : theme.colors.borderLight,
  };

  // List View Variant
  if (variant === "list") {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.listImageContainer}> 
             {resolvedImage ? (
                <Image source={{ uri: resolvedImage }} style={styles.image} resizeMode="cover" />
             ) : (
                <LinearGradient
                  colors={GRADIENT_PALETTES[gradientIndex] as [string, string]}
                  style={styles.placeholderGradient}
                >
                  <Text style={styles.initialsText}>{getInitials(resolvedTitle)}</Text>
                </LinearGradient>
             )}
        </View>

        <View style={styles.listContent}>
            <View style={styles.rowBetween}>
               <Text style={[styles.listCategory, { color: theme.colors.primary }]}>{categoryLabel}</Text>
               <TouchableOpacity onPress={onLike}>
                  <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
               </TouchableOpacity>
            </View>
            
            <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{resolvedTitle}</Text>
            <Text style={[styles.listAuthor, { color: colors.textSecondary }]} numberOfLines={1}>{resolvedAuthor}</Text>
            
            <View style={[styles.rowBetween, { marginTop: 4 }]}>
                 {resolvedPrice !== undefined && (
                   <Text style={[styles.priceText, { color: colors.text }]}>
                       RWF {resolvedPrice.toFixed(0)}
                   </Text>
                 )}
                 {resolvedDuration && (
                   <View style={styles.row}>
                       <MaterialIcons name="schedule" size={12} color={colors.textSecondary} />
                       <Text style={[styles.metaText, { color: colors.textSecondary }]}> {resolvedDuration}m</Text>
                   </View>
                 )}
            </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid / Default - Premium Compact
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Top Image Section */}
      <View style={styles.imageContainer}>
          {resolvedImage ? (
             <Image source={{ uri: resolvedImage }} style={styles.image} resizeMode="cover" />
          ) : (
             <LinearGradient
                colors={GRADIENT_PALETTES[gradientIndex] as [string, string]}
                style={styles.placeholderGradient}
             >
                <View style={styles.initialsCircle}>
                   <Text style={styles.initialsText}>{getInitials(resolvedTitle)}</Text>
                </View>
             </LinearGradient>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
          />
          
          {/* Top category Badge */}
          <View style={styles.categoryBadge}>
               <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>

          {/* Title on Image */}
          <View style={styles.imageContent}>
             <Text style={styles.title} numberOfLines={2}>{resolvedTitle}</Text>
          </View>
      </View>
      
      {/* Body Content */}
      <View style={styles.content}>
         <View style={[styles.row, { marginBottom: 8 }]}>
            <MaterialIcons name="store" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>{resolvedAuthor}</Text>
         </View>
         
         <View style={styles.divider} />
         
         <View style={styles.footer}>
             <View>
                 <Text style={styles.priceLabel}>Starting from</Text>
                 <Text style={[styles.priceTextLarge, { color: theme.colors.primary }]}>
                     {resolvedPrice !== undefined ? `RWF ${resolvedPrice}` : 'Price on request'}
                 </Text>
             </View>
             
             {resolvedDuration && (
                 <View style={styles.durationBadge}>
                     <MaterialIcons name="schedule" size={10} color={colors.text} />
                     <Text style={[styles.durationText, { color: colors.text }]}>{resolvedDuration}m</Text>
                 </View>
             )}
         </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    // Web-like shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140, 
    width: "100%",
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
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: "bold",
    color: '#FFF',
    fontFamily: theme.fonts.bold,
  },
  gradientOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '60%',
  },
  categoryBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      // backdropFilter removed as it is not supported in RN
  },
  categoryText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFF',
      textTransform: 'uppercase',
      fontFamily: theme.fonts.medium,
  },
  imageContent: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: '#FFF',
    fontFamily: theme.fonts.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    padding: 12,
    paddingTop: 10,
  },
  author: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },
  divider: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginBottom: 8,
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  priceLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginBottom: 0,
  },
  priceTextLarge: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
  },
  durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: theme.colors.backgroundSecondary, // Default light gray
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
  },
  durationText: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  
  // List Styles
  listCard: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      padding: 8,
      marginBottom: 8,
      alignItems: 'center',
  },
  listImageContainer: {
      width: 80,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      marginRight: 12,
  },
  listContent: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
  },
  listCategory: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 2,
  },
  listTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
  },
  listAuthor: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      marginBottom: 4,
  },
  rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  priceText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
  },
  metaText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
  },
});
