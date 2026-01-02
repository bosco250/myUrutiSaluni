import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import * as Location from "expo-location";
import { SERVICE_CATEGORIES, TARGET_CLIENTELE } from "../../constants/business";
import { exploreService, Service } from "../../services/explore";
import ServiceCard from "./components/ServiceCard";

// Helper function to safely get screen width
const getScreenWidth = () => {
  try {
    return Dimensions.get("window").width;
  } catch {
    return 375; // Fallback width
  }
};

const getCardWidth = () => (getScreenWidth() - theme.spacing.md * 3) / 2;

// Distance calculation
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

interface AllServicesScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

type ViewMode = "grid" | "list";
type SortOption = "name" | "price-low" | "price-high" | "newest";

export default function AllServicesScreen({
  navigation,
}: AllServicesScreenProps) {
  const { isDark } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);


  const fetchServices = async () => {
    try {
      setLoading(true);
      const allServices = await exploreService.getServices();
      const activeServices = allServices.filter((s) => s.isActive);
      setServices(activeServices);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      Alert.alert("Error", error.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  // Filter Options
  const categories = useMemo(() => [
     "All", 
     "Nearby",
     ...TARGET_CLIENTELE.map(t => t.label),
     ...SERVICE_CATEGORIES.map(c => c.label)
  ], []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
         Alert.alert('Permission Denied', 'Permission to access location was denied');
         return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    } catch (err) {
       console.log(err);
    }
  };

  const filterAndSortServices = useCallback(() => {
    let filtered = [...services];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query) ||
          service.salon?.name?.toLowerCase().includes(query)
      );
    }

    // Filter by category / Nearby / Gender
    if (selectedCategory && selectedCategory !== "All") {
       if (selectedCategory === "Nearby") {
           if (userLocation) {
                filtered = filtered.filter(s => {
                    if (s.salon?.latitude && s.salon?.longitude) {
                        return getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, s.salon.latitude, s.salon.longitude) <= 20;
                    }
                    return false;
                });
                // Sort by distance
                filtered.sort((a, b) => {
                    const d1 = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, a.salon!.latitude!, a.salon!.longitude!);
                    const d2 = getDistanceFromLatLonInKm(userLocation.latitude, userLocation.longitude, b.salon!.latitude!, b.salon!.longitude!);
                    return d1 - d2;
                });
           }
       } else {
           const filterLower = selectedCategory.toLowerCase();
           filtered = filtered.filter(service => {
              if (service.category?.toLowerCase() === filterLower) return true;
              if (service.targetGender?.toLowerCase() === filterLower) return true;
              if (service.metadata?.category?.toLowerCase() === filterLower) return true;
              if (service.metadata?.targetGender?.toLowerCase() === filterLower) return true;
              // Fallback
              if (service.name.toLowerCase().includes(filterLower)) return true;
              return false;
           });
       }
    }

    // Sort services
    // Sort services (skip if Nearby as it's already sorted by distance)
    if (selectedCategory !== "Nearby") {
        filtered.sort((a, b) => {
          switch (sortOption) {
            case "name":
              return a.name.localeCompare(b.name);
            case "price-low":
              return Number(a.basePrice) - Number(b.basePrice);
            case "price-high":
              return Number(b.basePrice) - Number(a.basePrice);
            case "newest":
              return (
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            default:
              return 0;
          }
        });
    }

    setFilteredServices(filtered);
  }, [services, searchQuery, sortOption, selectedCategory, userLocation]);

  useEffect(() => {
    filterAndSortServices();
  }, [filterAndSortServices]);

  const handleServicePress = (service: Service) => {
    navigation?.navigate("ServiceDetail", {
      serviceId: service.id,
      service,
    });
  };


  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSortOption("name");
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
    searchContainer: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    searchInput: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    filterButton: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
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
        <Text style={[styles.headerTitle, dynamicStyles.text]}>
          All Services
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={viewMode === "grid" ? "view-list" : "grid-view"}
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters Section */}
      <View style={[styles.filtersSection, dynamicStyles.container]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
          <MaterialIcons
            name="search"
            size={20}
            color={dynamicStyles.textSecondary.color}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            placeholder="Search services..."
            placeholderTextColor={dynamicStyles.textSecondary.color}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={dynamicStyles.textSecondary.color}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersBar}
          contentContainerStyle={styles.filtersContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                (selectedCategory === category || (!selectedCategory && category === "All")) && dynamicStyles.filterButtonActive,
              ]}
              onPress={() => {
                if (category === "Nearby") getLocation();
                if (category === "All") setSelectedCategory(null);
                else setSelectedCategory(category === selectedCategory ? null : category);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  (selectedCategory === category || (!selectedCategory && category === "All")) && { color: theme.colors.white },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Options */}
        {selectedCategory !== "Nearby" && (
        <View style={styles.sortContainer}>
          <MaterialIcons
            name="sort"
            size={18}
            color={dynamicStyles.textSecondary.color}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sortScroll}
          >
            {[
              { value: "name", label: "Name" },
              { value: "price-low", label: "Price: Low" },
              { value: "price-high", label: "Price: High" },
              { value: "newest", label: "Newest" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortButton,
                  dynamicStyles.filterButton,
                  sortOption === option.value && dynamicStyles.filterButtonActive,
                ]}
                onPress={() => setSortOption(option.value as SortOption)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortOption === option.value && { color: theme.colors.white },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        )}
      </View>

      {/* Services List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="inventory"
            size={64}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyText, dynamicStyles.text]}>
            {searchQuery || selectedCategory
              ? "No services found"
              : "No services available"}
          </Text>
          {(searchQuery || selectedCategory) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          <View
            style={
              viewMode === "grid"
                ? styles.gridContainer
                : styles.listContainer
            }
          >
            {filteredServices.map((service) => (
              <View
                key={service.id}
                style={viewMode === "grid" ? [styles.gridItem, { width: getCardWidth() }] : undefined}
              >
                <ServiceCard
                  service={service}
                  variant={viewMode}
                  onPress={() => handleServicePress(service)}
                  onLike={() => console.log("Like:", service.id)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Results Count - Floating */}
      {!loading && filteredServices.length > 0 && (
        <View style={[styles.resultsCount, dynamicStyles.container]}>
          <View style={styles.resultsBadge}>
            <MaterialIcons
              name="check-circle"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.resultsText, dynamicStyles.text]}>
              {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: theme.fonts.bold,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  viewModeButton: {
    padding: theme.spacing.xs,
  },
  filtersSection: {
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: 40,         // Even more compact
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    height: "100%",
    paddingVertical: 0, // Critical for text visibility
    textAlignVertical: "center", // Critical for Android
  },
  filtersBar: {
    maxHeight: 50,
    marginBottom: theme.spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sortScroll: {
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 100, // Space for bottom navigation
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    marginBottom: theme.spacing.md,
  },
  listContainer: {
    gap: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: theme.spacing.md,
    textAlign: "center",
    fontFamily: theme.fonts.medium,
  },
  clearButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  clearButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  resultsCount: {
    position: "absolute",
    bottom: theme.spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  resultsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    gap: theme.spacing.xs,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});

