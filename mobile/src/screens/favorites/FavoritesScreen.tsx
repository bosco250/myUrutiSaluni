import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { favoritesService, FavoriteEmployee } from '../../services/favorites';
import { Loader } from '../../components/common';

interface FavoritesScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

export default function FavoritesScreen({ navigation }: FavoritesScreenProps) {
  const { isDark } = useTheme();
  const [favorites, setFavorites] = useState<FavoriteEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Dynamic styles
  const bgColor = isDark ? theme.colors.backgroundDark : theme.colors.background;
  const cardColor = isDark ? theme.colors.gray900 : theme.colors.white;
  const textColor = isDark ? theme.colors.white : theme.colors.text;
  const subTextColor = isDark ? theme.colors.gray400 : theme.colors.textSecondary;
  const dividerColor = isDark ? theme.colors.gray800 : theme.colors.borderLight;

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await favoritesService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleRemoveFavorite = async (favoriteId: string, employeeName: string) => {
    Alert.alert(
      'Remove from Favorites?',
      `Are you sure you want to remove ${employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(favoriteId);
              await favoritesService.removeFavorite(favoriteId);
              setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId));
            } catch {
              Alert.alert('Error', 'Failed to remove favorite');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRebook = (employee: FavoriteEmployee) => {
    navigation?.navigate('BookingFlow', {
      salonId: employee.employee.salonId,
      employeeId: employee.salonEmployeeId,
    });
  };

  const handleViewProfile = (employee: FavoriteEmployee) => {
    navigation?.navigate('EmployeeDetail', {
      employeeId: employee.salonEmployeeId,
      salonId: employee.employee.salonId,
    });
  };

  if (loading) {
    return (
        <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
            <Loader message="Loading favorites..." />
        </View>
    );
  }

  const renderFavoriteCard = (favorite: FavoriteEmployee) => {
    const employee = favorite.employee;
    const isRemoving = removingId === favorite.id;

    if (!employee || !employee.user) {
      return null;
    }

    return (
      <View
        key={favorite.id}
        style={[
          styles.favoriteCard,
          { 
            backgroundColor: cardColor, 
            borderColor: isDark ? theme.colors.gray800 : 'transparent',
            // Elevation/Shadow only in light mode for cleanliness, stroke in dark mode
            shadowOpacity: isDark ? 0 : 0.08,
            borderWidth: isDark ? 1 : 0,
          },
          isRemoving && styles.removingCard,
        ]}
      >
        <View style={styles.cardContent}>
            {/* Top Row: Image + Info + Heart */}
            <View style={styles.cardHeaderRow}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => handleViewProfile(favorite)}
                    style={styles.imageContainer}
                >
                    {employee.user.profileImage ? (
                        <Image source={{ uri: employee.user.profileImage }} style={styles.profileImage} />
                    ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray100 }]}>
                             <MaterialIcons name="person" size={28} color={theme.colors.primary} />
                        </View>
                    )}
                    {/* Online/Status Indicator can go here */}
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.employeeName, { color: textColor }]} numberOfLines={1}>
                            {employee.user.fullName}
                        </Text>
                        <TouchableOpacity
                            style={[styles.favoriteButton]}
                            onPress={() => handleRemoveFavorite(favorite.id, employee.user.fullName)}
                            disabled={isRemoving}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons
                                name="favorite"
                                size={22}
                                color={isRemoving ? theme.colors.gray400 : theme.colors.error}
                            />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.roleText, { color: subTextColor }]} numberOfLines={1}>
                        {employee.specialization || 'Professional Stylist'}
                    </Text>
                    <Text style={[styles.salonText, { color: theme.colors.primary }]} numberOfLines={1}>
                        {employee.salon?.name || 'Salon'}
                    </Text>

                    {employee.rating && (
                        <View style={styles.ratingContainer}>
                            <MaterialIcons name="star" size={14} color="#FFB800" />
                            <Text style={[styles.ratingText, { color: textColor }]}>{employee.rating.toFixed(1)}</Text>
                            <Text style={[styles.ratingCount, { color: subTextColor }]}>(50+ Reviews)</Text> 
                        </View>
                    )}
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Actions Row */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton, { borderColor: isDark ? theme.colors.gray700 : theme.colors.border }]}
                    onPress={() => handleViewProfile(favorite)}
                    activeOpacity={0.7}
                    disabled={isRemoving}
                >
                    <Text style={[styles.actionButtonTextSecondary, { color: textColor }]}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleRebook(favorite)}
                    activeOpacity={0.8}
                    disabled={isRemoving}
                >
                    <Text style={[styles.actionButtonTextPrimary]}>Book Now</Text>
                </TouchableOpacity>
            </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Modern Header */}
      <View style={[styles.header, { borderBottomColor: dividerColor }]}>
        <TouchableOpacity 
            onPress={() => navigation?.goBack?.()} 
            style={[styles.backButton, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary }]}
        >
          <MaterialIcons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Favorites</Text>
        <View style={styles.headerRightPlaceholder} /> 
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
             {/* Illustrated Empty State */}
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.gray50 }]}>
               <MaterialIcons name="favorite" size={40} color={theme.colors.gray300} style={{ opacity: 0.5 }} />
               <View style={[styles.emptyIconOverlay, { backgroundColor: theme.colors.background }]}>
                  <MaterialIcons name="favorite-border" size={64} color={theme.colors.primary} />
               </View>
            </View>

            <Text style={[styles.emptyTitle, { color: textColor }]}>No Favorites Yet</Text>
            <Text style={[styles.emptyMessage, { color: subTextColor }]}>
              Save your top stylists here for quick access.
            </Text>
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
              onPress={() => navigation?.navigate('Explore')}
              activeOpacity={0.9}
            >
              <Text style={styles.exploreButtonText}>Find Professionals</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {favorites.map(renderFavoriteCard)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    // No border bottom by default for cleaner look, handled dynamically
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.sm,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  favoriteCard: {
    borderRadius: 20,
    marginBottom: theme.spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardContent: {
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: theme.spacing.md,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  placeholderImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    flex: 1,
    marginRight: 8,
  },
  roleText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  salonText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  ratingCount: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  favoriteButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.md,
    opacity: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // bg handled inline
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionButtonTextPrimary: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  actionButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  removingCard: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -40, // Visual center correction
  },
  emptyIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  emptyIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
});
