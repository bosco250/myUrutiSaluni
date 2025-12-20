import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { Button } from "../components";
import { theme } from "../theme";

// Import welcome image
const welcomeImage = require("../../assets/Welcome page.png");
const logo = require("../../assets/Logo.png");

// Helper function to safely get screen dimensions
const getScreenDimensions = () => {
  try {
    return Dimensions.get("window");
  } catch {
    return { width: 375, height: 667 }; // Fallback dimensions
  }
};

interface WelcomeScreenProps {
  navigation?: {
    navigate: (screen: string) => void;
  };
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const handleGetStarted = () => {
    // Complete welcome screen and show auth flow
    navigation?.navigate("complete");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Image */}
      <Image
        source={welcomeImage}
        style={[styles.backgroundImage, { width: getScreenDimensions().width, height: getScreenDimensions().height }]}
        resizeMode="cover"
      />
      
      {/* Dark Overlay for better text readability */}
      <View style={[styles.overlay, { width: getScreenDimensions().width, height: getScreenDimensions().height }]} />

      {/* Decorative Elements */}
      <View style={styles.decorativeTop} />
      <View style={styles.decorativeBottom} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo with Glow Effect */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow} />
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeTitle}>Welcome to</Text>
          <View style={styles.brandContainer}>
            <Text style={styles.brandName}>SIIMBII</Text>
            <View style={styles.brandUnderline} />
          </View>
          <Text style={styles.brandSubtitle}>SALON</Text>
          <Text style={styles.description}>
            Experience luxury and excellence{'\n'}in every service
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <TouchableOpacity
            onPress={handleGetStarted}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E", // Dark grey background
  },
  backgroundImage: {
    position: "absolute",
    opacity: 0.4,
  },
  overlay: {
    position: "absolute",
    backgroundColor: "rgba(28, 28, 30, 0.8)", // Dark overlay with gradient effect
  },
  decorativeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "rgba(200, 155, 104, 0.05)", // Subtle gold tint
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  decorativeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "rgba(200, 155, 104, 0.03)", // Subtle gold tint
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2.5,
    paddingBottom: theme.spacing.xl * 2,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(200, 155, 104, 0.2)",
    shadowColor: "#C89B68",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  logo: {
    width: 150,
    height: 150,
    maxWidth: "100%",
    zIndex: 1,
  },
  textContainer: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    flex: 1,
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 22,
    color: theme.colors.textInverse,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
    opacity: 0.9,
    letterSpacing: 1,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  brandName: {
    fontSize: 52,
    fontWeight: "bold",
    color: "#C89B68", // Gold color
    fontFamily: theme.fonts.bold,
    letterSpacing: 3,
    textShadowColor: "rgba(200, 155, 104, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  brandUnderline: {
    width: 120,
    height: 2,
    backgroundColor: "#C89B68",
    marginTop: theme.spacing.xs,
    opacity: 0.6,
  },
  brandSubtitle: {
    fontSize: 18,
    color: "#C89B68", // Gold color
    fontFamily: theme.fonts.medium,
    letterSpacing: 5,
    marginBottom: theme.spacing.xl,
    opacity: 0.9,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textInverse,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: theme.spacing.xl,
    opacity: 0.85,
    marginTop: theme.spacing.md,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    marginBottom: theme.spacing.md,
    backgroundColor: "#C89B68", // Gold button
    shadowColor: "#C89B68",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: theme.colors.textInverse,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  skipText: {
    fontSize: 16,
    color: theme.colors.textInverse,
    fontFamily: theme.fonts.regular,
    opacity: 0.7,
  },
});

