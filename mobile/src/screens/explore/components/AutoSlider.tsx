import React, { useRef, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Dimensions,
  Animated,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Easing,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 280;
const CARD_SPACING = theme.spacing.md;
const SLIDE_INTERVAL = 4000; // 4 seconds per slide for better UX

interface AutoSliderProps {
  children: React.ReactNode[];
  onItemPress?: (index: number) => void;
}

export default function AutoSlider({ children, onItemPress }: AutoSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const itemWidth = CARD_WIDTH + CARD_SPACING;
  const initialIndex = children.length > 1 ? 1 : 0;
  const scrollX = useRef(new Animated.Value(initialIndex * itemWidth)).current;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isPausedRef = useRef(false);

  // Calculate total width and offsets
  const totalWidth = children.length * itemWidth;

  // Initialize scroll position to second item
  useEffect(() => {
    if (children.length > 1 && scrollViewRef.current) {
      // Small delay to ensure ScrollView is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * itemWidth,
          animated: false,
        });
      }, 100);
    }
  }, [children.length, initialIndex, itemWidth]);

  useEffect(() => {
    if (children.length <= 1) return;

    // Auto-scroll function with fade animation
    const autoScroll = () => {
      if (isPausedRef.current) return;

      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0.85,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % children.length;
          
          scrollViewRef.current?.scrollTo({
            x: nextIndex * itemWidth,
            animated: true,
          });
          
          // Fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
          
          return nextIndex;
        });
      });
    };

    // Start auto-scrolling
    const startAutoScroll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(autoScroll, SLIDE_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [children.length, itemWidth]);

  // Handle manual scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / itemWidth);
    
    // Update animated value for indicators
    scrollX.setValue(offsetX);

    if (index !== currentIndex) {
      setCurrentIndex(index);
      
      // Pause auto-scroll when user manually scrolls
      isPausedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      
      // Resume auto-scroll after 5 seconds of no interaction
      pauseTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
        // Restart auto-scroll
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        const resumeAutoScroll = () => {
          if (isPausedRef.current) return;
          Animated.timing(fadeAnim, {
            toValue: 0.85,
            duration: 200,
            easing: Easing.ease,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex((prevIndex) => {
              const nextIndex = (prevIndex + 1) % children.length;
              scrollViewRef.current?.scrollTo({
                x: nextIndex * itemWidth,
                animated: true,
              });
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }).start();
              return nextIndex;
            });
          });
        };
        intervalRef.current = setInterval(resumeAutoScroll, SLIDE_INTERVAL);
      }, 5000);
    }
  };

  // Pagination dots animation
  const paginationDots = children.map((_, index) => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1.2, 0.8],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.paginationDot,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  });

  if (children.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Decorative gradient overlays */}
      <View style={styles.gradientLeft} pointerEvents="none">
        <MaterialIcons
          name="chevron-left"
          size={24}
          color={theme.colors.primary}
          style={styles.gradientIcon}
        />
      </View>
      <View style={styles.gradientRight} pointerEvents="none">
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme.colors.primary}
          style={styles.gradientIcon}
        />
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 },
          ]}
          style={styles.scrollView}
        >
          {children.map((child, index) => {
            // Animate cards based on scroll position
            const inputRange = [
              (index - 1) * itemWidth,
              index * itemWidth,
              (index + 1) * itemWidth,
            ];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: "clamp",
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.6, 1, 0.6],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.slide,
                  {
                    width: CARD_WIDTH,
                    marginRight: CARD_SPACING,
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              >
                {child}
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Pagination Dots - Hidden */}
      {/* {children.length > 1 && (
        <View style={styles.paginationContainer}>
          {paginationDots}
        </View>
      )} */}

      {/* Decorative floating elements */}
      <Animated.View
        style={[
          styles.decorativeLeft,
          {
            opacity: scrollX.interpolate({
              inputRange: [0, itemWidth],
              outputRange: [0.5, 0.2],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.decorativeRight,
          {
            opacity: scrollX.interpolate({
              inputRange: [(children.length - 2) * itemWidth, (children.length - 1) * itemWidth],
              outputRange: [0.2, 0.5],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginVertical: theme.spacing.xs,
  },
  scrollView: {
    overflow: "visible",
  },
  scrollContent: {
    alignItems: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 4,
  },
  gradientLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: theme.spacing.sm,
    zIndex: 10,
  },
  gradientRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: theme.spacing.sm,
    zIndex: 10,
  },
  gradientIcon: {
    opacity: 0.3,
  },
  decorativeLeft: {
    position: "absolute",
    left: -30,
    top: "30%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.2,
  },
  decorativeRight: {
    position: "absolute",
    right: -30,
    top: "70%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.2,
  },
});

