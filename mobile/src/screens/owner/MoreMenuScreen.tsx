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
    goBack?: () => void;
  };
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  description?: string;
  screen?: string;
  badge?: number | string;
  iconColor: string;
  requiredPermissions?: EmployeePermission[];
  ownerOnly?: boolean; // If true, only owners/admins can see this item
  subItems?: MenuItem[];
}

// Menu sections with items
// Using theme colors for consistency
const getMenuSections = (unreadNotificationCount: number, isDark: boolean) => [

  {
    title: 'Workspace',
    items: [
      {
        id: 'sales-group',
        icon: 'point-of-sale',
        label: 'POS & Sales',
        description: 'Manage sales & history',
        iconColor: theme.colors.success,
        requiredPermissions: [EmployeePermission.PROCESS_PAYMENTS, EmployeePermission.VIEW_SALES_REPORTS],
        subItems: [
          {
             id: 'sales',
             icon: 'bolt', 
             label: 'Quick Sales',
             screen: 'Sales',
             iconColor: theme.colors.success,
             requiredPermissions: [EmployeePermission.PROCESS_PAYMENTS],
          },
          {
             id: 'sales-history',
             icon: 'receipt-long',
             label: 'Sales History',
             screen: 'SalesHistory',
             iconColor: theme.colors.secondary,
             requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
          }
        ]
      },
      {
        id: 'finance-group',
        icon: 'account-balance',
        label: 'Accounting',
        description: 'Finance & Reports',
        iconColor: theme.colors.primary,
        requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS, EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS],
        subItems: [
          {
            id: 'accounting',
            icon: 'dashboard',
            label: 'Overview',
            screen: 'Accounting',
            iconColor: theme.colors.primary,
            requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
          },
          {
            id: 'expenses',
            icon: 'receipt',
            label: 'Expenses',
            screen: 'Expenses',
            iconColor: theme.colors.error,
            requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
          },
          {
            id: 'analytics',
            icon: 'analytics',
            label: 'Reports',
            screen: 'BusinessAnalytics',
            iconColor: theme.colors.warning,
            requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS],
          },
          {
            id: 'commissions',
            icon: 'payments',
            label: 'Commissions',
            screen: 'Commissions',
            iconColor: theme.colors.success,
            requiredPermissions: [EmployeePermission.VIEW_SALES_REPORTS, EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS],
          },
        ],
      },
      {
        id: 'inventory-group',
        icon: 'inventory',
        label: 'Inventory',
        description: 'Stock & Products',
        iconColor: theme.colors.warning,
        requiredPermissions: [EmployeePermission.MANAGE_PRODUCTS, EmployeePermission.MANAGE_INVENTORY],
        subItems: [
          {
            id: 'stock-management',
            icon: 'format-list-bulleted',
            label: 'Stock Management',
            screen: 'StockManagement',
            iconColor: theme.colors.primary,
            requiredPermissions: [EmployeePermission.MANAGE_INVENTORY],
          },
          {
            id: 'add-product',
            icon: 'add-circle-outline',
            label: 'Add New Product',
            screen: 'AddProduct',
            iconColor: theme.colors.success,
            requiredPermissions: [EmployeePermission.MANAGE_PRODUCTS],
          },
        ],
      },
      {
        id: 'team-group',
        icon: 'people',
        label: 'Team',
        description: 'Manage staff & schedules',
        iconColor: theme.colors.info,
        subItems: [
          {
            id: 'staff',
            icon: 'people',
            label: 'Team List',
            screen: 'StaffManagement',
            iconColor: theme.colors.secondary,
            requiredPermissions: [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES, EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE],
          },
          {
            id: 'employee-schedules',
            icon: 'calendar-today',
            label: 'Schedule',
            screen: 'MySchedule',
            iconColor: theme.colors.secondary,
            requiredPermissions: [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES],
          },
          {
            id: 'performance',
            icon: 'trending-up',
            label: 'Performance',
            screen: 'BusinessAnalytics',
            iconColor: theme.colors.warning,
            requiredPermissions: [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE],
          },
          {
            id: 'employee-permissions',
            icon: 'admin-panel-settings',
            label: 'Access Controls',
            screen: 'EmployeePermissions',
            iconColor: theme.colors.secondary,
            ownerOnly: true,
          },
        ],
      },
      {
        id: 'salon-group',
        icon: 'store',
        label: 'Salon',
        description: 'Operations & Settings',
        iconColor: theme.colors.primary,
        subItems: [
          {
            id: 'schedule',
            icon: 'schedule',
            label: 'Appointments',
            screen: 'SalonAppointments',
            iconColor: theme.colors.error,
            requiredPermissions: [EmployeePermission.VIEW_ALL_APPOINTMENTS, EmployeePermission.MANAGE_APPOINTMENTS],
          },
          {
            id: 'customers',
            icon: 'people-outline',
            label: 'Customers',
            screen: 'CustomerManagement',
            iconColor: theme.colors.secondaryLight,
            requiredPermissions: [EmployeePermission.MANAGE_CUSTOMERS, EmployeePermission.VIEW_CUSTOMER_HISTORY],
          },
          {
            id: 'salon-settings',
            icon: 'settings',
            label: 'Details & Settings',
            screen: 'SalonSettings',
            iconColor: theme.colors.primary,
            requiredPermissions: [
              EmployeePermission.MANAGE_SALON_PROFILE, 
              EmployeePermission.VIEW_SALON_SETTINGS, 
              EmployeePermission.UPDATE_SALON_SETTINGS, 
              EmployeePermission.MANAGE_BUSINESS_HOURS
            ],
          },
        ],
      },
    ] as MenuItem[],
  },
  {
    title: 'General',
    items: [

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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const { activeSalon, isOwner, isAdmin } = usePermissions();
  const { checkPermission } = useEmployeePermissionCheck();
  
  const employeeSalonId = activeSalon?.salonId;
  const salonName = activeSalon?.salonName;

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
    border: {
      borderBottomColor: isDark ? theme.colors.gray800 : theme.colors.borderLight,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalBg: {
      backgroundColor: isDark ? theme.colors.gray800 : theme.colors.white,
    }
  };

  const menuSections = useMemo(() => getMenuSections(unreadNotificationCount, isDark), [unreadNotificationCount, isDark]);

  const employeeSalonSection = useMemo(() => {
    return (employeeSalonId && user?.role === UserRole.SALON_EMPLOYEE) ? {
      title: 'Dashboard',
      items: [
        {
          id: 'my-salon',
          icon: 'dashboard',
          label: salonName || 'My Workspace',
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
      items: section.items.map(item => {
        // Handle sub-items recursively
        let filteredSubItems = item.subItems;
        if (item.subItems) {
           filteredSubItems = item.subItems.filter(sub => {
              if (sub.ownerOnly && !(isOwner || isAdmin)) return false;
              if (isOwner || isAdmin) return true;
              if (!sub.requiredPermissions || sub.requiredPermissions.length === 0) return true;
              return sub.requiredPermissions.some(perm => checkPermission(perm));
           });
        }
        return { ...item, subItems: filteredSubItems };
      }).filter(item => {
        // If it has subItems, only show if there are visible children
        if (item.subItems) return item.subItems.length > 0;

        if (item.ownerOnly) return isOwner || isAdmin;
        if (isOwner || isAdmin) return true;
        if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
        return item.requiredPermissions.some(perm => checkPermission(perm));
      })
    })).filter(section => section.items.length > 0);
  }, [allMenuSections, isOwner, isAdmin, checkPermission]);

  const handleMenuPress = (screen?: string) => {
    if (!screen) return;
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

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.id];
    
    const itemStyle = depth > 0 ? { 
        paddingLeft: 40, 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' 
    } : {};

    const mainRow = (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, dynamicStyles.border, itemStyle]}
        onPress={() => hasSubItems ? toggleExpand(item.id) : handleMenuPress(item.screen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.menuItemLabel, dynamicStyles.text, depth > 0 && { fontSize: 13, opacity: 0.9 }]}>{item.label}</Text>
        <View style={styles.menuItemRight}>
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
              </Text>
            </View>
          )}
          <MaterialIcons 
            name={hasSubItems ? (isExpanded ? "expand-less" : "expand-more") : "chevron-right"} 
            size={18} 
            color={isDark ? theme.colors.gray600 : theme.colors.border} 
          />
        </View>
      </TouchableOpacity>
    );

    if (hasSubItems) {
       return (
          <View key={item.id}>
             {mainRow}
             {isExpanded && item.subItems!.map(sub => renderMenuItem(sub, depth + 1))}
          </View>
       );
    }
    
    return mainRow;
  };

  return (
    <SafeAreaView 
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Premium Header */}
      <View style={[styles.header, dynamicStyles.border]}>
         <Text style={[styles.headerTitle, dynamicStyles.text]}>Menu</Text>
         <TouchableOpacity 
           onPress={() => navigation.goBack ? navigation.goBack() : navigation.navigate('Home')} 
           style={styles.closeButton}
           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
         >
            <MaterialIcons name="close" size={22} color={dynamicStyles.textSecondary.color} />
         </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredMenuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              {section.title}
            </Text>
            <View>
              {section.items.map(item => renderMenuItem(item, 0))}
            </View>
          </View>
        ))}
        {/* Profile & Logout Section at bottom */}
        <View style={[styles.bottomSection, dynamicStyles.border]}>
          <TouchableOpacity 
            style={[styles.profileOuterContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}
            onPress={() => handleMenuPress('Profile')}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <Image 
                source={user?.avatarUrl ? { uri: user.avatarUrl } : profileImage} 
                style={styles.avatar}
                defaultSource={profileImage}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, dynamicStyles.text]} numberOfLines={1}>
                {user?.fullName || 'User Profile'}
              </Text>
              <Text style={[styles.userRole, dynamicStyles.textSecondary]}>
                {getRoleName(user?.role)}
              </Text>
            </View>
            <MaterialIcons 
              name="chevron-right" 
              size={18} 
              color={dynamicStyles.textSecondary.color} 
              style={{ opacity: 0.3 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutContent}>
              <MaterialIcons name="logout" size={20} color={theme.colors.error} />
              <Text style={styles.logoutText}>Sign out of Uruti</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, dynamicStyles.textSecondary]}>
          Version 1.2.0 • Uruti
        </Text>
      </ScrollView>

      {/* Clean Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={cancelLogout}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Log Out</Text>
            <Text style={[styles.modalMessage, dynamicStyles.textSecondary]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
              >
                <Text style={[styles.cancelButtonText, dynamicStyles.text]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmLogout}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  bottomSection: {
    marginTop: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  profileOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    marginBottom: 1,
    letterSpacing: -0.4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRole: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    opacity: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 20,
    opacity: 0.4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    fontWeight: '600',
    color: theme.colors.error,
    marginLeft: 12,
    letterSpacing: -0.2,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
    opacity: 0.4,
  },
  // Minimial Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  confirmButton: {
    backgroundColor: theme.colors.error, // Keep red for dangerous action
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
