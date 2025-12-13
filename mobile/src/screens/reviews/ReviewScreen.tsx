import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { reviewsService, CreateReviewData, ReviewAspects } from "../../services/reviews";

interface ReviewScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId: string;
      salonName: string;
      employeeId?: string;
      employeeName?: string;
      appointmentId?: string;
    };
  };
}

const ASPECT_LABELS: { key: keyof ReviewAspects; label: string; icon: string }[] = [
  { key: "service", label: "Service Quality", icon: "star" },
  { key: "punctuality", label: "Punctuality", icon: "schedule" },
  { key: "cleanliness", label: "Cleanliness", icon: "cleaning-services" },
  { key: "value", label: "Value for Money", icon: "payments" },
];

export default function ReviewScreen({ navigation, route }: ReviewScreenProps) {
  const { isDark } = useTheme();
  const { salonId, salonName, employeeId, employeeName, appointmentId } = route?.params || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [aspects, setAspects] = useState<ReviewAspects>({
    service: 0,
    punctuality: 0,
    cleanliness: 0,
    value: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showAspects, setShowAspects] = useState(false);

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
      borderColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
      color: isDark ? "#FFFFFF" : theme.colors.text,
    },
  };

  const handleSubmit = async () => {
    if (!salonId) {
      Alert.alert("Error", "Missing salon information");
      return;
    }

    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating");
      return;
    }

    setLoading(true);
    try {
      const reviewData: CreateReviewData = {
        salonId,
        rating,
        comment: comment.trim() || undefined,
        employeeId,
        appointmentId,
      };

      // Only include aspects if user has rated them
      const hasAspects = Object.values(aspects).some(v => v > 0);
      if (hasAspects) {
        reviewData.aspects = aspects;
      }

      await reviewsService.createReview(reviewData);

      Alert.alert(
        "Thank You!",
        "Your review has been submitted successfully.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to submit review. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (
    currentRating: number,
    onSelect: (rating: number) => void,
    size = 40
  ) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onSelect(star)}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={star <= currentRating ? "star" : "star-border"}
            size={size}
            color={star <= currentRating ? theme.colors.primary : theme.colors.textTertiary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "Tap to rate";
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="close"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Write Review
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Salon/Employee Info */}
        <View style={[styles.infoCard, dynamicStyles.card]}>
          <MaterialIcons name="store" size={24} color={theme.colors.primary} />
          <View style={styles.infoText}>
            <Text style={[styles.salonName, dynamicStyles.text]}>
              {salonName || "Salon"}
            </Text>
            {employeeName && (
              <Text style={[styles.employeeName, dynamicStyles.textSecondary]}>
                Stylist: {employeeName}
              </Text>
            )}
          </View>
        </View>

        {/* Overall Rating */}
        <View style={styles.ratingSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            How was your experience?
          </Text>
          {renderStars(rating, setRating)}
          <Text style={[styles.ratingLabel, { color: rating > 0 ? theme.colors.primary : dynamicStyles.textSecondary.color }]}>
            {getRatingLabel(rating)}
          </Text>
        </View>

        {/* Aspect Ratings Toggle */}
        <TouchableOpacity
          style={[styles.toggleButton, dynamicStyles.card]}
          onPress={() => setShowAspects(!showAspects)}
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <MaterialIcons name="tune" size={20} color={theme.colors.primary} />
            <Text style={[styles.toggleText, dynamicStyles.text]}>
              Rate specific aspects
            </Text>
          </View>
          <MaterialIcons
            name={showAspects ? "expand-less" : "expand-more"}
            size={24}
            color={dynamicStyles.textSecondary.color}
          />
        </TouchableOpacity>

        {/* Aspect Ratings */}
        {showAspects && (
          <View style={styles.aspectsContainer}>
            {ASPECT_LABELS.map((aspect) => (
              <View key={aspect.key} style={[styles.aspectRow, dynamicStyles.card]}>
                <View style={styles.aspectInfo}>
                  <MaterialIcons
                    name={aspect.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.aspectLabel, dynamicStyles.text]}>
                    {aspect.label}
                  </Text>
                </View>
                {renderStars(
                  aspects[aspect.key],
                  (value) => setAspects((prev) => ({ ...prev, [aspect.key]: value })),
                  24
                )}
              </View>
            ))}
          </View>
        )}

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Share your thoughts (optional)
          </Text>
          <TextInput
            style={[styles.commentInput, dynamicStyles.input]}
            placeholder="What did you like or dislike about your visit?"
            placeholderTextColor={theme.colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.charCount, dynamicStyles.textSecondary]}>
            {comment.length}/500
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            rating === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={rating === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoText: {
    flex: 1,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  employeeName: {
    fontSize: 14,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  starContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
  },
  aspectsContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  aspectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  aspectInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  aspectLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  commentSection: {
    marginBottom: theme.spacing.lg,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
