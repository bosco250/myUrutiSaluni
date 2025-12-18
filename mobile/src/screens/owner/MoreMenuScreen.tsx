import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

// Profile image placeholder
const profileImage = require('../../../assets/Logo.png');

interface MoreMenuScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  description?: string;
  screen: string;
  badge?: number | string;
  iconBgColor?: string;
  iconColor?: string;
}

export default function MoreMenuScreen({ navigation }: MoreMenuScreenProps) {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const unreadNotificationCount = useUnreadNotifications();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#1C1C1E' : theme.colors.background,
    },
    text: {
      color: isDark ? '#FFFFFF' : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? '#8E8E93' : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? '#2C2C2E' : theme.colors.background,
    },
    divider: {
      backgroundColor: isDark ? '#3A3A3C' : theme.colors.borderLight,
    },
  };

  // Menu sections with items
  const menuSections = [
    {
      title: 'My Account',
      items: [
        {
          id: 'profile',
          icon: 'person',
          label: 'Profile',
          description: 'Manage your personal info',
          screen: 'Profile',
          iconBgColor: '#E3F2FD',
          iconColor: '#2196F3',
        },
        {
          id: 'notifications',
          icon: 'notifications',
          label: 'Notifications',
          description: 'Alerts & updates',
          screen: 'Notifications',
          badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          iconBgColor: '#FFF3E0',
          iconColor: '#FF9800',
        },
      ] as MenuItem[],
    },
    {
      title: 'Business Tools',
      items: [
        {
          id: 'sales',
          icon: 'point-of-sale',
          label: 'Quick Sale',
          description: 'New sale / POS',
          screen: 'Sales',
          iconBgColor: '#E8F5E9',
          iconColor: '#4CAF50',
        },
        {
          id: 'sales-history',
          icon: 'receipt-long',
          label: 'Sales History',
          description: 'View transactions',
          screen: 'SalesHistory',
          iconBgColor: '#E3F2FD',
          iconColor: '#2196F3',
        },
        {
          id: 'commissions',
          icon: 'payments',
          label: 'Commissions',
          description: 'Employee earnings',
          screen: 'Commissions',
          iconBgColor: `${theme.colors.primary}20`,
          iconColor: theme.colors.primary,
        },
        {
          id: 'analytics',
          icon: 'analytics',
          label: 'Business Analytics',
          description: 'Reports & insights',
          screen: 'BusinessAnalytics',
          iconBgColor: '#FFF3E0',
          iconColor: '#FF9800',
        },
        {
          id: 'staff',
          icon: 'people',
          label: 'Staff Management',
          description: 'Manage your team',
          screen: 'StaffManagement',
          iconBgColor: '#E1F5FE',
          iconColor: '#03A9F4',
        },
        {
          id: 'inventory',
          icon: 'inventory-2',
          label: 'Inventory',
          description: 'Manage products & stock',
          screen: 'InventoryManagement',
          iconBgColor: '#F3E5F5',
          iconColor: '#9C27B0',
        },
        {
          id: 'customers',
          icon: 'people-outline',
          label: 'Customer Management',
          description: 'View & manage customers',
          screen: 'CustomerManagement',
          iconBgColor: '#E0F7FA',
          iconColor: '#00BCD4',
        },
        {
          id: 'schedule',
          icon: 'schedule',
          label: 'My Schedule',
          description: 'Your appointments',
          screen: 'MySchedule',
          iconBgColor: '#FCE4EC',
          iconColor: '#E91E63',
        },
      ] as MenuItem[],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'salon-settings',
          icon: 'store',
          label: 'Salon Settings',
          description: 'Business hours, info & more',
          screen: 'SalonSettings',
          iconBgColor: `${theme.colors.primary}20`,
          iconColor: theme.colors.primary,
        },
        {
          id: 'explore',
          icon: 'explore',
          label: 'Explore Salons',
          description: 'Browse other salons',
          screen: 'Explore',
          iconBgColor: '#E8EAF6',
          iconColor: '#3F51B5',
        },
      ] as MenuItem[],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'chat',
          icon: 'chat',
          label: 'Messages',
          description: 'Chat with customers',
          screen: 'ChatList',
          iconBgColor: '#E1F5FE',
          iconColor: '#03A9F4',
        },
        {
          id: 'help',
          icon: 'help-outline',
          label: 'Help & Support',
          description: 'FAQs & contact us',
          screen: 'Help',
          iconBgColor: '#ECEFF1',
          iconColor: '#607D8B',
        },
      ] as MenuItem[],
    },
  ];

  const handleMenuPress = (screen: string) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error);
      navigation.navigate('Login');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, dynamicStyles.card]}
      onPress={() => handleMenuPress(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: item.iconBgColor }]}>
        <MaterialIcons name={item.icon as any} size={22} color={item.iconColor} />
      </View>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemLabel, dynamicStyles.text]}>{item.label}</Text>
        {item.description && (
          <Text style={[styles.menuItemDescription, dynamicStyles.textSecondary]}>
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
            </Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Profile */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>More</Text>
        </View>

        {/* User Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, dynamicStyles.card]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.profileImageContainer}>
            <Image source={profileImage} style={styles.profileImage} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, dynamicStyles.text]}>
              {user?.fullName || 'Salon Owner'}
            </Text>
            <Text style={[styles.profileRole, dynamicStyles.textSecondary]}>
              Salon Owner
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, dynamicStyles.card]}>
              {section.items.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderMenuItem(item)}
                  {index < section.items.length - 1 && (
                    <View style={[styles.itemDivider, dynamicStyles.divider]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, dynamicStyles.card]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#FFEBEE' }]}>
            <MaterialIcons name="exit-to-app" size={22} color={theme.colors.error} />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={[styles.versionText, dynamicStyles.textSecondary]}>
          Version 1.0.0
        </Text>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.card]}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="exit-to-app" size={40} color={theme.colors.error} />
            </View>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Log Out</Text>
            <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  profileImageContainer: {
    marginRight: theme.spacing.md,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },

  // Sections
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemDivider: {
    height: 1,
    marginLeft: 72, // Align with text start
  },

  // Badge
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.error,
    fontFamily: theme.fonts.medium,
    flex: 1,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
});
