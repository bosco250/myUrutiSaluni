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
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import BottomNavigation from "../../components/common/BottomNavigation";
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
  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "explore" | "favorites" | "profile"
  >("explore");
  const [selectedTab, setSelectedTab] = useState<TabType>("Overview");
  const [salon, setSalon] = useState<Salon | null>(route?.params?.salon || null);
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
      const fetchedSalon = await exploreService.getSalonById(salonId);
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
    tab: "home" | "bookings" | "explore" | "favorites" | "profile"
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
          <View style={styles.salonImagePlaceholder}>
            <Text style={styles.salonInitials}>{getInitials(salon.name)}</Text>
          </View>
        </View>

        {/* Salon Info */}
        <View style={styles.salonInfo}>
          <Text style={[styles.salonTitle, dynamicStyles.text]}>
            {salon.name}
          </Text>

          {/* Contact Info Cards */}
          <View style={styles.contactCards}>
            {salon.phone && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handlePhonePress}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                  {salon.phone}
                </Text>
              </TouchableOpacity>
            )}
            {salon.email && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handleEmailPress}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                  {salon.email}
                </Text>
              </TouchableOpacity>
            )}
            {salon.website && (
              <TouchableOpacity
                style={[styles.contactCard, dynamicStyles.card]}
                onPress={handleWebsitePress}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="language"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.contactText, dynamicStyles.text]} numberOfLines={1}>
                  Visit Website
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location Card */}
          {(salon.address || salon.city || salon.district) && (
            <View style={[styles.locationCard, dynamicStyles.card]}>
              <MaterialIcons
                name="location-on"
                size={24}
                color={theme.colors.primary}
              />
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
              <Text style={[styles.sectionHeading, dynamicStyles.text]}>
                ABOUT
              </Text>
              <Text style={[styles.description, dynamicStyles.textSecondary]}>
                {salon.description}
              </Text>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Overview")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Overview"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Overview
              </Text>
              {selectedTab === "Overview" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Services")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Services"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Services ({services.length})
              </Text>
              {selectedTab === "Services" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Products")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Products"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Products ({products.length})
              </Text>
              {selectedTab === "Products" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setSelectedTab("Employees")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === "Employees"
                    ? { color: theme.colors.primary }
                    : dynamicStyles.textSecondary,
                ]}
              >
                Employees ({employees.length})
              </Text>
              {selectedTab === "Employees" && (
                <View style={[styles.tabUnderline, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {selectedTab === "Overview" && (
            <View style={styles.overviewContent}>
              {/* Info Cards */}
              <View style={styles.infoCardsContainer}>
                {salon.employeeCount !== undefined && (
                  <View style={[styles.infoCard, dynamicStyles.card]}>
                    <MaterialIcons
                      name="people"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                      Employees
                    </Text>
                    <Text style={[styles.infoCardValue, dynamicStyles.text]}>
                      {salon.employeeCount}
                    </Text>
                  </View>
                )}
                {salon.registrationNumber && (
                  <View style={[styles.infoCard, dynamicStyles.card]}>
                    <MaterialIcons
                      name="verified"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                      Registration
                    </Text>
                    <Text style={[styles.infoCardValue, dynamicStyles.text]} numberOfLines={1}>
                      {salon.registrationNumber}
                    </Text>
                  </View>
                )}
                <View style={[styles.infoCard, dynamicStyles.card]}>
                  <MaterialIcons
                    name="store"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.infoCardLabel, dynamicStyles.textSecondary]}>
                    Status
                  </Text>
                  <Text
                    style={[
                      styles.infoCardValue,
                      {
                        color:
                          salon.status === "active"
                            ? theme.colors.success
                            : dynamicStyles.textSecondary.color,
                      },
                    ]}
                  >
                    {salon.status.charAt(0).toUpperCase() + salon.status.slice(1)}
                  </Text>
                </View>
              </View>
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
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
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
    paddingBottom: 100,
  },
  salonHeader: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  salonImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  salonInitials: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  salonInfo: {
    padding: theme.spacing.lg,
  },
  salonTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  contactCards: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    gap: theme.spacing.xs,
    flex: 1,
    minWidth: "45%",
  },
  contactText: {
    fontSize: 12,
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
  locationCard: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: theme.spacing.xs / 2,
    fontFamily: theme.fonts.regular,
  },
  locationText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  descriptionSection: {
    marginBottom: theme.spacing.md,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
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
    fontSize: 14,
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
});

