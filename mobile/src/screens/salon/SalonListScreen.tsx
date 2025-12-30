import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { salonService, SalonDetails } from "../../services/salon";
import { Loader } from "../../components/common";

interface SalonListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

const SalonListScreen = React.memo(function SalonListScreen({
  navigation,
}: SalonListScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
  };

  const loadSalons = useCallback(async () => {
    try {
      setError(null);

      // PERFORMANCE: Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      // Get all salons for this owner with timeout
      const response = await Promise.race([
        salonService.getSalonByOwnerId(user?.id?.toString() || ""),
        timeoutPromise,
      ]);

      // The API might return a single salon or array
      if (response) {
        setSalons([response as any]);
      } else {
        setSalons([]);
      }
    } catch (err: any) {
      console.error("Error loading salons:", err);
      setError(err.message || "Failed to load salons");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSalons();
  }, [loadSalons]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSalons();
  }, [loadSalons]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return theme.colors.success;
      case "inactive":
        return theme.colors.warning;
      case "pending_approval":
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "pending_approval":
        return "Pending";
      default:
        return status;
    }
  };

  const renderSalonCard = (salon: SalonDetails) => (
    <TouchableOpacity
      key={salon.id}
      style={[styles.salonCard, dynamicStyles.card]}
      onPress={() =>
        navigation.navigate("OwnerSalonDetail", {
          salonId: salon.id,
          salonName: salon.name,
        })
      }
      activeOpacity={0.7}
    >
      {/* Salon Image/Logo */}
      <View style={styles.salonImageContainer}>
        <View style={styles.salonImagePlaceholder}>
          <MaterialIcons name="store" size={32} color={theme.colors.white} />
        </View>
      </View>

      {/* Salon Info */}
      <View style={styles.salonInfo}>
        <View style={styles.salonHeader}>
          <Text
            style={[styles.salonName, dynamicStyles.text]}
            numberOfLines={1}
          >
            {salon.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(salon.status) + "20" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(salon.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(salon.status) },
              ]}
            >
              {getStatusLabel(salon.status)}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <MaterialIcons
            name="location-on"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.locationText, dynamicStyles.textSecondary]}
            numberOfLines={1}
          >
            {salon.address || "No address set"}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons
              name="people"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.statText, dynamicStyles.textSecondary]}>
              0 Employees
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons
              name="event"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.statText, dynamicStyles.textSecondary]}>
              0 Bookings
            </Text>
          </View>
        </View>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={24}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons name="store" size={48} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Salons Yet</Text>
      <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
        Create your first salon to start managing your business
      </Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={() => navigation.navigate("CreateSalon")}
        activeOpacity={0.8}
      >
        <View style={styles.createFirstButtonInner}>
          <MaterialIcons name="add" size={20} color={theme.colors.white} />
          <Text style={styles.createFirstButtonText}>
            Create Your First Salon
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <MaterialIcons
        name="error-outline"
        size={48}
        color={theme.colors.error}
      />
      <Text style={[styles.errorTitle, dynamicStyles.text]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorSubtitle, dynamicStyles.textSecondary]}>
        {error}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadSalons}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>My Salons</Text>
        <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
          Manage your salon businesses
        </Text>
      </View>

      {loading ? (
        <Loader fullscreen message="Loading salons..." />
      ) : error ? (
        renderError()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {salons.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {salons.map(renderSalonCard)}

              {/* Add More Card */}
              <TouchableOpacity
                style={[styles.addMoreCard, dynamicStyles.card]}
                onPress={() => navigation.navigate("CreateSalon")}
                activeOpacity={0.7}
              >
                <View style={styles.addMoreIcon}>
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[styles.addMoreText, { color: theme.colors.primary }]}
                >
                  Add New Salon
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button - only show when there are salons */}
      {!loading && salons.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateSalon")}
          activeOpacity={0.8}
        >
          <View style={styles.fabInner}>
            <MaterialIcons name="add" size={28} color={theme.colors.white} />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  salonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  salonImageContainer: {
    marginRight: theme.spacing.md,
  },
  salonImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  salonInfo: {
    flex: 1,
  },
  salonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginLeft: 4,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  statText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginLeft: 4,
  },
  addMoreCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addMoreIcon: {
    marginRight: theme.spacing.sm,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + "20",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  createFirstButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createFirstButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  createFirstButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginLeft: theme.spacing.sm,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: 30,
    borderRadius: 28,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
});

export default SalonListScreen;
