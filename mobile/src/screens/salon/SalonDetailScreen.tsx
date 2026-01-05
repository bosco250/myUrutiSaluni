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
          <View style={[styles.container, dynamicStyles.container]}>
               <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
               <Loader fullscreen message="Loading salon..." />
          </View>
      );
  }

  if (!salon) return null;

  // Render Functions
  const renderHeader = () => (
      <View style={[styles.header, dynamicStyles.headerBorder]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
              <MaterialIcons name="chevron-left" size={28} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, dynamicStyles.text]} numberOfLines={1}>{salon.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(salon.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(salon.status) }]}>{salon.status}</Text>
              </View>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate("CreateSalon", { mode: "edit", salon })}
          >
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
      </View>
  );

  const renderTabs = () => (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.tabsContainer}
        style={[styles.tabsScrollView, dynamicStyles.headerBorder]}
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
                        styles.tabItem, 
                        isActive ? dynamicStyles.tabActive : dynamicStyles.tabInactive
                    ]}
                    onPress={() => setActiveTab(tab.id as TabType)}
                  >
                      <Text style={[
                          styles.tabText, 
                          isActive ? { color: '#FFF' } : dynamicStyles.textSecondary
                      ]}>
                          {tab.label}
                      </Text>
                  </TouchableOpacity>
              );
          })}
      </ScrollView>
  );

  const renderOverview = () => {
      // Helper for Operating Hours
      const renderOperatingHours = () => {
          const hours = salon.businessHours || salon.settings?.workingHours;
          if (!hours) return null;

          const days = [
              "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
          ];
          
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

          return (
              <View style={[styles.sectionContainer, dynamicStyles.card]}>
                  <Text style={[styles.sectionTitle, dynamicStyles.text]}>Operating Hours</Text>
                  {days.map((day) => {
                      const data = (hours as any)[day];
                      if (!data) return null;
                      
                      const isOpen = data.isOpen !== false && (data.openTime || data.open);
                      const open = data.openTime || data.open;
                      const close = data.closeTime || data.close;
                      const isToday = day === today;

                      return (
                          <View key={day} style={[styles.hourRow, isToday && styles.hourRowToday]}>
                              <Text style={[
                                  styles.dayText, 
                                  dynamicStyles.text, 
                                  isToday && { color: theme.colors.primary, fontWeight: '700' }
                              ]}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                              </Text>
                              <Text style={[
                                  styles.timeText, 
                                  isOpen ? dynamicStyles.text : { color: theme.colors.textSecondary, fontStyle: 'italic' },
                                  isToday && isOpen && { color: theme.colors.primary, fontWeight: '700' }
                              ]}>
                                  {isOpen ? `${open} - ${close}` : "Closed"}
                              </Text>
                          </View>
                      );
                  })}
              </View>
          );
      };

      return (
          <View style={styles.contentContainer}>
              {/* Image Gallery */}
              {salon.images && salon.images.length > 0 && (
                <View style={[styles.sectionContainer, dynamicStyles.card]}>
                  <Text style={[styles.sectionTitle, dynamicStyles.text]}>Gallery</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                    {salon.images.map((img, index) => (
                      <TouchableOpacity key={index} onPress={() => {/* Maybe open full screen viewer later */}}>
                        <Image 
                          source={{ uri: img }} 
                          style={{ 
                            width: 280, 
                            height: 180, 
                            borderRadius: 12, 
                            marginRight: 12,
                            backgroundColor: theme.colors.gray200
                          }} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

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
                                  <Text style={{ color: theme.colors.primary, marginTop: 4, fontWeight: '500' }}>
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
                                <Text style={[styles.detailText, { color: theme.colors.primary, fontWeight: '500' }]}>{salon.phone}</Text>
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
                               <Text style={[styles.detailText, { color: theme.colors.primary, fontWeight: '500' }]}>{salon.website}</Text>
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
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                            onPress={() => navigation.navigate("AddEmployee", { salonId })}
                        >
                            <MaterialIcons name="person-add" size={20} color="#FFF" />
                            <Text style={styles.actionButtonText}>Add Staff</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                             style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
                             onPress={() => navigation.navigate("AddService", { salonId })}
                        >
                            <MaterialIcons name="add" size={20} color="#FFF" />
                            <Text style={styles.actionButtonText}>Add Service</Text>
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
                   <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add</Text>
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
                   <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add</Text>
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
                              source={{ uri: srv.imageUrl }} 
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
             <TouchableOpacity 
               onPress={() => navigation.navigate("StockManagement", { salonId })}
               style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
             >
                 <MaterialIcons name="inventory" size={16} color={theme.colors.primary} />
                 <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Manage Stock</Text>
             </TouchableOpacity>
        </View>

        {products.length === 0 ? (
            <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, dynamicStyles.iconBg]}>
                    <MaterialIcons name="inventory-2" size={28} color={dynamicStyles.textSecondary.color} />
                </View>
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>No products in inventory</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate("StockManagement", { salonId })}
                  style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: theme.colors.primary, borderRadius: 10 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Add Products</Text>
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
                        <MaterialIcons name="inventory-2" size={18} color="#FFF" />
                    </View>
                    <View style={styles.listItemContent}>
                        <Text style={[styles.listItemTitle, dynamicStyles.text]}>{prod.name}</Text>
                        <Text style={[styles.listItemSubtitle, dynamicStyles.textSecondary]}>
                            Stock: {prod.stockLevel} {prod.sku ? `• SKU: ${prod.sku}` : ''}
                        </Text>
                    </View>
                    {prod.stockLevel <= 5 && (
                         <View style={[styles.badge, { backgroundColor: theme.colors.error + '15' }]}>
                             <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: '700' }}>LOW</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  editButton: {
      padding: 8,
  },
  headerTitleContainer: {
      alignItems: 'center',
      flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 2,
  },
  statusText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
  },
  tabsScrollView: {
      flexGrow: 0,
      borderBottomWidth: 1,
  },
  tabsContainer: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 10,
  },
  tabItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      minHeight: 36,
      justifyContent: 'center',
  },
  tabText: {
      fontSize: 14,
      fontWeight: '600',
  },
  scrollContent: {
      padding: 14, // Reduced from 16
  },
  contentContainer: {
      gap: 14, // Reduced from 16
  },
  statsGrid: {
      flexDirection: 'row',
      gap: 10, // Reduced from 12
  },
  statBox: {
      flex: 1,
      padding: 14, // Reduced from 16
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
  },
  statValue: {
      fontSize: 18, // Reduced from 20
      fontWeight: '700',
      marginBottom: 2,
  },
  statLabel: {
      fontSize: 11, // Reduced from 12
  },
  sectionContainer: {
      padding: 14, // Reduced from 16
      borderRadius: 14,
      borderWidth: 1,
  },
  sectionTitle: {
      fontSize: 16, // Reduced from 18
      fontWeight: '700',
      marginBottom: 12, // Reduced from 16
  },
  description: {
      fontSize: 13, // Reduced from 14
      lineHeight: 18, // Reduced from 20
  },
  detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8, // Reduced from 16
  },
  detailContent: {
      flex: 1,
      marginLeft: 10, // Reduced from 12
  },
  detailLabel: {
      fontSize: 11, // Reduced from 12
      marginBottom: 0,
  },
  detailText: {
      fontSize: 13, // Reduced from 15
  },
  // Hours
  hourRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6, // Reduced from 8
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  hourRowToday: {
      backgroundColor: 'rgba(150,150,150,0.05)',
      marginHorizontal: -12, // Matches new padding
      paddingHorizontal: 12,
  },
  dayText: {
      fontSize: 13, // Reduced from 14
      fontWeight: '500',
  },
  timeText: {
      fontSize: 13, // Reduced from 14
  },
  actionButtonsRow: {
      flexDirection: 'row',
      gap: 10, // Reduced from 12
  },
  actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10, // Reduced from 12
      borderRadius: 10, // Reduced from 12
      gap: 6,
  },
  actionButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 13, // Reduced from 14
  },
  // Lists
  listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12, // Reduced from 16
      borderRadius: 12,
      marginBottom: 8, // Reduced from 12
      borderWidth: 1,
  },
  listItemContent: {
      flex: 1,
      marginHorizontal: 10,
  },
  listItemTitle: {
      fontSize: 15, // Reduced from 16
      fontWeight: '600',
      marginBottom: 2,
  },
  listItemSubtitle: {
      fontSize: 12, // Reduced from 13
  },
  avatarCircle: {
      width: 36, // Reduced from 40
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarInitials: {
      color: '#FFF',
      fontWeight: '700',
  },
  statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
  },
  priceTag: {
      fontSize: 16,
      fontWeight: '700',
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
      marginBottom: 8, // Reduced from 12
  },
  dateBox: {
      width: 44, // Reduced from 50
      height: 44,
      borderRadius: 10, // Reduced from 12
      justifyContent: 'center',
      alignItems: 'center',
  },
  dateDay: {
      fontSize: 16, // Reduced from 18
      fontWeight: '700',
  },
  dateMonth: {
      fontSize: 9, // Reduced from 10
      textTransform: 'uppercase',
  },
  // Reviews
  reviewCard: {
      padding: 12, // Reduced from 16
      borderRadius: 12, // Reduced from 16
      marginBottom: 8, // Reduced from 12
      borderWidth: 1,
  },
  reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6, // Reduced from 8
  },
  reviewAuthor: {
      fontSize: 14, // Reduced from 15
      fontWeight: '600',
      marginBottom: 2, // Reduced from 4
  },
  reviewDate: {
      fontSize: 11, // Reduced from 12
  },
  ratingRow: {
      flexDirection: 'row',
  },
  reviewText: {
      fontSize: 13, // Reduced from 14
      lineHeight: 18, // Reduced from 20
  },
  // Empty
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30, // Reduced from 40
  },
  emptyIconCircle: {
      width: 48, // Reduced from 60
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12, // Reduced from 16
  },
  emptyText: {
      fontSize: 14, // Reduced from 15
  }
});

export default SalonDetailScreen;
