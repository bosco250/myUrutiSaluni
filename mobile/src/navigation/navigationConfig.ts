import { Screen } from "../constants/permissions";
import { EmployeePermission } from "../constants/employeePermissions";

/**
 * Bottom navigation tab configuration
 */
export interface NavigationTab {
  id: string;
  label: string;
  icon: string;
  screen: Screen;
  requiredPermission?: EmployeePermission; // Permission required for employees to see this tab
  requiredPermissions?: EmployeePermission[]; // Multiple permissions (any one is sufficient)
}

/**
 * Navigation configuration for each role
 * Defines which tabs appear in the bottom navigation bar
 */
export const ROLE_NAVIGATION_TABS = {
  customer: [
    { id: "home", label: "Home", icon: "home", screen: Screen.HOME },
    {
      id: "bookings",
      label: "Bookings",
      icon: "event",
      screen: Screen.BOOKINGS,
    },
    {
      id: "explore",
      label: "Explore",
      icon: "explore",
      screen: Screen.EXPLORE,
    },
    {
      id: "notifications",
      label: "Alerts",
      icon: "notifications",
      screen: Screen.NOTIFICATIONS,
    },
    { id: "profile", label: "Profile", icon: "person", screen: Screen.PROFILE },
  ] as NavigationTab[],

  salon_employee: [
    { id: "home", label: "Home", icon: "home", screen: Screen.STAFF_DASHBOARD },
    {
      id: "worklog",
      label: "My Work",
      icon: "assignment",
      screen: Screen.WORK_LOG,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: "event",
      screen: "SalonAppointments" as any, // Use actual screen name
      requiredPermissions: [
        EmployeePermission.VIEW_ALL_APPOINTMENTS,
        EmployeePermission.MANAGE_APPOINTMENTS,
      ],
    },
    {
      id: "customers",
      label: "Customers",
      icon: "people",
      screen: "CustomerManagement" as any,
      requiredPermissions: [
        EmployeePermission.MANAGE_CUSTOMERS,
        EmployeePermission.VIEW_CUSTOMER_HISTORY,
      ],
    },
    {
      id: "sales",
      label: "Sales",
      icon: "point-of-sale",
      screen: "Sales" as any,
      requiredPermissions: [
        EmployeePermission.PROCESS_PAYMENTS,
        EmployeePermission.VIEW_SALES_REPORTS,
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: "inventory-2",
      screen: "StockManagement" as any,
      requiredPermissions: [
        EmployeePermission.MANAGE_INVENTORY,
        EmployeePermission.VIEW_INVENTORY_REPORTS,
      ],
    },
    {
      id: "explore",
      label: "Explore",
      icon: "explore",
      screen: Screen.EXPLORE,
    },
    { id: "chat", label: "Chat", icon: "chat", screen: Screen.CHAT }, // Chat is always visible for employees
    { id: "profile", label: "Profile", icon: "person", screen: Screen.PROFILE },
    { id: "more", label: "More", icon: "more-horiz", screen: Screen.MORE_MENU }, // More menu for employees with permissions
  ] as NavigationTab[],

  salon_owner: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      screen: Screen.OWNER_DASHBOARD,
      // Dashboard requires any significant permission - no specific requirement for owners
      // For employees, requires at least one management permission
      requiredPermissions: [
        EmployeePermission.MANAGE_SALON_PROFILE,
        EmployeePermission.MANAGE_APPOINTMENTS,
        EmployeePermission.MANAGE_SERVICES,
        EmployeePermission.MANAGE_PRODUCTS,
        EmployeePermission.VIEW_SALES_REPORTS,
        EmployeePermission.VIEW_ALL_APPOINTMENTS,
      ],
    },
    {
      id: "operations",
      label: "Operations",
      icon: "work",
      screen: Screen.OPERATIONS,
      requiredPermissions: [
        EmployeePermission.MANAGE_APPOINTMENTS,
        EmployeePermission.VIEW_ALL_APPOINTMENTS,
        EmployeePermission.MANAGE_SERVICES,
        EmployeePermission.MANAGE_PRODUCTS,
        EmployeePermission.ASSIGN_APPOINTMENTS,
      ],
    },
    {
      id: "salon",
      label: "Salon",
      icon: "store",
      screen: Screen.SALON_LIST,
      requiredPermissions: [
        EmployeePermission.MANAGE_SALON_PROFILE,
        EmployeePermission.MANAGE_BUSINESS_HOURS,
        EmployeePermission.VIEW_SALON_SETTINGS,
        EmployeePermission.UPDATE_SALON_SETTINGS,
      ],
    },
    {
      id: "finance",
      label: "Finance",
      icon: "account-balance-wallet",
      screen: Screen.FINANCE,
      requiredPermissions: [
        EmployeePermission.PROCESS_PAYMENTS,
        EmployeePermission.VIEW_SALES_REPORTS,
        EmployeePermission.MANAGE_INVENTORY,
      ],
    },
    {
      id: "more",
      label: "More",
      icon: "more-horiz",
      screen: Screen.MORE_MENU,
      // More menu accessible with any permission
      requiredPermissions: [
        EmployeePermission.MANAGE_SALON_PROFILE,
        EmployeePermission.MANAGE_APPOINTMENTS,
        EmployeePermission.MANAGE_SERVICES,
        EmployeePermission.MANAGE_PRODUCTS,
        EmployeePermission.VIEW_SALON_SETTINGS,
        EmployeePermission.VIEW_ALL_APPOINTMENTS,
      ],
    },
  ] as NavigationTab[],

  admin: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      screen: Screen.ADMIN_DASHBOARD,
    },
    {
      id: "salons",
      label: "Salons",
      icon: "store",
      screen: Screen.SALON_MANAGEMENT,
    },
    {
      id: "members",
      label: "Members",
      icon: "card-membership",
      screen: Screen.MEMBERSHIP_APPROVALS,
    },
    {
      id: "reports",
      label: "Reports",
      icon: "assessment",
      screen: Screen.SYSTEM_REPORTS,
    },
    { id: "profile", label: "Profile", icon: "person", screen: Screen.PROFILE },
  ] as NavigationTab[],
};

/**
 * Helper function to check if a tab should be shown based on permissions
 */
const shouldShowTab = (
  tab: NavigationTab,
  hasPermission?: (permission: EmployeePermission) => boolean,
  isOwner?: boolean,
  isAdmin?: boolean
): boolean => {
  // Owners and admins see all tabs
  if (isOwner || isAdmin) {
    return true;
  }

  // If tab has no permission requirement, show it
  if (!tab.requiredPermission && !tab.requiredPermissions) {
    return true;
  }

  // If no permission checker provided, don't show permission-required tabs
  if (!hasPermission) {
    return false;
  }

  // Check single required permission
  if (tab.requiredPermission) {
    return hasPermission(tab.requiredPermission);
  }

  // Check multiple permissions (any one is sufficient)
  if (tab.requiredPermissions && tab.requiredPermissions.length > 0) {
    return tab.requiredPermissions.some((perm) => hasPermission(perm));
  }

  return false;
};

/**
 * Get navigation tabs for a specific role, filtered by permissions
 * Employees see their default tabs PLUS owner tabs they have permission for
 * When viewing salon screens, employees with permissions see owner navigation
 */
export const getNavigationTabsForRole = (
  role: string | undefined,
  hasPermission?: (permission: EmployeePermission) => boolean,
  isOwner?: boolean,
  isAdmin?: boolean,
  hasOwnerLevelPermissions?: boolean, // Not used anymore - kept for backward compatibility
  currentScreen?: string // New parameter to detect salon view mode
): NavigationTab[] => {
  if (!role) return ROLE_NAVIGATION_TABS.customer;

  // Map role to navigation configuration
  let tabs: NavigationTab[] = [];

  // Salon-related screens that should trigger owner navigation for employees
  const salonManagementScreens = [
    "OwnerSalonDetail",
    "SalonList",
    "Operations",
    "Finance",
    "OwnerDashboard",
    "SalonAppointments",
    "CustomerManagement",
    "StaffManagement",
    "StockManagement",
    "Sales",
    "BusinessAnalytics",
    "SalonSettings",
  ];

  // Check if we're in salon management mode (for employees with permissions)
  const isInSalonMode =
    currentScreen && salonManagementScreens.includes(currentScreen);

  switch (role) {
    case "salon_employee":
    case "SALON_EMPLOYEE":
      // If employee is viewing salon screens and has owner-level permissions, show ALL owner tabs
      // The tabs will be visible, but screen-level permission checks will limit functionality
      if (isInSalonMode && hasOwnerLevelPermissions) {
        // Show ALL owner navigation tabs (don't filter by permissions for visibility)
        // Permission checks will happen at the screen level to limit functionality
        // This gives employees the full owner navigation experience
        return ROLE_NAVIGATION_TABS.salon_owner;
      }

      // Default employee tabs logic
      // Filter employee tabs based on permissions
      tabs = ROLE_NAVIGATION_TABS.salon_employee.filter((tab) =>
        shouldShowTab(tab, hasPermission, isOwner, isAdmin)
      );

      // Separate tabs into categories
      const essentialTabs = tabs.filter(
        (t) => t.id === "home" || t.id === "worklog"
      );
      const permissionBasedTabs = tabs.filter(
        (t) =>
          t.id !== "home" &&
          t.id !== "worklog" &&
          t.id !== "explore" &&
          t.id !== "chat" &&
          t.id !== "profile" &&
          t.id !== "more"
      );
      const exploreTabs = tabs.filter((t) => t.id === "explore");
      const chatTab = tabs.find((t) => t.id === "chat");
      const profileTab = tabs.find((t) => t.id === "profile");
      const moreTab = tabs.find((t) => t.id === "more");

      // Decide whether to show Profile or More in bottom nav
      // If employee has ANY permissions, show More (which will contain all permitted features + profile)
      // If employee has NO permissions, show Profile directly
      const hasAnyPermissions = permissionBasedTabs.length > 0;

      // Build final tabs: Home, My Work, Explore, Chat, More/Profile
      // This gives employees a clean 5-tab navigation (max 5 tabs)
      let finalTabs: NavigationTab[];
      if (hasAnyPermissions && moreTab) {
        // Employee has permissions and more tab exists -> show More
        // Include: Home, My Work, Explore, Chat, More
        finalTabs = [
          ...essentialTabs,
          ...exploreTabs,
          ...(chatTab ? [chatTab] : []),
          moreTab,
        ];
      } else if (profileTab) {
        // Employee has no permissions or more tab doesn't exist -> show Profile
        // Include: Home, My Work, Explore, Chat, Profile
        finalTabs = [
          ...essentialTabs,
          ...exploreTabs,
          ...(chatTab ? [chatTab] : []),
          profileTab,
        ];
      } else {
        // Fallback: just essential + explore + chat
        finalTabs = [
          ...essentialTabs,
          ...exploreTabs,
          ...(chatTab ? [chatTab] : []),
        ];
      }

      // Limit to 5 tabs maximum
      return finalTabs.slice(0, 5);

    case "salon_owner":
    case "SALON_OWNER":
      // Owners see all owner tabs
      return ROLE_NAVIGATION_TABS.salon_owner;

    case "super_admin":
    case "SUPER_ADMIN":
    case "association_admin":
    case "ASSOCIATION_ADMIN":
    case "district_leader":
    case "DISTRICT_LEADER":
      return ROLE_NAVIGATION_TABS.admin; // Admins see all tabs

    case "customer":
    case "CUSTOMER":
    default:
      return ROLE_NAVIGATION_TABS.customer; // Customers see all tabs
  }
};

/**
 * Map old tab IDs to new screen-based navigation
 * This helps with backward compatibility
 */
export const mapTabToScreen = (
  tabId: string,
  role: string | undefined
): Screen => {
  const tabs = getNavigationTabsForRole(role);
  const tab = tabs.find((t) => t.id === tabId);
  return tab?.screen ?? Screen.HOME;
};

/**
 * Map screen to tab ID for the given role
 */
export const mapScreenToTab = (
  screen: Screen,
  role: string | undefined
): string | undefined => {
  const tabs = getNavigationTabsForRole(role);
  const tab = tabs.find((t) => t.screen === screen);
  return tab?.id;
};
