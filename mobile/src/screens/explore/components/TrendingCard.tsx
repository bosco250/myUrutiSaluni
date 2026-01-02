import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../theme";

interface TrendingCardProps {
  image?: string | null;
  category: string;
  title: string;
  onPress?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap, color: string }> = {
  Hair: { icon: "content-cut", color: "#FF6B6B" },
  Nails: { icon: "spa", color: "#4ECDC4" },
  Face: { icon: "face", color: "#FFE66D" },
  Massage: { icon: "self-improvement", color: "#6B5B95" },
  Barber: { icon: "content-cut", color: "#95A5A6" },
  Makeup: { icon: "brush", color: "#FF9FF3" },
  Other: { icon: "star", color: "#A8E6CF" },
};

export default function TrendingCard({
  image,
  category,
  title,
  onPress,
}: TrendingCardProps) {
  // Determine fallback config based on category or default to 'Other'
  // Use loose matching
  const catKey = Object.keys(CATEGORY_CONFIG).find(k => category.includes(k)) || 'Other';
  const config = CATEGORY_CONFIG[catKey];

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.9} 
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholderContainer, { backgroundColor: config.color }]}>
            <View style={styles.iconCircle}>
                <MaterialIcons name={config.icon} size={40} color="#FFF" />
            </View>
        </View>
      )}
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.overlay}
      >
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    height: 180,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden', // Ensures image/gradient respects border radius
    backgroundColor: theme.colors.backgroundSecondary,
    
    // Shadow
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 60, // Gradient height
    justifyContent: 'flex-end',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: theme.fonts.medium,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  }
});
