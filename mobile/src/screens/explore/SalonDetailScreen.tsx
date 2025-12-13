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
  Linking,
  Dimensions,
} from "react-native";
import { MaterialIcons, FontAwesome, Feather } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import BottomNavigation from "../../components/common/BottomNavigation";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import ServiceCard from "./components/ServiceCard";
import { exploreService, Salon, Service, Product, Employee } from "../../services/explore";

interface SalonDetailScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId: string;
      salon?: Salon;
    };
  };
}

type TabType = "Overview" | "Services" | "Products" | "Employees";

export default function SalonDetailScreen({
  navigation,
  route,
}: SalonDetailScreenProps) {
  const { isDark } = useTheme();
  const unreadNotificationCount = useUnreadNotifications();
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "notifications" | "profile"
  >("explore");
  const [selectedTab, setSelectedTab] = useState<TabType>("Overview");
  const [salon, setSalon] = useState<Salon | null>(route?.params?.salon || null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(!route?.params?.salon);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const salonId = route?.params?.salonId || route?.params?.salon?.id;

  useEffect(() => {
    if (salonId && !salon) {
      fetchSalon();
    }
    if (salonId) {
      fetchServices();
      fetchProducts();
      fetchEmployees();
    }
  }, [salonId]);

  const fetchSalon = async () => {
    if (!salonId) return;

    try {
      setLoading(true);
      // Fetch salon with browse=true to get full settings including operating hours
      const fetchedSalon = await exploreService.getSalonById(salonId, true);
      setSalon(fetchedSalon);
    } catch (error: any) {
      console.error("Error fetching salon:", error);
      Alert.alert("Error", error.message || "Failed to load salon details");
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!salonId) return;

    try {
      setServicesLoading(true);
      const salonServices = await exploreService.getServices(salonId);
      setServices(salonServices.filter((s) => s.isActive));
    } catch (error: any) {
      console.error("Error fetching services:", error);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!salonId) return;

    try {
      setProductsLoading(true);
      const salonProducts = await exploreService.getProducts(salonId);
      // Filter out invalid products and ensure we have valid data
      const validProducts = salonProducts.filter(
        (p) => p && p.id && p.name
      );
      setProducts(validProducts);
    } catch (error: any) {
      // Set empty array on error to show "No products available" message
      setProducts([]);
      // Don't show alert for products as it's not critical
    } finally {
      setProductsLoading(false);
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

  const handleServicePress = (service: Service) => {
    navigation?.navigate("ServiceDetail", {
      serviceId: service.id,
      service,
    });
  };

  const fetchEmployees = async () => {
    if (!salonId) return;

    try {
      setEmployeesLoading(true);
      const salonEmployees = await exploreService.getSalonEmployees(salonId);
      setEmployees(salonEmployees.filter((e) => e.isActive));
    } catch (error: any) {
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleEmployeePress = (employee: Employee) => {
    navigation?.navigate("EmployeeDetail", {
      employeeId: employee.id,
      salonId: salonId,
      employee,
    });
  };

  const handleViewAllEmployees = () => {
    navigation?.navigate("EmployeeList", {
      salonId: salonId,
      salon,
    });
  };

  const handlePhonePress = () => {
    if (salon?.phone) {
      Linking.openURL(`tel:${salon.phone}`);
    }
  };

  const handleEmailPress = () => {
    if (salon?.email) {
      Linking.openURL(`mailto:${salon.email}`);
    }
  };

  const handleWebsitePress = () => {
    if (salon?.website) {
      const url = salon.website.startsWith("http")
        ? salon.website
        : `https://${salon.website}`;
      Linking.openURL(url);
    }
  };

  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Parse operating hours from settings
  const parseOperatingHours = () => {
    if (!salon?.settings) {
      return null;
    }

    // Try operatingHours first (detailed format)
    if (salon.settings.operatingHours) {
      try {
        let hours;
        if (typeof salon.settings.operatingHours === "string") {
          const hoursStr = salon.settings.operatingHours.trim();
          
          // Check if it's already a valid JSON object string
          if (hoursStr.startsWith("{") && hoursStr.endsWith("}")) {
            try {
              // Try parsing as-is first
              hours = JSON.parse(hoursStr);
            } catch (firstError) {
              // If that fails, try unescaping double-encoded JSON
              try {
                const unescaped = hoursStr
                  .replace(/\\"/g, '"')
                  .replace(/\\n/g, '')
                  .replace(/\\t/g, '');
                hours = JSON.parse(unescaped);
              } catch (secondError) {
                // If still fails, try removing outer quotes if present
                try {
                  const cleaned = hoursStr.replace(/^["']|["']$/g, '');
                  hours = JSON.parse(cleaned);
                } catch (thirdError) {
                  // Last attempt: try parsing after removing all escape characters
                  const fullyUnescaped = hoursStr
                    .replace(/\\/g, '')
                    .replace(/^["']|["']$/g, '');
                  hours = JSON.parse(fullyUnescaped);
                }
              }
            }
          } else {
            // Not a JSON string, might be a simple format
            return null;
          }
        } else {
          // Already an object
          hours = salon.settings.operatingHours;
        }

        // Verify structure: should have lowercase day names (monday, tuesday, etc.)
        if (hours && typeof hours === "object" && !Array.isArray(hours)) {
          // Check if it has at least one day with the expected structure
          const firstDay = Object.keys(hours)[0];
          if (firstDay && hours[firstDay] && typeof hours[firstDay] === "object") {
            if (
              hours[firstDay].hasOwnProperty("isOpen") &&
              hours[firstDay].hasOwnProperty("startTime") &&
              hours[firstDay].hasOwnProperty("endTime")
            ) {
              return hours;
            }
          }
        }
      } catch (error) {
        // Silently fail and try fallback - don't log to avoid console spam
        // The error is expected for malformed data
      }
    }

    // Fallback: If operatingHours not found or invalid, check for openingHours (simple format like "08:00-20:00")
    if (salon.settings.openingHours) {
      try {
        const openingHoursStr = String(salon.settings.openingHours).trim();
        // Parse format like "08:00-20:00"
        const match = openingHoursStr.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
        if (match) {
          const startTime = `${match[1]}:${match[2]}`;
          const endTime = `${match[3]}:${match[4]}`;

          // Convert to day-by-day format (all days open with same hours)
          return {
            monday: { isOpen: true, startTime, endTime },
            tuesday: { isOpen: true, startTime, endTime },
            wednesday: { isOpen: true, startTime, endTime },
            thursday: { isOpen: true, startTime, endTime },
            friday: { isOpen: true, startTime, endTime },
            saturday: { isOpen: true, startTime, endTime },
            sunday: { isOpen: false, startTime, endTime },
          };
        }
        // If it's not in the expected format, return as string
        return openingHoursStr;
      } catch (error) {
        // Silently fail - don't log to avoid console spam
      }
    }

    return null;
  };

  // Get specialties from settings
  const getSpecialties = () => {
    if (salon?.settings?.specialties && Array.isArray(salon.settings.specialties)) {
      return salon.settings.specialties;
    }
    return [];
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

  if (!salon) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <Text style={[styles.errorText, dynamicStyles.text]}>
          Salon not found
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
          {salon.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Salon Image/Header */}
        <View style={[styles.salonHeader, { backgroundColor: theme.colors.primaryLight }]}>
          <View style={styles.salonHeaderDecoration} />
          <View style={styles.salonImageContainer}>
            <View style={[styles.salonImagePlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.salonInitials}>{getInitials(salon.name)}</Text>
            </View>
            {salon.status === "active" && (
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.success }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Open</Text>
              </View>
            )}
          </View>
        </View>

        {/* Salon Info */}
        <View style={styles.salonInfo}>
          <View style={styles.salonTitleContainer}>
            <Text style={[styles.salonTitle, dynamicStyles.text]}>
              {salon.name}
            </Text>
            {salon.registrationNumber && (
              <View style={[styles.verifiedBadge, dynamicStyles.card]}>
                <MaterialIcons name="verified" size={14} color={theme.colors.primary} />
                <Text style={[styles.verifiedText, { color: theme.colors.primary }]}>
                  Verified
                </Text>
              </View>
            )}
          </View>

          {/* Contact Info Cards */}
          <View style={styles.contactCards}>
            {salon.phone && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handlePhonePress}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons
                    name="phone"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={[styles.contactLabel, dynamicStyles.textSecondary]}>Phone</Text>
                  <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                    {salon.phone}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            )}
            {salon.email && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handleEmailPress}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons
                    name="email"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={[styles.contactLabel, dynamicStyles.textSecondary]}>Email</Text>
                  <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                    {salon.email}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            )}
            {salon.website && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handleWebsitePress}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                  <MaterialIcons
                    name="language"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={[styles.contactLabel, dynamicStyles.textSecondary]}>Website</Text>
                  <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                    Visit Website
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
                </TouchableOpacity>
            )}
            {/* Message Salon Button */}
            <TouchableOpacity
              style={[styles.contactCard, dynamicStyles.card]}
              onPress={() => {
                navigation?.navigate("Chat", {
                  salonId: salon?.id,
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialIcons
                  name="chat"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={[styles.contactLabel, dynamicStyles.textSecondary]}>Message</Text>
                <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                  Start a Conversation
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={dynamicStyles.textSecondary.color}
              />
            </TouchableOpacity>
          </View>

          {/* Location Card */}
          {(salon.address || salon.city || salon.district) && (
            <View style={[styles.locationCard, dynamicStyles.card]}>
              <View style={[styles.locationIconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, dynamicStyles.textSecondary]}>
                  Location
                </Text>
                <Text style={[styles.locationText, dynamicStyles.text]}>
                  {[
                    salon.address,
                    salon.district,
                    salon.city,
                    salon.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {salon.description && (
            <View style={styles.descriptionSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLine} />
                <Text style={[styles.sectionHeading, dynamicStyles.text]}>
                  About
                </Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <Text
                style={[styles.description, dynamicStyles.textSecondary]}
                numberOfLines={isDescriptionExpanded ? undefined : 4}
              >
                {salon.description}
              </Text>
              {salon.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  style={styles.viewMoreButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewMoreText, { color: theme.colors.primary }]}>
                    {isDescriptionExpanded ? "Show Less" : "Read More"}
                  </Text>
                  <MaterialIcons
                    name={isDescriptionExpanded ? "expand-less" : "expand-more"}
                    size={18}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === "Overview" && styles.tabActive,
              ]}
              onPress={() => setSelectedTab("Overview")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Overview"
                    ? styles.tabTextActive
                    : styles.tabTextInactive,
                ]}
              >
                Overview
              </Text>
              {selectedTab === "Overview" && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === "Services" && styles.tabActive,
              ]}
              onPress={() => setSelectedTab("Services")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Services"
                    ? [styles.tabTextActive, { color: theme.colors.primary }]
                    : [styles.tabTextInactive, dynamicStyles.textSecondary],
                ]}
              >
                Services
              </Text>
              {services.length > 0 && (
                <View style={[
                  styles.tabBadge,
                  selectedTab === "Services" && styles.tabBadgeActive,
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    selectedTab === "Services" && styles.tabBadgeTextActive,
                  ]}>
                    {services.length}
                  </Text>
                </View>
              )}
              {selectedTab === "Services" && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === "Products" && styles.tabActive,
              ]}
              onPress={() => setSelectedTab("Products")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Products"
                    ? [styles.tabTextActive, { color: theme.colors.primary }]
                    : [styles.tabTextInactive, dynamicStyles.textSecondary],
                ]}
              >
                Products
              </Text>
              {products.length > 0 && (
                <View style={[
                  styles.tabBadge,
                  selectedTab === "Products" && styles.tabBadgeActive,
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    selectedTab === "Products" && styles.tabBadgeTextActive,
                  ]}>
                    {products.length}
                  </Text>
                </View>
              )}
              {selectedTab === "Products" && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === "Employees" && styles.tabActive,
              ]}
              onPress={() => setSelectedTab("Employees")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Employees"
                    ? [styles.tabTextActive, { color: theme.colors.primary }]
                    : [styles.tabTextInactive, dynamicStyles.textSecondary],
                ]}
              >
                Employees
              </Text>
              {employees.length > 0 && (
                <View style={[
                  styles.tabBadge,
                  selectedTab === "Employees" && styles.tabBadgeActive,
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    selectedTab === "Employees" && styles.tabBadgeTextActive,
                  ]}>
                    {employees.length}
                  </Text>
                </View>
              )}
              {selectedTab === "Employees" && (
                <View style={styles.tabUnderline} />
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {selectedTab === "Overview" && (
            <View style={styles.overviewContent}>
              {/* Business Information */}
              <View style={styles.infoSection}>
                <View style={styles.infoRowItem}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons
                      name="business"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                      Business Type
                    </Text>
                    <Text style={[styles.infoValue, dynamicStyles.text]}>
                      {salon.settings?.businessType || "Not specified"}
                    </Text>
                  </View>
                </View>

                {salon.settings?.numberOfEmployees && (
                  <View style={styles.infoRowItem}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons
                        name="people"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                        Team Size
                      </Text>
                      <Text style={[styles.infoValue, dynamicStyles.text]}>
                        {salon.settings.numberOfEmployees} {salon.settings.numberOfEmployees === 1 ? "professional" : "professionals"}
                      </Text>
                    </View>
                  </View>
                )}

                {salon.registrationNumber && (
                  <View style={styles.infoRowItem}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons
                        name="verified"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                        Registration Number
                      </Text>
                      <Text style={[styles.infoValue, dynamicStyles.text]}>
                        {salon.registrationNumber}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoRowItem}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={salon.status === "active" ? theme.colors.success : dynamicStyles.textSecondary.color}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, dynamicStyles.textSecondary]}>
                      Status
                    </Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            salon.status === "active"
                              ? theme.colors.success
                              : dynamicStyles.textSecondary.color,
                        },
                      ]}
                    >
                      {salon.status === "active" ? "Open for business" : "Currently closed"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Specialties */}
              {getSpecialties().length > 0 && (
                <View style={styles.infoSection}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons
                      name="star"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      What We Offer
                    </Text>
                  </View>
                  <View style={styles.specialtiesList}>
                    {getSpecialties().map((specialty: string, index: number) => (
                      <View key={index} style={styles.specialtyItem}>
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.specialtyText, dynamicStyles.text]}>
                          {specialty}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Operating Hours */}
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                    Opening Hours
                  </Text>
                </View>
                {(() => {
                  const hours = parseOperatingHours();
                  if (!hours) {
                    return (
                      <Text style={[styles.operatingHoursText, dynamicStyles.textSecondary]}>
                        Hours not specified
                      </Text>
                    );
                  }
                  
                  if (typeof hours === "string") {
                    return (
                      <Text style={[styles.operatingHoursText, dynamicStyles.text]}>
                        {hours}
                      </Text>
                    );
                  }

                  return (
                    <View style={styles.hoursList}>
                      {Object.entries(hours).map(([day, dayHours]: [string, any]) => {
                        if (dayHours && typeof dayHours === "object" && dayHours.isOpen) {
                          return (
                            <View key={day} style={styles.hourRow}>
                              <Text style={[styles.dayText, dynamicStyles.text]}>
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </Text>
                              <View style={styles.timeContainer}>
                                <MaterialIcons
                                  name="access-time"
                                  size={14}
                                  color={dynamicStyles.textSecondary.color}
                                />
                                <Text style={[styles.timeText, dynamicStyles.text]}>
                                  {dayHours.startTime} - {dayHours.endTime}
                                </Text>
                              </View>
                            </View>
                          );
                        } else if (dayHours && typeof dayHours === "object" && !dayHours.isOpen) {
                          return (
                            <View key={day} style={styles.hourRow}>
                              <Text style={[styles.dayText, dynamicStyles.text]}>
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </Text>
                              <Text style={[styles.timeText, dynamicStyles.textSecondary]}>
                                Closed
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  );
                })()}
              </View>

              {/* Location */}
              {salon.latitude && salon.longitude && (
                <View style={styles.infoSection}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons
                      name="place"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      Find Us
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => {
                      const url = `https://www.openstreetmap.org/?mlat=${salon.latitude}&mlon=${salon.longitude}&zoom=15`;
                      Linking.openURL(url);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mapIconContainer}>
                      <MaterialIcons
                        name="map"
                        size={24}
                        color={theme.colors.white}
                      />
                    </View>
                    <View style={styles.mapInfo}>
                      <Text style={[styles.mapButtonText, dynamicStyles.text]}>
                        View on Map
                      </Text>
                      <Text style={[styles.mapSubtext, dynamicStyles.textSecondary]}>
                        Tap to open location
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={dynamicStyles.textSecondary.color}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Social Media Links */}
              {(salon.settings?.facebookUrl || salon.settings?.instagramUrl || salon.settings?.twitterUrl) && (
                <View style={styles.infoSection}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons
                      name="share"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                      Connect With Us
                    </Text>
                  </View>
                  <View style={styles.socialLinksList}>
                    {salon.settings?.facebookUrl && (
                      <TouchableOpacity
                        style={styles.socialLinkItem}
                        onPress={() => Linking.openURL(salon.settings?.facebookUrl || "")}
                        activeOpacity={0.7}
                      >
                        <View style={styles.socialIconContainer}>
                          <MaterialIcons name="facebook" size={22} color="#1877F2" />
                        </View>
                        <Text style={[styles.socialLinkText, dynamicStyles.text]}>Facebook</Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color={dynamicStyles.textSecondary.color}
                        />
                      </TouchableOpacity>
                    )}
                    {salon.settings?.instagramUrl && (
                      <TouchableOpacity
                        style={styles.socialLinkItem}
                        onPress={() => Linking.openURL(salon.settings?.instagramUrl || "")}
                        activeOpacity={0.7}
                      >
                        <View style={styles.socialIconContainer}>
                          <FontAwesome name="instagram" size={24} color="#E1306C" />
                        </View>
                        <Text style={[styles.socialLinkText, dynamicStyles.text]}>Instagram</Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color={dynamicStyles.textSecondary.color}
                        />
                      </TouchableOpacity>
                    )}
                    {salon.settings?.twitterUrl && (
                      <TouchableOpacity
                        style={styles.socialLinkItem}
                        onPress={() => Linking.openURL(salon.settings?.twitterUrl || "")}
                        activeOpacity={0.7}
                      >
                        <View style={styles.socialIconContainer}>
                          <Feather name="twitter" size={24} color="#1DA1F2" />
                        </View>
                        <Text style={[styles.socialLinkText, dynamicStyles.text]}>Twitter</Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color={dynamicStyles.textSecondary.color}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {selectedTab === "Services" && (
            <View style={styles.servicesContent}>
              {servicesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : services.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="content-cut"
                    size={48}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.emptyText, dynamicStyles.text]}>
                    No services available
                  </Text>
                </View>
              ) : (
                <View style={styles.servicesGrid}>
                  {services.map((service) => (
                    <View key={service.id} style={styles.serviceCardWrapper}>
                      <ServiceCard
                        image={null}
                        title={service.name}
                        author={salon.name}
                        likes={0}
                        onPress={() => handleServicePress(service)}
                        onLike={() => console.log("Like:", service.id)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedTab === "Products" && (
            <View style={styles.productsContent}>
              {productsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="inventory"
                    size={48}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.emptyText, dynamicStyles.text]}>
                    No products available
                  </Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {products.map((product) => (
                    <View key={product.id} style={[styles.productCard, dynamicStyles.card]}>
                      <View style={[styles.productImage, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={styles.productInitials}>
                          {getInitials(product.name)}
                        </Text>
                      </View>
                      <View style={styles.productContent}>
                        <Text style={[styles.productTitle, dynamicStyles.text]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        {product.description && (
                          <Text
                            style={[styles.productDescription, dynamicStyles.textSecondary]}
                            numberOfLines={2}
                          >
                            {product.description}
                          </Text>
                        )}
                        <View style={styles.productFooter}>
                          <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
                            {product.price && product.price > 0
                              ? `$${Number(product.price).toFixed(2)}`
                              : "Price N/A"}
                          </Text>
                          {product.stockQuantity !== undefined && product.stockQuantity !== null && (
                            <Text style={[styles.productStock, dynamicStyles.textSecondary]}>
                              {product.stockQuantity} in stock
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedTab === "Employees" && (
            <View style={styles.employeesContent}>
              {employeesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : employees.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="people"
                    size={48}
                    color={dynamicStyles.textSecondary.color}
                  />
                  <Text style={[styles.emptyText, dynamicStyles.text]}>
                    No employees available
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.employeesGrid}>
                    {employees.slice(0, 4).map((employee) => (
                      <TouchableOpacity
                        key={employee.id}
                        style={[styles.employeeCard, dynamicStyles.card]}
                        onPress={() => handleEmployeePress(employee)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.employeeImage, { backgroundColor: theme.colors.primaryLight }]}>
                          <Text style={styles.employeeInitials}>
                            {employee.user?.fullName
                              ? employee.user.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "EM"}
                          </Text>
                        </View>
                        <Text style={[styles.employeeName, dynamicStyles.text]} numberOfLines={1}>
                          {employee.user?.fullName || "Employee"}
                        </Text>
                        {employee.roleTitle && (
                          <Text style={[styles.employeeRole, dynamicStyles.textSecondary]} numberOfLines={1}>
                            {employee.roleTitle}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {employees.length > 4 && (
                    <TouchableOpacity
                      style={styles.viewAllButtonBottom}
                      onPress={handleViewAllEmployees}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.viewAllText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        View All Employees
                      </Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  salonHeader: {
    width: "100%",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  salonHeaderDecoration: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(200, 155, 104, 0.15)",
  },
  salonImageContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  salonImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  salonInitials: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.5,
  },
  statusBadge: {
    position: "absolute",
    bottom: -8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 12,
    gap: theme.spacing.xs / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.white,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.5,
  },
  salonInfo: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  salonTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  salonTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: 12,
    gap: theme.spacing.xs / 2,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3,
  },
  contactCards: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    lineHeight: 18,
  },
  locationCard: {
    flexDirection: "row",
    padding: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    lineHeight: 18,
  },
  descriptionSection: {
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.1,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3,
  },
  viewAllButtonBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: "transparent",
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
    borderRadius: 8,
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabTextInactive: {
    color: theme.colors.textSecondary,
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 9,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: theme.colors.white,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: "15%",
    right: "15%",
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.primary,
  },
  overviewContent: {
    marginTop: theme.spacing.sm,
  },
  infoCardsContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
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
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
  },
  servicesContent: {
    marginTop: theme.spacing.sm,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  serviceCardWrapper: {
    width: (Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    marginBottom: theme.spacing.md,
  },
  productsContent: {
    marginTop: theme.spacing.sm,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  productCard: {
    width: (Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  productImage: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  productInitials: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  productContent: {
    padding: theme.spacing.sm,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.bold,
  },
  productDescription: {
    fontSize: 11,
    marginBottom: theme.spacing.xs,
    lineHeight: 14,
    fontFamily: theme.fonts.regular,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  productStock: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  employeesContent: {
    marginTop: theme.spacing.sm,
  },
  employeesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  employeeCard: {
    width: (Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  employeeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  employeeInitials: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.bold,
  },
  employeeRole: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: theme.fonts.regular,
  },
  infoSection: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  infoRowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    lineHeight: 20,
  },
  specialtiesList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  specialtyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  specialtyText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  operatingHoursText: {
    fontSize: 15,
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
    lineHeight: 22,
  },
  hoursList: {
    marginTop: theme.spacing.sm,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dayText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    minWidth: 90,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  timeText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    gap: theme.spacing.md,
  },
  mapIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  mapInfo: {
    flex: 1,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs / 2,
  },
  mapSubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  socialLinksList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  socialLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 16,
    gap: theme.spacing.md,
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  socialLinkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
});

