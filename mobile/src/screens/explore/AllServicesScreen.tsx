import React, { useState, useEffect, useMemo } from "react";
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
import { exploreService, Service } from "../../services/explore";
import ServiceCard from "./components/ServiceCard";
import BottomNavigation from "../../components/common/BottomNavigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.md * 3) / 2;

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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "favorites" | "profile"
  >("explore");

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterAndSortServices();
  }, [services, searchQuery, sortOption, selectedCategory]);

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

  // Get unique categories from services
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((service) => {
      const category = service.metadata?.category || "All";
      cats.add(category);
    });
    return Array.from(cats).sort();
  }, [services]);

  const filterAndSortServices = () => {
    let filtered = [...services];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query) ||
          service.salon?.name.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== "All") {
      filtered = filtered.filter(
        (service) => service.metadata?.category === selectedCategory
      );
    }

    // Sort services
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

    setFilteredServices(filtered);
  };

  const handleServicePress = (service: Service) => {
    navigation?.navigate("ServiceDetail", {
      serviceId: service.id,
      service,
    });
  };

  const handleTabPress = (
    tab: "home" | "bookings" | "explore" | "favorites" | "profile"
  ) => {
    setActiveTab(tab);
    if (tab !== "explore") {
      const screenName =
        tab === "home" ? "Home" : tab.charAt(0).toUpperCase() + tab.slice(1);
      navigation?.navigate(screenName as any);
    }
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
          <TouchableOpacity
            style={[
              styles.filterButton,
              dynamicStyles.filterButton,
              !selectedCategory && dynamicStyles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                !selectedCategory && { color: theme.colors.white },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                selectedCategory === category && dynamicStyles.filterButtonActive,
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategory === category && { color: theme.colors.white },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Options */}
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
                style={viewMode === "grid" ? styles.gridItem : undefined}
              >
                <ServiceCard
                  image={null}
                  title={service.name}
                  author={service.salon?.name || "Salon"}
                  likes={0}
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

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
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
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: 16,
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
    fontSize: 16,
    fontFamily: theme.fonts.regular,
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
    width: CARD_WIDTH,
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

