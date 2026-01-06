import { EmployeePermission } from '../constants/employeePermissions';
import { Screen } from '../constants/permissions';
import { UserRole } from '../constants/roles';

/**
 * Maps employee permissions to screens they can access
 * This is the central source of truth for permission-to-screen mapping
 */
export const PERMISSION_TO_SCREEN_MAP: Record<EmployeePermission, string[]> = {
  // Appointment Management
  [EmployeePermission.MANAGE_APPOINTMENTS]: [
    'SalonAppointments',
    'Appointments',
    'CreateAppointment',
    'EditAppointment',
    'AppointmentDetail',
    'AppointmentActions',
    'RescheduleAppointment',
  ],
  [EmployeePermission.ASSIGN_APPOINTMENTS]: [
    'SalonAppointments',
    'Appointments',
    'AppointmentDetail',
    'AssignAppointment',
  ],
  [EmployeePermission.VIEW_ALL_APPOINTMENTS]: [
    'SalonAppointments',
    'Appointments',
    'AppointmentDetail',
    'AppointmentCalendar',
  ],
  [EmployeePermission.MODIFY_APPOINTMENT_STATUS]: [
    'AppointmentDetail',
    'SalonAppointments',
    'Appointments',
  ],
  // DEFAULT: View own appointments (auto-granted to all employees)
  [EmployeePermission.VIEW_OWN_APPOINTMENTS]: [
    'MySchedule',         // Employee's own schedule
    'AppointmentDetail',  // Can view details of assigned appointments
    'StaffDashboard',     // Dashboard shows assigned appointments
  ],
  [EmployeePermission.MANAGE_SERVICES]: [
    'AllServices',
    'ServiceDetail',
    'AddService',
    'EditService',
    'ServiceCategories',
  ],
  [EmployeePermission.MANAGE_PRODUCTS]: [
    'StockManagement',
    'InventoryManagement',
    'AddProduct',
    'EditProduct',
    'ProductDetail',
  ],
  [EmployeePermission.UPDATE_SERVICE_PRICING]: [
    'AllServices',
    'ServiceDetail',
    'EditService',
  ],
  [EmployeePermission.UPDATE_PRODUCT_PRICING]: [
    'StockManagement',
    'InventoryManagement',
    'EditProduct',
  ],

  // Customer Management
  [EmployeePermission.MANAGE_CUSTOMERS]: [
    'CustomerManagement',
    'CustomerDetail',
    'AddCustomer',
    'EditCustomer',
    'CustomerSearch',
  ],
  [EmployeePermission.VIEW_CUSTOMER_HISTORY]: [
    'CustomerDetail',
    'CustomerManagement',
    'CustomerHistory',
  ],
  [EmployeePermission.VIEW_CUSTOMER_LOYALTY]: [
    'CustomerDetail',
    'Loyalty',
    'CustomerRewards',
  ],
  [EmployeePermission.UPDATE_CUSTOMER_INFO]: [
    'CustomerDetail',
    'CustomerManagement',
    'EditCustomer',
  ],

  // Sales & Financial
  [EmployeePermission.PROCESS_PAYMENTS]: [
    'Sales',
    'SaleDetail',
    'ProcessPayment',
    'Checkout',
  ],
  [EmployeePermission.APPLY_DISCOUNTS]: [
    'Sales',
    'SaleDetail',
    'ApplyDiscount',
  ],
  [EmployeePermission.VIEW_SALES_REPORTS]: [
    'Sales',
    'SalesHistory',
    'SaleDetail',
    'BusinessAnalytics',
    'ReportsOverview',
  ],
  [EmployeePermission.EXPORT_SALES_DATA]: [
    'Sales',
    'SalesHistory',
    'BusinessAnalytics',
    'ExportData',
  ],
  [EmployeePermission.VOID_TRANSACTIONS]: [
    'SaleDetail',
    'Sales',
    'VoidTransaction',
  ],
  // DEFAULT: View own sales (auto-granted to all employees)
  [EmployeePermission.VIEW_OWN_SALES]: [
    'SaleDetail',     // Can view details of own sales
    'StaffDashboard', // Shows own earnings
    'Commissions',    // Shows own commissions from sales
  ],

  // Staff Management
  [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES]: [
    'StaffManagement',
    'MySchedule',
    'EmployeeSchedule',
    'EditSchedule',
    'AddEmployee',
  ],
  [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE]: [
    'StaffManagement',
    'EmployeeDetail',
    'EmployeePerformance',
  ],
  [EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS]: [
    'Commissions',
    'CommissionDetail',
    'CommissionHistory',
  ],
  // DEFAULT: View own commissions (auto-granted to all employees)
  [EmployeePermission.VIEW_OWN_COMMISSIONS]: [
    'Commissions',       // View own commission list
    'CommissionDetail',  // View own commission details
    'StaffDashboard',    // Shows commission summary on dashboard
    'Wallet',           // Shows earnings in wallet
  ],

  // Inventory Management
  [EmployeePermission.MANAGE_INVENTORY]: [
    'StockManagement',
    'InventoryManagement',
    'AddProduct',
    'StockAdjustment',
    'ReceiveStock',
  ],
  [EmployeePermission.VIEW_INVENTORY_REPORTS]: [
    'StockManagement',
    'InventoryManagement',
    'InventoryReports',
  ],
  [EmployeePermission.PROCESS_STOCK_ADJUSTMENTS]: [
    'StockManagement',
    'InventoryManagement',
    'StockAdjustment',
  ],
  [EmployeePermission.VIEW_LOW_STOCK_ALERTS]: [
    'StockManagement',
    'InventoryManagement',
    'LowStockAlerts',
  ],

  // Salon Operations
  [EmployeePermission.VIEW_SALON_SETTINGS]: [
    'SalonSettings',
    'SalonDetail',
    'SalonList',
    'ViewSalonProfile',
  ],
  [EmployeePermission.UPDATE_SALON_SETTINGS]: [
    'SalonSettings',
    'EditSalon',
    'SalonConfiguration',
  ],
  [EmployeePermission.MANAGE_BUSINESS_HOURS]: [
    'SalonSettings',
    'BusinessHours',
    'EditBusinessHours',
  ],
  [EmployeePermission.MANAGE_SALON_PROFILE]: [
    'SalonSettings',
    'SalonDetail',
    'EditSalon',
    'SalonProfile',
  ],
};

/**
 * Maps notification types to required permissions
 */
export const NOTIFICATION_TYPE_TO_PERMISSION_MAP: Record<
  string,
  EmployeePermission | null
> = {
  permission_granted: null, // Special case - navigates to permissions screen
  permission_revoked: null, // Special case - navigates to permissions screen
  appointment_booked: EmployeePermission.VIEW_ALL_APPOINTMENTS,
  appointment_confirmed: EmployeePermission.VIEW_ALL_APPOINTMENTS,
  appointment_cancelled: EmployeePermission.VIEW_ALL_APPOINTMENTS,
  appointment_completed: EmployeePermission.VIEW_ALL_APPOINTMENTS,
  appointment_reminder: EmployeePermission.VIEW_ALL_APPOINTMENTS,
  sale_completed: EmployeePermission.VIEW_SALES_REPORTS,
  payment_received: EmployeePermission.VIEW_SALES_REPORTS,
  commission_earned: EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
  commission_paid: EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
  low_stock_alert: EmployeePermission.VIEW_LOW_STOCK_ALERTS,
  out_of_stock: EmployeePermission.VIEW_LOW_STOCK_ALERTS,
  stock_replenished: EmployeePermission.VIEW_INVENTORY_REPORTS,
};

/**
 * Priority order for screens when multiple permissions are granted
 * Higher priority screens are shown first
 */
const SCREEN_PRIORITY: Record<string, number> = {
  SalonAppointments: 10,
  AllServices: 9,
  StockManagement: 8,
  CustomerManagement: 7,
  Sales: 6,
  MyPermissions: 5,
  StaffDashboard: 4,
  WhatCanIDo: 3,
};

/**
 * Get the primary screen to navigate to based on granted permissions
 * Returns the most relevant screen where employee can use their permissions
 */
export function getPrimaryScreenFromPermissions(
  permissions: EmployeePermission[],
): string {
  if (!permissions || permissions.length === 0) {
    return 'MyPermissions'; // Default: show permissions screen if none granted
  }

  // Get all accessible screens from granted permissions
  const accessibleScreens = getAccessibleScreens(permissions);

  if (accessibleScreens.length === 0) {
    return 'MyPermissions';
  }

  // Sort by priority (higher priority first)
  const sortedScreens = accessibleScreens.sort((a, b) => {
    const priorityA = SCREEN_PRIORITY[a] || 0;
    const priorityB = SCREEN_PRIORITY[b] || 0;
    return priorityB - priorityA;
  });

  // Return the highest priority screen
  return sortedScreens[0];
}

/**
 * Maps notification types to screens
 */
export const NOTIFICATION_TYPE_TO_SCREEN_MAP: Record<
  string,
  { screen: string; params?: any }
> = {
  permission_granted: { screen: 'MyPermissions' }, // Will be overridden by smart navigation
  permission_revoked: { screen: 'MyPermissions' },
  appointment_booked: { screen: 'AppointmentDetail' },
  appointment_confirmed: { screen: 'AppointmentDetail' },
  appointment_cancelled: { screen: 'Appointments' },
  appointment_completed: { screen: 'AppointmentDetail' },
  appointment_reminder: { screen: 'AppointmentDetail' },
  sale_completed: { screen: 'SaleDetail' },
  payment_received: { screen: 'SaleDetail' },
  commission_earned: { screen: 'Commissions' },
  commission_paid: { screen: 'Commissions' },
  low_stock_alert: { screen: 'StockManagement' },
  out_of_stock: { screen: 'StockManagement' },
  stock_replenished: { screen: 'StockManagement' },
};

/**
 * Check if a screen requires a specific permission
 * Returns all permissions that grant access to this screen
 */
export function getRequiredPermissionsForScreen(
  screen: string | Screen,
): EmployeePermission[] {
  const screenName = typeof screen === 'string' ? screen : screen;
  const requiredPermissions: EmployeePermission[] = [];

  for (const [permission, screens] of Object.entries(PERMISSION_TO_SCREEN_MAP)) {
    if (screens.includes(screenName)) {
      requiredPermissions.push(permission as EmployeePermission);
    }
  }

  return requiredPermissions;
}

/**
 * Check if a screen requires a specific permission (backward compatibility)
 */
export function getRequiredPermissionForScreen(
  screen: string | Screen,
): EmployeePermission | null {
  const permissions = getRequiredPermissionsForScreen(screen);
  return permissions.length > 0 ? permissions[0] : null;
}

/**
 * Get all screens accessible with given permissions
 */
export function getAccessibleScreens(
  permissions: EmployeePermission[],
): string[] {
  const accessibleScreens = new Set<string>();

  permissions.forEach((permission) => {
    const screens = PERMISSION_TO_SCREEN_MAP[permission] || [];
    screens.forEach((screen) => accessibleScreens.add(screen));
  });

  return Array.from(accessibleScreens);
}

/**
 * Get screens for permissions (alias for getAccessibleScreens)
 */
export function getScreensForPermissions(
  permissions: EmployeePermission[],
): string[] {
  const screens = new Set<string>();

  for (const permission of permissions) {
    const permScreens = PERMISSION_TO_SCREEN_MAP[permission] || [];
    permScreens.forEach((s) => screens.add(s));
  }

  // Add public screens
  PUBLIC_EMPLOYEE_SCREENS.forEach((s) => screens.add(s));

  return Array.from(screens);
}

/**
 * Public screens that employees can always access without permissions
 * These are basic screens that all employees should have access to
 */
export const PUBLIC_EMPLOYEE_SCREENS: string[] = [
  'Home',
  'StaffDashboard',
  'WorkLog',
  'MySchedule',
  'Profile',
  'Notifications',
  'Explore',
  'Bookings', // Employees can view their own bookings
  'BookingFlow', // Public booking screen for customers and employees
  'AppointmentDetail', // Employees can view details of their assigned appointments
  'Attendance', // Clock in/out is a basic employee right
  'Commissions', // View own commissions
  'Chat',
  'Wallet',
  'MyPermissions',
  'WhatCanIDo',
  'Settings',
  'ChangePassword',
  'EditProfile',
];

/**
 * Public screens that customers can always access
 */
export const PUBLIC_CUSTOMER_SCREENS: string[] = [
  'Home',
  'Explore',
  'Bookings',
  'BookingFlow',
  'AppointmentDetail',
  'ServiceDetail',
  'SalonDetail',
  'Profile',
  'Notifications',
  'Chat',
  'Loyalty',
  'Wallet',
  'Settings',
  'Review',
  'Payment',
];

/**
 * All known screens in the app for validation
 */
export const ALL_KNOWN_SCREENS = [
  // Appointment screens
  'SalonAppointments',
  'Appointments',
  'CreateAppointment',
  'EditAppointment',
  'AppointmentDetail',
  'AppointmentCalendar',
  'BookingFlow', // Public booking screen for customers
  
  // Service screens
  'AllServices',
  'ServiceDetail',
  'AddService',
  'EditService',
  
  // Inventory screens
  'StockManagement',
  'InventoryManagement',
  'AddProduct',
  'EditProduct',
  
  // Customer screens
  'CustomerManagement',
  'CustomerDetail',
  'AddCustomer',
  'EditCustomer',
  
  // Sales screens
  'Sales',
  'SaleDetail',
  'SalesHistory',
  'BusinessAnalytics',
  
  // Staff screens
  'StaffManagement',
  'EmployeeDetail',
  'Commissions',
  'CommissionDetail',
  
  // Salon screens
  'SalonSettings',
  'SalonDetail',
  'EditSalon',
  
  // Employee screens
  'MySchedule',
  'StaffDashboard',
  'WorkLog',
  'Attendance',
  'MyPermissions',
  'WhatCanIDo',
  
  // Common screens
  'Home',
  'Profile',
  'Notifications',
  'Explore',
  'Bookings',
  'Chat',
  'Wallet',
  'Settings',
] as const;

/**
 * Check if a screen is public (doesn't require permissions)
 * Checks both customer and employee public screens
 */
export function isPublicScreen(screen: string | Screen, userRole?: UserRole | string): boolean {
  const screenName = typeof screen === 'string' ? screen : screen;
  
  // Check customer public screens first (for customers)
  if (userRole === UserRole.CUSTOMER || userRole === 'customer') {
    return PUBLIC_CUSTOMER_SCREENS.includes(screenName);
  }
  
  // Check employee public screens (for employees)
  return PUBLIC_EMPLOYEE_SCREENS.includes(screenName);
}

/**
 * Log unmapped screen access for debugging
 */
export function logUnmappedScreen(screenName: string): void {
  const requiredPerms = getRequiredPermissionsForScreen(screenName);
  const isPublic = isPublicScreen(screenName);
  const isKnown = ALL_KNOWN_SCREENS.includes(screenName as any);

  if (!isPublic && requiredPerms.length === 0 && !isKnown) {
    console.warn(
      `⚠️ UNMAPPED SCREEN: "${screenName}" - Consider adding to PERMISSION_TO_SCREEN_MAP`,
    );

    // In development, track unmapped screens
    if (__DEV__) {
      // Could send to analytics or logging service
    }
  }
}

/**
 * Check if user can access a screen based on role and permissions
 * Employees with owner-level permissions can access owner screens
 */
export function canAccessScreen(
  screen: string | Screen,
  userRole: UserRole | string | undefined,
  hasPermission: (permission: EmployeePermission) => boolean,
  isOwner: boolean,
  isAdmin: boolean,
  hasOwnerLevelPermissions?: boolean, // For employees with significant permissions
): boolean {
  // Owners and admins can access everything
  if (isOwner || isAdmin) {
    return true;
  }

  // Employees with owner-level permissions can access owner screens
  if (
    hasOwnerLevelPermissions &&
    (userRole === UserRole.SALON_EMPLOYEE || userRole === 'salon_employee')
  ) {
    // Check if this is an owner screen
    const ownerScreens = [
      Screen.OWNER_DASHBOARD,
      Screen.OPERATIONS,
      Screen.SALON_LIST,
      Screen.FINANCE,
      Screen.MORE_MENU,
      'OwnerDashboard',
      'Operations',
      'SalonList',
      'Finance',
      'MoreMenu',
    ];

    const screenName = typeof screen === 'string' ? screen : screen;
    if (ownerScreens.includes(screenName as any)) {
      return true;
    }
  }

  // Customers can access all customer screens without permission checks
  if (userRole === UserRole.CUSTOMER || userRole === 'customer') {
    // All customer screens are accessible - no employee permission checks needed
    // This includes: Home, Explore, Bookings, BookingFlow, AppointmentDetail,
    // ServiceDetail, SalonDetail, Profile, Notifications, Chat, Loyalty, Wallet, etc.
    return true;
  }

  // For employees, check permissions
  if (userRole === UserRole.SALON_EMPLOYEE || userRole === 'salon_employee') {
    const screenName = typeof screen === 'string' ? screen : screen;

    // Log unmapped screens in development
    logUnmappedScreen(screenName);

    // Public screens are always accessible
    if (isPublicScreen(screenName)) {
      return true;
    }

    const requiredPermissions = getRequiredPermissionsForScreen(screen);

    // If screen doesn't require any specific permission, allow access
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Check if employee has at least one of the required permissions
    return requiredPermissions.some((perm) => hasPermission(perm));
  }

  // Default: allow access
  return true;
}

/**
 * Get permission requirements summary for a screen
 * Useful for displaying in UI
 */
export function getScreenPermissionInfo(screenName: string): {
  isPublic: boolean;
  requiredPermissions: EmployeePermission[];
  requiresAny: boolean;
} {
  const isPublic = isPublicScreen(screenName);
  const requiredPermissions = getRequiredPermissionsForScreen(screenName);

  return {
    isPublic,
    requiredPermissions,
    requiresAny: requiredPermissions.length > 0, // Any one of these grants access
  };
}
