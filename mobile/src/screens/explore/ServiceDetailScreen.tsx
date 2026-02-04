import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { exploreService, Service } from "../../services/explore";
import { reviewsService, Review } from "../../services/reviews";
import { Loader } from "../../components/common";
import { SERVICE_CATEGORIES, TARGET_CLIENTELE } from "../../constants/business";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getImageUrl } from "../../utils";

interface ServiceDetailScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      serviceId: string;
      service?: Service;
    };
  };
}




export default function ServiceDetailScreen({
  navigation,
  route,
}: ServiceDetailScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(
    route?.params?.service || null
  );
  const [loading, setLoading] = useState(!route?.params?.service);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);

  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const serviceId = route?.params?.serviceId || route?.params?.service?.id;
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animation effect when image changes
  useEffect(() => {
    fadeAnim.setValue(0.4); // Start partially transparent to avoid flicker
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeImageIndex, fadeAnim]);

  // Check ownership
  const isOwner = user && service?.salon?.ownerId === user.id;

  const fetchService = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      const fetchedService = await exploreService.getServiceById(serviceId);
      setService(fetchedService);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load service details");
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  }, [serviceId, navigation]);

  const fetchReviews = useCallback(async (salonId: string) => {
    try {
      const response = await reviewsService.getReviews({ salonId, limit: 10 });
      const data = (response as any)?.data || response;
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.total || 0);
    } catch {
      setReviews([]);
    }
  }, []);

  const handleOpenMap = () => {
    if (!service?.salon) return;
    const { latitude, longitude, name, address } = service.salon;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude || 0},${longitude || 0}`;
    const label = name;
    
    let url;
    if (address) {
        url = `${scheme}${encodeURIComponent(address)}`;
    } else {
        url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
    }

    if (url) Linking.openURL(url);
  };

  useEffect(() => {
    if (serviceId && (!service || !service.salon)) {
      fetchService();
    }
  }, [serviceId, service, fetchService]);

  useEffect(() => {
    if (service?.salonId) {
      fetchReviews(service.salonId);
    }
  }, [service?.salonId, fetchReviews]);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleBookNow = () => {
    if (!service) return;
    if (!user) {
      AsyncStorage.setItem(
        "@booking_intent",
        JSON.stringify({ serviceId: service.id, service, salonId: service.salonId })
      );
      navigation?.navigate("Login");
      return;
    }
    navigation?.navigate("BookingFlow", {
      serviceId: service.id,
      service: service,
      salonId: service.salonId,
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
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
      borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.background,
    },
    sectionBg: {
       backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray50,
    }
  };

  if (loading) {
    return <Loader fullscreen message="Loading service..." />;
  }

  if (!service) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <Text style={[styles.errorText, dynamicStyles.text]}>Service not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === (service.category || service.metadata?.category))?.label
      || service.category || service.metadata?.category || 'Service';
  
  const genderValue = service.targetGender || service.metadata?.targetGender;
  const genderLabel = TARGET_CLIENTELE.find(t => t.value === genderValue)?.label || genderValue;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]} numberOfLines={1}>
          Service Details
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={isOwner ? () => navigation?.navigate("AddService", { 
              salonId: service.salonId, 
              service: service,  
              mode: 'edit',
              onSave: () => fetchService() // Refresh on return
          }) : handleFavorite}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isOwner ? "edit" : (isFavorite ? "favorite" : "favorite-border")}
            size={24}
            color={isOwner ? theme.colors.primary : (isFavorite ? theme.colors.error : dynamicStyles.text.color)}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Area */}
        {/* Hero Image Area - Swipeable Carousel */}
        {/* Hero Image Area - Immersive */}
        <View style={styles.heroContainer}>
            <TouchableOpacity activeOpacity={0.9} style={{ width: '100%', height: '100%' }}>
                  {service.images && service.images.length > 0 ? (
                      <Animated.Image 
                          source={{ uri: getImageUrl(service.images[activeImageIndex]) || '' }} 
                          style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: fadeAnim }} 
                      />
                  ) : (
                      service.imageUrl ? (
                          <Image 
                              source={{ uri: getImageUrl(service.imageUrl) || '' }} 
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                          />
                      ) : (
                          <View style={[styles.heroImagePlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                              <MaterialIcons name="spa" size={80} color={theme.colors.white} />
                          </View>
                      )
                  )}
                  
                  {/* Gradient Overlay */}
                  <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                      style={StyleSheet.absoluteFillObject}
                  />
            </TouchableOpacity>

            {/* Thumbnails Overlay (Floating) */}
            {service.images && service.images.length > 1 && (
                <View style={styles.thumbnailsOverlay}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                    >
                        {service.images.map((img, index) => (
                            <TouchableOpacity 
                                key={index} 
                                onPress={() => setActiveImageIndex(index)}
                                activeOpacity={0.8}
                                style={[
                                    styles.thumbnailItem,
                                    activeImageIndex === index && styles.thumbnailActive
                                ]}
                            >
                                <Image source={{ uri: getImageUrl(img) || '' }} style={styles.thumbnailImage} resizeMode="cover" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>

        {/* content */}
        <View style={[styles.mainContent, dynamicStyles.container]}>
            {/* Title & Badges */}
            <View style={styles.titleSection}>
                <Text style={[styles.serviceTitle, dynamicStyles.text]}>{service.name}</Text>
                
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, styles.badgePrimary]}>
                        <Text style={styles.badgeTextPrimary}>{categoryLabel}</Text>
                    </View>
                    
                    {genderLabel && (
                        <View style={[styles.badge, styles.badgeSecondary, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
                             <MaterialIcons name="person" size={12} color={dynamicStyles.textSecondary.color} style={{marginRight: 4}} />
                             <Text style={[styles.badgeTextSecondary, dynamicStyles.textSecondary]}>
                                 {typeof genderLabel === 'string' ? genderLabel.charAt(0).toUpperCase() + genderLabel.slice(1) : genderLabel}
                             </Text>
                        </View>
                    )}

                    {service.durationMinutes && (
                         <View style={[styles.badge, styles.badgeSecondary, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100 }]}>
                            <MaterialIcons name="schedule" size={12} color={dynamicStyles.textSecondary.color} style={{marginRight: 4}} />
                            <Text style={[styles.badgeTextSecondary, dynamicStyles.textSecondary]}>{service.durationMinutes} min</Text>
                         </View>
                    )}
                </View>
            </View>

            <View style={styles.separator} />

            {/* Salon Info (Professional Link) */}
            {service.salon && (
                <TouchableOpacity 
                    style={styles.salonRow}
                    activeOpacity={0.7}
                    onPress={() => navigation?.navigate("SalonDetail", { salonId: service.salonId })}
                >
                    <View style={styles.salonIconCircle}>
                        <MaterialIcons name="store" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.salonInfoText}>
                        <Text style={[styles.salonName, dynamicStyles.text]}>{service.salon.name}</Text>
                        <Text style={[styles.salonAddress, dynamicStyles.textSecondary]}>
                           {service.salon.address || "Location available on map"} 
                        </Text>

                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}} onPress={handleOpenMap}>
                              <MaterialIcons name="map" size={14} color={theme.colors.primary} />
                              <Text style={{color: theme.colors.primary, fontSize: 12, marginLeft: 4, fontWeight: '600'}}>View on Map</Text>
                        </TouchableOpacity>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme.colors.gray400} />
                </TouchableOpacity>
            )}

            <View style={styles.separator} />

            {/* Description */}
            <View style={styles.detailSection}>
                 <Text style={[styles.sectionTitle, dynamicStyles.text]}>About this Service</Text>
                 <Text style={[styles.descriptionText, dynamicStyles.textSecondary]}>
                     {service.description || "No description provided by the salon."}
                 </Text>
            </View>

            {/* Benefits */}
            {service.metadata?.benefits && Array.isArray(service.metadata.benefits) && service.metadata.benefits.length > 0 && (
                 <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, dynamicStyles.text]}>Key Benefits</Text>
                    {service.metadata.benefits.map((benefit: string, index: number) => (
                        <View key={index} style={styles.benefitRow}>
                             <MaterialIcons name="check-circle" size={18} color={theme.colors.success} style={{marginTop: 2}} />
                             <Text style={[styles.benefitText, dynamicStyles.textSecondary]}>{benefit}</Text>
                        </View>
                    ))}
                 </View>
            )}

            {/* Reviews Preview (Simplified) */}
            <View style={[styles.detailSection, { marginBottom: 20 }]}>
                 <View style={styles.rowBetween}>
                     <Text style={[styles.sectionTitle, dynamicStyles.text]}>Reviews ({totalReviews})</Text>
                     {totalReviews > 0 && (
                         <View style={styles.ratingBadge}>
                             <MaterialIcons name="star" size={14} color={theme.colors.warning} />
                             <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                         </View>
                     )}
                 </View>
                 
                 {reviews.length > 0 ? (
                     reviews.slice(0, 1).map((review) => (
                         <View key={review.id} style={[styles.reviewPreview, dynamicStyles.card]}>
                             <View style={styles.reviewHeader}>
                                 <View style={styles.reviewerAvatar}>
                                     {review.customer?.user?.profileImage ? (
                                         <Image 
                                             source={{ uri: getImageUrl(review.customer.user.profileImage) || '' }} 
                                             style={{ width: '100%', height: '100%' }}
                                         />
                                     ) : (
                                         <Text style={styles.reviewerInitials}>{review.customer?.user?.fullName?.charAt(0) || '?'}</Text>
                                     )}
                                 </View>
                                 <View style={{flex: 1}}>
                                     <Text style={[styles.reviewerName, dynamicStyles.text]}>{review.customer?.user?.fullName}</Text>
                                     <View style={{flexDirection: 'row'}}>
                                         {[...Array(5)].map((_, i) => (
                                             <MaterialIcons key={i} name={i < review.rating ? "star" : "star-border"} size={12} color={theme.colors.warning} />
                                         ))}
                                     </View>
                                 </View>
                             </View>
                             <Text style={[styles.reviewComment, dynamicStyles.textSecondary]} numberOfLines={2}>{review.comment}</Text>
                         </View>
                     ))
                 ) : (
                     <Text style={[styles.noReviewsText, dynamicStyles.textSecondary]}>No reviews yet.</Text>
                 )}
                 
                 <TouchableOpacity 
                    style={styles.viewReviewsLink}
                    onPress={() => { /* Navigate to full reviews or toggle tab? For now simple implementation */ }}
                 >
                     <Text style={{color: theme.colors.primary, fontWeight: '600'}}>View all reviews</Text>
                 </TouchableOpacity>
            </View>

        </View>
      </ScrollView>

      {/* Booking Footer Bar */}
      <View style={[styles.footerContainer, dynamicStyles.card]}>
          <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, dynamicStyles.textSecondary]}>Total Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
                  RWF {Number(service.basePrice).toFixed(0)}
                  <Text style={{fontSize: 14, color: theme.colors.textSecondary, fontWeight: 'normal'}}>.00</Text>
              </Text>
          </View>
          <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.8}
              onPress={handleBookNow}
          >
              <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
      </View>
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
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'transparent', // Initially transparent
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  backButton: {
      padding: 10,
  },
  backButtonText: {
      fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
      width: '100%',
      height: 380, // Taller image for premium feel
      backgroundColor: theme.colors.gray100,
      position: 'relative',
  },
  heroImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
  },
  thumbnailsOverlay: {
      position: 'absolute',
      bottom: 40, // Above the content overlap
      left: 0,
      right: 0,
  },
  thumbnailItem: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      overflow: 'hidden',
  },
  thumbnailActive: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      transform: [{ scale: 1.05 }],
  },
  thumbnailImage: {
      width: '100%',
      height: '100%',
  },
  mainContent: {
      flex: 1,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -24, // Overlap
      paddingHorizontal: 20,
      paddingTop: 24,
  },
  titleSection: {
      marginBottom: 20,
  },
  serviceTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      fontFamily: theme.fonts.bold,
      marginBottom: 12,
  },
  badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
  },
  badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
  },
  badgePrimary: {
      backgroundColor: theme.colors.primary,
  },
  badgeSecondary: {
      // bg handled in render
  },
  badgeTextPrimary: {
      color: theme.colors.white,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
  },
  badgeTextSecondary: {
      fontSize: 12,
      fontWeight: '600',
  },
  separator: {
      height: 1,
      backgroundColor: theme.colors.borderLight,
      marginVertical: 16,
      opacity: 0.5,
  },
  salonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
  },
  salonIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryLight + '30', // 30 opacity
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  salonInfoText: {
      flex: 1,
  },
  salonName: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
  },
  salonAddress: {
      fontSize: 13,
  },
  detailSection: {
      marginBottom: 24,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
      fontFamily: theme.fonts.bold,
  },
  descriptionText: {
      fontSize: 15,
      lineHeight: 24,
      fontFamily: theme.fonts.regular,
  },
  benefitRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 8,
  },
  benefitText: {
      fontSize: 15,
      flex: 1,
      lineHeight: 22,
  },
  rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warning + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
  },
  ratingText: {
      fontWeight: '700',
      fontSize: 12,
      color: theme.colors.warning,
  },
  reviewPreview: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.gray50, // default
      marginBottom: 12,
  },
  reviewHeader: {
      flexDirection: 'row',
      marginBottom: 8,
      gap: 12,
  },
  reviewerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: "hidden",
  },
  reviewerInitials: {
      color: 'white',
      fontWeight: '700',
      fontSize: 14,
  },
  reviewerName: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
  },
  reviewComment: {
      fontSize: 14,
      fontStyle: 'italic',
  },
  noReviewsText: {
      fontStyle: 'italic',
      marginBottom: 12,
  },
  viewReviewsLink: {
      alignItems: 'center',
      paddingVertical: 8,
  },
  
  // Footer
  footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      backgroundColor: theme.colors.background,
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
  },
  priceContainer: {
      justifyContent: 'center',
  },
  priceLabel: {
      fontSize: 12,
      marginBottom: 2,
  },
  priceValue: {
      fontSize: 24,
      fontWeight: 'bold',
      fontFamily: theme.fonts.bold,
  },
  bookBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 16,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
  },
  bookBtnText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
  },
});
