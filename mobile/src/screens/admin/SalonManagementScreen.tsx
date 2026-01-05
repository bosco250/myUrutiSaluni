import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Image,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { salonService, SalonDetails } from '../../services/salon';
import { useTheme } from '../../context';

// Filter types
type FilterStatus = 'all' | 'active' | 'pending_approval' | 'inactive';

const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending_approval', label: 'Pending' },
  { id: 'inactive', label: 'Inactive' },
];

export default function SalonManagementScreen({ navigation }: { navigation: any }) {
  const { isDark } = useTheme();
  
  // State
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

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
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    input: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    chip: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.border,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipText: {
      color: isDark ? theme.colors.gray400 : theme.colors.textSecondary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
  };

  // Fetch salons
  const fetchSalons = useCallback(async () => {
    try {
      const filters = {
        status: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchQuery || undefined,
      };
      const data = await salonService.getAllSalons(filters);
      setSalons(data);
    } catch (error) {
      console.error('Failed to fetch salons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchSalons();
  }, [fetchSalons]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSalons();
  };

  // Render salon card
  const renderSalonItem = ({ item }: { item: SalonDetails }) => {
    // Determine status color
    let statusColor = theme.colors.textSecondary;
    let statusLabel: string = item.status;
    
    switch (item.status) {
      case 'active':
        statusColor = theme.colors.success;
        statusLabel = 'Active';
        break;
      case 'pending_approval':
        statusColor = theme.colors.warning;
        statusLabel = 'Pending';
        break;
      case 'inactive':
        statusColor = theme.colors.error;
        statusLabel = 'Inactive';
        break;
    }

    return (
      <TouchableOpacity
        style={[styles.card, dynamicStyles.card]}
        onPress={() => navigation.navigate('OwnerSalonDetail', { salonId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.salonIconContainer}>
             {item.photos && item.photos.length > 0 ? (
               <Image source={{ uri: item.photos[0] }} style={styles.salonImage} />
             ) : (
               <View style={[styles.placeholderIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                 <MaterialIcons name="store" size={24} color={theme.colors.primary} />
               </View>
             )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.salonName, dynamicStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.salonAddress, dynamicStyles.textSecondary]} numberOfLines={1}>
              {item.city}, {item.district}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight }]} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
             <MaterialIcons name="phone" size={16} color={dynamicStyles.textSecondary.color} />
             <Text style={[styles.footerText, dynamicStyles.textSecondary]}>
               {item.phone || 'No phone'}
             </Text>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('OwnerSalonDetail', { salonId: item.id })}
          >
            <Text style={styles.actionButtonText}>Manage</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Salon Management</Text>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterSection}>
        <View style={[styles.searchContainer, dynamicStyles.input]}>
          <MaterialIcons name="search" size={20} color={dynamicStyles.textSecondary.color} />
          <TextInput
            style={[styles.searchInput, { color: dynamicStyles.text.color }]}
            placeholder="Search salons..."
            placeholderTextColor={dynamicStyles.textSecondary.color}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={dynamicStyles.textSecondary.color} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  dynamicStyles.chip,
                  isActive && dynamicStyles.chipActive
                ]}
                onPress={() => setActiveFilter(item.id)}
              >
                <Text style={[
                  styles.chipText,
                  dynamicStyles.chipText,
                  isActive && dynamicStyles.chipTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={salons}
          keyExtractor={(item) => item.id}
          renderItem={renderSalonItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="store-mall-directory" size={64} color={theme.colors.gray300} />
              <Text style={[styles.emptyText, dynamicStyles.text]}>No salons found</Text>
              <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
                Try adjusting your filters or search query
              </Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  filterSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
  },
  chipContainer: {
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: theme.spacing.xs,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 100, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Card Styles
  card: {
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonIconContainer: {
    marginRight: theme.spacing.md,
  },
  salonImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  salonName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  salonAddress: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.md,
    fontFamily: theme.fonts.bold,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.regular,
  },
});
