import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { exploreService, Service } from "../../services/explore";

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
  const unreadNotificationCount = useUnreadNotifications();
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "explore" | "notifications" | "profile">("explore");
  const [selectedTab, setSelectedTab] = useState<TabType>("Details");
  const [service, setService] = useState<Service | null>(
    route?.params?.service || null
  );
  const [loading, setLoading] = useState(!route?.params?.service);
  const [isFavorite, setIsFavorite] = useState(false);

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;

  useEffect(() => {
    if (serviceId && !service) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      const fetchedService = await exploreService.getServiceById(serviceId);
      setService(fetchedService);
    } catch (error: any) {
      console.error("Error fetching service:", error);
      Alert.alert("Error", error.message || "Failed to load service details");
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (
    tab: "home" | "bookings" | "explore" | "notifications" | "profile"
  ) => {
    setActiveTab(tab);
    if (tab !== "explore") {
      const screenName =
        tab === "home" ? "Home" : tab.charAt(0).toUpperCase() + tab.slice(1);
      navigation?.navigate(screenName as any);
    }
  };

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
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
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

  // Get initials from service name for placeholder
  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
              <Text style={[styles.sectionHeading, dynamicStyles.text]}>
                REVIEWS
              </Text>
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

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabPress={handleTabPress} 
        unreadNotificationCount={unreadNotificationCount}
      />
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
});

