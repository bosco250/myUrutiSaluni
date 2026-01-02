import React, { useState, useEffect, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme, useAuth } from '../../context';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';
import { EmployeePermission } from '../../constants/employeePermissions';
import { salonService } from '../../services/salon';
import { UserRole, getRoleName } from '../../constants/roles';

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
  iconColor: string;
  requiredPermissions?: EmployeePermission[];
  ownerOnly?: boolean; // If true, only owners/admins can see this item
}

// Menu sections with items
// Using theme colors for consistency
const getMenuSections = (unreadNotificationCount: number, isDark: boolean) => [
  {
    title: 'My Account',
    items: [
      {
        id: 'profile',
        icon: 'person',
        label: 'My Profile',
        description: 'Manage personal details',
        screen: 'Profile',
        iconColor: theme.colors.secondary,
      },
      {
        id: 'notifications',
        icon: 'notifications',
        label: 'Alerts',
        description: ' Updates & reminders',
        screen: 'Notifications',
        badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
        iconColor: theme.colors.warning,
      },
    ] as MenuItem[],
  },
  {
    title: 'Workspace',
    items: [
      {
        id: 'sales',
        icon: 'point-of-sale',
        label: 'Checkout',
        description: 'Process a new payment',
        screen: 'Sales',
        iconColor: theme.colors.success,
        requiredPermissions: [EmployeePermission.PROCESS_PAYMENTS],
      },
      {
        id: 'sales-history',
        icon: 'receipt-long',
        label: 'Transactions',
        description: 'View sales history',
        screen: 'SalesHistory',
        iconColor: theme.colors.secondary,
        requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
      },
      {
        id: 'commissions',
        icon: 'payments',
        label: 'My Earnings',
        description: 'Track commissions',
        screen: 'Commissions',
        iconColor: theme.colors.primary,
        requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS, EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS],
      },
      {
        id: 'analytics',
        icon: 'analytics',
        label: 'Business Reports',
        description: 'Performance insights',
        screen: 'BusinessAnalytics',
        iconColor: theme.colors.warning,
        requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
      },
      {
        id: 'employee-schedules',
        icon: 'calendar-today',
        label: 'Team Schedule',
        description: 'Manage shifts',
        screen: 'MySchedule',
        iconColor: theme.colors.secondary,
        requiredPermissions: [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES],
      },
      {
        id: 'performance',
        icon: 'trending-up',
        label: 'Team Performance',
        description: 'Staff metrics',
        screen: 'BusinessAnalytics',
        iconColor: theme.colors.warning,
        requiredPermissions: [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE],
      },
      {
        id: 'staff',
        icon: 'people',
        label: 'Team List',
        description: 'View & manage staff',
        screen: 'StaffManagement',
        iconColor: theme.colors.secondary,
        requiredPermissions: [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES, EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE],
      },
      {
        id: 'employee-permissions',
        icon: 'admin-panel-settings',
        label: 'Access Controls',
        description: 'Manage staff permissions',
        screen: 'EmployeePermissions',
        iconColor: theme.colors.secondary,
        ownerOnly: true, // Only owners can manage permissions
      },
      {
        id: 'customers',
        icon: 'people-outline',
        label: 'Client List',
        description: 'View customer directory',
        screen: 'CustomerManagement',
        iconColor: theme.colors.secondaryLight,
        requiredPermissions: [EmployeePermission.MANAGE_CUSTOMERS, EmployeePermission.VIEW_CUSTOMER_HISTORY],
      },
      {
        id: 'schedule',
        icon: 'schedule',
        label: 'My Calendar',
        description: 'View my appointments',
        screen: 'SalonAppointments',
        iconColor: theme.colors.error,
        requiredPermissions: [EmployeePermission.VIEW_ALL_APPOINTMENTS, EmployeePermission.MANAGE_APPOINTMENTS],
      },
    ] as MenuItem[],
  },
  {
    title: 'App Settings',
    items: [
      {
        id: 'salon-settings',
        icon: 'store',
        label: 'Salon Details',
        description: 'Hours & info',
        screen: 'SalonSettings',
        iconColor: theme.colors.primary,
        requiredPermissions: [EmployeePermission.MANAGE_SALON_PROFILE, EmployeePermission.VIEW_SALON_SETTINGS, EmployeePermission.UPDATE_SALON_SETTINGS, EmployeePermission.MANAGE_BUSINESS_HOURS],
      },
      {
        id: 'explore',
        icon: 'explore',
        label: 'Explore Salons',
        description: 'Find other salons',
        screen: 'Explore',
        iconColor: theme.colors.secondary,
        // No permission required - public
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
        description: 'Customer chats',
        screen: 'ChatList',
        iconColor: theme.colors.secondary,
      },
      {
        id: 'help',
        icon: 'help-outline',
        label: 'Help & Support',
        description: 'FAQs & contact',
        screen: 'Help',
        iconColor: theme.colors.textSecondary,
      },
    ] as MenuItem[],
  },
];

export default function MoreMenuScreen({ navigation }: MoreMenuScreenProps) {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const unreadNotificationCount = useUnreadNotifications();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { checkPermission, isOwner, isAdmin, salonId: employeeSalonId } = useEmployeePermissionCheck();
  const [salonName, setSalonName] = useState<string | null>(null);

  // Fetch salon name for employees
  useEffect(() => {
    const fetchSalonName = async () => {
      if (employeeSalonId && user?.role === UserRole.SALON_EMPLOYEE) {
        try {
          const salons = await salonService.getAllSalons();
          const salon = salons.find(s => s.id === employeeSalonId);
          if (salon?.name) {
            setSalonName(salon.name);
          }
        } catch (error) {
          console.error('Error fetching salon name:', error);
        }
      }
    };
    fetchSalonName();
  }, [employeeSalonId, user?.role]);

  // Dynamic styles for dark/light mode (matching OperationsScreen pattern)
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : theme.colors.background,
    },
    divider: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    // Button styles matching OperationsScreen
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    outlineButtonBorder: {
      borderColor: isDark ? theme.colors.gray600 : theme.colors.border,
    },
    outlineButtonText: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
  };

  // Helper to generate light background from color
  const getLightBg = (color: string) => `${color}15`; // 15% opacity

  const menuSections = useMemo(() => getMenuSections(unreadNotificationCount, isDark), [unreadNotificationCount, isDark]);

  // Add "My Salon" section for employees with permissions
  // Use employeeSalonId check instead of salonName to avoid render delay
  const employeeSalonSection = useMemo(() => {
    return (employeeSalonId && user?.role === UserRole.SALON_EMPLOYEE) ? {
      title: 'Dashboard',
      items: [
        {
          id: 'my-salon',
          icon: 'dashboard',
          label: salonName || 'My Salon Workspace', // Fallback while loading
          description: 'Go to main dashboard',
          screen: 'EmployeeSalonDashboard', // Navigate to employee-specific dashboard with all permitted features
          iconColor: theme.colors.primary,
          // Show this if employee has any management permissions
          requiredPermissions: [
            EmployeePermission.MANAGE_PRODUCTS,
            EmployeePermission.MANAGE_SERVICES,
            EmployeePermission.MANAGE_APPOINTMENTS,
            EmployeePermission.MANAGE_CUSTOMERS,
            EmployeePermission.MANAGE_SALON_PROFILE,
            EmployeePermission.UPDATE_SALON_SETTINGS,
          ],
        },
      ] as MenuItem[],
    } : null;
  }, [employeeSalonId, user?.role, salonName]);

  // Combine all sections, adding employee salon section if it exists
  const allMenuSections = useMemo(() => employeeSalonSection 
    ? [employeeSalonSection, ...menuSections]
    : menuSections, [employeeSalonSection, menuSections]);

  // Filter menu items based on permissions
  const filteredMenuSections = useMemo(() => {
    return allMenuSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Owner-only items: only visible to owners and admins
        if (item.ownerOnly) {
          return isOwner || isAdmin;
        }
        
        // Owners and admins see everything (except owner-only items already handled above)
        if (isOwner || isAdmin) return true;
        
        // If no permissions required, show it
        if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
        
        // Check if user has any of the required permissions
        return item.requiredPermissions.some(perm => checkPermission(perm));
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
  }, [allMenuSections, isOwner, isAdmin, checkPermission]);

  const handleMenuPress = (screen: string) => {
    // Screens that require salonId parameter
    const screensNeedingSalonId = [
      'AddProduct',
      'AddService', 
      'StockManagement',
      'SalonSettings',
      'SalonAppointments',
      'CustomerManagement',
      'Sales',
      'StaffManagement',
      'EmployeePermissions',
      'Operations', // Added for employee salon access
    ];
    
    // For employees, use the salonId from their employee record (from hook)
    // For owners, let the screen fetch their own salon
    const salonIdToPass = employeeSalonId;
    
    // Navigate with salonId if the screen needs it and we have one
    if (screensNeedingSalonId.includes(screen) && salonIdToPass) {
      navigation.navigate(screen, { salonId: salonIdToPass });
    } else {
      navigation.navigate(screen);
    }
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
      style={[styles.menuItem, dynamicStyles.card, { borderWidth: 0 }]}
      onPress={() => handleMenuPress(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: getLightBg(item.iconColor) }]}>
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
    <SafeAreaView 
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
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
              {user?.fullName || getRoleName(user?.role)}
            </Text>
            <Text style={[styles.profileRole, dynamicStyles.textSecondary]}>
              {getRoleName(user?.role)}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>

        {/* Menu Sections - Filtered by permissions */}
        {filteredMenuSections.map((section, sectionIndex) => (
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
          style={[styles.logoutButton, dynamicStyles.card, { borderColor: dynamicStyles.card.borderColor }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: getLightBg(theme.colors.error) }]}>
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
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  dynamicStyles.outlineButtonBorder,
                  { backgroundColor: isDark ? theme.colors.gray800 : theme.colors.backgroundSecondary },
                ]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, dynamicStyles.outlineButtonText]}>Cancel</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    // paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileImageContainer: {
    marginRight: theme.spacing.md,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
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
    backgroundColor: theme.colors.overlay,
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
    backgroundColor: `${theme.colors.error}1A`,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
