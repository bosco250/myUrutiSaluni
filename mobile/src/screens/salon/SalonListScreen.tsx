import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useTheme, useAuth } from "../../context";
import { salonService, SalonDetails } from "../../services/salon";
import { Loader } from "../../components/common";

interface SalonListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

const SalonListScreen = React.memo(function SalonListScreen({
  navigation,
}: SalonListScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    iconBg: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.gray100,
    },
    headerBorder: {
        borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
    }
  };

  const loadSalons = useCallback(async () => {
    try {
      setError(null);
      // Get all salons for this owner 
      const response = await salonService.getSalonByOwnerId(user?.id?.toString() || "");
      
      if (response) {
        // API returns a single object if only one? Or array? strict typing says singular but let's handle array if it changes
        setSalons([response as any]); 
      } else {
        setSalons([]);
      }
    } catch (err: any) {
      console.error("Error loading salons:", err);
      // Don't show error for empty list, just empty state
      if (err.message?.includes('404')) {
          setSalons([]);
      } else {
          setError(err.message || "Failed to load salons");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSalons();
  }, [loadSalons]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSalons();
  }, [loadSalons]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return theme.colors.success;
      case "inactive": return theme.colors.gray500;
      case "pending_approval": return theme.colors.warning;
      case "rejected": return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "inactive": return "Inactive";
      case "pending_approval": return "Pending";
       case "rejected": return "Rejected";
      default: return status;
    }
  };

  // Render a clean flat card for each salon
  const renderSalonCard = (salon: SalonDetails) => (
    <TouchableOpacity
      key={salon.id}
      style={[styles.salonCard, dynamicStyles.card]}
      onPress={() =>
        navigation.navigate("OwnerSalonDetail", {
          salonId: salon.id,
          salonName: salon.name,
        })
      }
      activeOpacity={0.7}
    >
      {/* Icon/Image Area */}
      <View style={[styles.iconContainer, dynamicStyles.iconBg]}>
        {(salon.images && salon.images.length > 0) || (salon.photos && salon.photos.length > 0) ? (
           <Image 
             source={{ uri: (salon.images && salon.images[0]) || (salon.photos && salon.photos[0]) }} 
             style={styles.salonImage} 
           />
        ) : (
           <MaterialIcons name="storefront" size={28} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={[styles.salonName, dynamicStyles.text]} numberOfLines={1}>
                {salon.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(salon.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(salon.status) }]}>
                    {getStatusLabel(salon.status)}
                </Text>
            </View>
        </View>

        <View style={styles.cardDetails}>
             <MaterialIcons name="location-on" size={14} color={dynamicStyles.textSecondary.color} style={{ marginRight: 4 }} />
             <Text style={[styles.detailText, dynamicStyles.textSecondary]} numberOfLines={1}>
                 {salon.address || "No address set"}
             </Text>
        </View>

        <View style={styles.statsRow}>
             <Text style={[styles.statText, dynamicStyles.textSecondary]}>{salon.city || "Kigali"}</Text>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, dynamicStyles.iconBg]}>
        <MaterialIcons name="add-business" size={48} color={theme.colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Salons Found</Text>
      <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
        Register your salon to start managing appointments and staff.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("CreateSalon")}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Register Salon</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
      return (
        <View style={[styles.container, dynamicStyles.container]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Loader fullscreen message="Loading your salons..." />
        </View>
      );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Modern Header */}
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <View>
             <Text style={[styles.headerTitle, dynamicStyles.text]}>My Salons</Text>
             <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>Manage your businesses</Text>
        </View>
        <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate("CreateSalon")}
        >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
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
        {salons.length === 0 && !error ? (
          renderEmptyState()
        ) : (
          <View>
              {salons.map(renderSalonCard)}
              
              {/* Optional: Descriptive Footer */}
              <Text style={[styles.footerText, dynamicStyles.textSecondary]}>
                  Tap a salon to view dashboard
              </Text>
          </View>
        )}

        {error && (
             <View style={styles.errorContainer}>
                 <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                 <TouchableOpacity onPress={loadSalons} style={{ marginTop: 8 }}>
                     <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Retry</Text>
                 </TouchableOpacity>
             </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
     // subtle touch target
     backgroundColor: 'transparent' 
  },
  scrollContent: {
    padding: 24,
  },
  salonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: 'hidden',
  },
  salonImage: {
      width: '100%',
      height: '100%',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
  },
  statusText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
  },
  cardDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  detailText: {
      fontSize: 13,
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  statText: {
      fontSize: 12,
      marginRight: 8,
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
  },
  emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
  },
  emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
  },
  emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 20,
  },
  primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
  },
  primaryButtonText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '600',
  },
  footerText: {
      textAlign: 'center',
      fontSize: 12,
      marginTop: 24,
      opacity: 0.6,
  },
  errorContainer: {
      padding: 24,
      alignItems: 'center',
  },
  errorText: {
      textAlign: 'center',
      marginBottom: 8,
  }
});

export default SalonListScreen;
