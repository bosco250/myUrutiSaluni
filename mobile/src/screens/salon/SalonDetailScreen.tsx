import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  salonService,
  SalonDetails,
  SalonEmployee,
  SalonProduct,
} from "../../services/salon";
import { reviewsService, Review } from "../../services/reviews";
import { Loader } from "../../components/common";

interface SalonDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: {
    params: {
      salonId: string;
      salonName?: string;
      reviewId?: string; // Optional reviewId to highlight specific review
    };
  };
}

type TabType =
  | "overview"
  | "employees"
  | "services"
  | "products"
  | "bookings"
  | "reviews";

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Appointment {
  id: string;
  serviceName?: string;
  customerName?: string;
  scheduledAt: string;
  status: string;
}

const SalonDetailScreen = React.memo(function SalonDetailScreen({
  navigation,
  route,
}: SalonDetailScreenProps) {
  const salonId = route.params?.salonId;
  const salonName = route.params?.salonName;
  const reviewId = route.params?.reviewId;
  const { isDark } = useTheme();

  // All hooks MUST be called unconditionally before any returns
  const [activeTab, setActiveTab] = useState<TabType>(
    reviewId ? "reviews" : "overview"
  );
  const [salon, setSalon] = useState<SalonDetails | null>(null);
  const [employees, setEmployees] = useState<SalonEmployee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<SalonProduct[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

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
    tabInactive: {
      backgroundColor: isDark
        ? theme.colors.gray800
        : theme.colors.backgroundSecondary,
    },
  };

  const fetchReviews = useCallback(async () => {
    if (!salonId) return;

    try {
      setReviewsLoading(true);
      // PERFORMANCE: Reduce limit to 20 for faster loading, add pagination later if needed
      const response = await reviewsService.getReviews({
        salonId,
        limit: 20,
      });
      const data = (response as any)?.data || response;
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.total || 0);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [salonId]);

  const loadData = useCallback(async () => {
    if (!salonId) return;

    try {
      // PERFORMANCE OPTIMIZATION: Load critical data first, then load secondary data
      // This makes the screen appear faster to the user

      // Add timeout to prevent hanging
      const timeout = (ms: number) =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), ms)
        );

      // Step 1: Load salon details first (critical for UI) with timeout
      const salonData = (await Promise.race([
        salonService.getSalonDetails(salonId),
        timeout(8000), // 8 second timeout
      ]).catch((err) => {
        console.error("Error loading salon details:", err);
        throw err;
      })) as SalonDetails;

      setSalon(salonData);
      setLoading(false); // Show UI immediately with salon info

      // Step 2: Load tab-specific data based on active tab (lazy loading)
      // Only load data for the currently active tab to reduce initial load time
      const loadTabData = async () => {
        try {
          if (activeTab === "overview" || activeTab === "employees") {
            const employeesData = await salonService
              .getEmployees(salonId)
              .catch(() => []);
            setEmployees(employeesData);
          }

          if (activeTab === "overview" || activeTab === "services") {
            const servicesData = await salonService
              .getServices(salonId)
              .catch(() => []);
            setServices(servicesData);
          }

          if (activeTab === "overview" || activeTab === "products") {
            const productsData = await salonService
              .getProducts(salonId)
              .catch(() => []);
            setProducts(productsData);
          }

          if (activeTab === "overview" || activeTab === "bookings") {
            const appointmentsData = await salonService
              .getSalonAppointments(salonId, "upcoming")
              .catch(() => []);
            setAppointments(appointmentsData.slice(0, 5)); // Only first 5
          }

          if (activeTab === "reviews") {
            await fetchReviews();
          }
        } catch (err) {
          console.error("Error loading tab data:", err);
        }
      };

      // Load tab data in background
      loadTabData();
    } catch (err) {
      console.error("Error loading salon details:", err);
      Alert.alert("Error", "Failed to load salon details");
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [salonId, activeTab, fetchReviews]);

  useEffect(() => {
    if (!salonId) {
      Alert.alert("Error", "Salon ID is missing");
      navigation.goBack();
      return;
    }
    loadData();
  }, [salonId, navigation]); // eslint-disable-line react-hooks/exhaustive-deps -- loadData intentionally excluded to prevent infinite loops

  // Log when reviewId is present for debugging
  useEffect(() => {
    if (reviewId) {
      console.log("Review ID provided:", reviewId);
      console.log("Active tab set to:", activeTab);
    }
  }, [reviewId, activeTab]);

  // Scroll to review when it loads (if reviewId is provided)
  useEffect(() => {
    if (reviewId && reviews.length > 0 && activeTab === "reviews") {
      const reviewIndex = reviews.findIndex(
        (r) => String(r.id) === String(reviewId)
      );
      if (reviewIndex !== -1) {
        console.log(
          "Review found at index:",
          reviewIndex,
          "Review ID:",
          reviewId
        );
        // The review will be highlighted via the style
      } else {
        console.warn("Review not found in list:", {
          reviewId,
          reviewIds: reviews.map((r) => r.id),
          reviewsCount: reviews.length,
        });
      }
    }
  }, [reviewId, reviews, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // No early return here since hooks are already called and loading state is handled below
  // if (!salonId) return null;

  const handleEditSalon = () => {
    navigation.navigate("CreateSalon", { mode: "edit", salon });
  };

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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "employees", label: "Team", icon: "people" },
    { id: "services", label: "Services", icon: "content-cut" },
    { id: "products", label: "Products", icon: "inventory" },
    { id: "bookings", label: "Bookings", icon: "event" },
    { id: "reviews", label: "Reviews", icon: "rate-review" },
  ];

  const renderTab = (tab: { id: TabType; label: string; icon: string }) => {
    const isActive = activeTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tab,
          isActive ? styles.tabActive : dynamicStyles.tabInactive,
        ]}
        onPress={() => {
          setActiveTab(tab.id);
          // PERFORMANCE: Load tab data when tab is clicked
          if (tab.id !== activeTab) {
            loadData();
          }
        }}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={tab.icon as any}
          size={18}
          color={isActive ? theme.colors.white : theme.colors.textSecondary}
        />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="people" size={24} color={theme.colors.primary} />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            {employees.length}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Employees
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons
            name="content-cut"
            size={24}
            color={theme.colors.secondary}
          />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            {services.length}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Services
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <MaterialIcons name="event" size={24} color={theme.colors.warning} />
          <Text style={[styles.statValue, dynamicStyles.text]}>
            {appointments.length}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Upcoming
          </Text>
        </View>
      </View>

      {/* Salon Info */}
      <View style={[styles.infoCard, dynamicStyles.card]}>
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>
          Salon Information
        </Text>

        {salon?.registrationNumber && (
          <View style={styles.infoRow}>
            <MaterialIcons
              name="verified-user"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              Reg: {salon.registrationNumber}
            </Text>
          </View>
        )}

        {(salon?.address || salon?.city || salon?.district) && (
          <View style={styles.infoRow}>
            <MaterialIcons
              name="location-on"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              {[salon?.address, salon?.district, salon?.city]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        )}

        {salon?.phone && (
          <View style={styles.infoRow}>
            <MaterialIcons
              name="phone"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              {salon.phone}
            </Text>
          </View>
        )}

        {salon?.email && (
          <View style={styles.infoRow}>
            <MaterialIcons
              name="email"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              {salon.email}
            </Text>
          </View>
        )}

        {salon?.website && (
          <View style={styles.infoRow}>
            <MaterialIcons
              name="language"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.infoText, dynamicStyles.text]}>
              {salon.website}
            </Text>
          </View>
        )}

        {/* Operating Hours */}
        <View
          style={[
            styles.descriptionContainer,
            { marginTop: 12, marginBottom: 4 },
          ]}
        >
          <Text
            style={[
              styles.descriptionLabel,
              dynamicStyles.textSecondary,
              { marginBottom: 8 },
            ]}
          >
            Operating Hours
          </Text>
          {(() => {
            const hours = salon?.businessHours || salon?.settings?.workingHours;
            if (!hours)
              return (
                <Text style={[styles.infoText, dynamicStyles.text]}>
                  Not set
                </Text>
              );

            const days = [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ];
            return days.map((day) => {
              // Handle both backend structure (businessHours) and frontend structure (settings.workingHours)
              const data = (hours as any)[day];
              if (!data) return null;

              const label = day.charAt(0).toUpperCase() + day.slice(1);
              // Check for both property conventions
              const open = data.openTime || data.open;
              const close = data.closeTime || data.close;
              // strict check for isOpen false, otherwise check if times exist
              const isOpen = data.isOpen !== false && !!open;

              return (
                <View
                  key={day}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(150,150,150,0.1)",
                    paddingBottom: 2,
                  }}
                >
                  <Text
                    style={[
                      styles.infoText,
                      dynamicStyles.text,
                      { width: 100, fontWeight: "500" },
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.infoText,
                      dynamicStyles.text,
                      !isOpen && {
                        color: theme.colors.textSecondary,
                        fontStyle: "italic",
                      },
                    ]}
                  >
                    {isOpen ? `${open} - ${close}` : "Closed"}
                  </Text>
                </View>
              );
            });
          })()}
        </View>

        {salon?.description && (
          <View style={styles.descriptionContainer}>
            <Text
              style={[styles.descriptionLabel, dynamicStyles.textSecondary]}
            >
              Description
            </Text>
            <Text
              style={[styles.descriptionText, dynamicStyles.text]}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {salon.description}
            </Text>
            {salon.description.length > 100 && (
              <TouchableOpacity
                onPress={() => setShowFullDescription(!showFullDescription)}
                style={{ alignSelf: "flex-start", paddingVertical: 4 }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  {showFullDescription ? "Show Less" : "Read More"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { backgroundColor: theme.colors.primary + "20" },
          ]}
          onPress={() => navigation.navigate("AddEmployee", { salonId })}
        >
          <MaterialIcons
            name="person-add"
            size={24}
            color={theme.colors.primary}
          />
          <Text
            style={[styles.quickActionText, { color: theme.colors.primary }]}
          >
            Add Employee
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { backgroundColor: theme.colors.secondary + "20" },
          ]}
          onPress={() => navigation.navigate("AddService", { salonId })}
        >
          <MaterialIcons name="add" size={24} color={theme.colors.secondary} />
          <Text
            style={[styles.quickActionText, { color: theme.colors.secondary }]}
          >
            Add Service
          </Text>
        </TouchableOpacity>
      </View>

      {/* Management Actions */}
      <View
        style={[
          styles.infoCard,
          dynamicStyles.card,
          { marginTop: theme.spacing.lg },
        ]}
      >
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>
          Salon Management
        </Text>

        <TouchableOpacity
          style={[
            styles.managementButton,
            { backgroundColor: theme.colors.warning + "15" },
          ]}
          onPress={handleEditSalon}
          disabled={actionLoading}
        >
          <MaterialIcons name="edit" size={22} color={theme.colors.warning} />
          <View style={styles.managementButtonContent}>
            <Text
              style={[
                styles.managementButtonTitle,
                { color: theme.colors.warning },
              ]}
            >
              Edit Salon
            </Text>
            <Text
              style={[
                styles.managementButtonSubtitle,
                dynamicStyles.textSecondary,
              ]}
            >
              Update salon details
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.warning}
          />
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[styles.managementButton, { backgroundColor: theme.colors.error + '15' }]}
          onPress={handleDeleteSalon}
          disabled={actionLoading}
        >
          <MaterialIcons name="delete-outline" size={22} color={theme.colors.error} />
          <View style={styles.managementButtonContent}>
            <Text style={[styles.managementButtonTitle, { color: theme.colors.error }]}>Delete Salon</Text>
            <Text style={[styles.managementButtonSubtitle, dynamicStyles.textSecondary]}>Permanently remove this salon</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.error} />
        </TouchableOpacity> */}
      </View>
    </View>
  );

  const renderEmployeesTab = () => (
    <View style={styles.tabContent}>
      {employees.length === 0 ? (
        <View style={styles.emptyTab}>
          <MaterialIcons
            name="people-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyTabText, dynamicStyles.textSecondary]}>
            No employees yet
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddEmployee", { salonId })}
          >
            <View
              style={[
                styles.addButtonGradient,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.addButtonText}>Add Employee</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {employees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={[styles.listCard, dynamicStyles.card]}
              onPress={() =>
                navigation.navigate("OwnerEmployeeDetail", {
                  employeeId: employee.id,
                  salonId,
                  employeeName: employee.user?.fullName,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {employee.user?.fullName?.charAt(0) || "E"}
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.listCardInfo}>
                <Text style={[styles.listCardTitle, dynamicStyles.text]}>
                  {employee.user?.fullName || "Employee"}
                </Text>
                <Text
                  style={[styles.listCardSubtitle, dynamicStyles.textSecondary]}
                >
                  {employee.position || "Staff"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: employee.isActive
                      ? theme.colors.success
                      : theme.colors.error,
                  },
                ]}
              />
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.addMoreListButton, dynamicStyles.card]}
            onPress={() => navigation.navigate("AddEmployee", { salonId })}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.primary,
                marginLeft: 8,
                fontFamily: theme.fonts.medium,
              }}
            >
              Add Employee
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderServicesTab = () => (
    <View style={styles.tabContent}>
      {services.length === 0 ? (
        <View style={styles.emptyTab}>
          <MaterialIcons
            name="content-cut"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyTabText, dynamicStyles.textSecondary]}>
            No services yet
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddService", { salonId })}
          >
            <View
              style={[
                styles.addButtonGradient,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.addButtonText}>Add Service</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.listCard, dynamicStyles.card]}
              onPress={() =>
                navigation.navigate("EditService", { salonId, service })
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.serviceIcon,
                  { backgroundColor: theme.colors.secondary + "20" },
                ]}
              >
                <MaterialIcons
                  name="content-cut"
                  size={20}
                  color={theme.colors.secondary}
                />
              </View>
              <View style={styles.listCardInfo}>
                <Text
                  style={[
                    styles.listCardTitle,
                    dynamicStyles.text,
                    { fontSize: 16 },
                  ]}
                >
                  {service.name}
                </Text>
                <Text
                  style={[
                    styles.listCardSubtitle,
                    dynamicStyles.textSecondary,
                    {
                      fontSize: 14,
                      color: isDark
                        ? theme.colors.gray300
                        : theme.colors.gray600,
                    },
                  ]}
                >
                  <Text
                    style={{ fontWeight: "600", color: theme.colors.primary }}
                  >
                    {service.price?.toLocaleString()} RWF
                  </Text>
                  {"  •  "}
                  {service.duration} min
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    {
                      backgroundColor: service.isActive
                        ? theme.colors.success + "20"
                        : theme.colors.error + "20",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: service.isActive
                        ? theme.colors.success
                        : theme.colors.error,
                      fontSize: 11,
                      fontFamily: theme.fonts.medium,
                    }}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
                <MaterialIcons
                  name="edit"
                  size={16}
                  color={theme.colors.textSecondary}
                  style={{ marginTop: 8, opacity: 0.5 }}
                />
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.addMoreListButton, dynamicStyles.card]}
            onPress={() => navigation.navigate("AddService", { salonId })}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.primary,
                marginLeft: 8,
                fontFamily: theme.fonts.medium,
              }}
            >
              Add Service
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      {/* Stock Management Link */}
      <TouchableOpacity
        style={[styles.managementButton, dynamicStyles.card]}
        onPress={() => navigation.navigate("StockManagement", { salonId })}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.serviceIcon,
            { backgroundColor: theme.colors.primary + "20" },
          ]}
        >
          <MaterialIcons
            name="grid-view"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.managementButtonContent}>
          <Text style={[styles.managementButtonTitle, dynamicStyles.text]}>
            Manage Stock Levels
          </Text>
          <Text
            style={[
              styles.managementButtonSubtitle,
              dynamicStyles.textSecondary,
            ]}
          >
            View table & history
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={dynamicStyles.textSecondary.color}
        />
      </TouchableOpacity>

      {products.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddProduct", { salonId })}
          >
            <View
              style={[
                styles.addButtonGradient,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.addButtonText}>Add Product</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.listCard, dynamicStyles.card]}
              onPress={() =>
                navigation.navigate("AddProduct", { salonId, product })
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.serviceIcon,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <MaterialIcons
                  name="inventory"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.listCardInfo}>
                <Text
                  style={[
                    styles.listCardTitle,
                    dynamicStyles.text,
                    { fontSize: 16 },
                  ]}
                >
                  {product.name}
                </Text>
                <Text
                  style={[
                    styles.listCardSubtitle,
                    dynamicStyles.textSecondary,
                    { fontSize: 13 },
                  ]}
                >
                  {product.sku ? `${product.sku} • ` : ""}
                  {product.unitPrice
                    ? `${product.unitPrice.toLocaleString()} RWF`
                    : "No Price"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    {
                      backgroundColor: !product.isInventoryItem
                        ? theme.colors.gray200
                        : product.stockLevel <= 0
                          ? theme.colors.error + "20"
                          : product.stockLevel <= 5
                            ? theme.colors.warning + "20"
                            : theme.colors.success + "20",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: !product.isInventoryItem
                        ? theme.colors.textSecondary
                        : product.stockLevel <= 0
                          ? theme.colors.error
                          : product.stockLevel <= 5
                            ? theme.colors.warning
                            : theme.colors.success,
                      fontSize: 11,
                      fontFamily: theme.fonts.medium,
                    }}
                  >
                    {!product.isInventoryItem
                      ? "No Track"
                      : product.stockLevel <= 0
                        ? "Out of Stock"
                        : `${product.stockLevel} in Stock`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.addMoreListButton, dynamicStyles.card]}
            onPress={() => navigation.navigate("AddProduct", { salonId })}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.primary,
                marginLeft: 8,
                fontFamily: theme.fonts.medium,
              }}
            >
              Add Product
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderBookingsTab = () => (
    <View style={styles.tabContent}>
      {appointments.length === 0 ? (
        <View style={styles.emptyTab}>
          <MaterialIcons
            name="event-available"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyTabText, dynamicStyles.textSecondary]}>
            No upcoming bookings
          </Text>
        </View>
      ) : (
        appointments.map((appointment) => (
          <View
            key={appointment.id}
            style={[styles.listCard, dynamicStyles.card]}
          >
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: theme.colors.warning + "20" },
              ]}
            >
              <MaterialIcons
                name="event"
                size={20}
                color={theme.colors.warning}
              />
            </View>
            <View style={styles.listCardInfo}>
              <Text style={[styles.listCardTitle, dynamicStyles.text]}>
                {appointment.serviceName || "Appointment"}
              </Text>
              <Text
                style={[styles.listCardSubtitle, dynamicStyles.textSecondary]}
              >
                {appointment.customerName || "Customer"} •{" "}
                {new Date(appointment.scheduledAt).toLocaleDateString()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadgeSmall,
                { backgroundColor: theme.colors.warning + "20" },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.warning,
                  fontSize: 11,
                  fontFamily: theme.fonts.medium,
                }}
              >
                {appointment.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {reviewsLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, dynamicStyles.text]}>
            Loading reviews...
          </Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="rate-review"
            size={48}
            color={dynamicStyles.textSecondary.color}
          />
          <Text style={[styles.emptyText, dynamicStyles.text]}>
            No reviews yet
          </Text>
          <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
            Customers haven't left any reviews for this salon
          </Text>
        </View>
      ) : (
        <>
          {/* Reviews Summary */}
          <View style={[styles.reviewsSummary, dynamicStyles.card]}>
            <View style={styles.ratingContainer}>
              <MaterialIcons
                name="star"
                size={32}
                color={theme.colors.warning}
              />
              <View style={styles.ratingInfo}>
                <Text style={[styles.averageRating, dynamicStyles.text]}>
                  {averageRating.toFixed(1)}
                </Text>
                <Text
                  style={[styles.totalReviewsText, dynamicStyles.textSecondary]}
                >
                  {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Reviews List */}
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View
                key={review.id}
                style={[
                  styles.reviewCard,
                  dynamicStyles.card,
                  reviewId &&
                    String(review.id) === String(reviewId) &&
                    styles.highlightedReview,
                ]}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View
                      style={[
                        styles.reviewerAvatar,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.reviewerInitials}>
                        {review.customer?.user?.fullName
                          ?.charAt(0)
                          .toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.reviewerName, dynamicStyles.text]}>
                        {review.customer?.user?.fullName || "Customer"}
                      </Text>
                      <Text
                        style={[styles.reviewDate, dynamicStyles.textSecondary]}
                      >
                        {new Date(review.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialIcons
                        key={star}
                        name={star <= review.rating ? "star" : "star-border"}
                        size={16}
                        color={theme.colors.warning}
                      />
                    ))}
                  </View>
                </View>
                {review.comment && (
                  <Text style={[styles.reviewComment, dynamicStyles.text]}>
                    {review.comment}
                  </Text>
                )}
                {review.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons
                      name="verified"
                      size={12}
                      color={theme.colors.success}
                    />
                    <Text
                      style={[
                        styles.verifiedText,
                        { color: theme.colors.success },
                      ]}
                    >
                      Verified Visit
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "employees":
        return renderEmployeesTab();
      case "services":
        return renderServicesTab();
      case "products":
        return renderProductsTab();
      case "bookings":
        return renderBookingsTab();
      case "reviews":
        return renderReviewsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, dynamicStyles.container]}
        edges={["top"]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Loader fullscreen message="Loading salon details..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDark ? theme.colors.white : theme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerTitle, dynamicStyles.text]}
            numberOfLines={1}
          >
            {salon?.name || salonName || "Salon"}
          </Text>
          {salon && (
            <View
              style={[
                styles.headerBadge,
                { backgroundColor: getStatusColor(salon.status) + "20" },
              ]}
            >
              <View
                style={[
                  styles.headerBadgeDot,
                  { backgroundColor: getStatusColor(salon.status) },
                ]}
              />
              <Text
                style={[
                  styles.headerBadgeText,
                  { color: getStatusColor(salon.status) },
                ]}
              >
                {salon.status === "active"
                  ? "Active"
                  : salon.status === "pending_approval"
                    ? "Pending Approval"
                    : "Inactive"}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditSalon}>
          <MaterialIcons name="edit" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map(renderTab)}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginRight: theme.spacing.sm,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  editButton: {
    padding: theme.spacing.xs,
  },
  tabsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  tabs: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    marginLeft: 6,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabContent: {
    padding: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  infoCard: {
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: theme.spacing.sm,
  },
  descriptionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginLeft: theme.spacing.sm,
  },
  emptyTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTabText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  addButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginLeft: theme.spacing.sm,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  listCardInfo: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  listCardSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addMoreListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: theme.spacing.sm,
  },
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  managementButtonContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  managementButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  managementButtonSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  // Reviews styles
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  reviewsSummary: {
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingInfo: {
    marginLeft: theme.spacing.md,
  },
  averageRating: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: theme.fonts.bold,
  },
  totalReviewsText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  reviewsList: {
    gap: theme.spacing.md,
  },
  reviewCard: {
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  highlightedReview: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  reviewerInitials: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: theme.fonts.bold,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
});

export default SalonDetailScreen;
