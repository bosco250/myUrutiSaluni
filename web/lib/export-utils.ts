/**
 * Utility functions for exporting data to CSV and PDF formats
 */

export interface ExportOptions {
  filename?: string;
  headers?: string[];
  dateFormat?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const { filename = 'export', headers } = options;

  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    csvHeaders.join(','),
    // Data rows
    ...data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(data: T[], options: ExportOptions = {}): void {
  const { filename = 'export' } = options;

  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date, format: string = 'yyyy-MM-dd'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'yyyy-MM-dd HH:mm':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    default:
      return d.toISOString();
  }
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number, currency: string = 'RWF'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

