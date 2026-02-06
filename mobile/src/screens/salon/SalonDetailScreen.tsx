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
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme } from "../../context";
import {
  salonService,
  SalonDetails,
  SalonEmployee,
  SalonProduct,
} from "../../services/salon";
import { appointmentsService } from "../../services/appointments";
import { reviewsService, Review } from "../../services/reviews";
import { Loader } from "../../components/common";
import { getImageUrl } from "../../utils";



interface SalonDetailScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
    addListener: (event: string, callback: () => void) => () => void;
  };
  route: {
    params: {
      salonId: string;
      salonName?: string;
      reviewId?: string;
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

// Local interfaces for mapped data
interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
  imageUrl?: string;
}

interface AppointmentItem {
  id: string;
  serviceName: string;
  customerName: string;
  scheduledAt: string;
  status: string;
  price: number;
}

const SalonDetailScreen = React.memo(function SalonDetailScreen({
  navigation,
  route,
}: SalonDetailScreenProps) {
  const salonId = route.params?.salonId;
  const reviewId = route.params?.reviewId;
  const { isDark } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState<TabType>(reviewId ? "reviews" : "overview");
  const [salon, setSalon] = useState<SalonDetails | null>(null);
  const [employees, setEmployees] = useState<SalonEmployee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<SalonProduct[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Styling
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray500 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    border: {
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    iconBg: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
    },
    tabActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    tabInactive: {
        backgroundColor: "transparent",
        borderColor: isDark ? theme.colors.gray600 : theme.colors.borderLight,
    },
    headerBorder: {
        borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    }
  };

  // Status Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return theme.colors.success;
      case "inactive": return theme.colors.gray500;
      case "pending_approval": return theme.colors.warning;
      case "rejected": return theme.colors.error;
      case "completed": return theme.colors.success;
      case "cancelled": return theme.colors.error;
      case "confirmed": return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  // Data Loading
  const fetchReviews = useCallback(async () => {
    if (!salonId) return;
    try {
      setReviewsLoading(true);
      const response = await reviewsService.getReviews({ salonId, limit: 20 });
      const data = (response as any)?.data || response;
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  }, [salonId]);

  const loadTabData = useCallback(async () => {
    if (!salonId) return;
    try {
      if (activeTab === "overview" || activeTab === "employees") {
        const empData = await salonService.getEmployees(salonId).catch(() => []);
        setEmployees(empData);
      }

      if (activeTab === "overview" || activeTab === "services") {
        const srvData = await salonService.getServices(salonId).catch(() => []);
        setServices(srvData.map((s: any) => ({
             id: s.id,
             name: s.name,
             description: s.description,
             price: s.price || s.basePrice || 0,
             duration: s.duration || s.durationMinutes || 0,
             isActive: s.isActive !== false,
             imageUrl: s.imageUrl,
        })));
      }

      if (activeTab === "overview" || activeTab === "products") {
        const prodData = await salonService.getProducts(salonId).catch(() => []);
        setProducts(prodData);
      }

      if (activeTab === "overview" || activeTab === "bookings") {
        const aptData = await appointmentsService.getSalonAppointments({ salonId }).catch(() => []);
        const mapped = aptData.map((a: any) => ({
            id: a.id,
            serviceName: a.service?.name || "Service",
            customerName: a.customer?.user?.fullName || a.customerName || "Customer",
            scheduledAt: a.scheduledStart,
            status: a.status,
            price: a.serviceAmount || a.service?.basePrice || 0,
        })).sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        setAppointments(mapped);
      }

      if (activeTab === "reviews") {
        await fetchReviews();
      }
    } catch (err) {
      console.error("Error loading tab data:", err);
    }
  }, [salonId, activeTab, fetchReviews]);

  const loadSalon = useCallback(async () => {
    if (!salonId) return;
    try {
      const data = await salonService.getSalonDetails(salonId);
      setSalon(data);
      setLoading(false);
      loadTabData();
    } catch (err: any) {
        console.error("Error loading salon:", err);
        Alert.alert("Error", "Failed to load salon details");
        setLoading(false);
        navigation.goBack();
    }
  }, [salonId, loadTabData, navigation]);

  useEffect(() => {
    loadSalon();
  }, [loadSalon]);

  // Reload when tab changes
  useEffect(() => {
      if (!loading) loadTabData();
  }, [activeTab, loading, loadTabData]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSalon();
    setRefreshing(false);
  }, [loadSalon]);


  if (loading) {
      return (
          <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
               <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
               <View style={styles.loaderContainer}>
                 <Loader />
               </View>
          </SafeAreaView>
      );
  }

  if (!salon) return null;

  // Render Functions
  const renderHeader = () => (
      <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
              <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                  <Text style={[styles.headerTitle, dynamicStyles.text]} numberOfLines={1}>{salon.name}</Text>
                  <View style={[styles.statusBadgeCompact, { backgroundColor: getStatusColor(salon.status) + '15' }]}>
                      <View style={[styles.statusDotCompact, { backgroundColor: getStatusColor(salon.status) }]} />
                      <Text style={[styles.statusTextCompact, { color: getStatusColor(salon.status) }]}>
                        {salon.status === 'pending_approval' ? 'Pending' : salon.status}
                      </Text>
                  </View>
              </View>
          </View>
          <TouchableOpacity 
            style={styles.editLink}
            onPress={() => navigation.navigate("CreateSalon", { mode: "edit", salon })}
          >
              <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
      </View>
  );

  const renderTabs = () => (
      <View style={[styles.tabsWrapper, dynamicStyles.headerBorder]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsContainer}
          >
              {[
                  { id: "overview", label: "Overview" },
                  { id: "employees", label: "Team" },
                  { id: "services", label: "Services" },
                  { id: "products", label: "Inventory" },
                  { id: "bookings", label: "Bookings" },
                  { id: "reviews", label: "Reviews" },
              ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.tabItemCompact, 
                            isActive && styles.tabItemActiveCompact
                        ]}
                        onPress={() => setActiveTab(tab.id as TabType)}
                      >
                          <Text style={[
                              styles.tabTextCompact,
                              isActive ? styles.tabTextActive : dynamicStyles.textSecondary
                          ]}>
                              {tab.label}
                          </Text>
                          {isActive && <View style={styles.activeTabIndicator} />}
                      </TouchableOpacity>
                  );
              })}
          </ScrollView>
      </View>
  );

  const renderOverview = () => {
      // Robust helper to get business hours from various possible locations
      const getOperatingHoursData = () => {
          if (!salon) return null;
          
          // 1. Direct property
          if (salon.businessHours) return salon.businessHours;

          // 2. Settings locations
          const settings = salon.settings || {};
          const settingsHours = settings.workingHours || settings.operatingHours || settings.businessHours;
          
          if (settingsHours) {
              if (typeof settingsHours === 'string') {
                  try { return JSON.parse(settingsHours); } catch (e) { /* ignore */ }
              } else {
                  return settingsHours;
              }
          }

          // 3. Metadata locations (common in some API responses)
          const metadata = (salon as any).metadata || {};
          const metaHours = metadata.workingHours || metadata.operatingHours || metadata.businessHours;
          
          if (metaHours) {
              if (typeof metaHours === 'string') {
                  try { return JSON.parse(metaHours); } catch (e) { /* ignore */ }
              } else {
                  return metaHours;
              }
          }

          return null;
      };

      // Helper for Operating Hours UI
      const renderOperatingHours = () => {
          const hours = getOperatingHoursData();
          
          const daysOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

          return (
              <View style={[styles.sectionContainer, dynamicStyles.card, { paddingBottom: 8 }]}>
                  <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
                          <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 0 }]}>Operating Hours</Text>
                      </View>
                  </View>

                  {!hours ? (
                      <TouchableOpacity 
                        style={styles.emptyHoursContainer}
                        onPress={() => navigation.navigate("CreateSalon", { mode: "edit", salon })}
                      >
                          <Text style={[styles.emptyHoursText, dynamicStyles.textSecondary]}>
                              Business hours not set yet.
                          </Text>
                          <Text style={styles.setHoursText}>
                              Set Hours
                          </Text>
                      </TouchableOpacity>
                  ) : (
                      <View style={styles.hoursGrid}>
                          {daysOrder.map((day) => {
                              // Support both lowercase and Capitalized keys
                              const dayData = hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)];
                              
                              const isOpen = dayData && dayData.isOpen !== false && (dayData.openTime || dayData.open || dayData.startTime);
                              const open = dayData?.openTime || dayData?.open || dayData?.startTime;
                              const close = dayData?.closeTime || dayData?.close || dayData?.endTime;
                              const isToday = day === today;

                              return (
                                  <View key={day} style={[styles.hourRowCompact, isToday && styles.hourRowTodayCompact]}>
                                      <Text style={[
                                          styles.dayTextCompact,
                                          dynamicStyles.text,
                                          isToday && styles.todayText
                                      ]}>
                                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                      </Text>
                                      <View style={styles.timeContainerCompact}>
                                          {isOpen ? (
                                              <Text style={[
                                                  styles.timeTextCompact,
                                                  dynamicStyles.text,
                                                  isToday && styles.todayText
                                              ]}>
                                                  {open} - {close}
                                              </Text>
                                          ) : (
                                              <Text style={styles.closedText}>
                                                  Closed
                                              </Text>
                                          )}
                                      </View>
                                  </View>
                              );
                          })}
                      </View>
                  )}
              </View>
          );
      };

      const renderGallery = () => {
          const images = salon.images || [];
          if (images.length === 0) return null;

          const galleryHeight = 220;
          const spacing = 6;

          return (
              <View style={[styles.gallerySection, dynamicStyles.card]}>
                  <View style={styles.galleryHeader}>
                      <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 0 }]}>Gallery</Text>
                      {images.length > 3 && (
                          <TouchableOpacity>
                              <Text style={styles.viewAllLink}>View All</Text>
                          </TouchableOpacity>
                      )}
                  </View>

                  <View style={[styles.mosaicContainer, { height: galleryHeight }]}>
                      {images.length === 1 ? (
                          <TouchableOpacity activeOpacity={0.9} style={styles.fullImageContainer}>
                              <Image source={{ uri: getImageUrl(images[0]) || '' }} style={styles.mosaicImage} />
                          </TouchableOpacity>
                      ) : images.length === 2 ? (
                          <View style={styles.mosaicRow}>
                              <TouchableOpacity activeOpacity={0.9} style={styles.halfImageContainer}>
                                  <Image source={{ uri: getImageUrl(images[0]) || '' }} style={styles.mosaicImage} />
                              </TouchableOpacity>
                              <View style={{ width: spacing }} />
                              <TouchableOpacity activeOpacity={0.9} style={styles.halfImageContainer}>
                                  <Image source={{ uri: getImageUrl(images[1]) || '' }} style={styles.mosaicImage} />
                              </TouchableOpacity>
                          </View>
                      ) : (
                          <View style={styles.mosaicRow}>
                              {/* Large Featured Image */}
                              <TouchableOpacity activeOpacity={0.9} style={styles.featuredImageContainer}>
                                  <Image source={{ uri: getImageUrl(images[0]) || '' }} style={styles.mosaicImage} />
                              </TouchableOpacity>
                              
                              <View style={{ width: spacing }} />
                              
                              {/* Side Column (2 smaller images) */}
                              <View style={styles.sideMosaicColumn}>
                                  <TouchableOpacity activeOpacity={0.9} style={styles.sideImageContainer}>
                                      <Image source={{ uri: getImageUrl(images[1]) || '' }} style={styles.mosaicImage} />
                                  </TouchableOpacity>
                                  <View style={{ height: spacing }} />
                                  <TouchableOpacity activeOpacity={0.9} style={styles.sideImageContainer}>
                                      <Image source={{ uri: getImageUrl(images[2]) || '' }} style={styles.mosaicImage} />
                                      {images.length > 3 && (
                                          <View style={styles.moreOverlay}>
                                              <Text style={styles.moreText}>+{images.length - 3}</Text>
                                          </View>
                                      )}
                                  </TouchableOpacity>
                              </View>
                          </View>
                      )}
                  </View>
              </View>
          );
      };

      return (
          <View style={styles.contentContainer}>
              {/* Image Gallery */}
              {renderGallery()}

              {/* Quick Stats Grid */}
              <View style={styles.statsGrid}>
                  <View style={[styles.statBox, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>{employees.length}</Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Staff</Text>
                  </View>
                  <View style={[styles.statBox, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>{services.length}</Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Services</Text>
                  </View>
                  <View style={[styles.statBox, dynamicStyles.card]}>
                      <Text style={[styles.statValue, dynamicStyles.text]}>{appointments.filter(a => a.status === 'confirmed').length}</Text>
                      <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Upcoming</Text>
                  </View>
              </View>

              {/* About Section */}
              <View style={[styles.sectionContainer, dynamicStyles.card]}>
                  <Text style={[styles.sectionTitle, dynamicStyles.text]}>About</Text>
                  {salon.description ? (
                      <View>
                          <Text style={[styles.description, dynamicStyles.textSecondary]} numberOfLines={showFullDescription ? undefined : 3}>
                              {salon.description}
                          </Text>
                          {salon.description.length > 100 && (
                              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                                  <Text style={styles.readMoreText}>
                                      {showFullDescription ? "Show Less" : "Read More"}
                                  </Text>
                              </TouchableOpacity>
                          )}
                      </View>
                  ) : (
                      <Text style={[styles.description, dynamicStyles.textSecondary, { fontStyle: 'italic' }]}>No description provided.</Text>
                  )}
              </View>

              {/* Details Section */}
              <View style={[styles.sectionContainer, dynamicStyles.card]}>
                   <Text style={[styles.sectionTitle, dynamicStyles.text]}>Details</Text>
                   
                   {salon.registrationNumber && (
                       <View style={styles.detailRow}>
                           <MaterialIcons name="verified-user" size={20} color={theme.colors.primary} />
                           <View style={styles.detailContent}>
                               <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Reg. Number</Text>
                               <Text style={[styles.detailText, dynamicStyles.text]}>{salon.registrationNumber}</Text>
                           </View>
                       </View>
                   )}

                   <View style={styles.detailRow}>
                       <MaterialIcons name="location-on" size={20} color={theme.colors.primary} />
                       <View style={styles.detailContent}>
                           <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Address</Text>
                           <Text style={[styles.detailText, dynamicStyles.text]}>
                               {[salon.address, salon.district, salon.city].filter(Boolean).join(", ") || "No address set"}
                           </Text>
                       </View>
                   </View>

                   {salon.phone && (
                       <View style={styles.detailRow}>
                           <MaterialIcons name="phone" size={20} color={theme.colors.primary} />
                           <TouchableOpacity onPress={() => Linking.openURL(`tel:${salon.phone}`)} style={styles.detailContent}>
                                <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Phone</Text>
                                <Text style={[styles.detailText, styles.linkText]}>{salon.phone}</Text>
                           </TouchableOpacity>
                       </View>
                   )}

                   {salon.email && (
                       <View style={styles.detailRow}>
                           <MaterialIcons name="email" size={20} color={theme.colors.primary} />
                           <View style={styles.detailContent}>
                               <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Email</Text>
                               <Text style={[styles.detailText, dynamicStyles.text]}>{salon.email}</Text>
                           </View>
                       </View>
                   )}

                   {salon.website && (
                       <View style={styles.detailRow}>
                           <MaterialIcons name="language" size={20} color={theme.colors.primary} />
                           <TouchableOpacity onPress={() => Linking.openURL(salon.website!.startsWith('http') ? salon.website! : `https://${salon.website}`)} style={styles.detailContent}>
                               <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Website</Text>
                               <Text style={[styles.detailText, styles.linkText]}>{salon.website}</Text>
                           </TouchableOpacity>
                       </View>
                   )}
              </View>

              {/* Operating Hours */}
              {renderOperatingHours()}

              {/* Quick Actions */}
              <View style={[styles.sectionContainer, { borderWidth: 0, padding: 0 }]}>
                   <Text style={[styles.sectionTitle, dynamicStyles.text, { marginBottom: 12 }]}>Quick Actions</Text>
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
                            onPress={() => navigation.navigate("AddEmployee", { salonId })}
                        >
                            <MaterialIcons name="person-add" size={18} color={theme.colors.white} />
                            <Text style={[styles.actionButtonText, { fontSize: 13 }]}>Staff</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                             style={[styles.actionButton, { backgroundColor: theme.colors.secondary, flex: 1 }]}
                             onPress={() => navigation.navigate("AddService", { salonId })}
                        >
                            <MaterialIcons name="add" size={18} color={theme.colors.white} />
                            <Text style={[styles.actionButtonText, { fontSize: 13 }]}>Service</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                             style={[styles.actionButton, { backgroundColor: '#FF9500', flex: 1 }]}
                             onPress={() => navigation.navigate("AddProduct", { salonId })}
                        >
                            <MaterialIcons name="inventory-2" size={18} color={theme.colors.white} />
                            <Text style={[styles.actionButtonText, { fontSize: 13 }]}>Product</Text>
                        </TouchableOpacity>
                    </View>
              </View>
          </View>
      );
  };

  const renderListEmpty = (message: string, icon: any = "info-outline") => (
      <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, dynamicStyles.iconBg]}>
              <MaterialIcons name={icon} size={32} color={dynamicStyles.textSecondary.color} />
          </View>
          <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>{message}</Text>
      </View>
  );

  const renderEmployees = () => (
      <View style={styles.contentContainer}>
          <View style={styles.sectionHeaderRow}>
               <Text style={[styles.sectionTitle, dynamicStyles.text]}>Team Members</Text>
               <TouchableOpacity onPress={() => navigation.navigate("AddEmployee", { salonId })}>
                   <Text style={styles.addLinkText}>+ Add</Text>
               </TouchableOpacity>
          </View>
          
          {employees.length === 0 ? renderListEmpty("No employees found", "people-outline") : (
              employees.map((emp) => (
                  <TouchableOpacity
                      key={emp.id}
                      style={[styles.listItem, dynamicStyles.card]}
                      onPress={() => navigation.navigate("OwnerEmployeeDetail", { 
                          employeeId: emp.id, 
                          salonId,
                          employeeName: emp.user?.fullName 
                      })}
                  >
                      <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.avatarInitials}>
                              {emp.user?.fullName?.charAt(0) || "U"}
                          </Text>
                      </View>
                      <View style={styles.listItemContent}>
                          <Text style={[styles.listItemTitle, dynamicStyles.text]}>{emp.user?.fullName || "Unknown"}</Text>
                          <Text style={[styles.listItemSubtitle, dynamicStyles.textSecondary]}>{emp.position || "Staff"}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: emp.isActive ? theme.colors.success : theme.colors.gray400 }]} />
                      <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
                  </TouchableOpacity>
              ))
          )}
      </View>
  );

  const renderServices = () => (
      <View style={styles.contentContainer}>
          <View style={styles.sectionHeaderRow}>
               <Text style={[styles.sectionTitle, dynamicStyles.text]}>Services Menu</Text>
               <TouchableOpacity onPress={() => navigation.navigate("AddService", { salonId })}>
                   <Text style={styles.addLinkText}>+ Add</Text>
               </TouchableOpacity>
          </View>

          {services.length === 0 ? renderListEmpty("No services added", "content-cut") : (
              services.map((srv) => (
                  <TouchableOpacity 
                      key={srv.id} 
                      style={[styles.listItem, dynamicStyles.card]}
                      onPress={() => navigation.navigate("ServiceDetail", { serviceId: srv.id, service: srv })}
                  >
                      {srv.imageUrl ? (
                          <Image 
                              source={{ uri: getImageUrl(srv.imageUrl) || '' }} 
                              style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: theme.colors.gray200 }} 
                          />
                      ) : (
                          <View style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: theme.colors.primaryLight + '30', alignItems: 'center', justifyContent: 'center' }}>
                               <MaterialIcons name="spa" size={24} color={theme.colors.primary} />
                          </View>
                      )}
                      <View style={styles.listItemContent}>
                          <Text style={[styles.listItemTitle, dynamicStyles.text]}>{srv.name}</Text>
                          <Text style={[styles.listItemSubtitle, dynamicStyles.textSecondary]}>{srv.duration} mins</Text>
                      </View>
                      <Text style={[styles.priceTag, { color: theme.colors.primary }]}>
                           RWF {srv.price.toLocaleString()}
                      </Text>
                  </TouchableOpacity>
              ))
          )}
      </View>
  );

  const renderProducts = () => (
    <View style={styles.contentContainer}>
        <View style={styles.sectionHeaderRow}>
             <Text style={[styles.sectionTitle, dynamicStyles.text]}>Inventory ({products.length})</Text>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity 
                  onPress={() => navigation.navigate("StockManagement", { salonId })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                    <MaterialIcons name="inventory" size={16} color={theme.colors.primary} />
                    <Text style={styles.manageLinkText}>Manage</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => navigation.navigate("AddProduct", { salonId })}
                >
                    <Text style={styles.addBoldLinkText}>+ Add</Text>
                </TouchableOpacity>
             </View>
        </View>

        {products.length === 0 ? (
            <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, dynamicStyles.iconBg]}>
                    <MaterialIcons name="inventory-2" size={28} color={dynamicStyles.textSecondary.color} />
                </View>
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>No products in inventory</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate("AddProduct", { salonId })}
                  style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: theme.colors.primary, borderRadius: 10 }}
                >
                    <Text style={styles.addProductButtonText}>Add Product</Text>
                </TouchableOpacity>
            </View>
        ) : (
            products.map((prod) => (
                <TouchableOpacity 
                  key={prod.id} 
                  style={[styles.listItem, dynamicStyles.card]}
                  onPress={() => navigation.navigate("StockManagement", { salonId, productId: prod.id })}
                >
                    <View style={[styles.avatarCircle, { backgroundColor: theme.colors.secondary }]}>
                        <MaterialIcons name="inventory-2" size={18} color={theme.colors.white} />
                    </View>
                    <View style={styles.listItemContent}>
                        <Text style={[styles.listItemTitle, dynamicStyles.text]}>{prod.name}</Text>
                        <Text style={[styles.listItemSubtitle, dynamicStyles.textSecondary]}>
                            Stock: {prod.stockLevel} {prod.sku ? `• SKU: ${prod.sku}` : ''}
                        </Text>
                    </View>
                    {prod.stockLevel <= 5 && (
                         <View style={[styles.badge, { backgroundColor: theme.colors.error + '15' }]}>
                             <Text style={styles.lowStockText}>LOW</Text>
                         </View>
                    )}
                    <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
                </TouchableOpacity>
            ))
        )}
    </View>
  );

  const renderBookings = () => (
      <View style={styles.contentContainer}>
          {appointments.length === 0 ? renderListEmpty("No bookings yet", "event-note") : (
              appointments.map((apt) => (
                  <View key={apt.id} style={[styles.listItem, dynamicStyles.card]}>
                      <View style={[styles.dateBox, dynamicStyles.iconBg]}>
                          <Text style={[styles.dateDay, dynamicStyles.text]}>
                              {new Date(apt.scheduledAt).getDate()}
                          </Text>
                          <Text style={[styles.dateMonth, dynamicStyles.textSecondary]}>
                              {new Date(apt.scheduledAt).toLocaleString('default', { month: 'short' })}
                          </Text>
                      </View>
                      <View style={styles.listItemContent}>
                          <Text style={[styles.listItemTitle, dynamicStyles.text]}>{apt.customerName}</Text>
                          <Text style={[styles.listItemSubtitle, dynamicStyles.textSecondary]}>{apt.serviceName}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '15' }]}>
                           <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>{apt.status}</Text>
                      </View>
                  </View>
              ))
          )}
      </View>
  );

  const renderReviews = () => (
      <View style={styles.contentContainer}>
          {reviewsLoading ? (
               <Loader message="Loading reviews..." />
          ) : reviews.length === 0 ? (
               renderListEmpty("No reviews yet", "rate-review")
          ) : (
               reviews.map((rev) => (
                   <View key={rev.id} style={[styles.reviewCard, dynamicStyles.card]}>
                       <View style={styles.reviewHeader}>
                           <View style={{ flex: 1 }}>
                               <Text style={[styles.reviewAuthor, dynamicStyles.text]}>{rev.customer?.user?.fullName || "Anonymous"}</Text>
                               <View style={styles.ratingRow}>
                                   {[1, 2, 3, 4, 5].map((star) => (
                                       <MaterialIcons 
                                          key={star} 
                                          name={star <= rev.rating ? "star" : "star-border"} 
                                          size={14} 
                                          color={theme.colors.warning} 
                                       />
                                   ))}
                               </View>
                           </View>
                           <Text style={[styles.reviewDate, dynamicStyles.textSecondary]}>
                               {new Date(rev.createdAt).toLocaleDateString()}
                           </Text>
                       </View>
                       {rev.comment && (
                           <Text style={[styles.reviewText, dynamicStyles.textSecondary]}>{rev.comment}</Text>
                       )}
                   </View>
               ))
          )}
      </View>
  );

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {renderHeader()}
      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
          {activeTab === "overview" && renderOverview()}
          {activeTab === "employees" && renderEmployees()}
          {activeTab === "services" && renderServices()}
          {activeTab === "products" && renderProducts()}
          {activeTab === "bookings" && renderBookings()}
          {activeTab === "reviews" && renderReviews()}
          
          <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    letterSpacing: -0.5,
    maxWidth: '70%',
  },
  statusBadgeCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
  },
  statusDotCompact: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 4,
  },
  statusTextCompact: {
      fontSize: 9,
      fontFamily: theme.fonts.bold,
      textTransform: 'uppercase',
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
  },
  statusText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      textTransform: 'uppercase',
  },
  editLink: {
      padding: 8,
  },
  tabsWrapper: {
      borderBottomWidth: 1,
  },
  tabsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 0,
  },
  tabItemCompact: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 4,
      alignItems: 'center',
      justifyContent: 'center',
  },
  tabItemActiveCompact: {
      // styles for active tab
  },
  tabTextCompact: {
      fontSize: 14,
      fontFamily: theme.fonts.semibold,
  },
  tabTextActive: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
  },
  activeTabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      height: 3,
      backgroundColor: theme.colors.primary,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
  },
  scrollContent: {
      padding: 14,
  },
  contentContainer: {
      gap: 14,
  },
  statsGrid: {
      flexDirection: 'row',
      gap: 10,
  },
  statBox: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
  },
  statValue: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      marginBottom: 2,
  },
  statLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
  },
  sectionContainer: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
  },
  gallerySection: {
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mosaicContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mosaicRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mosaicImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.gray200,
  },
  fullImageContainer: {
    flex: 1,
  },
  halfImageContainer: {
    flex: 1,
  },
  featuredImageContainer: {
    flex: 2, // Takes 2/3 of space
  },
  sideMosaicColumn: {
    flex: 1, // Takes 1/3 of space
  },
  sideImageContainer: {
    flex: 1,
    position: 'relative',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      marginBottom: 12,
  },
  description: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      lineHeight: 18,
  },
  detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  detailContent: {
      flex: 1,
      marginLeft: 10,
  },
  detailLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      marginBottom: 0,
  },
  detailText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
  },
  // Hours refined
  hoursGrid: {
      marginTop: 4,
  },
  hourRowCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  hourRowTodayCompact: {
      backgroundColor: theme.colors.primary + '08',
      marginHorizontal: -12,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderBottomWidth: 0,
  },
  dayTextCompact: {
      fontSize: 13,
      fontFamily: theme.fonts.semibold,
      width: 45,
  },
  timeContainerCompact: {
      flex: 1,
      alignItems: 'flex-end',
  },
  timeTextCompact: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
  },
  emptyHoursContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 4,
  },
  emptyHoursText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      fontStyle: 'italic',
  },
  actionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
  },
  actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
  },
  actionButtonText: {
      color: theme.colors.white,
      fontFamily: theme.fonts.semibold,
      fontSize: 13,
  },
  // Lists
  listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
  },
  listItemContent: {
      flex: 1,
      marginHorizontal: 10,
  },
  listItemTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.semibold,
      marginBottom: 2,
  },
  listItemSubtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
  },
  avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarInitials: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
  },
  statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
  },
  priceTag: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
  },
  badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
  },
  sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  dateBox: {
      width: 44,
      height: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  dateDay: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
  },
  dateMonth: {
      fontSize: 9,
      fontFamily: theme.fonts.regular,
      textTransform: 'uppercase',
  },
  // Reviews
  reviewCard: {
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
  },
  reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
  },
  reviewAuthor: {
      fontSize: 14,
      fontFamily: theme.fonts.semibold,
      marginBottom: 2,
  },
  reviewDate: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
  },
  ratingRow: {
      flexDirection: 'row',
  },
  reviewText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      lineHeight: 18,
  },
  // Empty
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
  },
  emptyIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
  },
  emptyText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
  },
  addProductButtonText: {
      color: theme.colors.white,
      fontFamily: theme.fonts.semibold,
  },
  setHoursText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontFamily: theme.fonts.semibold,
  },
  todayText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
  },
  closedText: {
      color: theme.colors.error,
      opacity: 0.6,
      fontStyle: 'italic',
      fontSize: 13,
      fontFamily: theme.fonts.regular,
  },
  viewAllLink: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
      fontSize: 13,
  },
  readMoreText: {
      color: theme.colors.primary,
      marginTop: 4,
      fontFamily: theme.fonts.medium,
  },
  linkText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.medium,
  },
  addLinkText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
  },
  manageLinkText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
      fontSize: 13,
  },
  addBoldLinkText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bold,
  },
  lowStockText: {
      color: theme.colors.error,
      fontSize: 10,
      fontFamily: theme.fonts.bold,
  }
});

export default SalonDetailScreen;
