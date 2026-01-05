import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { useTheme } from "../../context";

interface LoaderProps {
  /** Loading message to display */
  message?: string;
  /** Show or hide the loader (for overlay mode) */
  visible?: boolean;
  /** Use as overlay modal (blocks interaction) */
  overlay?: boolean;
  /** Use fullscreen mode */
  fullscreen?: boolean;
}

/**
 * Premium Loader Component for URUTI Saluni
 * 
 * A beautiful, animated loader with the brand identity.
 * 
 * @example
 * // Basic inline usage
 * <Loader />
 * 
 * // With message
 * <Loader message="Loading..." />
 * 
 * // Fullscreen (for page loads)
 * <Loader fullscreen message="Loading salon details..." />
 * 
 * // Overlay modal (blocks interaction)
 * <Loader overlay visible={isLoading} message="Please wait..." />
 */
export const Loader: React.FC<LoaderProps> = ({
  message,
  visible = true,
  overlay = false,
  fullscreen = false,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0.3)).current;

  // Colors based on theme
  const bgColor = isDark ? theme.colors.gray900 : theme.colors.background;
  const textColor = isDark ? theme.colors.white : theme.colors.text;

  // Start animations
  useEffect(() => {
    // Fade in
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Scale in with bounce
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Continuous rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Pulse effect
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Glow effect
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowValue, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowValue, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();

    return () => {
      rotateAnimation.stop();
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [rotateValue, scaleValue, pulseValue, fadeValue, glowValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // The core loader content
  const LoaderContent = () => (
    <Animated.View
      style={[
        styles.loaderWrapper,
        {
          opacity: fadeValue,
          transform: [{ scale: scaleValue }],
        },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glowValue,
            transform: [{ scale: pulseValue }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.primaryLight,
            theme.colors.primary,
            theme.colors.primaryDark,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* Spinning ring */}
      <Animated.View
        style={[
          styles.spinnerContainer,
          {
            transform: [{ rotate }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            theme.colors.primary,
            theme.colors.primaryLight,
            "transparent",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.spinnerGradient}
        />
      </Animated.View>

      {/* Center icon with pulse */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: pulseValue }],
          },
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBackground}
        >
          <MaterialIcons
            name="spa"
            size={28}
            color={theme.colors.white}
          />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );

  // Message component
  const MessageComponent = () =>
    message ? (
      <Animated.View style={{ opacity: fadeValue }}>
        <Text style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
        <View style={styles.dotsContainer}>
          <AnimatedDots />
        </View>
      </Animated.View>
    ) : null;

  // Animated dots for message
  const AnimatedDots = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const a1 = animateDot(dot1, 0);
      const a2 = animateDot(dot2, 200);
      const a3 = animateDot(dot3, 400);

      a1.start();
      a2.start();
      a3.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
      };
    }, [dot1, dot2, dot3]);

    return (
      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    scale: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Inline mode (default)
  if (!fullscreen && !overlay) {
    return (
      <View style={styles.inlineContainer}>
        <LoaderContent />
        <MessageComponent />
      </View>
    );
  }

  // Fullscreen mode - use absolute positioning to fill screen but respect bottom navigation
  if (fullscreen && !overlay) {
    // Bottom navigation height is approximately 80-90px, plus safe area bottom inset
    const bottomNavHeight = 90;
    const bottomInset = insets.bottom;
    const totalBottomSpace = bottomNavHeight + bottomInset;
    
    return (
      <View style={[
        styles.fullscreenContainer, 
        { 
          backgroundColor: bgColor,
          bottom: totalBottomSpace,
        }
      ]}>
        <LoaderContent />
        <MessageComponent />
        <Text style={[styles.brandText, { color: theme.colors.primary }]}>
          URUTI Saluni
        </Text>
      </View>
    );
  }

  // Overlay modal mode
  if (overlay) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlayBackground}>
          <Animated.View
            style={[
              styles.overlayCard,
              { 
                backgroundColor: bgColor,
                opacity: fadeValue,
                transform: [{ scale: scaleValue }],
              },
            ]}
          >
            <LoaderContent />
            {message && (
              <Text style={[styles.overlayMessage, { color: textColor }]}>
                {message}
              </Text>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // Inline styles
  inlineContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },

  // Loader wrapper
  loaderWrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },

  // Glow ring
  glowRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
  },
  glowGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    opacity: 0.3,
  },

  // Spinner
  spinnerContainer: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
  },
  spinnerGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
  },

  // Icon
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconBackground: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
  },

  // Message
  message: {
    marginTop: theme.spacing.lg,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  dotsContainer: {
    marginTop: theme.spacing.xs,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Fullscreen
  fullscreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  brandText: {
    position: "absolute",
    bottom: 60,
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // Overlay
  overlayBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayCard: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl * 1.5,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 180,
  },
  overlayMessage: {
    marginTop: theme.spacing.lg,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    textAlign: "center",
  },
});

export default Loader;
