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

/**
 * Format currency in compact form for small spaces (e.g., 5000 -> 5k RWF)
 */
export const formatCompactCurrency = (amount: number): string => {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    // Remove .0 if it's a whole number
    const k = num / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return num.toString();
};
