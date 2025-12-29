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
  const bgColor = isDark ? theme.colors.gray900 : theme.colors.background;
  const cardColor = isDark ? theme.colors.gray800 : theme.colors.white;
  const textColor = isDark ? theme.colors.white : theme.colors.text;
  const subTextColor = isDark ? theme.colors.gray400 : theme.colors.textSecondary;

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
      'Remove Favorite',
      `Remove ${employeeName} from your favorites?`,
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
    // Navigate to BookingFlow with salonId and pre-selected employeeId
    // The booking flow will show service selection first, then proceed with the employee pre-selected
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
    return <Loader fullscreen message="Loading favorites..." />;
  }

  const renderFavoriteCard = (favorite: FavoriteEmployee) => {
    const employee = favorite.employee;
    const isRemoving = removingId === favorite.id;

    // Skip rendering if employee data is not available
    if (!employee || !employee.user) {
      return null;
    }

    return (
      <View
        key={favorite.id}
        style={[
          styles.favoriteCard,
          { backgroundColor: cardColor, borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight },
          isRemoving && styles.removingCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.profileSection}>
            <View style={[styles.profileImageContainer, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.backgroundSecondary }]}>
              {employee.user.profileImage ? (
                <Image source={{ uri: employee.user.profileImage }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={32} color={theme.colors.primary} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.employeeName, { color: textColor }]} numberOfLines={1}>
                {employee.user.fullName}
              </Text>
              <Text style={[styles.specialization, { color: subTextColor }]} numberOfLines={1}>
                {employee.specialization || 'Stylist'} • {employee.salon?.name || 'Salon'}
              </Text>
              {employee.rating && (
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#FFB800" />
                  <Text style={styles.ratingText}>{employee.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.favoriteButton, isRemoving && styles.favoriteButtonDisabled]}
            onPress={() => handleRemoveFavorite(favorite.id, employee.user.fullName)}
            disabled={isRemoving}
          >
            <MaterialIcons
              name="favorite"
              size={24}
              color={isRemoving ? theme.colors.gray400 : theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rebookButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleRebook(favorite)}
            activeOpacity={0.8}
            disabled={isRemoving}
          >
            <Text style={styles.rebookButtonText}>Rebook</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.profileButton, { borderColor: isDark ? theme.colors.gray600 : theme.colors.border }]}
            onPress={() => handleViewProfile(favorite)}
            activeOpacity={0.8}
            disabled={isRemoving}
          >
            <Text style={[styles.profileButtonText, { color: textColor }]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Favorites</Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
            Your top professionals
          </Text>
        </View>
        <View style={{ width: 40 }} />
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
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary }]}>
              <MaterialIcons name="favorite-border" size={64} color={isDark ? theme.colors.gray600 : theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Favorites Yet</Text>
            <Text style={[styles.emptyMessage, { color: subTextColor }]}>
              Add your favorite stylists for quick access and easy rebooking
            </Text>
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation?.navigate('Explore')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="explore" size={20} color="#FFFFFF" />
              <Text style={styles.exploreButtonText}>Explore Stylists</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.favoritesContainer}>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.md,
  },
  favoritesContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  favoriteCard: {
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  removingCard: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  profileSection: {
    flexDirection: 'row',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  profileImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  specialization: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB800',
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteButtonDisabled: {
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rebookButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rebookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  profileButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  profileButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
});
