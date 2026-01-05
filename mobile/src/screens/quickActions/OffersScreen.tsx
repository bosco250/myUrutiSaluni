import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";

interface Offer {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  image: any;
}

interface OffersData {
  activeOffers: Offer[];
}

// Mock data - in production, this would come from the API
const mockOffersData: OffersData = {
  activeOffers: [
    {
      id: "1",
      title: "Summer Glow Package",
      description: "Full body spa + Facial treatment",
      originalPrice: 120,
      discountedPrice: 89,
      discountPercentage: 26,
      image: require("../../../assets/Logo.png"),
    },
    {
      id: "2",
      title: "Summer Glow Package",
      description: "Full body spa + Facial treatment",
      originalPrice: 120,
      discountedPrice: 89,
      discountPercentage: 26,
      image: require("../../../assets/Logo.png"),
    },
  ],
};

interface OffersScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function OffersScreen({ navigation }: OffersScreenProps) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offersData, setOffersData] = useState<OffersData | null>(null);

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
    fetchOffersData();
  }, []);

  const fetchOffersData = async () => {
    try {
      setLoading(true);
      // Simulate API call - in production, use actual API
      await new Promise((resolve) => setTimeout(resolve, 500));
      setOffersData(mockOffersData);
    } catch (error) {
      console.error("Error fetching offers data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffersData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount}`;
  };

  const handleOfferPress = (offer: Offer) => {
    // TODO: Navigate to offer detail
    console.log("Offer pressed:", offer.id);
  };

  const handleSendGiftCard = () => {
    // TODO: Navigate to gift card flow
    console.log("Send Gift Card pressed");
  };

  const handleSendTip = () => {
    // TODO: Navigate to tip flow
    console.log("Send Tip pressed");
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
          Offers & Gifts
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
        {/* Active Offers Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Active Offers
          </Text>

          {offersData?.activeOffers.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={[styles.offerCard, dynamicStyles.card]}
              onPress={() => handleOfferPress(offer)}
              activeOpacity={0.8}
            >
              {/* Offer Image */}
              <Image
                source={offer.image}
                style={styles.offerImage}
                resizeMode="cover"
              />

              {/* Offer Details */}
              <View style={styles.offerDetails}>
                <Text style={[styles.offerTitle, dynamicStyles.text]}>
                  {offer.title}
                </Text>
                <Text
                  style={[styles.offerDescription, dynamicStyles.textSecondary]}
                  numberOfLines={1}
                >
                  {offer.description}
                </Text>

                {/* Price Row */}
                <View style={styles.priceRow}>
                  <Text style={styles.discountedPrice}>
                    {formatCurrency(offer.discountedPrice)}
                  </Text>
                  <Text style={[styles.originalPrice, dynamicStyles.textSecondary]}>
                    {formatCurrency(offer.originalPrice)}
                  </Text>
                </View>
              </View>

              {/* Discount Badge */}
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>%</Text>
              </View>
            </TouchableOpacity>
          ))}

          {(!offersData?.activeOffers ||
            offersData.activeOffers.length === 0) && (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="local-offer"
                size={48}
                color={dynamicStyles.textSecondary.color}
              />
              <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                No active offers at the moment
              </Text>
            </View>
          )}
        </View>

        {/* Gift Cards & Tips Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            Gift Cards & Tips
          </Text>

          <View style={styles.giftCardsRow}>
            {/* Send Gift Card Button */}
            <TouchableOpacity
              style={styles.giftCardButton}
              onPress={handleSendGiftCard}
              activeOpacity={0.8}
            >
              <View style={styles.giftCardGradient}>
                <MaterialIcons
                  name="card-giftcard"
                  size={32}
                  color="#FFFFFF"
                />
                <Text style={styles.giftCardTitle}>Send Gift Card</Text>
                <Text style={styles.giftCardSubtitle}>To friends & family</Text>
              </View>
            </TouchableOpacity>

            {/* Send a Tip Button */}
            <TouchableOpacity
              style={styles.tipButton}
              onPress={handleSendTip}
              activeOpacity={0.8}
            >
              <View style={styles.tipGradient}>
                <MaterialIcons
                  name="attach-money"
                  size={32}
                  color="#FFFFFF"
                />
                <Text style={styles.tipTitle}>Send a Tip</Text>
                <Text style={styles.tipSubtitle}>To your stylist</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* How Gifts Work */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>
            How Gifts Work
          </Text>

          <View style={[styles.infoCard, dynamicStyles.card]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="looks-one"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.infoText, dynamicStyles.text]}>
                Choose a gift card amount or tip value
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="looks-two"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.infoText, dynamicStyles.text]}>
                Add a personal message for the recipient
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="looks-3"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.infoText, dynamicStyles.text]}>
                Send instantly via email or message
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
    marginRight: 32,
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
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
    overflow: "hidden",
  },
  offerImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.gray200,
  },
  offerDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: "center",
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
  },
  originalPrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 12,
  },
  discountBadgeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  giftCardsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  giftCardButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  giftCardGradient: {
    backgroundColor: "#FF7B54",
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    borderRadius: 16,
  },
  giftCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  giftCardSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: theme.fonts.regular,
    marginTop: 4,
    textAlign: "center",
  },
  tipButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  tipGradient: {
    backgroundColor: "#FF4080",
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    borderRadius: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  tipSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: theme.fonts.regular,
    marginTop: 4,
    textAlign: "center",
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
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200, 155, 104, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
  },
});
