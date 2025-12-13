import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  aiService,
  FaceAnalysis,
  StyleRecommendation,
} from "../../services/ai";

const CACHED_PHOTO_KEY = "@ai_cached_photo_uri";
const CACHED_ANALYSIS_KEY = "@ai_cached_analysis";

const { width } = Dimensions.get("window");

// No logo placeholder - we'll use a better UI placeholder

// Mock data - fallback if AI analysis fails
const mockFaceAnalysis: FaceAnalysis = {
  faceShape: "Oval",
  analysisDescription: "Your perfect match analysis",
  recommendations: [
    {
      id: "1",
      name: "Long Waves",
      matchPercentage: 90,
      description: "Soft waves that frame the face beautifully",
    },
    {
      id: "2",
      name: "High Bun",
      matchPercentage: 95,
      description: "Elegant and versatile style",
    },
    {
      id: "3",
      name: "Curly Updo",
      matchPercentage: 88,
      description: "Perfect for special occasions",
    },
    {
      id: "4",
      name: "Side Part",
      matchPercentage: 85,
      description: "Classic and timeless look",
    },
  ],
  stylingTips: [
    "Styles that add width at the temples work great",
    "Soft layers frame your face beautifully",
    "Side-swept bangs complement your features",
  ],
};

interface AIConsultantScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      photoUri?: string;
    };
  };
}

export default function AIConsultantScreen({
  navigation,
  route,
}: AIConsultantScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(
    route?.params?.photoUri || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRequestRef = useRef<boolean>(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? "#1C1C1E" : theme.colors.background,
    },
    text: {
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? "#8E8E93" : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.background,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
  };

  useEffect(() => {
    const loadPhotoAndAnalyze = async () => {
      let shouldAnalyze = false;
      let currentPhotoUri = photoUri;

      // If no photo provided, try to load from cache
      if (!currentPhotoUri) {
        try {
          const cachedPhoto = await AsyncStorage.getItem(CACHED_PHOTO_KEY);
          if (cachedPhoto) {
            currentPhotoUri = cachedPhoto;
            setPhotoUri(cachedPhoto);
            // Check if we have cached analysis for this photo
            const cachedAnalysis =
              await AsyncStorage.getItem(CACHED_ANALYSIS_KEY);
            if (cachedAnalysis) {
              try {
                const analysis = JSON.parse(cachedAnalysis);
                setFaceAnalysis(analysis);
                setLoading(false);
                setAnalyzing(false);
                return; // Use cached analysis, no need to re-analyze
              } catch (error) {
                console.error("Error parsing cached analysis:", error);
                // If parsing fails, we'll analyze again
                shouldAnalyze = true;
              }
            } else {
              shouldAnalyze = true; // No cached analysis, need to analyze
            }
          } else {
            setLoading(false);
            setError("No photo provided. Please take a photo first.");
            return;
          }
        } catch (error) {
          console.error("Error loading cached photo:", error);
          setLoading(false);
          setError("No photo provided. Please take a photo first.");
          return;
        }
      } else {
        // New photo provided - check if it's different from cached
        try {
          const cachedPhoto = await AsyncStorage.getItem(CACHED_PHOTO_KEY);
          if (cachedPhoto !== currentPhotoUri) {
            // Different photo, need to analyze
            shouldAnalyze = true;
            await AsyncStorage.setItem(CACHED_PHOTO_KEY, currentPhotoUri);
            // Clear old analysis since photo changed
            await AsyncStorage.removeItem(CACHED_ANALYSIS_KEY);
          } else {
            // Same photo - check if we have cached analysis
            const cachedAnalysis =
              await AsyncStorage.getItem(CACHED_ANALYSIS_KEY);
            if (cachedAnalysis) {
              try {
                const analysis = JSON.parse(cachedAnalysis);
                setFaceAnalysis(analysis);
                setLoading(false);
                setAnalyzing(false);
                return; // Use cached analysis
              } catch (error) {
                console.error("Error parsing cached analysis:", error);
                shouldAnalyze = true;
              }
            } else {
              shouldAnalyze = true; // No cached analysis
            }
          }
        } catch (error) {
          console.error("Error checking cached photo:", error);
          shouldAnalyze = true;
        }
      }

      // Only analyze if needed
      if (shouldAnalyze && currentPhotoUri) {
        analyzePhoto(currentPhotoUri);
      } else {
        setLoading(false);
      }
    };

    loadPhotoAndAnalyze();
  }, [photoUri]);

  const analyzePhoto = async (photoToAnalyze?: string) => {
    const photoToUse = photoToAnalyze || photoUri;
    if (!photoToUse) {
      setError("No photo to analyze");
      setLoading(false);
      return;
    }

    // Reset cancellation flag
    cancelRequestRef.current = false;
    setIsCancelled(false);

    try {
      setAnalyzing(true);
      setError(null);

      // Call real AI service
      const analysis = await aiService.analyzeFace(photoToUse);

      // Check if cancelled before updating state
      if (cancelRequestRef.current) {
        return;
      }

      // Analysis already includes imageUrl from backend
      setFaceAnalysis(analysis);

      // Cache the analysis results
      try {
        await AsyncStorage.setItem(
          CACHED_ANALYSIS_KEY,
          JSON.stringify(analysis)
        );
      } catch (error) {
        console.error("Error saving analysis to cache:", error);
      }
    } catch (error: any) {
      // Check if cancelled
      if (cancelRequestRef.current) {
        return;
      }
      console.error("Error analyzing face:", error);
      setError(error.message || "Failed to analyze face. Please try again.");
      // Show fallback mock data on error
      setFaceAnalysis(mockFaceAnalysis);
    } finally {
      if (!cancelRequestRef.current) {
        setAnalyzing(false);
        setLoading(false);
      }
    }
  };

  const handleCancelAnalysis = () => {
    cancelRequestRef.current = true;
    setIsCancelled(true);
    setAnalyzing(false);
    setLoading(false);
    // Navigate back to face scan screen
    navigation.goBack();
  };

  const handleTryOn = (style: StyleRecommendation) => {
    // Navigate to Search screen with the hairstyle name as initial query
    navigation.navigate("Search", { initialQuery: style.name });
  };

  const handleTakePhoto = async () => {
    // Clear cached analysis when taking a new photo
    try {
      await AsyncStorage.removeItem(CACHED_ANALYSIS_KEY);
      await AsyncStorage.removeItem(CACHED_PHOTO_KEY);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
    navigation.goBack(); // Go back to AIFaceScanScreen to take new photo
  };

  if (loading || analyzing) {
    return (
      <View style={[styles.container, { backgroundColor: "#1C1C1E" }]}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {analyzing ? "Analyzing your face shape..." : "Loading..."}
          </Text>
          {analyzing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelAnalysis}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section with Face Analysis */}
        <View style={styles.heroSection}>
          {/* Background Image - User's Face */}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require("../../../assets/Logo.png")}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />

          {/* Header */}
          <SafeAreaView style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>AI Consultant</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>

          {/* Face Analysis Result */}
          <View style={styles.heroContent}>
            <Text style={styles.faceShapeTitle}>
              {faceAnalysis?.faceShape} Face
            </Text>
            <Text style={styles.faceShapeSubtitle}>
              {faceAnalysis?.analysisDescription}
            </Text>
          </View>
        </View>

        {/* Recommended Styles Section */}
        <View style={[styles.recommendationsSection, dynamicStyles.container]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Recommended Styles
          </Text>

          {error && (
            <View style={[styles.errorCard, dynamicStyles.card]}>
              <MaterialIcons
                name="error-outline"
                size={24}
                color={theme.colors.error}
              />
              <Text style={[styles.errorText, dynamicStyles.text]}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.stylesGrid}>
            {faceAnalysis?.recommendations.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[styles.styleCard, dynamicStyles.card]}
                onPress={() =>
                  navigation.navigate("RecommendationDetail", {
                    recommendation: style,
                    photoUri: photoUri,
                    faceShape: faceAnalysis?.faceShape,
                  })
                }
                activeOpacity={0.8}
              >
                {/* Style Image */}
                {style.imageUrl ? (
                  <Image
                    source={{ uri: style.imageUrl }}
                    style={styles.styleImage}
                    resizeMode="cover"
                    onError={() => {
                      // Image failed to load - will show placeholder
                    }}
                  />
                ) : (
                  <View style={[styles.styleImage, styles.imagePlaceholder]}>
                    <MaterialIcons
                      name="image"
                      size={40}
                      color={isDark ? "#8E8E93" : "#C7C7CC"}
                    />
                    <Text
                      style={[
                        styles.placeholderText,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      Image loading...
                    </Text>
                  </View>
                )}

                {/* Style Info */}
                <View style={styles.styleInfo}>
                  <Text style={[styles.styleName, dynamicStyles.text]}>
                    {style.name}
                  </Text>

                  {style.description && (
                    <Text
                      style={[
                        styles.styleDescription,
                        dynamicStyles.textSecondary,
                      ]}
                      numberOfLines={2}
                    >
                      {style.description}
                    </Text>
                  )}

                  <View style={styles.matchRow}>
                    <Text
                      style={[
                        styles.matchPercentage,
                        dynamicStyles.textSecondary,
                      ]}
                    >
                      {style.matchPercentage}% Match
                    </Text>

                    <View onStartShouldSetResponder={() => true}>
                      <TouchableOpacity
                        style={styles.tryOnButton}
                        onPress={() => handleTryOn(style)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.tryOnButtonText}>Try On</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Take New Photo Button */}
          <TouchableOpacity
            style={styles.takePhotoButton}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="photo-camera"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.takePhotoButtonText}>Take New Photo</Text>
          </TouchableOpacity>

          {/* AI Tips */}
          {faceAnalysis?.stylingTips && faceAnalysis.stylingTips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={[styles.tipsTitle, dynamicStyles.text]}>
                Styling Tips for {faceAnalysis?.faceShape} Face
              </Text>

              {faceAnalysis.stylingTips.map((tip, index) => (
                <View key={index} style={[styles.tipCard, dynamicStyles.card]}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={[styles.tipText, dynamicStyles.text]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cancelButton: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: 400,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    backgroundColor: "#2C2C2E",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  heroContent: {
    position: "absolute",
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  faceShapeTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  faceShapeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: theme.fonts.regular,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recommendationsSection: {
    padding: theme.spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    backgroundColor: theme.colors.background,
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  stylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  styleCard: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  styleImage: {
    width: "100%",
    height: 140,
    backgroundColor: theme.colors.gray200,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.gray200,
  },
  placeholderText: {
    fontSize: 12,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  styleInfo: {
    padding: theme.spacing.sm,
  },
  styleName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchPercentage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  tryOnButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
  },
  tryOnButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  takePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  takePhotoButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  tipsSection: {
    marginBottom: theme.spacing.xl,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error + "20",
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
  },
  styleDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
});
