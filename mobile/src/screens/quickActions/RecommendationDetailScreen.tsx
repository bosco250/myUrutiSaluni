import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { StyleRecommendation } from "../../services/ai";

const { width, height } = Dimensions.get("window");

interface RecommendationDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      recommendation: StyleRecommendation;
      photoUri?: string;
      faceShape?: string;
    };
  };
}

export default function RecommendationDetailScreen({
  navigation,
  route,
}: RecommendationDetailScreenProps) {
  const { isDark } = useTheme();
  const recommendation = route?.params?.recommendation;
  const photoUri = route?.params?.photoUri;
  const faceShape = route?.params?.faceShape;

  if (!recommendation) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? "#1C1C1E" : theme.colors.background }]}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: isDark ? "#FFFFFF" : theme.colors.text }]}>
            Recommendation not found
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

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

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, dynamicStyles.text]}>Style Details</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>

        {/* Large Image Section */}
        <View style={styles.imageSection}>
          {recommendation.imageUrl ? (
            <Image
              source={{ uri: recommendation.imageUrl }}
              style={styles.largeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.largeImage, styles.imagePlaceholder]}>
              <MaterialIcons
                name="image"
                size={80}
                color={isDark ? "#8E8E93" : "#C7C7CC"}
              />
              <Text style={[styles.placeholderText, dynamicStyles.textSecondary]}>
                Image not available
              </Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={[styles.contentSection, dynamicStyles.container]}>
          {/* Style Name and Match */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={[styles.styleName, dynamicStyles.text]}>
                {recommendation.name}
              </Text>
              {faceShape && (
                <Text style={[styles.faceShapeLabel, dynamicStyles.textSecondary]}>
                  For {faceShape} Face
                </Text>
              )}
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchPercentage}>
                {recommendation.matchPercentage}%
              </Text>
              <Text style={styles.matchLabel}>Match</Text>
            </View>
          </View>

          {/* Description */}
          {recommendation.description && (
            <View style={[styles.descriptionCard, dynamicStyles.card]}>
              <Text style={[styles.descriptionTitle, dynamicStyles.text]}>
                About This Style
              </Text>
              <Text style={[styles.descriptionText, dynamicStyles.textSecondary]}>
                {recommendation.description}
              </Text>
            </View>
          )}

          {/* User Photo Preview */}
          {photoUri && (
            <View style={[styles.photoPreviewCard, dynamicStyles.card]}>
              <Text style={[styles.photoPreviewTitle, dynamicStyles.text]}>
                Your Photo
              </Text>
              <Image
                source={{ uri: photoUri }}
                style={styles.userPhoto}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Search", { initialQuery: recommendation.name })}
              activeOpacity={0.8}
            >
              <MaterialIcons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Find Salons</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, dynamicStyles.card]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, dynamicStyles.text]}>
                Back to Recommendations
              </Text>
            </TouchableOpacity>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "transparent",
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
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  imageSection: {
    width: "100%",
    height: height * 0.5,
    backgroundColor: "#2C2C2E",
  },
  largeImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.gray200,
  },
  placeholderText: {
    fontSize: 14,
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
  contentSection: {
    padding: theme.spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    backgroundColor: theme.colors.background,
    minHeight: height * 0.5,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  styleName: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  faceShapeLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  matchBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 70,
  },
  matchPercentage: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  matchLabel: {
    fontSize: 10,
    color: "#FFFFFF",
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  descriptionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
  },
  photoPreviewCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  photoPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  userPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: theme.colors.gray200,
  },
  actionsContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
  },
});

