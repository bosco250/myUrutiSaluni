import React, { useState, useMemo } from 'react';
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
import { usePermissions } from '../../context/PermissionContext';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useEmployeePermissionCheck } from '../../hooks/useEmployeePermissionCheck';
import { EmployeePermission } from '../../constants/employeePermissions';
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
        id: 'expenses',
        icon: 'receipt-long',
        label: 'Expenses',
        description: 'Track expenses',
        screen: 'Expenses',
        iconColor: theme.colors.error,
        requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
      },
      {
        id: 'accounting',
        icon: 'account-balance',
        label: 'Accounting',
        description: 'Financial overview',
        screen: 'Accounting',
        iconColor: theme.colors.info || theme.colors.primary,
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
  
  // Get cached permission data - this is instant, no API calls needed!
  const { activeSalon, isOwner, isAdmin } = usePermissions();
  
  // Also get checkPermission from hook for backward compatibility
  const { checkPermission } = useEmployeePermissionCheck();
  
  // Get salon info from cached activeSalon - instant access!
  const employeeSalonId = activeSalon?.salonId;
  const salonName = activeSalon?.salonName;


  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? theme.colors.gray900 : "#F8F9FA",
    },
    text: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    textSecondary: {
      color: isDark ? theme.colors.gray600 : theme.colors.textSecondary,
    },
    card: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
      borderColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
      borderWidth: 1,
    },
    header: {
      backgroundColor: isDark ? theme.colors.gray900 : "#F8F9FA",
    },
    divider: {
      backgroundColor: isDark ? theme.colors.gray700 : theme.colors.borderLight,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    outlineButtonBorder: {
      borderColor: isDark ? theme.colors.gray600 : theme.colors.border,
    },
    outlineButtonText: {
      color: isDark ? theme.colors.white : theme.colors.text,
    },
    iconBg: {
      backgroundColor: isDark ? theme.colors.gray900 + "80" : theme.colors.backgroundSecondary,
    }
  };

  // Helper to generate light background from color
  const getLightBg = (color: string) => `${color}15`; // 15% opacity

  const menuSections = useMemo(() => getMenuSections(unreadNotificationCount, isDark), [unreadNotificationCount, isDark]);

  // Dashboard section for employees
  const employeeSalonSection = useMemo(() => {
    return (employeeSalonId && user?.role === UserRole.SALON_EMPLOYEE) ? {
      title: 'Dashboard',
      items: [
        {
          id: 'my-salon',
          icon: 'dashboard',
          label: salonName || 'My Workspace',
          description: 'Manage your tasks & schedule',
          screen: 'EmployeeSalonDashboard',
          iconColor: theme.colors.primary,
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

  const allMenuSections = useMemo(() => employeeSalonSection 
    ? [employeeSalonSection, ...menuSections]
    : menuSections, [employeeSalonSection, menuSections]);

  const filteredMenuSections = useMemo(() => {
    return allMenuSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.ownerOnly) return isOwner || isAdmin;
        if (isOwner || isAdmin) return true;
        if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
        return item.requiredPermissions.some(perm => checkPermission(perm));
      })
    })).filter(section => section.items.length > 0);
  }, [allMenuSections, isOwner, isAdmin, checkPermission]);

  const handleMenuPress = (screen: string) => {
    const screensNeedingSalonId = [
      'AddProduct', 'AddService', 'StockManagement', 'SalonSettings',
      'SalonAppointments', 'CustomerManagement', 'Sales', 'StaffManagement',
      'EmployeePermissions', 'Operations', 'Expenses', 'Accounting'
    ];
    if (screensNeedingSalonId.includes(screen) && employeeSalonId) {
      navigation.navigate(screen, { salonId: employeeSalonId });
    } else {
      navigation.navigate(screen);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

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

  const cancelLogout = () => setShowLogoutModal(false);

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: getLightBg(item.iconColor) }]}>
        <MaterialIcons name={item.icon as any} size={20} color={item.iconColor} />
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
        <MaterialIcons name="chevron-right" size={20} color={dynamicStyles.textSecondary.color} />
      </View>
    </TouchableOpacity>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

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
        {/* Personalized Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingText, dynamicStyles.textSecondary]}>{getGreeting()},</Text>
            <Text style={[styles.userNameText, dynamicStyles.text]}>
              {user?.fullName?.split(' ')[0] || getRoleName(user?.role)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.notificationIcon, dynamicStyles.iconBg]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications-none" size={24} color={dynamicStyles.text.color} />
            {unreadNotificationCount > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, dynamicStyles.card]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Image 
            source={user?.avatarUrl ? { uri: user.avatarUrl } : profileImage} 
            style={styles.profileImage} 
            onError={(e) => console.log('More menu avatar load error:', e.nativeEvent.error)}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, dynamicStyles.text]}>
              {user?.fullName || getRoleName(user?.role)}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{getRoleName(user?.role)}</Text>
            </View>
          </View>
          <MaterialIcons name="keyboard-arrow-right" size={24} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>

        {/* Menu Sections */}
        {filteredMenuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, dynamicStyles.card]}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {renderMenuItem(item)}
                  {index < section.items.length - 1 && (
                    <View style={[styles.itemDivider, dynamicStyles.divider]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, dynamicStyles.card]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: getLightBg(theme.colors.error) }]}>
            <MaterialIcons name="logout" size={20} color={theme.colors.error} />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, dynamicStyles.textSecondary]}>
          Version 1.2.0 • Uruti
        </Text>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={cancelLogout}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.card, { borderWidth: 0 }]}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="logout" size={32} color={theme.colors.error} />
            </View>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Confirm Logout</Text>
            <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
              Are you sure you want to exit your account?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? theme.colors.gray700 : "#F1F3F5" }]}
                onPress={cancelLogout}
              >
                <Text style={[styles.cancelButtonText, dynamicStyles.text]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmLogout}>
                <Text style={styles.confirmButtonText}>Logout</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs,
  },
  greetingText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    fontWeight: 'bold',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 24,
    marginBottom: theme.spacing.xl,
  },
  profileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xs,
  },
  sectionCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    fontWeight: '500',
  },
  menuItemDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDivider: {
    height: 1,
    marginHorizontal: theme.spacing.md,
    opacity: 0.5,
  },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: theme.spacing.xs,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: theme.fonts.bold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: 24,
    marginTop: theme.spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: theme.spacing.xl,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: theme.fonts.bold,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
});
