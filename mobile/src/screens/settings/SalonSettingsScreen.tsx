import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { salonService, SalonDetails } from '../../services/salon';

interface SalonSettingsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

interface SettingsMenuItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  screen?: string;
  action?: () => void;
  badge?: string;
  color?: string;
}

export default function SalonSettingsScreen({ navigation }: SalonSettingsScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salons, setSalons] = useState<SalonDetails[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<SalonDetails | null>(null);
  const [showSalonPicker, setShowSalonPicker] = useState(false);

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
      borderColor: isDark ? theme.colors.gray700 : theme.colors.gray200,
    },
    modal: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
    },
  };

  const loadData = useCallback(async () => {
    try {
      if (!user?.id) return;

      const salonList = await salonService.getMySalons();
      setSalons(salonList);
      
      // Auto-select first salon if none selected
      if (salonList.length > 0 && !selectedSalon) {
        setSelectedSalon(salonList[0]);
      }
    } catch (error) {
      console.error('Error loading salons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, selectedSalon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatBusinessHours = () => {
    if (!selectedSalon?.settings?.operatingHours?.monday) return 'Not set';
    const { open, close } = selectedSalon.settings.operatingHours.monday;
    return `${open || '09:00'} - ${close || '18:00'}`;
  };

  const getSettingsMenuItems = (): { section: string; items: SettingsMenuItem[] }[] => [
    {
      section: 'Salon Profile',
      items: [
        {
          id: 'basic-info',
          icon: 'store',
          title: 'Basic Information',
          description: 'Name, description, registration',
          screen: 'EditSalon',
          color: theme.colors.primary,
        },
        {
          id: 'location',
          icon: 'location-on',
          title: 'Location',
          description: selectedSalon?.address || 'Set your salon address',
          screen: 'EditSalon',
          color: theme.colors.success,
        },
        {
          id: 'contact',
          icon: 'contact-phone',
          title: 'Contact Information',
          description: selectedSalon?.phone || 'Phone, email, website',
          screen: 'EditSalon',
          color: theme.colors.info,
        },
      ],
    },
    {
      section: 'Business Settings',
      items: [
        {
          id: 'hours',
          icon: 'schedule',
          title: 'Business Hours',
          description: formatBusinessHours(),
          screen: 'EditSalon',
          color: theme.colors.warning,
        },
        {
          id: 'services',
          icon: 'content-cut',
          title: 'Services',
          description: 'Manage your service menu',
          screen: 'SalonDetail',
          color: theme.colors.secondary,
        },
        {
          id: 'products',
          icon: 'shopping-bag',
          title: 'Products',
          description: 'Manage retail products',
          screen: 'StockManagement',
          color: theme.colors.info,
        },
      ],
    },
    {
      section: 'Team',
      items: [
        {
          id: 'staff',
          icon: 'people',
          title: 'Staff Members',
          description: 'Manage employees & roles',
          screen: 'StaffManagement',
          color: theme.colors.primary,
        },
        {
          id: 'permissions',
          icon: 'admin-panel-settings',
          title: 'Employee Permissions',
          description: 'Grant & manage permissions',
          screen: 'EmployeePermissions',
          color: theme.colors.secondary,
        },
        {
          id: 'commissions',
          icon: 'payments',
          title: 'Commission Rates',
          description: 'Set employee commission %',
          screen: 'Commissions',
          color: theme.colors.success,
        },
      ],
    },
    {
      section: 'Business',
      items: [
        {
          id: 'customers',
          icon: 'people-outline',
          title: 'Customer Management',
          description: 'View & manage customers',
          screen: 'CustomerManagement',
          color: '#00BCD4',
        },
        {
          id: 'analytics',
          icon: 'analytics',
          title: 'Business Analytics',
          description: 'View reports & insights',
          screen: 'BusinessAnalytics',
          color: theme.colors.warning,
        },
        {
          id: 'inventory',
          icon: 'inventory-2',
          title: 'Inventory Management',
          description: 'Track stock levels',
          screen: 'StockManagement',
          color: '#9C27B0',
        },
      ],
    },
  ];

  const handleMenuItemPress = (item: SettingsMenuItem) => {
    if (!selectedSalon) {
      Alert.alert('No Salon Selected', 'Please select a salon first.');
      return;
    }
    
    if (item.action) {
      item.action();
    } else if (item.screen) {
      const params: any = {
        salonId: selectedSalon.id,
        salon: selectedSalon,
      };
      navigation.navigate(item.screen, params);
    }
  };

  const renderSalonPicker = () => (
    <Modal visible={showSalonPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.pickerModal, dynamicStyles.modal]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, dynamicStyles.text]}>Select Salon</Text>
            <TouchableOpacity onPress={() => setShowSalonPicker(false)}>
              <MaterialIcons name="close" size={24} color={dynamicStyles.text.color} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.pickerList}>
            {salons.map((salon) => (
              <TouchableOpacity
                key={salon.id}
                style={[
                  styles.pickerItem, 
                  dynamicStyles.card,
                  selectedSalon?.id === salon.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedSalon(salon);
                  setShowSalonPicker(false);
                }}
              >
                <View style={[styles.pickerIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <MaterialIcons name="store" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.pickerInfo}>
                  <Text style={[styles.pickerName, dynamicStyles.text]}>{salon.name}</Text>
                  <Text style={[styles.pickerAddress, dynamicStyles.textSecondary]} numberOfLines={1}>
                    {salon.address || salon.city || 'No address'}
                  </Text>
                </View>
                {selectedSalon?.id === salon.id && (
                  <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Add new salon button */}
          <TouchableOpacity
            style={[styles.addSalonBtn, { borderColor: theme.colors.primary }]}
            onPress={() => {
              setShowSalonPicker(false);
              navigation.navigate('CreateSalon');
            }}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={[styles.addSalonText, { color: theme.colors.primary }]}>
              Add New Salon
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderMenuItem = (item: SettingsMenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, dynamicStyles.card]}
      onPress={() => handleMenuItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: (item.color || theme.colors.primary) + '20' }]}>
        <MaterialIcons name={item.icon as any} size={22} color={item.color || theme.colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, dynamicStyles.text]}>{item.title}</Text>
        <Text style={[styles.menuDescription, dynamicStyles.textSecondary]} numberOfLines={1}>
          {item.description}
        </Text>
      </View>
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.loadingContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={dynamicStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Salon Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Salon Selector Card */}
        <TouchableOpacity 
          style={[styles.salonCard, dynamicStyles.card]}
          onPress={() => setShowSalonPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.salonIconContainer}>
            <MaterialIcons name="store" size={32} color={theme.colors.primary} />
          </View>
          
          {selectedSalon ? (
            <View style={styles.salonInfo}>
              <Text style={[styles.salonName, dynamicStyles.text]}>{selectedSalon.name}</Text>
              <Text style={[styles.salonAddress, dynamicStyles.textSecondary]} numberOfLines={1}>
                {selectedSalon.address || selectedSalon.city || 'No address set'}
              </Text>
            </View>
          ) : (
            <View style={styles.salonInfo}>
              <Text style={[styles.salonName, dynamicStyles.textSecondary]}>No Salon Selected</Text>
              <Text style={[styles.salonAddress, dynamicStyles.textSecondary]}>
                Tap to select a salon
              </Text>
            </View>
          )}
          
          {/* Show salon count badge if multiple */}
          {salons.length > 1 && (
            <View style={styles.salonCountBadge}>
              <Text style={styles.salonCountText}>{salons.length} salons</Text>
            </View>
          )}
          
          <MaterialIcons 
            name={salons.length > 1 ? "unfold-more" : "edit"} 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>

        {/* No Salon State */}
        {salons.length === 0 && (
          <View style={styles.noSalonState}>
            <MaterialIcons name="store" size={64} color={theme.colors.gray400} />
            <Text style={[styles.noSalonTitle, dynamicStyles.text]}>No Salon Yet</Text>
            <Text style={[styles.noSalonText, dynamicStyles.textSecondary]}>
              Create your first salon to start managing your business
            </Text>
            <TouchableOpacity
              style={[styles.createSalonBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('CreateSalon')}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.white} />
              <Text style={styles.createSalonText}>Create Salon</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Sections - only show if salon is selected */}
        {selectedSalon && getSettingsMenuItems().map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              {section.section}
            </Text>
            <View style={styles.menuList}>
              {section.items.map(renderMenuItem)}
            </View>
          </View>
        ))}

        {/* Danger Zone - only show if salon is selected */}
        {selectedSalon && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
              Danger Zone
            </Text>
            <View style={styles.menuList}>
              <TouchableOpacity
                style={[styles.menuItem, dynamicStyles.card, styles.dangerItem]}
                onPress={() => {
                  Alert.alert(
                    'Coming Soon',
                    'This feature will allow you to temporarily close or permanently delete your salon.',
                    [{ text: 'OK' }]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: theme.colors.error + '20' }]}>
                  <MaterialIcons name="warning" size={22} color={theme.colors.error} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, { color: theme.colors.error }]}>Close Salon</Text>
                  <Text style={[styles.menuDescription, dynamicStyles.textSecondary]}>
                    Temporarily close or delete salon
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Salon Picker Modal */}
      {renderSalonPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  scrollContent: {
    padding: 16,
  },

  // Salon Card
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  salonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salonInfo: {
    flex: 1,
    marginLeft: 16,
  },
  salonName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: 4,
  },
  salonAddress: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  salonCountBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  salonCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },

  // No Salon State
  noSalonState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noSalonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  noSalonText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  createSalonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  createSalonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Menu Items
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  dangerItem: {
    borderColor: theme.colors.error + '40',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerItemSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  pickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pickerName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  pickerAddress: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  addSalonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  addSalonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
});
