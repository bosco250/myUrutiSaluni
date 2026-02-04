import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../theme";
import { getImageUrl } from "../../../utils";

interface TrendingCardProps {
  image?: string | null;
  category: string;
  title: string;
  onPress?: () => void;
}

// Refined, elegant gradient palettes for premium salon aesthetic
const CATEGORY_GRADIENTS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap, colors: [string, string] }> = {
  Hair: { icon: "content-cut", colors: ["#1A1A2E", "#4A4A68"] }, // Deep Navy gradient
  Nails: { icon: "spa", colors: ["#2D3436", "#636E72"] }, // Charcoal to Storm
  Face: { icon: "face", colors: ["#3D3D3D", "#6B6B6B"] }, // Elegant Dark Gray
  Massage: { icon: "self-improvement", colors: ["#1E3A5F", "#3D6B8F"] }, // Deep Blue gradient
  Barber: { icon: "content-cut", colors: ["#585757ff", "#3D3D3D"] }, // Classic Black
  Makeup: { icon: "brush", colors: ["#4A3C31", "#6B5545"] }, // Warm Mocha
  Spa: { icon: "spa", colors: ["#2C5364", "#203A43"] }, // Ocean Deep
  Other: { icon: "star", colors: ["#434343", "#1A1A1A"] }, // Premium Dark
};

export default function TrendingCard({
  image,
  category,
  title,
  onPress,
}: TrendingCardProps) {
  // Determine fallback config based on category or default to 'Other'
  // Use loose matching
  const catKey = Object.keys(CATEGORY_GRADIENTS).find(k => category.includes(k)) || 'Other';
  const config = CATEGORY_GRADIENTS[catKey];

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.9} 
    >
      {image ? (
        <Image source={{ uri: getImageUrl(image) || '' }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient
            colors={config.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderContainer}
        >
            <View style={styles.iconCircle}>
                <MaterialIcons name={config.icon} size={40} color="#FFF" />
            </View>
        </LinearGradient>
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
