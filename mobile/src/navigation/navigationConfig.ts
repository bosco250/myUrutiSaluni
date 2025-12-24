import { Screen } from '../constants/permissions';

/**
 * Bottom navigation tab configuration
 */
export interface NavigationTab {
  id: string;
  label: string;
  icon: string;
  screen: Screen;
}

/**
 * Navigation configuration for each role
 * Defines which tabs appear in the bottom navigation bar
 */
export const ROLE_NAVIGATION_TABS = {
  customer: [
    { id: 'home', label: 'Home', icon: 'home', screen: Screen.HOME },
    { id: 'bookings', label: 'Bookings', icon: 'event', screen: Screen.BOOKINGS },
    { id: 'explore', label: 'Explore', icon: 'explore', screen: Screen.EXPLORE },
    { id: 'notifications', label: 'Alerts', icon: 'notifications', screen: Screen.NOTIFICATIONS },
    { id: 'profile', label: 'Profile', icon: 'person', screen: Screen.PROFILE },
  ] as NavigationTab[],
  
  salon_employee: [
    { id: 'home', label: 'Home', icon: 'home', screen: Screen.STAFF_DASHBOARD },
    { id: 'worklog', label: 'My Work', icon: 'assignment', screen: Screen.WORK_LOG },
    { id: 'chats', label: 'Chats', icon: 'chat', screen: Screen.CHAT },
    { id: 'profile', label: 'Profile', icon: 'person', screen: Screen.PROFILE },
  ] as NavigationTab[],
  
  salon_owner: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', screen: Screen.OWNER_DASHBOARD },
    { id: 'operations', label: 'Operations', icon: 'work', screen: Screen.OPERATIONS },
    { id: 'salon', label: 'Salon', icon: 'store', screen: Screen.SALON_LIST },
    { id: 'finance', label: 'Finance', icon: 'account-balance-wallet', screen: Screen.FINANCE },
    { id: 'more', label: 'More', icon: 'more-horiz', screen: Screen.MORE_MENU },
  ] as NavigationTab[],
  
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', screen: Screen.ADMIN_DASHBOARD },
    { id: 'salons', label: 'Salons', icon: 'store', screen: Screen.SALON_MANAGEMENT },
    { id: 'members', label: 'Members', icon: 'card-membership', screen: Screen.MEMBERSHIP_APPROVALS },
    { id: 'reports', label: 'Reports', icon: 'assessment', screen: Screen.SYSTEM_REPORTS },
    { id: 'profile', label: 'Profile', icon: 'person', screen: Screen.PROFILE },
  ] as NavigationTab[],
};

/**
 * Get navigation tabs for a specific role
 */
export const getNavigationTabsForRole = (role: string | undefined): NavigationTab[] => {
  if (!role) return ROLE_NAVIGATION_TABS.customer;
  
  // Map role to navigation configuration
  switch (role) {
    case 'salon_employee':
    case 'SALON_EMPLOYEE':
      return ROLE_NAVIGATION_TABS.salon_employee;
      
    case 'salon_owner':
    case 'SALON_OWNER':
      return ROLE_NAVIGATION_TABS.salon_owner;
      
    case 'super_admin':
    case 'SUPER_ADMIN':
    case 'association_admin':
    case 'ASSOCIATION_ADMIN':
    case 'district_leader':
    case 'DISTRICT_LEADER':
      return ROLE_NAVIGATION_TABS.admin;
      
    case 'customer':
    case 'CUSTOMER':
    default:
      return ROLE_NAVIGATION_TABS.customer;
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
  const tab = tabs.find(t => t.id === tabId);
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
  const tab = tabs.find(t => t.screen === screen);
  return tab?.id;
};
