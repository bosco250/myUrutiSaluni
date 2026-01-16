/**
 * Employee Permission Constants for Web
 *
 * These match the backend EmployeePermission enum exactly.
 */

export enum EmployeePermission {
  // Appointment Management
  MANAGE_APPOINTMENTS = 'MANAGE_APPOINTMENTS',
  ASSIGN_APPOINTMENTS = 'ASSIGN_APPOINTMENTS',
  VIEW_ALL_APPOINTMENTS = 'VIEW_ALL_APPOINTMENTS',
  MODIFY_APPOINTMENT_STATUS = 'MODIFY_APPOINTMENT_STATUS',

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

  // Staff Management (Limited)
  MANAGE_EMPLOYEE_SCHEDULES = 'MANAGE_EMPLOYEE_SCHEDULES',
  VIEW_EMPLOYEE_PERFORMANCE = 'VIEW_EMPLOYEE_PERFORMANCE',
  VIEW_EMPLOYEE_COMMISSIONS = 'VIEW_EMPLOYEE_COMMISSIONS',

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

  // Expense Management
  MANAGE_EXPENSES = 'MANAGE_EXPENSES',
  CREATE_EXPENSES = 'CREATE_EXPENSES',
  VIEW_EXPENSE_REPORTS = 'VIEW_EXPENSE_REPORTS',
  APPROVE_EXPENSES = 'APPROVE_EXPENSES',
}

export enum PermissionCategory {
  APPOINTMENTS = 'APPOINTMENTS',
  SERVICES = 'SERVICES',
  CUSTOMERS = 'CUSTOMERS',
  SALES = 'SALES',
  STAFF = 'STAFF',
  INVENTORY = 'INVENTORY',
  EXPENSES = 'EXPENSES',
  SALON = 'SALON',
}

/**
 * Human-readable category labels
 */
export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  [PermissionCategory.APPOINTMENTS]: 'Appointments',
  [PermissionCategory.SERVICES]: 'Services & Products',
  [PermissionCategory.CUSTOMERS]: 'Customers',
  [PermissionCategory.SALES]: 'Sales & Financial',
  [PermissionCategory.STAFF]: 'Staff Management',
  [PermissionCategory.INVENTORY]: 'Inventory',
  [PermissionCategory.EXPENSES]: 'Expenses',
  [PermissionCategory.SALON]: 'Salon Settings',
};

/**
 * Category icons (Lucide icon names)
 */
export const CATEGORY_ICONS: Record<PermissionCategory, string> = {
  [PermissionCategory.APPOINTMENTS]: 'Calendar',
  [PermissionCategory.SERVICES]: 'Scissors',
  [PermissionCategory.CUSTOMERS]: 'Users',
  [PermissionCategory.SALES]: 'DollarSign',
  [PermissionCategory.STAFF]: 'UserCog',
  [PermissionCategory.INVENTORY]: 'Package',
  [PermissionCategory.EXPENSES]: 'Receipt',
  [PermissionCategory.SALON]: 'Settings',
};

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<EmployeePermission, string> = {
  [EmployeePermission.MANAGE_APPOINTMENTS]:
    'Create, update, and cancel any appointment',
  [EmployeePermission.ASSIGN_APPOINTMENTS]: 'Assign appointments to employees',
  [EmployeePermission.VIEW_ALL_APPOINTMENTS]:
    'View all salon appointments',
  [EmployeePermission.MODIFY_APPOINTMENT_STATUS]:
    'Change appointment status',
  [EmployeePermission.MANAGE_SERVICES]: 'Create, update, delete services',
  [EmployeePermission.MANAGE_PRODUCTS]: 'Create, update, delete products',
  [EmployeePermission.UPDATE_SERVICE_PRICING]: 'Modify service prices',
  [EmployeePermission.UPDATE_PRODUCT_PRICING]: 'Modify product prices',
  [EmployeePermission.MANAGE_CUSTOMERS]: 'Create, update customer records',
  [EmployeePermission.VIEW_CUSTOMER_HISTORY]: 'View customer transaction history',
  [EmployeePermission.VIEW_CUSTOMER_LOYALTY]: 'View customer loyalty points',
  [EmployeePermission.UPDATE_CUSTOMER_INFO]: 'Modify customer information',
  [EmployeePermission.PROCESS_PAYMENTS]: 'Process payments and refunds',
  [EmployeePermission.APPLY_DISCOUNTS]: 'Apply discounts and promotions',
  [EmployeePermission.VIEW_SALES_REPORTS]: 'View sales analytics',
  [EmployeePermission.EXPORT_SALES_DATA]: 'Export sales data',
  [EmployeePermission.VOID_TRANSACTIONS]: 'Void/cancel transactions',
  [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES]: 'Create/edit employee schedules',
  [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE]: 'View employee performance',
  [EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS]: 'View all employee commissions',
  [EmployeePermission.MANAGE_INVENTORY]: 'Add/remove stock, adjust quantities',
  [EmployeePermission.VIEW_INVENTORY_REPORTS]: 'View inventory analytics',
  [EmployeePermission.PROCESS_STOCK_ADJUSTMENTS]: 'Make inventory adjustments',
  [EmployeePermission.VIEW_LOW_STOCK_ALERTS]: 'Access inventory alerts',
  [EmployeePermission.VIEW_SALON_SETTINGS]: 'View salon settings (read-only)',
  [EmployeePermission.UPDATE_SALON_SETTINGS]: 'Modify salon settings',
  [EmployeePermission.MANAGE_BUSINESS_HOURS]: 'Update salon operating hours',
  [EmployeePermission.MANAGE_SALON_PROFILE]: 'Update salon profile information',
  [EmployeePermission.MANAGE_EXPENSES]: 'Full access to create, update, and delete expenses',
  [EmployeePermission.CREATE_EXPENSES]: 'Create new expense records',
  [EmployeePermission.VIEW_EXPENSE_REPORTS]: 'View expense reports and analytics',
  [EmployeePermission.APPROVE_EXPENSES]: 'Approve or reject expense submissions',
};

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
  [PermissionCategory.EXPENSES]: [
    EmployeePermission.MANAGE_EXPENSES,
    EmployeePermission.CREATE_EXPENSES,
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.APPROVE_EXPENSES,
  ],
};

/**
 * Get all permissions as array
 */
export const ALL_PERMISSIONS = Object.values(EmployeePermission);

/**
 * Get all categories as array
 */
export const ALL_CATEGORIES = Object.values(PermissionCategory);
