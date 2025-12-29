import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { exploreService, Service } from "../../services/explore";
import { reviewsService, Review } from "../../services/reviews";
import { Loader } from "../../components/common";

interface ServiceDetailScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      serviceId: string;
      service?: Service;
    };
  };
}

type TabType = "Details" | "Reviews";

export default function ServiceDetailScreen({
  navigation,
  route,
}: ServiceDetailScreenProps) {
  const { isDark } = useTheme();
  const [selectedTab, setSelectedTab] = useState<TabType>("Details");
  const [service, setService] = useState<Service | null>(
    route?.params?.service || null
  );
  const [loading, setLoading] = useState(!route?.params?.service);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;

  const fetchService = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      const fetchedService = await exploreService.getServiceById(serviceId);
      setService(fetchedService);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load service details");
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  }, [serviceId, navigation]);

  const fetchReviews = useCallback(async (salonId: string) => {
    try {
      setReviewsLoading(true);
      const response = await reviewsService.getReviews({ salonId, limit: 10 });
      // Handle both nested and direct response structures
      const data = (response as any)?.data || response;
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.total || 0);
    } catch {
      // Silently fail - reviews are optional
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serviceId && !service) {
      fetchService();
    }
  }, [serviceId, service, fetchService]);

  // Fetch reviews when service is loaded
  useEffect(() => {
    if (service?.salonId) {
      fetchReviews(service.salonId);
    }
  }, [service?.salonId, fetchReviews]);


  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality with backend
  };

  const handleBookNow = () => {
    if (!service) return;
    navigation?.navigate("BookingFlow", {
      serviceId: service.id,
      service: service,
      salonId: service.salonId,
    });
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
  };

  if (loading) {
    return (
      <Loader
        fullscreen
        message="Loading service..."
      />
    );
  }

  if (!service) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Service not found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format price
  const formattedPrice = `Starting at $${Number(service.basePrice).toFixed(2)}`;


  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]} numberOfLines={1}>
          {service.name}
        </Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavorite}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorite ? "favorite" : "favorite-border"}
            size={24}
            color={isFavorite ? theme.colors.error : dynamicStyles.text.color}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Image */}
        <View style={[styles.serviceImage, { backgroundColor: theme.colors.primaryLight }]}>
          <View style={styles.serviceImagePlaceholder}>
            <MaterialIcons
              name="spa"
              size={64}
              color={theme.colors.white}
            />
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceTitle, dynamicStyles.text]}>
            {service.name}
          </Text>
          <Text style={[styles.servicePrice, { color: theme.colors.primary }]}>
            {formattedPrice}
          </Text>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Details")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Details"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Details
              </Text>
              {selectedTab === "Details" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Reviews")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Reviews"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Reviews
              </Text>
              {selectedTab === "Reviews" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {selectedTab === "Details" ? (
            <View style={styles.detailsContent}>
              {/* Service Info Cards */}
              <View style={styles.infoCardsContainer}>
                {service.durationMinutes && (
                  <View style={styles.infoCard}>
                    <MaterialIcons
                      name="schedule"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                      Duration
                    </Text>
                    <Text style={[styles.infoCardValue, dynamicStyles.text]}>
                      {service.durationMinutes} min
                    </Text>
                  </View>
                )}
                {service.salon && (
                  <View style={styles.infoCard}>
                    <MaterialIcons
                      name="store"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                      Salon
                    </Text>
                    <Text style={[styles.infoCardValue, dynamicStyles.text]} numberOfLines={1}>
                      {service.salon.name}
                    </Text>
                  </View>
                )}
                <View style={styles.infoCard}>
                  <MaterialIcons
                    name="attach-money"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                    Price
                  </Text>
                  <Text style={[styles.infoCardValue, dynamicStyles.text]}>
                    ${Number(service.basePrice).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Description Section */}
              <Text style={[styles.sectionHeading, dynamicStyles.text, styles.descriptionHeading]}>
                DETAILED DESCRIPTION
              </Text>
              <Text style={[styles.description, dynamicStyles.textSecondary, styles.descriptionContent]}>
                {service.description ||
                  "Balayage is a French hair coloring technique where the color is painted on the hair by hand as to create a graduated, more natural-looking highlight effect. That means the final look is less stripy than highlights of the past, while offering the same gorgeous dimension and fun color."}
              </Text>

              {/* Benefits Section */}
              <Text style={[styles.sectionHeading, dynamicStyles.text, { marginTop: theme.spacing.lg }]}>
                KEY BENEFITS
              </Text>
              <View style={styles.benefitsList}>
                {[
                  "Natural-looking highlights",
                  "Low maintenance",
                  "Customizable color placement",
                  "Suitable for all hair types",
                ].map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={[styles.benefitText, dynamicStyles.text]}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.reviewsContent}>
              {/* Rating Summary */}
              {totalReviews > 0 && (
                <View style={[styles.ratingSummary, dynamicStyles.card]}>
                  <View style={styles.ratingAverage}>
                    <Text style={[styles.ratingNumber, dynamicStyles.text]}>
                      {averageRating.toFixed(1)}
                    </Text>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= Math.round(averageRating) ? "star" : "star-border"}
                          size={16}
                          color={theme.colors.primary}
                        />
                      ))}
                    </View>
                    <Text style={[styles.ratingCount, dynamicStyles.textSecondary]}>
                      {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <View style={styles.loadingReviews}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
                    Loading reviews...
                  </Text>
                </View>
              ) : reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <MaterialIcons
                    name="rate-review"
                    size={48}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.emptyReviewsText, dynamicStyles.text]}>
                    No reviews yet
                  </Text>
                  <Text style={[styles.emptyReviewsSubtext, dynamicStyles.textSecondary]}>
                    Be the first to review this service
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review.id} style={[styles.reviewCard, dynamicStyles.card]}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          <View style={[styles.reviewerAvatar, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.reviewerInitials}>
                              {review.customer?.user?.fullName?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.reviewerName, dynamicStyles.text]}>
                              {review.customer?.user?.fullName || 'Customer'}
                            </Text>
                            <Text style={[styles.reviewDate, dynamicStyles.textSecondary]}>
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.reviewRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialIcons
                              key={star}
                              name={star <= review.rating ? "star" : "star-border"}
                              size={14}
                              color={theme.colors.primary}
                            />
                          ))}
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={[styles.reviewComment, dynamicStyles.text]}>
                          {review.comment}
                        </Text>
                      )}
                      {review.isVerified && (
                        <View style={styles.verifiedBadge}>
                          <MaterialIcons name="verified" size={12} color={theme.colors.success} />
                          <Text style={[styles.verifiedText, { color: theme.colors.success }]}>
                            Verified Visit
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Write Review Button */}
              <TouchableOpacity
                style={[styles.writeReviewButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  navigation?.navigate("Review", {
                    salonId: service.salonId,
                    salonName: service.salon?.name || "Salon",
                  });
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="star"
                  size={18}
                  color={theme.colors.white}
                />
                <Text style={styles.writeReviewButtonText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={[styles.bookButtonContainer, dynamicStyles.card]}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleBookNow}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="event"
            size={20}
            color={theme.colors.white}
            style={styles.bookButtonIcon}
          />
          <Text style={[styles.bookButtonText, { color: theme.colors.white }]}>
            Book Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  favoriteButton: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav and book button
  },
  serviceImage: {
    width: "100%",
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.bold,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.medium,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
  },
  detailsContent: {
    marginTop: theme.spacing.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
  },
  descriptionHeading: {
    marginTop: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  descriptionContent: {
    marginTop: theme.spacing.sm,
  },
  benefitsList: {
    marginTop: theme.spacing.xs,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
  infoCardsContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  infoCard: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  infoCardLabel: {
    fontSize: 12,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  reviewsContent: {
    marginTop: theme.spacing.sm,
  },
  emptyReviews: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyReviewsText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.medium,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    marginTop: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
  },
  bookButtonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    minHeight: 52,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonIcon: {
    marginRight: theme.spacing.xs,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  writeReviewButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  // Reviews styles
  ratingSummary: {
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  ratingAverage: {
    alignItems: "center",
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  ratingStars: {
    flexDirection: "row",
    marginTop: theme.spacing.xs,
  },
  ratingCount: {
    fontSize: 14,
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  loadingReviews: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  reviewsList: {
    gap: theme.spacing.md,
  },
  reviewCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewerInitials: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
});

