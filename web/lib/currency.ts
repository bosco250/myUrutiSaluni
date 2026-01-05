/**
 * Currency formatting utilities
 */

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'RWF'): string {
  if (amount === null || amount === undefined || amount === '') return `${currency} 0`;
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0`;
  return `${currency} ${Math.round(numAmount).toLocaleString('en-US')}`;
}

export function formatCurrencyWithDecimals(amount: number | string | null | undefined, currency: string = 'RWF'): string {
  if (amount === null || amount === undefined || amount === '') return `${currency} 0.00`;
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0.00`;
  return `${currency} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove currency symbols and spaces, then parse
  const cleaned = value.replace(/[RWF\s,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

