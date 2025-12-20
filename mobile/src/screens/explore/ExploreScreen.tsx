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
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import FilterButton from "./components/FilterButton";
import TrendingCard from "./components/TrendingCard";
import ServiceCard from "./components/ServiceCard";
import SalonCard from "./components/SalonCard";
import AutoSlider from "./components/AutoSlider";
import { exploreService, Service, Salon } from "../../services/explore";

interface ExploreScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

type FilterType = "For You" | "Hair" | "Nails" | "Facials" | "Oil";

export default function ExploreScreen({ navigation }: ExploreScreenProps) {
  const { isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("For You");
  const [services, setServices] = useState<Service[]>([]);
  const [trendingServices, setTrendingServices] = useState<Service[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllSalons, setShowAllSalons] = useState(false);

  const filters: FilterType[] = ["For You", "Hair", "Nails", "Facials", "Oil"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allServices, trending, allSalons] = await Promise.all([
        exploreService.getServices(),
        exploreService.getTrendingServices(10),
        exploreService.getSalons(),
      ]);

      // Filter active services only
      const activeServices = allServices.filter((s) => s.isActive);
      setServices(activeServices);
      setTrendingServices(trending.filter((s) => s.isActive));

      // Filter active salons only (status === 'active')
      const activeSalons = allSalons.filter((s) => s.status === "active");
      setSalons(activeSalons);
    } catch (error: any) {
      console.error("Error fetching explore data:", error);
      Alert.alert("Error", error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleServicePress = (service: Service) => {
    navigation?.navigate("ServiceDetail", { serviceId: service.id, service });
  };

  const handleTrendingPress = (service: Service) => {
    navigation?.navigate("ServiceDetail", { serviceId: service.id, service });
  };

  const handleSalonPress = (salon: Salon) => {
    navigation?.navigate("SalonDetail", {
      salonId: salon.id,
      salon,
    });
  };


  const handleSearch = () => {
    // TODO: Navigate to search screen
    console.log("Search pressed");
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
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: dynamicStyles.container.backgroundColor },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.discoverTitle, dynamicStyles.text]}>
            Discover
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="search"
              size={24}
              color={dynamicStyles.text.color}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <FilterButton
              key={filter}
              label={filter}
              isSelected={selectedFilter === filter}
              onPress={() => setSelectedFilter(filter)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
          {/* Trending Now Section with Auto-Slider */}
          {trendingServices.length > 0 && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingSectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons
                    name="local-fire-department"
                    size={20}
                    color={theme.colors.warning}
                  />
                  <Text
                    style={[styles.sectionTitle, dynamicStyles.sectionTitle]}
                  >
                    Trending Now
                  </Text>
                </View>
              </View>

              <AutoSlider
                onItemPress={(index) => {
                  if (trendingServices[index]) {
                    handleTrendingPress(trendingServices[index]);
                  }
                }}
              >
                {trendingServices.map((service) => (
                  <TrendingCard
                    key={service.id}
                    image={null}
                    category={service.metadata?.category || "Service"}
                    title={service.name}
                    onPress={() => handleTrendingPress(service)}
                  />
                ))}
              </AutoSlider>
            </View>
          )}

          {/* All Services Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons
                  name="content-cut"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                  {selectedFilter === "For You"
                    ? "All Services"
                    : selectedFilter}
                </Text>
              </View>
              {services.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation?.navigate("AllServices")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.viewAllText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    View All
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {services.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="inventory"
                  size={48}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No services available
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {services.map((service) => (
                  <View key={service.id} style={styles.serviceCardWrapper}>
                    <ServiceCard
                      image={null}
                      title={service.name}
                      author={service.salon?.name || "Salon"}
                      likes={0} // TODO: Add likes/favorites count from backend
                      onPress={() => handleServicePress(service)}
                      onLike={() => console.log("Like pressed:", service.id)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* All Salons Section */}
          <View style={[styles.section, styles.salonsSection]}>
            <View style={[styles.sectionHeader, styles.salonsSectionHeader]}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons
                  name="store"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                  All Salons
                </Text>
              </View>
            </View>

            {salons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="store"
                  size={48}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No salons available
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.salonsGrid}>
                  {(showAllSalons ? salons : salons.slice(0, 10)).map(
                    (salon) => (
                      <SalonCard
                        key={salon.id}
                        salon={salon}
                        onPress={() => handleSalonPress(salon)}
                      />
                    )
                  )}
                </View>
                {salons.length > 10 && (
                  <TouchableOpacity
                    style={styles.viewAllButtonBottom}
                    onPress={() => {
                      setShowAllSalons(!showAllSalons);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.viewAllText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {showAllSalons ? "Show Less" : "View All"}
                    </Text>
                    <MaterialIcons
                      name={showAllSalons ? "arrow-upward" : "arrow-forward"}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
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
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  discoverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  searchButton: {
    padding: theme.spacing.xs,
  },
  filtersContainer: {
    paddingRight: theme.spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  trendingSection: {
    marginTop: theme.spacing.md,
  },
  salonsSection: {
    marginTop: 0,
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  trendingSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  salonsSectionHeader: {
    paddingHorizontal: theme.spacing.md,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  horizontalScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingRight: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  serviceCardWrapper: {
    width: 240,
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  salonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    rowGap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  salonCardWrapper: {
    marginBottom: theme.spacing.md,
  },
  viewAllButtonBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
});
