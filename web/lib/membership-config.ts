/**
 * Membership Configuration
 * Centralized configuration for membership-related constants
 */

// Annual membership fee in RWF
export const MEMBERSHIP_ANNUAL_FEE = 3000;

// Per-installment amount (2 installments per year)
export const MEMBERSHIP_INSTALLMENT_AMOUNT = 1500;

// Minimum payment required for 6-month activation
export const MEMBERSHIP_MIN_ACTIVATION_AMOUNT = 1500;

// Number of installments per year
export const MEMBERSHIP_INSTALLMENTS_PER_YEAR = 2;

// Membership duration in months based on payment
export const MEMBERSHIP_DURATION = {
  FULL_YEAR: 12,
  HALF_YEAR: 6,
} as const;

// Status configurations for UI display
export const MEMBERSHIP_STATUS_CONFIG = {
  new: {
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    label: 'New',
  },
  active: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
    label: 'Active',
  },
  pending_renewal: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
    label: 'Pending Renewal',
  },
  expired: {
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error',
    label: 'Expired',
  },
  suspended: {
    color: 'text-text-light/60 dark:text-text-dark/60',
    bg: 'bg-text-light/5 dark:bg-text-dark/5',
    border: 'border-border-light dark:border-border-dark',
    label: 'Suspended',
  },
} as const;

export const PAYMENT_STATUS_CONFIG = {
  pending: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
    label: 'Pending',
  },
  paid: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
    label: 'Paid',
  },
  overdue: {
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error',
    label: 'Overdue',
  },
  cancelled: {
    color: 'text-text-light/60 dark:text-text-dark/60',
    bg: 'bg-text-light/5 dark:bg-text-dark/5',
    border: 'border-border-light dark:border-border-dark',
    label: 'Cancelled',
  },
} as const;

export const PAYMENT_METHODS = {
  cash: { label: 'Cash', emoji: '💵' },
  mobile_money: { label: 'Mobile Money', emoji: '📱' },
  bank_transfer: { label: 'Bank Transfer', emoji: '🏦' },
  card: { label: 'Card', emoji: '💳' },
} as const;

// Format currency for display
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} RWF`;
}

// Validate Rwanda phone number (078, 079, 072, 073)
export function isValidRwandaPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  // Rwanda phone numbers: 078, 079, 072, 073 followed by 7 digits
  return /^(078|079|072|073)\d{7}$/.test(cleanPhone);
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  return phone;
}
