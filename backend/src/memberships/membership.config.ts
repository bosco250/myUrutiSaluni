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
  FULL_YEAR_MONTHS: 12,
  HALF_YEAR_MONTHS: 6,
} as const;
