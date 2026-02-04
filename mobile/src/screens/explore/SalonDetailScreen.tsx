import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
  Animated,
  Share,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import {
  exploreService,
  Salon,
  Service,
  Product,
  Employee
} from "../../services/explore";
import ImageViewing from "react-native-image-viewing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getImageUrl, getImageUrls } from "../../utils";

// Custom navigation props since we don't use React Navigation methods directly
type Props = {
  navigation: any;
  route: {
    params: any;
  };
};

// --- Constants & Helpers ---

const HERO_HEIGHT = 280;



// Middleware to normalize working hours location from backend
// Matches web version's getWorkingHours logic
const getSalonHours = (salon: Salon) => {
  // 1. Check direct operatingHours / businessHours first
  if (salon.operatingHours) return salon.operatingHours;
  if (salon.businessHours) return salon.businessHours;

  // 2. Check settings.workingHours (may be a JSON string)
  if (salon.settings?.workingHours) {
    const hours = salon.settings.workingHours;
    if (typeof hours === 'string') {
      try {
        return JSON.parse(hours);
      } catch {
        return null;
      }
    }
    return hours;
  }

  // 3. Check settings.operatingHours (may be a JSON string)
  if (salon.settings?.operatingHours) {
    const hours = salon.settings.operatingHours;
    if (typeof hours === 'string') {
      try {
        return JSON.parse(hours);
      } catch {
        return null;
      }
    }
    return hours;
  }

  // 4. Check metadata locations
  if (salon.metadata?.workingHours) return salon.metadata.workingHours;
  if (salon.metadata?.operatingHours) return salon.metadata.operatingHours;
  if (salon.metadata?.businessHours) return salon.metadata.businessHours;

  return null;
};

// Helper to check if salon is currently open based on structure hours
const checkSalonOpenStatus = (salon: Salon) => {
  const hoursData = getSalonHours(salon);

  // 1. If detailed operating hours exist, use them
  if (hoursData) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const dayName = days[now.getDay()];
    // @ts-ignore - indexing generic record
    const todayHours = hoursData[dayName];

    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, label: 'Closed' };
    }

    // Flexible time field access (matches web version)
    const openTime = todayHours.open || todayHours.openTime || todayHours.startTime || '09:00';
    const closeTime = todayHours.close || todayHours.closeTime || todayHours.endTime || '18:00';

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return { isOpen: true, label: `Open until ${closeTime}` };
    }
    return { isOpen: false, label: 'Closed' };
  }

  // 2. Fallback: If no hours data, rely on status but don't say "Open Now" (time-specific)
  if (salon.status === 'active') {
    return { isOpen: true, label: 'Open' }; 
  }
  
  return { isOpen: false, label: 'Closed' };
};

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ... inside component render ...
// In Overview Tab:
// <SectionHeader title="Working Hours" />
// <View style={styles.hoursList}>
//   {DAYS_ORDER.map(day => {
//      const hours = salon.operatingHours?.[day] || (day !== 'sunday' ? { open: '08:00', close: '23:00', isOpen: true } : { open: '00:00', close: '00:00', isOpen: false });
//      return (
//        <View key={day} style={styles.hourRow}>
//          <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
//          <Text style={[styles.timeText, !hours.isOpen && styles.closedText]}>
//            {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
//          </Text>
//        </View>
//      );
//   })}
// </View>



const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hair_salon: "Hair Salon",
  beauty_spa: "Beauty Spa",
  nail_salon: "Nail Salon",
  barbershop: "Barbershop",
  full_service: "Full Service",
  mobile: "Mobile Service",
  other: "Beauty Center",
};

const CLIENTELE_LABELS: Record<string, string> = {
  men: "Men Only",
  women: "Women Only",
  both: "Unisex",
  kids: "Kids Friendly",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- Sub-Components ---

const ActionButton = ({ 
  icon, 
  label, 
  onPress, 
  primary = false,
  disabled = false
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  onPress: () => void; 
  primary?: boolean;
  disabled?: boolean;
}) => (
  <TouchableOpacity 
    style={[
      styles.actionButton, 
      primary && styles.actionButtonPrimary,
      disabled && styles.actionButtonDisabled
    ]} 
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Ionicons 
      name={icon} 
      size={20} 
      color={primary ? theme.colors.white : theme.colors.text} 
    />
    <Text style={[
      styles.actionButtonText, 
      primary && styles.actionButtonTextPrimary
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SectionHeader = ({ title, action }: { title: string; action?: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ServiceItem = ({ service, onPress, onBook }: { service: Service; onPress: () => void; onBook: () => void }) => {
  const rawImageUrl = (service.images && service.images.length > 0 ? service.images[0] : null) || service.imageUrl;
  const imageSource = rawImageUrl ? { uri: getImageUrl(rawImageUrl) || '' } : null;

  return (
    <TouchableOpacity style={styles.serviceItem} onPress={onPress}>
      {imageSource && (
         <Image source={imageSource} style={styles.serviceImage} resizeMode="cover" />
      )}
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDuration}>{service.durationMinutes} mins</Text>
      </View>
      <View style={styles.servicePriceContainer}>
        <Text style={styles.servicePrice}>{formatCurrency(service.basePrice)}</Text>
        <TouchableOpacity style={styles.bookButtonSmall} onPress={onBook}>
          <Text style={styles.bookButtonTextSmall}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const EmployeeAvatar = ({ employee }: { employee: Employee }) => {
  // Use any cast if you suspect profileImage exists at runtime but not in type
  // const imageUrl = (employee.user as any)?.profileImage;
  // For strict safety, we use initials only as per current interface
  
  return (
    <View style={styles.employeeCard}>
      <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {employee.user?.fullName?.charAt(0) || "S"}
          </Text>
      </View>
      <Text style={styles.employeeName} numberOfLines={1}>
        {employee.user?.fullName || "Stylist"}
      </Text>
      <Text style={styles.employeeRole} numberOfLines={1}>
        {employee.roleTitle || "Expert"}
      </Text>
    </View>
  );
};

const DescriptionText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  // Truncate if longer than 150 chars
  const shouldTruncate = text.length > 150;

  if (!shouldTruncate) {
    return <Text style={styles.description}>{text}</Text>;
  }

  return (
    <View>
      <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>
        {text}
      </Text>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.readMoreText}>
          {expanded ? "Read Less" : "Read More"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Main Screen ---

export default function SalonDetailScreen({ route, navigation }: Props) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  // Use generic access to params since types might optionally include salon object
  const params = route.params as any;
  const salonId = params.salonId;
  const initialSalon = params.salon as Salon | undefined;

  const [salon, setSalon] = useState<Salon | null>(initialSalon || null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!initialSalon);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "team" | "gallery">("overview");
  
  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Animations
  const scrollY = useMemo(() => new Animated.Value(0), []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 100, HERO_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Combine salon and service images for gallery viewer
  const allGalleryImages = useMemo(() => {
    const salonImages = salon?.images || [];
    const serviceImagesUrls: string[] = [];
    
    services.forEach(service => {
      if (service.images && service.images.length > 0) {
        serviceImagesUrls.push(...service.images);
      } else if (service.imageUrl) {
        serviceImagesUrls.push(service.imageUrl);
      }
    });

    return [...salonImages, ...serviceImagesUrls];
  }, [salon?.images, services]);

  const fetchData = async () => {
    try {
      if (!initialSalon) setLoading(true);
      setError(null);

      // optimize: fetch services/employees in parallel
      const tasks: Promise<any>[] = [
        exploreService.getServices(salonId),
        exploreService.getSalonEmployees(salonId),
        exploreService.getProducts(salonId),
      ];
      
      // If we didn't get salon data from params, fetch it
      if (!initialSalon) {
        tasks.push(exploreService.getSalonById(salonId));
      }

      const results = await Promise.all(tasks);
      const [servicesData, employeesData, productsData] = results;

      setServices(servicesData);
      setEmployees(employeesData);
      setProducts(productsData);

      if (!initialSalon && results[3]) {
        setSalon(results[3]);
      }
    } catch (err) {
      setError("Failed to load salon details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // fetchData is stable - only changes on salonId or initialSalon change
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [salonId]);

  const handleShare = async () => {
    if (!salon) return;
    try {
      await Share.share({
        message: `Check out ${salon.name} on Uruti Saluni!`,
        url: salon.website || "",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCall = () => {
    if (salon?.phone) Linking.openURL(`tel:${salon.phone}`);
  };

  const handleMessage = () => {
    if (salon?.phone) Linking.openURL(`sms:${salon.phone}`);
  };

  const handleViewService = (service: Service) => {
    // Navigate to service detail screen
    navigation.navigate("ServiceDetail", {
      serviceId: service.id,
      service: service,
    });
  };

  const handleBookService = (service: Service) => {
    if (!user) {
      AsyncStorage.setItem(
        "@booking_intent",
        JSON.stringify({ salonId: salon?.id, serviceId: service.id, service })
      );
      navigation.navigate("Login");
      return;
    }
    // @ts-ignore
    navigation.navigate("BookingFlow", {
      salonId: salon?.id,
      serviceId: service.id,
      service: service,
    });
  };

  const handleBook = () => {
    if (!salon) return;
    if (!user) {
      AsyncStorage.setItem(
        "@booking_intent",
        JSON.stringify({ salonId: salon.id, salonName: salon.name })
      );
      navigation.navigate("Login");
      return;
    }
    // @ts-ignore - BookingFlow params mismatch possible, ignoring for clean build if verified elsewhere
    navigation.navigate("BookingFlow", {
      salonId: salon.id,
      salonName: salon.name,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !salon) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || "Salon not found"}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const businessType = BUSINESS_TYPE_LABELS[salon.businessType || "other"] || "Beauty Center";
  const clientele = CLIENTELE_LABELS[salon.targetClientele || "both"] || "Generic";

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Absolute Header (Back Button & Actions) */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.headerTitle} numberOfLines={1}>{salon.name}</Text>
        </SafeAreaView>
      </Animated.View>

      <View style={styles.floatingHeader}>
        <SafeAreaView edges={['top']} style={styles.floatingHeaderContent}>
          <TouchableOpacity 
            style={styles.circleButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.circleButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleButton}>
              <Ionicons name="heart-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.heroSection}>
          {salon.images && salon.images.length > 0 ? (
            <Image 
              source={{ uri: getImageUrl(salon.images[0]) || '' }} 
              style={StyleSheet.absoluteFillObject} 
              resizeMode="cover" 
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroInitials}>
                {salon.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.heroOverlay} />
          
          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{businessType}</Text>
              </View>
              <View style={[styles.badge, styles.badgeSecondary]}>
                <Text style={[styles.badgeText, styles.badgeTextSecondary]}>{clientele}</Text>
              </View>
            </View>
            <Text style={styles.salonName}>{salon.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>4.8 (120 reviews)</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={[
                styles.statusText, 
                checkSalonOpenStatus(salon).isOpen ? styles.statusOpen : styles.statusClosed
              ]}>
                {checkSalonOpenStatus(salon).label}
              </Text>
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              <Ionicons name="location-outline" size={14} /> {salon.address}, {salon.city}
            </Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <ActionButton 
            icon="calendar" 
            label="Book Now" 
            primary 
            onPress={handleBook} 
          />
          <ActionButton 
            icon="chatbubble-outline" 
            label="Message" 
            onPress={handleMessage} 
          />
          <ActionButton 
            icon="call-outline" 
            label="Call" 
            onPress={handleCall} 
            disabled={!salon.phone}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(["overview", "services", "team", "gallery"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          {activeTab === "overview" && (
            <View style={styles.overviewContainer}>
              <SectionHeader title="About" />
              <DescriptionText text={salon.description || "No description available for this salon."} />

              <View style={styles.divider} />

              <SectionHeader title="Info" />
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} />
                  <View>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{salon.phone || "N/A"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <SectionHeader title="Working Hours" />
              {getSalonHours(salon) ? (
                <View style={styles.hoursList}>
                  {DAYS_ORDER.map(day => {
                     // @ts-ignore
                     const hours = getSalonHours(salon)[day];
                     if (!hours) return null; // Skip if specific day data missing
                     
                     const isToday = new Date().getDay() === DAYS_ORDER.indexOf(day) + 1 || (day === 'sunday' && new Date().getDay() === 0);
                     
                     // Normalize field names (open vs openTime vs startTime) - matches web
                     const openStr = hours.open || hours.openTime || hours.startTime || '09:00';
                     const closeStr = hours.close || hours.closeTime || hours.endTime || '18:00';

                     return (
                       <View key={day} style={[styles.hourRow, isToday && styles.todayRow]}>
                         <Text style={[styles.dayText, isToday && styles.todayText]}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                         </Text>
                         <Text style={[
                           styles.timeText, 
                           !hours.isOpen && styles.closedText,
                           isToday && styles.todayText
                         ]}>
                           {hours.isOpen ? `${openStr} - ${closeStr}` : 'Closed'}
                         </Text>
                       </View>
                     );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Contact salon for operating hours.</Text>
              )}

              <View style={styles.divider} />

              <SectionHeader title="Location" />
              <TouchableOpacity style={styles.mapPlaceholder} onPress={() => {
                  const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
                  const latLng = `${salon.latitude || 0},${salon.longitude || 0}`;
                  const label = salon.name;
                  
                  let url;
                  // Prioritize searching by address if available (more reliable than user-provided coords or name matching)
                  if (salon.address) {
                      const query = encodeURIComponent(salon.address);
                      url = `${scheme}${query}`;
                  } else {
                      url = Platform.select({
                        ios: `${scheme}${label}@${latLng}`,
                        android: `${scheme}${latLng}(${label})`
                      });
                  }
                  
                  if (url) Linking.openURL(url);
              }}>
                 <Ionicons name="map-outline" size={32} color={theme.colors.primary} />
                 <Text style={styles.mapText}>{salon.address || "View on Map"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "services" && (
            <View style={styles.servicesContainer}>
              {services.length === 0 ? (
                <Text style={styles.emptyText}>No services listed.</Text>
              ) : (
                services.map((service) => (
                  <ServiceItem 
                    key={service.id} 
                    service={service} 
                    onPress={() => handleViewService(service)}
                    onBook={() => handleBookService(service)}
                  />
                ))
              )}
            </View>
          )}

          {activeTab === "team" && (
            <View style={styles.teamContainer}>
              <SectionHeader title="Our Specialists" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamScroll}>
                {employees.length === 0 ? (
                  <Text style={styles.emptyText}>No information available.</Text>
                ) : (
                  employees.map((emp) => (
                    <EmployeeAvatar key={emp.id} employee={emp} />
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {activeTab === "gallery" && (() => {
            // Collect all images: salon images + service images
            const salonImages = salon.images || [];
            const serviceImages: { url: string; serviceName: string }[] = [];
            
            services.forEach(service => {
              if (service.images && service.images.length > 0) {
                service.images.forEach(img => {
                  serviceImages.push({ url: img, serviceName: service.name });
                });
              } else if (service.imageUrl) {
                serviceImages.push({ url: service.imageUrl, serviceName: service.name });
              }
            });

            // Combined all images for the image viewer
            // const allImages = [
            //   ...salonImages,
            //   ...serviceImages.map(s => s.url)
            // ];

            const hasNoImages = salonImages.length === 0 && serviceImages.length === 0;

            return (
              <View style={styles.galleryContainer}>
                {hasNoImages ? (
                  <Text style={styles.emptyText}>No photos available.</Text>
                ) : (
                  <View>
                    {/* Salon Profile Images */}
                    {salonImages.length > 0 && (
                      <View style={{ marginBottom: 24 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Salon Photos</Text>
                        <View style={styles.galleryGrid}>
                          {salonImages.map((img, index) => (
                            <TouchableOpacity 
                              key={`salon-${index}`} 
                              style={styles.galleryImageContainer}
                              onPress={() => {
                                setSelectedImageIndex(index);
                                setViewerVisible(true);
                              }}
                            >
                              <Image source={{ uri: getImageUrl(img) || '' }} style={styles.galleryImage} resizeMode="cover" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Service Images */}
                    {serviceImages.length > 0 && (
                      <View>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Service Photos</Text>
                        <View style={styles.galleryGrid}>
                          {serviceImages.map((item, index) => (
                            <TouchableOpacity 
                              key={`service-${index}`} 
                              style={styles.galleryImageContainer}
                              onPress={() => {
                                setSelectedImageIndex(salonImages.length + index);
                                setViewerVisible(true);
                              }}
                            >
                              <Image source={{ uri: getImageUrl(item.url) || '' }} style={styles.galleryImage} resizeMode="cover" />
                              {/* Optional: Show service name overlay */}
                              <View style={styles.galleryImageOverlay}>
                                <Text style={styles.galleryImageLabel} numberOfLines={1}>{item.serviceName}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })()}
        </View>

      </Animated.ScrollView>

      {/* Full Screen Image Viewer */}
      <ImageViewing
        images={getImageUrls(allGalleryImages).map(img => ({ uri: img }))}
        imageIndex={selectedImageIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error || "red",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.white,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    color: theme.colors.textSecondary,
  },
  
  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: theme.colors.background,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight || "#E5E5E5",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: theme.colors.text,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 101, 
  },
  floatingHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8, 
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background, 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight || "#E5E5E5",
  },
  rightActions: {
    flexDirection: "row",
    gap: 12,
  },

  // Hero
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: HERO_HEIGHT,
    position: "relative",
    justifyContent: "flex-end",
    padding: 20,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.primaryLight || "#E6F0FF",
    justifyContent: "center",
    alignItems: "center",
  },
  heroInitials: {
    fontSize: 80,
    fontWeight: "bold",
    color: theme.colors.primary,
    opacity: 0.3,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)", 
  },
  heroContent: {
    zIndex: 2,
    gap: 8,
  },
  salonName: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeSecondary: {
    backgroundColor: theme.colors.backgroundSecondary || "#F5F5F5",
    borderWidth: 1,
    borderColor: theme.colors.borderLight || "#ddd",
  },
  badgeTextSecondary: {
    color: theme.colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  dot: {
    color: theme.colors.textSecondary,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusOpen: {
    color: theme.colors.success || "green",
  },
  statusClosed: {
    color: theme.colors.error || "red",
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // Action Bar
  actionBar: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: theme.colors.background,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24, 
    backgroundColor: theme.colors.backgroundSecondary || "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight || "#EEE",
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    flex: 2, 
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  actionButtonTextPrimary: {
    color: theme.colors.white,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight || "#EEE",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  tabItem: {
    marginRight: 24,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  // Content
  contentSection: {
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  readMoreText: {
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight || "#EEE",
    marginVertical: 24,
  },
  infoRow: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: theme.colors.backgroundSecondary || "#F9F9F9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderLight || "#EEE",
    gap: 8,
  },
  mapText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  
  // Services
  servicesContainer: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight || "#EEE",
    backgroundColor: theme.colors.background,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.backgroundSecondary || "#F5F5F5",
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  servicePriceContainer: {
    alignItems: "flex-end",
    gap: 8,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  bookButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primaryLight || "#E6F0FF",
    borderRadius: 16,
  },
  bookButtonTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },

  // Team
  teamContainer: {},
  teamScroll: {
    gap: 16,
    paddingRight: 20,
  },
  employeeCard: {
    width: 100,
    alignItems: "center",
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundSecondary || "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
    textAlign: "center",
  },
  employeeRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  overviewContainer: {},
  // Working Hours Styles
  hoursList: {
    backgroundColor: theme.colors.backgroundSecondary || "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  todayRow: {
    // Optional highlight
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
    width: 100,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "600",
  },
  closedText: {
    color: theme.colors.error || "red",
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  
  // Gallery
  galleryContainer: {
    paddingBottom: 20,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  galleryImageContainer: {
    width: "48%", // Roughly 2 columns with gap
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary || "#f0f0f0",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  galleryImageLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
});
