import { EmployeePermission } from '../enums/employee-permission.enum';

/**
 * Permission Template
 *
 * Predefined permission bundles for common employee roles
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: EmployeePermission[];
  category: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Predefined permission templates for common salon roles
 */
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'receptionist',
    name: 'Receptionist',
    description:
      'Front desk staff who manage appointments and basic customer interactions',
    category: 'basic',
    permissions: [
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      EmployeePermission.MANAGE_CUSTOMERS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.PROCESS_PAYMENTS,
    ],
  },
  {
    id: 'stylist',
    name: 'Stylist / Technician',
    description:
      'Service providers who view their appointments and track commissions',
    category: 'basic',
    permissions: [
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
    ],
  },
  {
    id: 'senior_stylist',
    name: 'Senior Stylist',
    description:
      'Experienced service providers with additional customer management access',
    category: 'intermediate',
    permissions: [
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      EmployeePermission.MANAGE_CUSTOMERS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.VIEW_CUSTOMER_LOYALTY,
      EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
      EmployeePermission.PROCESS_PAYMENTS,
    ],
  },
  {
    id: 'cashier',
    name: 'Cashier',
    description: 'Handles payments and basic sales operations',
    category: 'basic',
    permissions: [
      EmployeePermission.PROCESS_PAYMENTS,
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.APPLY_DISCOUNTS,
    ],
  },
  {
    id: 'inventory_manager',
    name: 'Inventory Manager',
    description: 'Manages stock levels and product inventory',
    category: 'intermediate',
    permissions: [
      EmployeePermission.MANAGE_PRODUCTS,
      EmployeePermission.MANAGE_INVENTORY,
      EmployeePermission.VIEW_INVENTORY_REPORTS,
      EmployeePermission.PROCESS_STOCK_ADJUSTMENTS,
      EmployeePermission.VIEW_LOW_STOCK_ALERTS,
      EmployeePermission.UPDATE_PRODUCT_PRICING,
    ],
  },
  {
    id: 'supervisor',
    name: 'Shift Supervisor',
    description: 'Oversees daily operations and staff during shifts',
    category: 'intermediate',
    permissions: [
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.ASSIGN_APPOINTMENTS,
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      EmployeePermission.MANAGE_CUSTOMERS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.PROCESS_PAYMENTS,
      EmployeePermission.APPLY_DISCOUNTS,
      EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES,
      EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE,
    ],
  },
  {
    id: 'manager',
    name: 'Salon Manager',
    description: 'Full operational access to manage the salon day-to-day',
    category: 'advanced',
    permissions: [
      // Appointments
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.ASSIGN_APPOINTMENTS,
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      // Services & Products
      EmployeePermission.MANAGE_SERVICES,
      EmployeePermission.MANAGE_PRODUCTS,
      EmployeePermission.UPDATE_SERVICE_PRICING,
      EmployeePermission.UPDATE_PRODUCT_PRICING,
      // Customers
      EmployeePermission.MANAGE_CUSTOMERS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.VIEW_CUSTOMER_LOYALTY,
      EmployeePermission.UPDATE_CUSTOMER_INFO,
      // Sales
      EmployeePermission.PROCESS_PAYMENTS,
      EmployeePermission.APPLY_DISCOUNTS,
      EmployeePermission.VIEW_SALES_REPORTS,
      EmployeePermission.VOID_TRANSACTIONS,
      // Staff
      EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES,
      EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE,
      EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
      // Inventory
      EmployeePermission.MANAGE_INVENTORY,
      EmployeePermission.VIEW_INVENTORY_REPORTS,
      EmployeePermission.PROCESS_STOCK_ADJUSTMENTS,
      EmployeePermission.VIEW_LOW_STOCK_ALERTS,
      // Salon
      EmployeePermission.VIEW_SALON_SETTINGS,
    ],
  },
  {
    id: 'assistant_manager',
    name: 'Assistant Manager',
    description: 'Supports manager with most operational tasks',
    category: 'advanced',
    permissions: [
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.ASSIGN_APPOINTMENTS,
      EmployeePermission.VIEW_ALL_APPOINTMENTS,
      EmployeePermission.MODIFY_APPOINTMENT_STATUS,
      EmployeePermission.MANAGE_CUSTOMERS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
      EmployeePermission.VIEW_CUSTOMER_LOYALTY,
      EmployeePermission.PROCESS_PAYMENTS,
      EmployeePermission.APPLY_DISCOUNTS,
      EmployeePermission.VIEW_SALES_REPORTS,
      EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES,
      EmployeePermission.VIEW_EMPLOYEE_PERFORMANCE,
      EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
      EmployeePermission.VIEW_INVENTORY_REPORTS,
      EmployeePermission.VIEW_LOW_STOCK_ALERTS,
      EmployeePermission.VIEW_SALON_SETTINGS,
    ],
  },
  {
    id: 'bookkeeper',
    name: 'Bookkeeper',
    description: 'Financial reporting and data export access',
    category: 'intermediate',
    permissions: [
      EmployeePermission.VIEW_SALES_REPORTS,
      EmployeePermission.EXPORT_SALES_DATA,
      EmployeePermission.VIEW_EMPLOYEE_COMMISSIONS,
      EmployeePermission.VIEW_INVENTORY_REPORTS,
      EmployeePermission.VIEW_CUSTOMER_HISTORY,
    ],
  },
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): PermissionTemplate | undefined {
  return PERMISSION_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: 'basic' | 'intermediate' | 'advanced',
): PermissionTemplate[] {
  return PERMISSION_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get permission dependencies
 *
 * Some permissions logically require other permissions to be useful.
 * This maps permissions to their recommended dependencies.
 */
export const PERMISSION_DEPENDENCIES: Partial<
  Record<EmployeePermission, EmployeePermission[]>
> = {
  // Managing appointments requires viewing them
  [EmployeePermission.MANAGE_APPOINTMENTS]: [
    EmployeePermission.VIEW_ALL_APPOINTMENTS,
  ],

  // Assigning appointments requires viewing them
  [EmployeePermission.ASSIGN_APPOINTMENTS]: [
    EmployeePermission.VIEW_ALL_APPOINTMENTS,
  ],

  // Processing payments often needs appointment view
  [EmployeePermission.PROCESS_PAYMENTS]: [
    EmployeePermission.VIEW_ALL_APPOINTMENTS,
  ],

  // Voiding transactions needs to view sales
  [EmployeePermission.VOID_TRANSACTIONS]: [
    EmployeePermission.VIEW_SALES_REPORTS,
  ],

  // Exporting data needs to view reports
  [EmployeePermission.EXPORT_SALES_DATA]: [
    EmployeePermission.VIEW_SALES_REPORTS,
  ],

  // Managing inventory needs to view reports
  [EmployeePermission.MANAGE_INVENTORY]: [
    EmployeePermission.VIEW_INVENTORY_REPORTS,
  ],

  // Stock adjustments need inventory management
  [EmployeePermission.PROCESS_STOCK_ADJUSTMENTS]: [
    EmployeePermission.VIEW_INVENTORY_REPORTS,
  ],

  // Managing services needs no additional
  [EmployeePermission.MANAGE_SERVICES]: [],

  // Managing customers often needs history
  [EmployeePermission.MANAGE_CUSTOMERS]: [
    EmployeePermission.VIEW_CUSTOMER_HISTORY,
  ],

  // Updating customer info needs customer management
  [EmployeePermission.UPDATE_CUSTOMER_INFO]: [
    EmployeePermission.MANAGE_CUSTOMERS,
  ],

  // Updating salon settings needs view access
  [EmployeePermission.UPDATE_SALON_SETTINGS]: [
    EmployeePermission.VIEW_SALON_SETTINGS,
  ],
};

/**
 * Get recommended additional permissions when granting a permission
 */
export function getRecommendedDependencies(
  permission: EmployeePermission,
): EmployeePermission[] {
  return PERMISSION_DEPENDENCIES[permission] || [];
}

/**
 * Expand permissions with their dependencies
 */
export function expandWithDependencies(
  permissions: EmployeePermission[],
): EmployeePermission[] {
  const expanded = new Set(permissions);

  for (const permission of permissions) {
    const deps = getRecommendedDependencies(permission);
    deps.forEach((dep) => expanded.add(dep));
  }

  return Array.from(expanded);
}
