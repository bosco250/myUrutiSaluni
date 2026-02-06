import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../context';
import { salonService } from '../../services/salon';
import { Loader } from '../../components/common';

interface ServiceListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      salonId?: string;
    };
  };
}

export default function ServiceListScreen({
  navigation,
  route,
}: ServiceListScreenProps) {
  const { isDark } = useTheme();
  const { salonId } = route?.params || {};
  
  const [services, setServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      color: isDark ? theme.colors.white : theme.colors.text,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
  };

  const loadServices = useCallback(async () => {
    if (!salonId) return;
    try {
      const data = await salonService.getServices(salonId);
      // Sort by active status then name
      const sortedData = data.sort((a, b) => {
        if (a.isActive === b.isActive) {
           return a.name.localeCompare(b.name);
        }
        return a.isActive ? -1 : 1;
      });
      setServices(sortedData);
      setFilteredServices(sortedData);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      const filtered = services.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.description?.toLowerCase().includes(lower) ||
          s.category?.toLowerCase().includes(lower)
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [searchQuery, services]);

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleServicePress = (service: any) => {
    navigation.navigate('EditService', { 
      salonId, 
      service, 
      mode: 'edit',
      onSave: loadServices // Callback to refresh list on return
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <LoaderFullscreen />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.headerContainer, dynamicStyles.card]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
          >
              <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, dynamicStyles.text]}>All Services</Text>
              <Text style={[styles.headerSubtitle, dynamicStyles.textSecondary]}>
                {services.length} services found
              </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddService', { salonId, onSave: loadServices })}
          >
            <MaterialIcons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, dynamicStyles.input]}>
            <MaterialIcons name="search" size={20} color={dynamicStyles.textSecondary.color} />
            <TextInput
              style={[styles.searchInput, { color: dynamicStyles.text.color }]}
              placeholder="Search services..."
              placeholderTextColor={dynamicStyles.textSecondary.color}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={18} color={dynamicStyles.textSecondary.color} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="content-cut" size={64} color={dynamicStyles.textSecondary.color} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, dynamicStyles.text]}>No services found</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.textSecondary]}>
              {searchQuery ? 'Try a different search term' : 'Tap + to add your first service'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.serviceCard, dynamicStyles.card, !item.isActive && styles.inactiveCard]}
            onPress={() => handleServicePress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.serviceLeftContent}>
                <View style={[
                  styles.serviceIconContainer, 
                  { backgroundColor: item.isActive ? theme.colors.primary + '15' : theme.colors.gray200 }
                ]}>
                    <MaterialIcons 
                      name="content-cut" 
                      size={20} 
                      color={item.isActive ? theme.colors.primary : theme.colors.gray500} 
                    />
                </View>
                <View style={styles.serviceTextContent}>
                    <Text style={[styles.serviceName, dynamicStyles.text, !item.isActive && styles.inactiveText]}>
                      {item.name}
                      {!item.isActive && ' (Inactive)'}
                    </Text>
                    <View style={styles.serviceMetaRow}>
                        <MaterialIcons name="schedule" size={12} color={dynamicStyles.textSecondary.color} />
                        <Text style={[styles.serviceMetaText, dynamicStyles.textSecondary]}>{item.duration} min</Text>
                        <View style={[styles.dotSeparator, { backgroundColor: dynamicStyles.textSecondary.color }]} />
                         <Text style={[styles.serviceMetaText, dynamicStyles.textSecondary]}>{item.category || 'General'}</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.serviceRightContent}>
                <Text style={[styles.servicePrice, { color: item.isActive ? theme.colors.primary : theme.colors.gray500 }]}>
                    RWF {item.price.toLocaleString()}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const LoaderFullscreen = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semibold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  listContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 40,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  inactiveText: {
    textDecorationLine: 'line-through', 
    opacity: 0.6,
  },
  serviceLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
  },
  serviceIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  serviceTextContent: {
      flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
    marginBottom: 4,
  },
  serviceMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  serviceMetaText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  dotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      opacity: 0.5,
  },
  serviceRightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  servicePrice: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
