/**
 * Shared Formatting Utilities
 */

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number): string => {
  return `RWF ${amount.toLocaleString()}`;
};

/**
 * Format large numbers (e.g., 1500 -> 1.5K)
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};
