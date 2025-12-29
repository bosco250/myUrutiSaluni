import { UserRole } from './roles';

/**
 * Centralized permissions configuration for role-based access control
 * 
 * This is the SINGLE SOURCE OF TRUTH for what each role can see and do.
 * All permission checks throughout the app should reference this configuration.
 */

// Screen access permissions
export enum Screen {
  HOME = 'HOME',
  EXPLORE = 'EXPLORE',
  BOOKINGS = 'BOOKINGS',
  PROFILE = 'PROFILE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  
  // Customer screens
  SEARCH = 'SEARCH',
  AI_FACE_SCAN = 'AI_FACE_SCAN',
  AI_CONSULTANT = 'AI_CONSULTANT',
  LOYALTY = 'LOYALTY',
  WALLET = 'WALLET',
  OFFERS = 'OFFERS',
  CHAT = 'CHAT',
  MEMBERSHIP_INFO = 'MEMBERSHIP_INFO',
  MEMBERSHIP_APPLICATION = 'MEMBERSHIP_APPLICATION',
  
  // Salon staff screens
  STAFF_DASHBOARD = 'STAFF_DASHBOARD',
  WORK_LOG = 'WORK_LOG',
  TASKS = 'TASKS',
  MY_SCHEDULE = 'MY_SCHEDULE',
  ATTENDANCE = 'ATTENDANCE',
  CUSTOMER_MANAGEMENT = 'CUSTOMER_MANAGEMENT',
  COMMISSIONS = 'COMMISSIONS',
  
  // Salon owner screens
  OWNER_DASHBOARD = 'OWNER_DASHBOARD',
  CREATE_SALON = 'CREATE_SALON',
  OPERATIONS = 'OPERATIONS',
  STAFF_MANAGEMENT = 'STAFF_MANAGEMENT',
  FINANCE = 'FINANCE',
  MORE_MENU = 'MORE_MENU',
  SALON_SETTINGS = 'SALON_SETTINGS',
  BUSINESS_ANALYTICS = 'BUSINESS_ANALYTICS',
  INVENTORY_MANAGEMENT = 'INVENTORY_MANAGEMENT',
  SALON_LIST = 'SALON_LIST',
  SALON_DETAIL = 'SALON_DETAIL',
  OWNER_SALON_DETAIL = 'OWNER_SALON_DETAIL',
  OWNER_EMPLOYEE_DETAIL = 'OWNER_EMPLOYEE_DETAIL',
  SALON_APPOINTMENTS = 'SALON_APPOINTMENTS',
  ADD_EMPLOYEE = 'ADD_EMPLOYEE',
  ADD_SERVICE = 'ADD_SERVICE',
  ADD_PRODUCT = 'ADD_PRODUCT',
  EDIT_SALON = 'EDIT_SALON',
  
  // Admin screens
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  SALON_MANAGEMENT = 'SALON_MANAGEMENT',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  SYSTEM_REPORTS = 'SYSTEM_REPORTS',
  MEMBERSHIP_APPROVALS = 'MEMBERSHIP_APPROVALS',
}

// Action permissions
export enum Action {
  // Booking actions
  CREATE_BOOKING = 'CREATE_BOOKING',
  VIEW_OWN_BOOKINGS = 'VIEW_OWN_BOOKINGS',
  VIEW_SALON_BOOKINGS = 'VIEW_SALON_BOOKINGS',
  VIEW_ALL_BOOKINGS = 'VIEW_ALL_BOOKINGS',
  CANCEL_BOOKING = 'CANCEL_BOOKING',
  MODIFY_BOOKING = 'MODIFY_BOOKING',
  
  // Staff actions
  CLOCK_IN_OUT = 'CLOCK_IN_OUT',
  VIEW_OWN_SCHEDULE = 'VIEW_OWN_SCHEDULE',
  MARK_APPOINTMENT_COMPLETE = 'MARK_APPOINTMENT_COMPLETE',
  VIEW_CUSTOMER_DETAILS = 'VIEW_CUSTOMER_DETAILS',
  
  // Owner actions
  MANAGE_STAFF = 'MANAGE_STAFF',
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  MANAGE_SALON_SETTINGS = 'MANAGE_SALON_SETTINGS',
  VIEW_BUSINESS_METRICS = 'VIEW_BUSINESS_METRICS',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  ASSIGN_APPOINTMENTS = 'ASSIGN_APPOINTMENTS',
  CREATE_SALON = 'CREATE_SALON',
  UPDATE_SALON = 'UPDATE_SALON',
  DELETE_SALON = 'DELETE_SALON',
  
  // Admin actions
  APPROVE_SALONS = 'APPROVE_SALONS',
  SUSPEND_USERS = 'SUSPEND_USERS',
  VIEW_ALL_DATA = 'VIEW_ALL_DATA',
  MANAGE_MEMBERSHIPS = 'MANAGE_MEMBERSHIPS',
  SYSTEM_CONFIGURATION = 'SYSTEM_CONFIGURATION',
  
  // Common actions
  VIEW_PROFILE = 'VIEW_PROFILE',
  EDIT_OWN_PROFILE = 'EDIT_OWN_PROFILE',
  SEND_MESSAGES = 'SEND_MESSAGES',
  VIEW_NOTIFICATIONS = 'VIEW_NOTIFICATIONS',
  ADD_NOTES = 'ADD_NOTES',
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
}

// Feature visibility (UI elements)
export enum Feature {
  // Home screen features
  QUICK_ACTIONS_CUSTOMER = 'QUICK_ACTIONS_CUSTOMER',
  QUICK_ACTIONS_STAFF = 'QUICK_ACTIONS_STAFF',
  QUICK_ACTIONS_OWNER = 'QUICK_ACTIONS_OWNER',
  UPCOMING_APPOINTMENTS = 'UPCOMING_APPOINTMENTS',
  TOP_SALONS = 'TOP_SALONS',
  BUSINESS_METRICS = 'BUSINESS_METRICS',
  STAFF_PERFORMANCE = 'STAFF_PERFORMANCE',
  
  // Profile features
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  MEMBERSHIP_STATUS = 'MEMBERSHIP_STATUS',
  EARNINGS_SUMMARY = 'EARNINGS_SUMMARY',
  ATTENDANCE_HISTORY = 'ATTENDANCE_HISTORY',
  BUSINESS_SETTINGS = 'BUSINESS_SETTINGS',
  
  // Booking features
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  VIEW_CUSTOMER_INFO = 'VIEW_CUSTOMER_INFO',
  REASSIGN_APPOINTMENT = 'REASSIGN_APPOINTMENT',
  ADD_NOTES = 'ADD_NOTES',
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
}

/**
 * Role-based permissions mapping
 * Defines what screens, actions, and features each role has access to
 */
export const ROLE_PERMISSIONS = {
  [UserRole.CUSTOMER]: {
    screens: [
      Screen.HOME,
      Screen.EXPLORE,
      Screen.BOOKINGS,
      Screen.PROFILE,
      Screen.NOTIFICATIONS,
      Screen.SEARCH,
      Screen.AI_FACE_SCAN,
      Screen.AI_CONSULTANT,
      Screen.LOYALTY,
      Screen.WALLET,
      Screen.OFFERS,
      Screen.CHAT,
      Screen.MEMBERSHIP_INFO,
      Screen.MEMBERSHIP_APPLICATION,
    ],
    actions: [
      Action.CREATE_BOOKING,
      Action.VIEW_OWN_BOOKINGS,
      Action.CANCEL_BOOKING,
      Action.VIEW_PROFILE,
      Action.EDIT_OWN_PROFILE,
      Action.SEND_MESSAGES,
      Action.VIEW_NOTIFICATIONS,
    ],
    features: [
      Feature.QUICK_ACTIONS_CUSTOMER,
      Feature.UPCOMING_APPOINTMENTS,
      Feature.TOP_SALONS,
      Feature.LOYALTY_POINTS,
      Feature.MEMBERSHIP_STATUS,
      Feature.BOOK_APPOINTMENT,
    ],
  },
  
  [UserRole.SALON_EMPLOYEE]: {
    screens: [
      Screen.HOME,
      Screen.STAFF_DASHBOARD,
      Screen.MY_SCHEDULE,
      Screen.ATTENDANCE,
      Screen.BOOKINGS,
      Screen.PROFILE,
      Screen.NOTIFICATIONS,
      Screen.CHAT,
      Screen.CUSTOMER_MANAGEMENT,
      Screen.COMMISSIONS,
      Screen.EXPLORE,
    ],
    actions: [
      Action.CLOCK_IN_OUT,
      Action.VIEW_OWN_SCHEDULE,
      Action.VIEW_OWN_BOOKINGS,
      Action.MARK_APPOINTMENT_COMPLETE,
      Action.VIEW_CUSTOMER_DETAILS,
      Action.VIEW_PROFILE,
      Action.EDIT_OWN_PROFILE,
      Action.SEND_MESSAGES,
      Action.VIEW_NOTIFICATIONS,
      Action.ADD_NOTES,
    ],
    features: [
      Feature.QUICK_ACTIONS_STAFF,
      Feature.UPCOMING_APPOINTMENTS,
      Feature.EARNINGS_SUMMARY,
      Feature.ATTENDANCE_HISTORY,
      Feature.VIEW_CUSTOMER_INFO,
      Feature.ADD_NOTES,
    ],
  },
  
  [UserRole.SALON_OWNER]: {
    screens: [
      Screen.OWNER_DASHBOARD,
      Screen.OPERATIONS,
      Screen.STAFF_MANAGEMENT,
      Screen.FINANCE,
      Screen.MORE_MENU,
      Screen.SALON_SETTINGS,
      Screen.BUSINESS_ANALYTICS,
      Screen.INVENTORY_MANAGEMENT,
      Screen.SALON_LIST,
      Screen.SALON_DETAIL,
      Screen.OWNER_EMPLOYEE_DETAIL,
      Screen.ADD_EMPLOYEE,
      Screen.ADD_SERVICE,
      Screen.BOOKINGS,
      Screen.PROFILE,
      Screen.NOTIFICATIONS,
      Screen.CHAT,
      Screen.MY_SCHEDULE,
      Screen.CUSTOMER_MANAGEMENT,
      Screen.EXPLORE,
    ],
    actions: [
      Action.MANAGE_STAFF,
      Action.MANAGE_SERVICES,
      Action.MANAGE_SALON_SETTINGS,
      Action.VIEW_BUSINESS_METRICS,
      Action.MANAGE_INVENTORY,
      Action.ASSIGN_APPOINTMENTS,
      Action.CREATE_SALON,
      Action.UPDATE_SALON,
      Action.DELETE_SALON,
      Action.VIEW_SALON_BOOKINGS,
      Action.MODIFY_BOOKING,
      Action.CANCEL_BOOKING,
      Action.VIEW_CUSTOMER_DETAILS,
      Action.CLOCK_IN_OUT,
      Action.VIEW_OWN_SCHEDULE,
      Action.MARK_APPOINTMENT_COMPLETE,
      Action.VIEW_PROFILE,
      Action.EDIT_OWN_PROFILE,
      Action.SEND_MESSAGES,
      Action.VIEW_NOTIFICATIONS,
      Action.ADD_NOTES,
      Action.PROCESS_PAYMENT,
    ],
    features: [
      Feature.QUICK_ACTIONS_OWNER,
      Feature.BUSINESS_METRICS,
      Feature.STAFF_PERFORMANCE,
      Feature.UPCOMING_APPOINTMENTS,
      Feature.BUSINESS_SETTINGS,
      Feature.VIEW_CUSTOMER_INFO,
      Feature.REASSIGN_APPOINTMENT,
      Feature.ADD_NOTES,
      Feature.PROCESS_PAYMENT,
      Feature.EARNINGS_SUMMARY,
    ],
  },
  
  [UserRole.DISTRICT_LEADER]: {
    screens: [
      Screen.HOME,
      Screen.ADMIN_DASHBOARD,
      Screen.SALON_MANAGEMENT,
      Screen.MEMBERSHIP_APPROVALS,
      Screen.SYSTEM_REPORTS,
      Screen.PROFILE,
      Screen.NOTIFICATIONS,
    ],
    actions: [
      Action.APPROVE_SALONS,
      Action.VIEW_ALL_BOOKINGS,
      Action.VIEW_ALL_DATA,
      Action.MANAGE_MEMBERSHIPS,
      Action.VIEW_PROFILE,
      Action.EDIT_OWN_PROFILE,
      Action.VIEW_NOTIFICATIONS,
    ],
    features: [
      Feature.BUSINESS_METRICS,
    ],
  },
  
  [UserRole.ASSOCIATION_ADMIN]: {
    screens: [
      Screen.HOME,
      Screen.ADMIN_DASHBOARD,
      Screen.SALON_MANAGEMENT,
      Screen.USER_MANAGEMENT,
      Screen.MEMBERSHIP_APPROVALS,
      Screen.SYSTEM_REPORTS,
      Screen.PROFILE,
      Screen.NOTIFICATIONS,
    ],
    actions: [
      Action.APPROVE_SALONS,
      Action.SUSPEND_USERS,
      Action.VIEW_ALL_BOOKINGS,
      Action.VIEW_ALL_DATA,
      Action.MANAGE_MEMBERSHIPS,
      Action.SYSTEM_CONFIGURATION,
      Action.VIEW_PROFILE,
      Action.EDIT_OWN_PROFILE,
      Action.VIEW_NOTIFICATIONS,
    ],
    features: [
      Feature.BUSINESS_METRICS,
    ],
  },
  
  [UserRole.SUPER_ADMIN]: {
    screens: Object.values(Screen), // Access to all screens
    actions: Object.values(Action), // Can perform all actions
    features: Object.values(Feature), // See all features
  },
};

/**
 * Check if a role has access to a specific screen
 */
export const canAccessScreen = (role: UserRole | string | undefined, screen: Screen): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.screens?.includes(screen) ?? false;
};

/**
 * Check if a role can perform a specific action
 */
export const canPerformAction = (role: UserRole | string | undefined, action: Action): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.actions?.includes(action) ?? false;
};

/**
 * Check if a role can see a specific feature
 */
export const canSeeFeature = (role: UserRole | string | undefined, feature: Feature): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.features?.includes(feature) ?? false;
};

/**
 * Get all screens accessible by a role
 */
export const getAccessibleScreens = (role: UserRole | string | undefined): Screen[] => {
  if (!role) return [];
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.screens ?? [];
};

/**
 * Get all actions a role can perform
 */
export const getAllowedActions = (role: UserRole | string | undefined): Action[] => {
  if (!role) return [];
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.actions ?? [];
};

/**
 * Get all features a role can see
 */
export const getVisibleFeatures = (role: UserRole | string | undefined): Feature[] => {
  if (!role) return [];
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.features ?? [];
};

/**
 * Get the default home screen for a role
 */
export const getDefaultHomeScreen = (role: UserRole | string | undefined): Screen => {
  if (!role) return Screen.HOME;
  
  // Normalize role to lowercase for comparison
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case UserRole.SALON_EMPLOYEE:
    case 'salon_employee':
      return Screen.STAFF_DASHBOARD;
    case UserRole.SALON_OWNER:
    case 'salon_owner':
      return Screen.OWNER_DASHBOARD;
    case UserRole.DISTRICT_LEADER:
    case 'district_leader':
    case UserRole.ASSOCIATION_ADMIN:
    case 'association_admin':
    case UserRole.SUPER_ADMIN:
    case 'super_admin':
      return Screen.ADMIN_DASHBOARD;
    case UserRole.CUSTOMER:
    case 'customer':
    default:
      return Screen.HOME;
  }
};
