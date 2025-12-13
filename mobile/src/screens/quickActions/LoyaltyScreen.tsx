import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { loyaltyService, LoyaltyData } from "../../services/loyalty";
import { customersService } from "../../services/customers";

// Mock data - in production, this would come from the API
const mockLoyaltyData: LoyaltyData = {
  membershipTier: "Gold",
  pointsBalance: 2450,
  pointsExpiry: "Dec 31, 2025",
  rewards: [
    {
      id: "1",
      title: "Free Hair Treatment",
      pointsRequired: 1000,
      pointsProgress: 850,
      description: "Redeem for 1,000 points",
    },
    {
      id: "2",
      title: "Free Hair Treatment",
      pointsRequired: 1000,
      pointsProgress: 650,
      description: "Redeem for 1,000 points",
    },
    {
      id: "3",
      title: "Free Hair Treatment",
      pointsRequired: 1000,
      pointsProgress: 450,
      description: "Redeem for 1,000 points",
    },
  ],
};

interface LoyaltyScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function LoyaltyScreen({ navigation }: LoyaltyScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch customer ID from user ID
  useEffect(() => {
    const fetchCustomerId = async () => {
      if (!user?.id) {
        setLoading(false);
        setError("Please login to view your loyalty points");
        return;
      }

      // Set customer name from user context first (immediate display)
      if (user?.fullName) {
        const firstName = getFirstName(user.fullName);
        if (firstName) {
          setCustomerName(firstName);
        }
      }

      try {
        const userId = String(user.id);
        const customer = await customersService.getCustomerByUserId(userId);

        if (customer && customer.id) {
          setCustomerId(customer.id);
          // Get customer name from multiple sources (priority order):
          // 1. customer.fullName (direct field on customer entity)
          // 2. customer.user?.fullName (from user relation)
          // 3. user?.fullName (from auth context)
          const fullName =
            customer.fullName ||
            customer.user?.fullName ||
            user?.fullName ||
            null;

          // Extract first name only
          const firstName = getFirstName(fullName);
          if (firstName) {
            setCustomerName(firstName);
          }
        } else {
          setLoading(false);
          setError("Customer profile not found");
        }
      } catch (error: any) {
        setLoading(false);
        setError("Failed to load customer data");
      }
    };

    fetchCustomerId();
  }, [user?.id, user?.fullName]);

  // Fetch loyalty data when customer ID is available
  useEffect(() => {
    if (customerId) {
      fetchLoyaltyData();
    }
  }, [customerId]);

  const fetchLoyaltyData = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await loyaltyService.getLoyaltyData(customerId);
      setLoyaltyData(data);
    } catch (error: any) {
      setError(error.message || "Failed to load loyalty data");
      // Use mock data as fallback
      setLoyaltyData(mockLoyaltyData);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoyaltyData();
    setRefreshing(false);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold":
        return theme.colors.primary;
      case "Platinum":
        return "#A0A0A0";
      case "Silver":
        return "#C0C0C0";
      default:
        return "#CD7F32";
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getFirstName = (fullName: string | null | undefined): string | null => {
    if (!fullName) return null;
    const nameParts = fullName.trim().split(/\s+/);
    return nameParts[0] || null;
  };

  const getProgressPercentage = (progress: number, required: number) => {
    return Math.min((progress / required) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          Loyalty Program
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* LUXE Membership Card */}
        <View style={styles.membershipCard}>
          <View style={styles.membershipCardGradient}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.brandSection}>
                {customerName ? (
                  <Text style={styles.luxeBrand}>{customerName}</Text>
                ) : (
                  <Text style={styles.luxeBrand}>LUXE</Text>
                )}
              </View>
              <View
                style={[
                  styles.tierBadge,
                  {
                    backgroundColor: getTierColor(
                      loyaltyData?.membershipTier || "Gold"
                    ),
                  },
                ]}
              >
                <Text style={styles.tierBadgeText}>
                  {loyaltyData?.membershipTier} Member
                </Text>
              </View>
            </View>

            {/* Points Balance */}
            <View style={styles.pointsSection}>
              <Text style={styles.pointsLabel}>POINTS BALANCE</Text>
              <Text style={styles.pointsAmount}>
                {formatNumber(loyaltyData?.pointsBalance || 0)}
              </Text>
            </View>

            {/* Expiry */}
            {loyaltyData?.pointsExpiry ? (
              <Text style={styles.expiryText}>
                Points expire on {loyaltyData.pointsExpiry}
              </Text>
            ) : (
              <Text style={styles.expiryText}>Points never expire</Text>
            )}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, dynamicStyles.card]}>
            <MaterialIcons
              name="error-outline"
              size={24}
              color={theme.colors.error}
            />
            <Text style={[styles.errorText, dynamicStyles.text]}>{error}</Text>
          </View>
        )}

        {/* Rewards Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Rewards</Text>

          {loyaltyData?.rewards.map((reward) => (
            <TouchableOpacity
              key={reward.id}
              style={[styles.rewardCard, dynamicStyles.card]}
              activeOpacity={0.7}
            >
              {/* Gift Icon */}
              <View style={styles.rewardIconContainer}>
                <MaterialIcons
                  name="card-giftcard"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>

              {/* Reward Details */}
              <View style={styles.rewardDetails}>
                <Text style={[styles.rewardTitle, dynamicStyles.text]}>
                  {reward.title}
                </Text>
                <Text
                  style={[
                    styles.rewardDescription,
                    dynamicStyles.textSecondary,
                  ]}
                >
                  {reward.description}
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressPercentage(
                            reward.pointsProgress,
                            reward.pointsRequired
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* How to Earn Points */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            How to Earn Points
          </Text>

          <View style={[styles.infoCard, dynamicStyles.card]}>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="spa"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.infoText, dynamicStyles.text]}>
                1 point for every $1 spent on services
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="shopping-bag"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.infoText, dynamicStyles.text]}>
                Bonus points on product purchases
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="person-add"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.infoText, dynamicStyles.text]}>
                500 points for referring a friend
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    marginRight: 32, // Balance back button width
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  membershipCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: theme.spacing.sm,
  },
  membershipCardGradient: {
    backgroundColor: "#1C1C1E",
    padding: theme.spacing.lg,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  brandSection: {
    flex: 1,
  },
  luxeBrand: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    letterSpacing: 3,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
    fontFamily: theme.fonts.medium,
  },
  pointsSection: {
    marginBottom: theme.spacing.md,
  },
  pointsLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  pointsAmount: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  expiryText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: theme.fonts.regular,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(200, 155, 104, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(200, 155, 104, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  infoCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.error + "20",
    borderRadius: 12,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
});
