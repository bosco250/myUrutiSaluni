import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

// Helper function to safely get screen width
const getScreenWidth = () => {
  try {
    return Dimensions.get("window").width;
  } catch {
    return 375; // Fallback width
  }
};

interface NetworkErrorScreenProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function NetworkErrorScreen({
  onRetry,
  isRetrying = false,
}: NetworkErrorScreenProps) {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the icon container
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Fade in animation
    const fadeInAnimation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });

    // Slide up animation
    const slideUpAnimation = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    });

    // Start animations
    pulseAnimation.start();
    Animated.parallel([fadeInAnimation, slideUpAnimation]).start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim, fadeAnim, slideAnim]);

  // Shake animation when retrying
  useEffect(() => {
    if (isRetrying) {
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );
      shakeAnimation.start();
      return () => shakeAnimation.stop();
    }
  }, [isRetrying, iconRotate]);

  const rotateInterpolate = iconRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-10deg", "10deg"],
  });

  const troubleshootingTips = [
    "Check your WiFi or mobile data",
    "Try moving closer to your router",
    "Restart your device if needed",
    "Check if other apps have internet",
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E", "#1C1C1E"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Icon Container with Pulse */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }, { rotate: rotateInterpolate }],
            },
          ]}
        >
          <View style={styles.iconGlow} />
          <View style={styles.iconInner}>
            <Ionicons name="wifi-outline" size={64} color="#C89B68" />
            <View style={styles.slashLine} />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>We couldn't connect to the server</Text>

        {/* Glassmorphism Card with Tips */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={20} color="#C89B68" />
            <Text style={styles.cardTitle}>Troubleshooting Tips</Text>
          </View>
          <View style={styles.divider} />
          {troubleshootingTips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Retry Button */}
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              isRetrying ? ["#8B7355", "#6B5740"] : ["#C89B68", "#A67C52"]
            }
            style={styles.retryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isRetrying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name="refresh-outline"
                  size={22}
                  color="#FFFFFF"
                  style={styles.retryIcon}
                />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer message */}
        <Text style={styles.footerText}>
          We'll automatically reconnect when{"\n"}your connection is restored
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(200, 155, 104, 0.05)",
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(200, 155, 104, 0.03)",
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(200, 155, 104, 0.04)",
    bottom: -30,
    right: 50,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  iconContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  iconGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(200, 155, 104, 0.15)",
    shadowColor: "#C89B68",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(200, 155, 104, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(200, 155, 104, 0.3)",
  },
  slashLine: {
    position: "absolute",
    width: 80,
    height: 3,
    backgroundColor: "#FF6B63",
    transform: [{ rotate: "-45deg" }],
    borderRadius: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: theme.spacing.sm,
    textAlign: "center",
    fontFamily: theme.fonts.bold,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: theme.spacing.xl,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
  card: {
    width: getScreenWidth() - 48,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    // Glassmorphism effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C89B68",
    marginLeft: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: theme.spacing.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C89B68",
    marginRight: theme.spacing.sm,
  },
  tipText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
  retryButton: {
    width: getScreenWidth() - 48,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: theme.spacing.lg,
    shadowColor: "#C89B68",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonDisabled: {
    shadowOpacity: 0.1,
  },
  retryButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  retryIcon: {
    marginRight: theme.spacing.sm,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  footerText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
});
