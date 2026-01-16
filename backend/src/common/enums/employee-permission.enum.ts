/**
 * Employee Permission Enum
 *
 * Defines all granular permissions that can be granted to salon employees.
 * These permissions allow employees to perform owner-level tasks without
 * having full owner access.
 */
export enum EmployeePermission {
  // ============================================
  // Appointment Management
  // ============================================
  /** Create, update, and cancel any appointment in the salon */
  MANAGE_APPOINTMENTS = 'MANAGE_APPOINTMENTS',

  /** Assign appointments to employees */
  ASSIGN_APPOINTMENTS = 'ASSIGN_APPOINTMENTS',

  /** View all salon appointments (not just assigned ones) */
  VIEW_ALL_APPOINTMENTS = 'VIEW_ALL_APPOINTMENTS',

  /** Change appointment status (pending, confirmed, completed, cancelled) */
  MODIFY_APPOINTMENT_STATUS = 'MODIFY_APPOINTMENT_STATUS',

  // ============================================
  // Service & Product Management
  // ============================================
  /** Create, update, delete salon services */
  MANAGE_SERVICES = 'MANAGE_SERVICES',

  /** Create, update, delete products/inventory items */
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',

  /** Modify service prices */
  UPDATE_SERVICE_PRICING = 'UPDATE_SERVICE_PRICING',

  /** Modify product prices */
  UPDATE_PRODUCT_PRICING = 'UPDATE_PRODUCT_PRICING',

  // ============================================
  // Customer Management
  // ============================================
  /** Create, update customer records */
  MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',

  /** View full customer transaction history */
  VIEW_CUSTOMER_HISTORY = 'VIEW_CUSTOMER_HISTORY',

  /** View customer loyalty points and rewards */
  VIEW_CUSTOMER_LOYALTY = 'VIEW_CUSTOMER_LOYALTY',

  /** Modify customer information */
  UPDATE_CUSTOMER_INFO = 'UPDATE_CUSTOMER_INFO',

  // ============================================
  // Sales & Financial Operations
  // ============================================
  /** Process payments and refunds */
  PROCESS_PAYMENTS = 'PROCESS_PAYMENTS',

  /** Apply discounts and promotions to sales */
  APPLY_DISCOUNTS = 'APPLY_DISCOUNTS',

  /** View sales analytics and reports */
  VIEW_SALES_REPORTS = 'VIEW_SALES_REPORTS',

  /** Export sales data for reporting */
  EXPORT_SALES_DATA = 'EXPORT_SALES_DATA',

  /** Void/cancel completed transactions */
  VOID_TRANSACTIONS = 'VOID_TRANSACTIONS',

  // ============================================
  // Staff Management (Limited)
  // ============================================
  /** Create/edit employee schedules */
  MANAGE_EMPLOYEE_SCHEDULES = 'MANAGE_EMPLOYEE_SCHEDULES',

  /** View employee metrics and performance */
  VIEW_EMPLOYEE_PERFORMANCE = 'VIEW_EMPLOYEE_PERFORMANCE',

  /** View all employee commissions (not just own) */
  VIEW_EMPLOYEE_COMMISSIONS = 'VIEW_EMPLOYEE_COMMISSIONS',

  // ============================================
  // Inventory Management
  // ============================================
  /** Add/remove stock, adjust quantities */
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',

  /** View inventory analytics */
  VIEW_INVENTORY_REPORTS = 'VIEW_INVENTORY_REPORTS',

  /** Make inventory adjustments */
  PROCESS_STOCK_ADJUSTMENTS = 'PROCESS_STOCK_ADJUSTMENTS',

  /** Access inventory alerts */
  VIEW_LOW_STOCK_ALERTS = 'VIEW_LOW_STOCK_ALERTS',

  // ============================================
  // Salon Operations
  // ============================================
  /** View salon settings (read-only) */
  VIEW_SALON_SETTINGS = 'VIEW_SALON_SETTINGS',

  /** Modify salon settings (with owner approval) */
  UPDATE_SALON_SETTINGS = 'UPDATE_SALON_SETTINGS',

  /** Update salon operating hours */
  MANAGE_BUSINESS_HOURS = 'MANAGE_BUSINESS_HOURS',

  /** Update salon profile information */
  MANAGE_SALON_PROFILE = 'MANAGE_SALON_PROFILE',

  // ============================================
  // Expense Management
  // ============================================
  /** Full access to create, update, delete expenses */
  MANAGE_EXPENSES = 'MANAGE_EXPENSES',

  /** Create new expense records */
  CREATE_EXPENSES = 'CREATE_EXPENSES',

  /** View expense reports and analytics */
  VIEW_EXPENSE_REPORTS = 'VIEW_EXPENSE_REPORTS',

  /** Approve or reject expense submissions */
  APPROVE_EXPENSES = 'APPROVE_EXPENSES',
}

/**
 * Permission categories for grouping in UI
 */
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

  if (
    permission === EmployeePermission.MANAGE_EXPENSES ||
    permission === EmployeePermission.CREATE_EXPENSES ||
    permission === EmployeePermission.VIEW_EXPENSE_REPORTS ||
    permission === EmployeePermission.APPROVE_EXPENSES
  ) {
    return PermissionCategory.EXPENSES;
  }

  return PermissionCategory.SALON; // Default
}

/**
 * Get permission description for UI
 */
export function getPermissionDescription(
  permission: EmployeePermission,
): string {
  const descriptions: Record<EmployeePermission, string> = {
    [EmployeePermission.MANAGE_APPOINTMENTS]:
      'Create, update, and cancel any appointment in the salon',
    [EmployeePermission.ASSIGN_APPOINTMENTS]:
      'Assign appointments to employees',
    [EmployeePermission.VIEW_ALL_APPOINTMENTS]:
      'View all salon appointments (not just assigned ones)',
    [EmployeePermission.MODIFY_APPOINTMENT_STATUS]:
      'Change appointment status (pending, confirmed, completed, cancelled)',
    [EmployeePermission.MANAGE_SERVICES]:
      'Create, update, delete salon services',
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
    [EmployeePermission.VOID_TRANSACTIONS]:
      'Void/cancel completed transactions',
    [EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES]:
      'Create/edit employee schedules',
    [EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE]:
      'View employee metrics and performance',
    [EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS]:
      'View all employee commissions (not just own)',
    [EmployeePermission.MANAGE_INVENTORY]:
      'Add/remove stock, adjust quantities',
    [EmployeePermission.VIEW_INVENTORY_REPORTS]: 'View inventory analytics',
    [EmployeePermission.PROCESS_STOCK_ADJUSTMENTS]:
      'Make inventory adjustments',
    [EmployeePermission.VIEW_LOW_STOCK_ALERTS]: 'Access inventory alerts',
    [EmployeePermission.VIEW_SALON_SETTINGS]: 'View salon settings (read-only)',
    [EmployeePermission.UPDATE_SALON_SETTINGS]:
      'Modify salon settings (with owner approval)',
    [EmployeePermission.MANAGE_BUSINESS_HOURS]: 'Update salon operating hours',
    [EmployeePermission.MANAGE_SALON_PROFILE]:
      'Update salon profile information',
    [EmployeePermission.MANAGE_EXPENSES]:
      'Full access to create, update, and delete expenses',
    [EmployeePermission.CREATE_EXPENSES]:
      'Create new expense records for the salon',
    [EmployeePermission.VIEW_EXPENSE_REPORTS]:
      'View expense reports and analytics',
    [EmployeePermission.APPROVE_EXPENSES]:
      'Approve or reject expense submissions',
  };

  return descriptions[permission] || 'No description available';
}
