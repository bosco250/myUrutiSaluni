import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../theme";
import { useTheme } from "../../../context";
import { Service } from "../../../services/explore";
import { SERVICE_CATEGORIES } from "../../../constants/business";

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

export default function ServiceCard({
  service,
  title,
  author,
  likes = 0,
  onPress,
  onLike,
  variant = "grid",
}: ServiceCardProps) {
  const { isDark } = useTheme();

  // Resolve values from service object or props
  const resolvedTitle = service?.name || title || "Service";
  const resolvedAuthor = service?.salon?.name || author || "Salon";
  const resolvedPrice = service?.basePrice !== undefined ? Number(service.basePrice) : undefined;
  const resolvedDuration = service?.durationMinutes;
  
  // Resolve Category Label and Color
  const categoryValue = service?.category || service?.metadata?.category || "Other";
  const categoryOption = SERVICE_CATEGORIES.find(c => c.value === categoryValue);
  const categoryLabel = categoryOption?.label || categoryValue;
  // Assign random color based on category if not defined? 
  // We can use a hash map or predefined colors.
  const getCategoryColor = (cat: string) => {
      const colors = [theme.colors.primary, "#E91E63", "#9C27B0", "#673AB7", "#FF9800", "#4CAF50"];
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  };
  const categoryColor = getCategoryColor(categoryValue);

  // Resolve Gender
  const genderValue = service?.targetGender || service?.metadata?.targetGender;


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
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    border: {
        borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    }
  };

  const GenderIcon = () => {
    if (!genderValue) return null;
    const lower = genderValue.toLowerCase();
    let iconName = "person";
    if (lower === 'men') iconName = "male";
    if (lower === 'women') iconName = "female";
    if (lower === 'both' || lower === 'unisex') iconName = "wc"; // wc is distinct
    
    // Fallback if 'wc' not valid in MaterialIcons? It is.
    return (
        <View style={styles.genderBadge}>
            <MaterialIcons name={iconName as any} size={12} color={theme.colors.textSecondary} />
            <Text style={styles.genderText}>{lower === 'both' ? 'Both' : (lower.charAt(0).toUpperCase() + lower.slice(1))}</Text>
        </View>
    );
  };

  if (variant === "list") {
    return (
      <TouchableOpacity
        style={[styles.listCard, dynamicStyles.card]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Compact Image */}
        <View style={[styles.listImage, { backgroundColor: categoryColor + '20' }]}> 
             <Text style={[styles.initials, { color: categoryColor, fontSize: 20 }]}>{getInitials(resolvedTitle)}</Text>
        </View>

        <View style={styles.listContent}>
           <View style={styles.rowBetween}>
               <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15' }]}>
                   <Text style={[styles.categoryText, { color: categoryColor }]}>{categoryLabel}</Text>
               </View>
               {resolvedPrice !== undefined && (
                   <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                       RWF {resolvedPrice.toFixed(0)}
                   </Text>
               )}
           </View>
           
           <Text style={[styles.listTitle, dynamicStyles.text]} numberOfLines={1}>{resolvedTitle}</Text>
           <Text style={[styles.listAuthor, dynamicStyles.textSecondary]} numberOfLines={1}>{resolvedAuthor}</Text>
           
           <View style={[styles.rowBetween, { marginTop: 4 }]}>
               <GenderIcon />
               {resolvedDuration && (
                   <View style={styles.row}>
                       <MaterialIcons name="schedule" size={12} color={theme.colors.textSecondary} />
                       <Text style={[styles.metaText, dynamicStyles.textSecondary]}> {resolvedDuration}m</Text>
                   </View>
               )}
           </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid / Default - Compact
  return (
    <TouchableOpacity
      style={[styles.card, dynamicStyles.card]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.initials, { color: categoryColor }]}>{getInitials(resolvedTitle)}</Text>
          <View style={styles.badgeOverlay}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.colors.background, opacity: 0.95 }]}>
                   <Text style={[styles.categoryText, { color: categoryColor, fontWeight: '700' }]}>{categoryLabel}</Text>
              </View>
          </View>
      </View>
      
      <View style={styles.content}>
         <View style={styles.rowBetween}>
            <Text style={[styles.title, dynamicStyles.text]} numberOfLines={1}>{resolvedTitle}</Text>
         </View>
         <Text style={[styles.author, dynamicStyles.textSecondary]} numberOfLines={1}>{resolvedAuthor}</Text>
         
         <View style={[styles.footer, dynamicStyles.border]}>
             <View style={styles.row}>
                 {resolvedPrice !== undefined ? (
                    <Text style={[styles.priceText, { color: theme.colors.primary }]}>RWF {resolvedPrice}</Text>
                 ) : null}
             </View>
             <View style={styles.row}>
                {genderValue && (
                    <MaterialIcons 
                        name={genderValue === 'men' ? 'male' : genderValue === 'women' ? 'female' : 'wc'} 
                        size={14} 
                        color={theme.colors.textSecondary} 
                        style={{marginRight: 4}}
                    />
                )}
                {resolvedDuration && (
                    <Text style={[styles.metaText, dynamicStyles.textSecondary]}>{resolvedDuration}m</Text>
                )}
             </View>
         </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  imageContainer: {
    height: 120, // Compact height
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  badgeOverlay: {
      position: 'absolute',
      top: 8,
      left: 8,
      flexDirection: 'row',
  },
  initials: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 15, // Slightly smaller for compact
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    flex: 1,
  },
  author: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
    fontFamily: theme.fonts.regular,
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderColor: theme.colors.borderLight, // Overridden by dynamic
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
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
  categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: theme.colors.backgroundSecondary, // Default
  },
  categoryText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      fontFamily: theme.fonts.medium,
  },
  genderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
  },
  genderText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular,
  },
  
  // List Styles
  listCard: {
      flexDirection: 'row',
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      padding: 8,
      marginBottom: 8,
      alignItems: 'center',
  },
  listImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  listContent: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
  },
  listTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      marginVertical: 2,
  },
  listAuthor: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      marginBottom: 4,
  },
});
