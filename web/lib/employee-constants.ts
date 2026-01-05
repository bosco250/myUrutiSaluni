/**
 * Employee-related constants
 */

export const EMPLOYEE_ACTIVITY_TYPES = {
  APPOINTMENT: 'appointment',
  SALE: 'sale',
  COMMISSION: 'commission',
  PAYROLL: 'payroll',
} as const;

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const COMMISSION_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
} as const;

export const PAYROLL_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
} as const;

export const DEFAULT_VALUES = {
  UNKNOWN_USER: 'Unknown User',
  NOT_AVAILABLE: 'N/A',
  SERVICE: 'Service',
  ASSIGNED_ITEMS: 'Assigned items',
  COMMISSION_ONLY: 'Commission Only',
  PAYMENT_METHOD_PAYROLL: 'payroll',
} as const;

export const MESSAGES = {
  LOADING_EMPLOYEE: 'Loading employee details...',
  LOADING_COMMISSIONS: 'Loading commissions...',
  LOADING_PAYROLL: 'Loading payroll...',
  LOADING_ACTIVITIES: 'Loading activities...',
  NO_COMMISSIONS: 'No commissions found',
  NO_PAYROLL: 'No payroll records found',
  NO_ACTIVITY: 'No activity found',
  EMPLOYEE_NOT_FOUND: 'Employee not found',
  EMPLOYEE_NOT_FOUND_DESCRIPTION: "The employee you're looking for doesn't exist or you don't have permission to view it.",
  BACK_TO_EMPLOYEES: 'Back to Employees',
  EDIT_EMPLOYEE: 'Edit Employee',
  EDIT_EMPLOYEE_DESCRIPTION: 'To edit employee details, please navigate to the employees list page where you can use the edit button.',
  GO_TO_EMPLOYEES_LIST: 'Go to Employees List',
  CANCEL: 'Cancel',
} as const;

export const API_ENDPOINTS = {
  EMPLOYEES: (salonId: string) => `/salons/${salonId}/employees`,
  COMMISSION_SUMMARY: (employeeId: string) => `/commissions/employee/${employeeId}/summary`,
  COMMISSIONS: (employeeId: string) => `/commissions?salonEmployeeId=${employeeId}`,
  PAYROLL: (salonId: string) => `/payroll/salon/${salonId}`,
  APPOINTMENTS: (salonId: string) => `/appointments?salonId=${salonId}`,
  SALES: (salonId: string) => `/sales?salonId=${salonId}`,
} as const;

export const QUERY_KEYS = {
  SALON_EMPLOYEE: (salonId: string, employeeId: string) => ['salon-employee', salonId, employeeId],
  EMPLOYEE_COMMISSION_SUMMARY: (employeeId: string) => ['employee-commission-summary', employeeId],
  EMPLOYEE_COMMISSIONS: (employeeId: string) => ['employee-commissions', employeeId],
  EMPLOYEE_PAYROLL: (employeeId: string) => ['employee-payroll', employeeId],
  EMPLOYEE_APPOINTMENTS: (employeeId: string) => ['employee-appointments', employeeId],
  EMPLOYEE_SALES: (employeeId: string) => ['employee-sales', employeeId],
} as const;

export const QUERY_PARAMS = {
  SALON_ID: 'salonId',
  SALON_EMPLOYEE_ID: 'salonEmployeeId',
  LIMIT: 'limit',
} as const;

export const DEFAULT_LIMITS = {
  SALES: 100,
} as const;

export const DATE_FORMATS = {
  FULL: 'MMM d, yyyy h:mm a',
  DATE_ONLY: 'MMM d, yyyy',
  MONTH_DAY: 'MMM d',
} as const;

export const CURRENCY = {
  DEFAULT: 'RWF',
} as const;

// Note: Icon components should be imported and used directly, not as strings

export const ACTIVITY_COLORS = {
  APPOINTMENT: 'text-blue-500',
  SALE: 'text-green-500',
  COMMISSION: 'text-success',
  PAYROLL: 'text-primary',
} as const;

export const STATUS_COLORS = {
  SUCCESS: 'bg-success/10 text-success',
  WARNING: 'bg-warning/10 text-warning',
  DANGER: 'bg-danger/10 text-danger',
  DEFAULT: 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60',
} as const;

export const STATUS_MAPPING = {
  PAID: ['paid', 'completed'],
  PENDING: ['unpaid', 'pending', 'booked', 'confirmed'],
  CANCELLED: ['cancelled', 'no_show'],
} as const;

