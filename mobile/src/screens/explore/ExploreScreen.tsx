import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  TextInput,
  Keyboard,
  Animated,
  Easing,
  Platform,
  UIManager,
} from "react-native";
import * as Location from "expo-location";
import LeafletMap from "../../components/LeafletMap";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";

import TrendingCard from "./components/TrendingCard";
import ServiceCard from "./components/ServiceCard";
import SalonCard from "./components/SalonCard";
import AutoSlider from "./components/AutoSlider";
import { exploreService, Service, Salon } from "../../services/explore";
import { Loader } from "../../components/common";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface ExploreScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

type FilterType = string;

export default function ExploreScreen({ navigation }: ExploreScreenProps) {
  const { isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Map View State
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapRegion, setMapRegion] = useState({
    latitude: -1.9441, // Default to Kigali
    longitude: 30.0619,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Animation for search expansion (0 = collapsed/title visible, 1 = expanded/search visible)
  const searchAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
     Animated.timing(searchAnim, {
       toValue: isSearching ? 1 : 0,
       duration: 350,
       useNativeDriver: false,
       easing: Easing.bezier(0.25, 0.1, 0.25, 1),
     }).start();
  }, [isSearching, searchAnim]);

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [trendingServices, setTrendingServices] = useState<Service[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllSalons, setShowAllSalons] = useState(false);

  const filters = useMemo(() => [
    "All",
    "Hair", 
    "Nails", 
    "Barbershop",
    "Spa",
    "Makeup",
    "Massage",
    "Other"
  ], []);

  useEffect(() => {
    fetchData();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (err) {
      console.log("Location permission denied or error:", err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allServicesData, trending, allSalons] = await Promise.all([
        exploreService.getServices(),
        exploreService.getTrendingServices(10),
        exploreService.getSalons(),
      ]);

      // Filter active services only
      const activeServices = allServicesData.filter((s) => s.isActive);
      setAllServices(activeServices);
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

  // Filter services based on selected filter and search query
  const services = useMemo(() => {
    let result = allServices;

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query) ||
          service.salon?.name?.toLowerCase().includes(query)
      );
    }

    // 2. Filter by Chip (Category/Gender)
    if (selectedFilter === "All") {
      return result;
    }

    const filterLower = selectedFilter.toLowerCase();
    
    return result.filter((service) => {
      // Direct category match
      if (service.category?.toLowerCase() === filterLower) return true;
      if (service.metadata?.category?.toLowerCase() === filterLower) return true;
      
      // Smart matching
      const serviceName = service.name.toLowerCase();
      if (serviceName.includes(filterLower)) return true;
      
      // Gender mapping for specific filters if needed, though we moved to Categories mainly
      if (filterLower === 'men' && service.targetGender === 'men') return true;
      if (filterLower === 'women' && service.targetGender === 'women') return true;
      
      return false;
    });
  }, [selectedFilter, allServices, searchQuery]);

  // Filter salons based on search and gender filter
  const filteredSalons = useMemo(() => {
    let result = salons;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query) ||
        s.city?.toLowerCase().includes(query)
      );
    }
    
    if (selectedFilter !== "All") {
        const filterLower = selectedFilter.toLowerCase();
        
        // Filter salons that offer services in this category
        // Note: This is a loose approximation based on salon type or name
        return result.filter(s => {
             const type = s.businessType?.toLowerCase() || "";
             const name = s.name.toLowerCase();
             
             // Map filter to types
             if (filterLower === 'hair' && (type.includes('hair') || type.includes('barber') || name.includes('hair') || name.includes('cut'))) return true;
             if (filterLower === 'nails' && (type.includes('nail') || name.includes('nail'))) return true;
             if (filterLower === 'barbershop' && (type.includes('barber') || name.includes('barber'))) return true;
             if (filterLower === 'spa' && (type.includes('spa') || name.includes('spa'))) return true;
             
             return type.includes(filterLower) || name.includes(filterLower);
        });
    }

    return result;
  }, [salons, searchQuery, selectedFilter]);

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
      browse: true, // Allow employees to view any salon
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
    sectionTitle: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header Area */}
      <View style={[styles.header, { backgroundColor: dynamicStyles.container.backgroundColor }]}>
         <View style={[styles.headerTop, { position: 'relative', height: 50 }]}>
          {/* Title Area - Fades Out */}
          <Animated.View style={{ 
            opacity: searchAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] }),
            position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center', zIndex: isSearching ? 0 : 1
          }}>
             <View>
                 <Text style={[styles.greetingText, dynamicStyles.textSecondary]}>Good evening,</Text>
                 <Text style={[styles.discoverTitle, dynamicStyles.text]}>Discover</Text>
             </View>
          </Animated.View>

          {/* Search Button (Target for opening) - Fades Out */}
          <Animated.View style={{ 
            opacity: searchAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] }),
            position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', zIndex: isSearching ? 0 : 1,
            flexDirection: 'row', gap: 8
          }}>
             {/* Map Toggle Button */}
             <TouchableOpacity 
                style={[styles.searchIconBtn, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}
                onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
             >
                <MaterialIcons name={viewMode === 'list' ? "map" : "list"} size={24} color={theme.colors.primary} />
             </TouchableOpacity>

             <TouchableOpacity 
                style={[styles.searchIconBtn, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}
                onPress={() => setIsSearching(true)}
             >
                <MaterialIcons name="search" size={24} color={theme.colors.primary} />
             </TouchableOpacity>
          </Animated.View>

          {/* Expandable Search Bar */}
          <Animated.View style={[
             styles.searchBarContainer, 
             { 
               backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100,
               width: searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
               opacity: searchAnim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
               position: 'absolute', right: 0, top: 0, bottom: 0,
               marginTop: 0, marginBottom: 0, 
               overflow: 'hidden',
               zIndex: isSearching ? 2 : 0
             }
          ]}>
             <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
             <TextInput
                style={[styles.searchInput, { color: isDark ? theme.colors.white : theme.colors.text }]}
                placeholder="Search salons, services..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onBlur={() => !searchQuery && setIsSearching(false)} 
             />
             {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
                    <MaterialIcons name="close" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
             )}
             <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(""); Keyboard.dismiss(); }} style={styles.closeSearchBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
             </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Categories / Filters */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filters.map((filter) => {
              const isSelected = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipSelected : styles.filterChipUnselected,
                    !isSelected && { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }
                  ]}
                >
                  <Text style={[
                     styles.filterChipText, 
                     isSelected ? styles.filterChipTextSelected : { color: isDark ? theme.colors.gray400 : theme.colors.textSecondary }
                  ]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Loader message="Discovering salons..." />
        </View>
      )}
      
      {/* Map View Rendering */}
      {!loading && viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <LeafletMap
            region={mapRegion}
            markers={filteredSalons.map(s => ({
                id: s.id,
                latitude: s.latitude || 0,
                longitude: s.longitude || 0,
                title: s.name,
                description: s.address || "",
            })).filter(m => m.latitude !== 0 && m.longitude !== 0)}
            onMarkerPress={(marker) => {
                const salon = filteredSalons.find(s => s.id === marker.id);
                if (salon) handleSalonPress(salon);
            }}
            style={styles.map}
          />
        </View>
      )}

      {!loading && viewMode === 'list' && (
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
          {/* Trending Now Section */}
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
                    image={service.images?.[0] || null}
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
                  {selectedFilter === "All"
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
                {services.slice(0, 10).map((service) => (
                  <View key={service.id} style={styles.serviceCardWrapper}>
                    <ServiceCard
                      service={service}
                      onPress={() => handleServicePress(service)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Salons Section */}
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

            {filteredSalons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="store"
                  size={48}
                  color={dynamicStyles.textSecondary.color}
                />
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  {searchQuery.trim() || selectedFilter !== 'All' ? 'No salons match your criteria' : 'No salons available'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.salonsGrid}>
                  {(showAllSalons ? filteredSalons : filteredSalons.slice(0, 10)).map(
                    (salon) => (
                      <SalonCard
                        key={salon.id}
                        salon={salon}
                        onPress={() => handleSalonPress(salon)}
                      />
                    )
                  )}
                </View>
                {filteredSalons.length > 10 && (
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
  greetingText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  searchIconBtn: {
    padding: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    padding: 0,
  },
  filtersWrapper: {
    marginTop: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipUnselected: {
    // handled inline
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  filterChipTextSelected: {
    color: theme.colors.white,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  closeSearchBtn: {
    marginLeft: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
