import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import { api } from "../../services/api";

const RECENT_SEARCHES_KEY = "@recent_searches";
const MAX_RECENT_SEARCHES = 10;




// Category data with placeholder images
const categories = [
  {
    id: "1",
    name: "Nail Art",
    image: require("../../../assets/Logo.png"),
  },
  {
    id: "2",
    name: "Facials",
    image: require("../../../assets/Logo.png"),
  },
  {
    id: "3",
    name: "Haircuts",
    image: require("../../../assets/Logo.png"),
  },
  {
    id: "4",
    name: "Makeup",
    image: require("../../../assets/Logo.png"),
  },
];

interface SearchScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      initialQuery?: string;
    };
  };
}

export default function SearchScreen({ navigation, route }: SearchScreenProps) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // State for search results
  const [results, setResults] = useState<{ salons: any[]; services: any[] }>({
    salons: [],
    services: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

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
    searchContainer: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    chip: {
      backgroundColor: isDark ? "#2C2C2E" : theme.colors.backgroundSecondary,
      borderColor: isDark ? "#3A3A3C" : theme.colors.border,
    },
    resultItem: {
      borderBottomColor: isDark ? "#3A3A3C" : theme.colors.borderLight,
    },
  };

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Handle initial query from route params
  useEffect(() => {
    if (route?.params?.initialQuery) {
      setSearchQuery(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setResults({ salons: [], services: [] });
        setLocationSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const trimmed = query.trim();
      if (!trimmed) return;

      let updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)];
      if (updated.length > MAX_RECENT_SEARCHES) {
        updated = updated.slice(0, MAX_RECENT_SEARCHES);
      }

      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const clearAllRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  const removeRecentSearch = async (searchToRemove: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== searchToRemove);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error removing recent search:", error);
    }
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const searchUrl = `/search?q=${encodeURIComponent(query)}`;
      
      const response = await api.get<any>(searchUrl);
      
      // Handle different response structures - backend might wrap in data property
      let searchResults: { salons: any[]; services: any[] } = { salons: [], services: [] };
      
      if (response) {
        // Check if response has salons and services directly
        if (response.salons !== undefined && response.services !== undefined) {
          searchResults = {
            salons: Array.isArray(response.salons) ? response.salons : [],
            services: Array.isArray(response.services) ? response.services : [],
          };
        } 
        // Check if wrapped in data property
        else if (response.data) {
          if (response.data.salons !== undefined && response.data.services !== undefined) {
            searchResults = {
              salons: Array.isArray(response.data.salons) ? response.data.salons : [],
              services: Array.isArray(response.data.services) ? response.data.services : [],
            };
          }
        }
      }
      
      // Extract unique location suggestions from salon results
      const locations = new Set<string>();
      searchResults.salons.forEach((salon) => {
        // Add city if available
        if (salon.city) {
          locations.add(salon.city);
        }
        // Add district if available
        if (salon.district) {
          locations.add(salon.district);
        }
        // Add city, district combination if both available
        if (salon.city && salon.district) {
          locations.add(`${salon.city}, ${salon.district}`);
        }
        // Add full address if it's a meaningful location (not too long)
        if (salon.address && salon.address.length < 50) {
          locations.add(salon.address);
        }
      });
      
      // Convert to array, prioritize shorter/more specific locations, limit to 5
      const locationArray = Array.from(locations)
        .sort((a, b) => {
          // Sort by length (shorter first) and then alphabetically
          if (a.length !== b.length) return a.length - b.length;
          return a.localeCompare(b);
        })
        .slice(0, 5);
      
      setLocationSuggestions(locationArray);
      setResults(searchResults);
    } catch (error: any) {
      // Fallback empty results
      setResults({ salons: [], services: [] });
      setLocationSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
    }
  };

  const handleRecentSearchPress = (search: string) => {
    setSearchQuery(search);
  };

  const handleCategoryPress = (category: typeof categories[0]) => {
    saveRecentSearch(category.name);
    setSearchQuery(category.name);
  };

  const handleLocationPress = (location: string) => {
    saveRecentSearch(location);
    setSearchQuery(location);
  };

  const handleSalonPress = (salon: any) => {
    if (salon?.id) {
      navigation.navigate("SalonDetail", {
        salonId: salon.id,
        salon: salon,
      });
    }
  };

  const handleServicePress = (service: any) => {
    if (service?.id) {
      navigation.navigate("ServiceDetail", {
        serviceId: service.id,
        service: service,
      });
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
            name="arrow-back"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, dynamicStyles.text]}
            placeholder="Search for salons, services..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <MaterialIcons
            name="tune"
            size={24}
            color={dynamicStyles.text.color}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!searchQuery ? (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                    Recent
                  </Text>
                  <TouchableOpacity onPress={clearAllRecentSearches}>
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.chipsContainer}>
                  {recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.chip, dynamicStyles.chip]}
                      onPress={() => handleRecentSearchPress(search)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="history"
                        size={16}
                        color={theme.colors.textSecondary}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[styles.chipText, dynamicStyles.text]}
                        numberOfLines={1}
                      >
                        {search}
                      </Text>
                      <TouchableOpacity onPress={() => removeRecentSearch(search)}>
                        <MaterialIcons
                          name="close"
                          size={16}
                          color={theme.colors.textSecondary}
                          style={{ marginLeft: 4 }}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Browse Categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                Browse Categories
              </Text>

              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.8}
                  >
                    <Image source={category.image} style={styles.categoryImage} />
                    <View style={styles.categoryOverlay}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* Search Results */
          <View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
                  Searching...
                </Text>
              </View>
            ) : (
              <>
                {results.salons.length === 0 &&
                  results.services.length === 0 &&
                  searchQuery.length >= 2 && (
                    <View style={styles.emptyState}>
                      <MaterialIcons
                        name="search-off"
                        size={48}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[styles.emptyText, dynamicStyles.textSecondary]}
                      >
                        No results found for "{searchQuery}"
                      </Text>
                    </View>
                  )}

                {/* Location Suggestions */}
                {locationSuggestions.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      Locations
                    </Text>
                    <View style={styles.locationChipsContainer}>
                      {locationSuggestions.map((location, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.locationChip, dynamicStyles.chip]}
                          onPress={() => handleLocationPress(location)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="location-on"
                            size={16}
                            color={theme.colors.primary}
                            style={styles.chipIcon}
                          />
                          <Text
                            style={[styles.chipText, dynamicStyles.text]}
                            numberOfLines={1}
                          >
                            {location}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Salons Results */}
                {results.salons.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      Salons
                    </Text>
                    {results.salons.map((salon) => (
                      <TouchableOpacity
                        key={salon.id}
                        style={[styles.resultItem, dynamicStyles.resultItem]}
                        onPress={() => handleSalonPress(salon)}
                      >
                        <View style={styles.resultIconContainer}>
                          <MaterialIcons
                            name="store"
                            size={24}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultTitle, dynamicStyles.text]}>
                            {salon.name}
                          </Text>
                          <Text
                            style={[
                              styles.resultSubtitle,
                              dynamicStyles.textSecondary,
                            ]}
                          >
                            {salon.address || salon.city}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Services Results */}
                {results.services.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      Services
                    </Text>
                    {results.services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[styles.resultItem, dynamicStyles.resultItem]}
                        onPress={() => handleServicePress(service)}
                      >
                        <View style={styles.resultIconContainer}>
                          <MaterialIcons
                            name="spa"
                            size={24}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultTitle, dynamicStyles.text]}>
                            {service.name}
                          </Text>
                          <Text
                            style={[
                              styles.resultSubtitle,
                              dynamicStyles.textSecondary,
                            ]}
                          >
                            {service.salon?.name
                              ? `${service.salon.name}${service.basePrice || service.price ? " • " : ""}`
                              : ""}
                            {service.basePrice || service.price
                              ? `$${Number(service.basePrice || service.price || 0).toFixed(2)}`
                              : ""}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    height: 44,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    height: "100%",
  },
  filterButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  clearAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  categoryCard: {
    width: "47%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
  resultSection: {
    marginBottom: theme.spacing.lg,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  resultSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  locationChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: theme.colors.primaryLight + "20",
    borderColor: theme.colors.primary,
  },
});
