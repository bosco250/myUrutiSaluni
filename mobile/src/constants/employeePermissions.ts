/**
 * Employee Permission Constants
 * 
 * These match the backend EmployeePermission enum.
 * This is the single source of truth for permission codes in the mobile app.
 */

export enum EmployeePermission {
  // Appointment Management
  MANAGE_APPOINTMENTS = 'MANAGE_APPOINTMENTS',
  ASSIGN_APPOINTMENTS = 'ASSIGN_APPOINTMENTS',
  VIEW_ALL_APPOINTMENTS = 'VIEW_ALL_APPOINTMENTS',
  MODIFY_APPOINTMENT_STATUS = 'MODIFY_APPOINTMENT_STATUS',
  
  // DEFAULT: View/manage OWN appointments (assigned to this employee)
  VIEW_OWN_APPOINTMENTS = 'VIEW_OWN_APPOINTMENTS',

  // Service & Product Management
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  UPDATE_SERVICE_PRICING = 'UPDATE_SERVICE_PRICING',
  UPDATE_PRODUCT_PRICING = 'UPDATE_PRODUCT_PRICING',

  // Customer Management
  MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',
  VIEW_CUSTOMER_HISTORY = 'VIEW_CUSTOMER_HISTORY',
  VIEW_CUSTOMER_LOYALTY = 'VIEW_CUSTOMER_LOYALTY',
  UPDATE_CUSTOMER_INFO = 'UPDATE_CUSTOMER_INFO',

  // Sales & Financial
  PROCESS_PAYMENTS = 'PROCESS_PAYMENTS',
  APPLY_DISCOUNTS = 'APPLY_DISCOUNTS',
  VIEW_SALES_REPORTS = 'VIEW_SALES_REPORTS',
  EXPORT_SALES_DATA = 'EXPORT_SALES_DATA',
  VOID_TRANSACTIONS = 'VOID_TRANSACTIONS',
  
  // DEFAULT: View OWN sales (made by this employee)
  VIEW_OWN_SALES = 'VIEW_OWN_SALES',

  // Staff Management (Limited)
  MANAGE_EMPLOYEE_SCHEDULES = 'MANAGE_EMPLOYEE_SCHEDULES',
  VIEW_EMPLOYEE_PERFORMANCE = 'VIEW_EMPLOYEE_PERFORMANCE',
  VIEW_EMPLOYEE_COMMISSIONS = 'VIEW_EMPLOYEE_COMMISSIONS',
  
  // DEFAULT: View OWN commissions
  VIEW_OWN_COMMISSIONS = 'VIEW_OWN_COMMISSIONS',

  // Inventory Management
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_INVENTORY_REPORTS = 'VIEW_INVENTORY_REPORTS',
  PROCESS_STOCK_ADJUSTMENTS = 'PROCESS_STOCK_ADJUSTMENTS',
  VIEW_LOW_STOCK_ALERTS = 'VIEW_LOW_STOCK_ALERTS',

  // Salon Operations
  VIEW_SALON_SETTINGS = 'VIEW_SALON_SETTINGS',
  UPDATE_SALON_SETTINGS = 'UPDATE_SALON_SETTINGS',
  MANAGE_BUSINESS_HOURS = 'MANAGE_BUSINESS_HOURS',
  MANAGE_SALON_PROFILE = 'MANAGE_SALON_PROFILE',
}

/**
 * DEFAULT EMPLOYEE PERMISSIONS
 * These permissions are automatically granted to ALL active employees.
 * They allow employees to view/manage their OWN data without explicit grants.
 * Additional permissions (like VIEW_ALL_APPOINTMENTS) require explicit grants.
 */
export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermission[] = [
  EmployeePermission.VIEW_OWN_APPOINTMENTS,    // View appointments assigned to them
  EmployeePermission.MODIFY_APPOINTMENT_STATUS, // Update status of their appointments
  EmployeePermission.VIEW_OWN_SALES,           // View sales they made
  EmployeePermission.VIEW_OWN_COMMISSIONS,     // View their commission earnings
];

export enum PermissionCategory {
  APPOINTMENTS = 'APPOINTMENTS',
  SERVICES = 'SERVICES',
  CUSTOMERS = 'CUSTOMERS',
  SALES = 'SALES',
  STAFF = 'STAFF',
  INVENTORY = 'INVENTORY',
  SALON = 'SALON',
}

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<EmployeePermission, string> = {
  [EmployeePermission.MANAGE_APPOINTMENTS]:
    'Create, update, and cancel any appointment in the salon',
  [EmployeePermission.ASSIGN_APPOINTMENTS]: 'Assign appointments to employees',
  [EmployeePermission.VIEW_ALL_APPOINTMENTS]:
    'View all salon appointments (not just assigned ones)',
  [EmployeePermission.MODIFY_APPOINTMENT_STATUS]:
    'Change appointment status (pending, confirmed, completed, cancelled)',
  [EmployeePermission.VIEW_OWN_APPOINTMENTS]:
    'View appointments assigned to you (default for all employees)',
  [EmployeePermission.MANAGE_SERVICES]: 'Create, update, delete salon services',
  [EmployeePermission.MANAGE_PRODUCTS]:
    'Create, update, delete products/inventory items',
  [EmployeePermission.UPDATE_SERVICE_PRICING]: 'Modify service prices',
  [EmployeePermission.UPDATE_PRODUCT_PRICING]: 'Modify product prices',
  [EmployeePermission.MANAGE_CUSTOMERS]: 'Create, update customer records',
  [EmployeePermission.VIEW_CUSTOMER_HISTORY]:
    'View full customer transaction history',
  [EmployeePermission.VIEW_CUSTOMER_LOYALTY]:
    'View customer loyalty points and rewards',
  [EmployeePermission.UPDATE_CUSTOMER_INFO]: 'Modify customer information',
  [EmployeePermission.PROCESS_PAYMENTS]: 'Process payments and refunds',
  [EmployeePermission.APPLY_DISCOUNTS]:
    'Apply discounts and promotions to sales',
  [EmployeePermission.VIEW_SALES_REPORTS]: 'View sales analytics and reports',
  [EmployeePermission.EXPORT_SALES_DATA]: 'Export sales data for reporting',
  [EmployeePermission.VOID_TRANSACTIONS]: 'Void/cancel completed transactions',
  [EmployeePermission.VIEW_OWN_SALES]:
    'View sales you made (default for all employees)',
  [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES]:
    'Create/edit employee schedules',
  [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE]:
    'View employee metrics and performance',
  [EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS]:
    'View all employee commissions (not just own)',
  [EmployeePermission.VIEW_OWN_COMMISSIONS]:
    'View your commission earnings (default for all employees)',
  [EmployeePermission.MANAGE_INVENTORY]:
    'Add/remove stock, adjust quantities',
  [EmployeePermission.VIEW_INVENTORY_REPORTS]: 'View inventory analytics',
  [EmployeePermission.PROCESS_STOCK_ADJUSTMENTS]:
    'Make inventory adjustments',
  [EmployeePermission.VIEW_LOW_STOCK_ALERTS]: 'Access inventory alerts',
  [EmployeePermission.VIEW_SALON_SETTINGS]: 'View salon settings (read-only)',
  [EmployeePermission.UPDATE_SALON_SETTINGS]:
    'Modify salon settings (with owner approval)',
  [EmployeePermission.MANAGE_BUSINESS_HOURS]:
    'Update salon operating hours',
  [EmployeePermission.MANAGE_SALON_PROFILE]:
    'Update salon profile information',
};

/**
 * Get permission category
 */
export function getPermissionCategory(
  permission: EmployeePermission,
): PermissionCategory {
  if (
    permission === EmployeePermission.MANAGE_APPOINTMENTS ||
    permission === EmployeePermission.ASSIGN_APPOINTMENTS ||
    permission === EmployeePermission.VIEW_ALL_APPOINTMENTS ||
    permission === EmployeePermission.MODIFY_APPOINTMENT_STATUS
  ) {
    return PermissionCategory.APPOINTMENTS;
  }

  if (
    permission === EmployeePermission.MANAGE_SERVICES ||
    permission === EmployeePermission.MANAGE_PRODUCTS ||
    permission === EmployeePermission.UPDATE_SERVICE_PRICING ||
    permission === EmployeePermission.UPDATE_PRODUCT_PRICING
  ) {
    return PermissionCategory.SERVICES;
  }

  if (
    permission === EmployeePermission.MANAGE_CUSTOMERS ||
    permission === EmployeePermission.VIEW_CUSTOMER_HISTORY ||
    permission === EmployeePermission.VIEW_CUSTOMER_LOYALTY ||
    permission === EmployeePermission.UPDATE_CUSTOMER_INFO
  ) {
    return PermissionCategory.CUSTOMERS;
  }

  if (
    permission === EmployeePermission.PROCESS_PAYMENTS ||
    permission === EmployeePermission.APPLY_DISCOUNTS ||
    permission === EmployeePermission.VIEW_SALES_REPORTS ||
    permission === EmployeePermission.EXPORT_SALES_DATA ||
    permission === EmployeePermission.VOID_TRANSACTIONS
  ) {
    return PermissionCategory.SALES;
  }

  if (
    permission === EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES ||
    permission === EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE ||
    permission === EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS
  ) {
    return PermissionCategory.STAFF;
  }

  if (
    permission === EmployeePermission.MANAGE_INVENTORY ||
    permission === EmployeePermission.VIEW_INVENTORY_REPORTS ||
    permission === EmployeePermission.PROCESS_STOCK_ADJUSTMENTS ||
    permission === EmployeePermission.VIEW_LOW_STOCK_ALERTS
  ) {
    return PermissionCategory.INVENTORY;
  }

  if (
    permission === EmployeePermission.VIEW_SALON_SETTINGS ||
    permission === EmployeePermission.UPDATE_SALON_SETTINGS ||
    permission === EmployeePermission.MANAGE_BUSINESS_HOURS ||
    permission === EmployeePermission.MANAGE_SALON_PROFILE
  ) {
    return PermissionCategory.SALON;
  }

  return PermissionCategory.SALON; // Default
}

/**
 * Group permissions by category
 */
export const PERMISSION_CATEGORIES: Record<
  PermissionCategory,
  EmployeePermission[]
> = {
  [PermissionCategory.APPOINTMENTS]: [
    EmployeePermission.MANAGE_APPOINTMENTS,
    EmployeePermission.ASSIGN_APPOINTMENTS,
    EmployeePermission.VIEW_ALL_APPOINTMENTS,
    EmployeePermission.MODIFY_APPOINTMENT_STATUS,
  ],
  [PermissionCategory.SERVICES]: [
    EmployeePermission.MANAGE_SERVICES,
    EmployeePermission.MANAGE_PRODUCTS,
    EmployeePermission.UPDATE_SERVICE_PRICING,
    EmployeePermission.UPDATE_PRODUCT_PRICING,
  ],
  [PermissionCategory.CUSTOMERS]: [
    EmployeePermission.MANAGE_CUSTOMERS,
    EmployeePermission.VIEW_CUSTOMER_HISTORY,
    EmployeePermission.VIEW_CUSTOMER_LOYALTY,
    EmployeePermission.UPDATE_CUSTOMER_INFO,
  ],
  [PermissionCategory.SALES]: [
    EmployeePermission.PROCESS_PAYMENTS,
    EmployeePermission.APPLY_DISCOUNTS,
    EmployeePermission.VIEW_SALES_REPORTS,
    EmployeePermission.EXPORT_SALES_DATA,
    EmployeePermission.VOID_TRANSACTIONS,
  ],
  [PermissionCategory.STAFF]: [
    EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES,
    EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE,
    EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
  ],
  [PermissionCategory.INVENTORY]: [
    EmployeePermission.MANAGE_INVENTORY,
    EmployeePermission.VIEW_INVENTORY_REPORTS,
    EmployeePermission.PROCESS_STOCK_ADJUSTMENTS,
    EmployeePermission.VIEW_LOW_STOCK_ALERTS,
  ],
  [PermissionCategory.SALON]: [
    EmployeePermission.VIEW_SALON_SETTINGS,
    EmployeePermission.UPDATE_SALON_SETTINGS,
    EmployeePermission.MANAGE_BUSINESS_HOURS,
    EmployeePermission.MANAGE_SALON_PROFILE,
  ],
};

