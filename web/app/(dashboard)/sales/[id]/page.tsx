'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import { useState } from 'react';
import {
  ArrowLeft,
  Receipt,
  Printer,
  Download,
  User,
  CreditCard,
  Loader2,
  Package,
  Scissors,
  Users,
  Check,
  Clock,
  MapPin,
  Phone,
  Mail,
  Tag,
  Calendar,
  TrendingDown,
  Calculator,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface SaleItem {
  id: string;
  service?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    sku?: string;
    taxRate?: number;
  };
  salonEmployee?: {
    id: string;
    user?: {
      fullName: string;
    };
    roleTitle?: string;
  };
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  status: string;
  createdAt: string;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  salon?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  createdBy?: {
    id: string;
    fullName: string;
    email?: string;
  };
  items?: SaleItem[];
}

export default function SaleDetailPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER]}>
      <SaleDetailContent />
    </ProtectedRoute>
  );
}

function SaleDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const saleId = params.id as string;
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: sale, isLoading, error } = useQuery<Sale>({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const response = await api.get(`/sales/${saleId}`);
      return response.data;
    },
    enabled: !!saleId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethod = (method: string) => {
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await api.get(`/reports/receipt/${saleId}`, {
        responseType: 'blob',
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });

      if (blob.size === 0) {
        throw new Error('Received empty file');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${saleId.slice(0, 8)}-${Date.now()}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err: any) {
      console.error('PDF download error:', err);

      let errorMessage = 'Unable to download receipt';

      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Receipt not found on server';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to download this receipt';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error occurred while generating receipt';
        } else {
          errorMessage = `Server error: ${err.response.statusText || 'Unknown error'}`;
        }
      } else if (err.request) {
        errorMessage = 'Unable to reach server. Please check your connection';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading sale details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-warning/10 border-2 border-warning rounded-xl p-4 text-center">
          <p className="text-sm text-danger mb-4">
            {error ? 'Failed to load sale details. You may not have permission to view this sale.' : 'Sale not found.'}
          </p>
          <Button onClick={() => router.push('/sales/history')} variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {user?.role === UserRole.CUSTOMER ? 'Purchase History' : 'Sales History'}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate subtotal (before discount)
  const subtotal = sale.items?.reduce((sum, item) => {
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + (unitPrice * quantity);
  }, 0) || 0;

  // Calculate total discount
  const totalDiscount = sale.items?.reduce((sum, item) => {
    return sum + (Number(item.discountAmount) || 0);
  }, 0) || 0;

  // Calculate tax for products (tax is applied to amount after discount)
  const tax = sale.items?.reduce((sum, item) => {
    if (item.product) {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const discountAmount = Number(item.discountAmount) || 0;
      const itemSubtotal = unitPrice * quantity;
      const itemAfterDiscount = Math.max(0, itemSubtotal - discountAmount);
      const taxRate = Number(item.product.taxRate) || 0;
      const itemTax = (itemAfterDiscount * taxRate) / 100;
      return sum + Math.max(0, itemTax);
    }
    return sum;
  }, 0) || 0;

  // Total = (Subtotal - Discount) + Tax
  const calculatedTotal = Math.max(0, subtotal - totalDiscount + tax);

  const isCustomer = user?.role === UserRole.CUSTOMER;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Header Section - Hidden on print */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/sales/history')}
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                {isCustomer ? 'Purchase Receipt' : 'Sale Receipt'}
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                ID: <span className="font-mono">{sale.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isDownloading ? 'Downloading...' : 'PDF'}
            </Button>
            {!isCustomer && (
              <Button onClick={() => router.push('/sales')} variant="primary" size="sm">
                <Receipt className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            )}
          </div>
        </div>

        {/* Download Error Alert */}
        {downloadError && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-start gap-3 print:hidden">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-danger">Download Failed</p>
              <p className="text-xs text-text-light/80 dark:text-text-dark/80 mt-0.5">{downloadError}</p>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="text-text-light/60 hover:text-text-light dark:text-text-dark/60 dark:hover:text-text-dark text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Receipt Card */}
        <div className="print-content">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-2 print:border-black">

            {/* Receipt Header */}
            <div className="bg-primary/5 dark:bg-primary/10 p-6 border-b border-border-light dark:border-border-dark print:bg-white print:p-6 print:border-b-2 print:border-black">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-primary dark:text-primary print:text-black" />
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark print:text-black">
                      {sale.salon?.name || 'Receipt'}
                    </h2>
                  </div>
                  {sale.salon?.address && (
                    <div className="flex items-start gap-2 text-sm text-text-light/70 dark:text-text-dark/70 mb-1 print:text-black">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{sale.salon.address}</span>
                    </div>
                  )}
                  {sale.salon?.phone && (
                    <div className="flex items-center gap-2 text-sm text-text-light/70 dark:text-text-dark/70 print:text-black">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{sale.salon.phone}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/20 dark:bg-success/30 text-success rounded-full text-xs font-semibold mb-2 print:bg-green-100 print:text-green-800">
                    <Check className="w-3.5 h-3.5" />
                    {sale.status.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70 justify-end print:text-black">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(sale.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Payment Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-background-light/50 dark:bg-background-dark/50 border-b border-border-light dark:border-border-dark print:bg-gray-50 print:border-b-2 print:border-black">
              {/* Customer Info */}
              {sale.customer && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-2 print:text-black">
                    <User className="w-3.5 h-3.5" />
                    Customer
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark print:text-black">
                      {sale.customer.fullName}
                    </p>
                    <p className="text-xs text-text-light/70 dark:text-text-dark/70 print:text-gray-700">
                      {sale.customer.phone}
                    </p>
                    {sale.customer.email && (
                      <p className="text-xs text-text-light/70 dark:text-text-dark/70 print:text-gray-700">
                        {sale.customer.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-2 print:text-black">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-light dark:text-text-dark print:text-black">
                    {formatPaymentMethod(sale.paymentMethod)}
                  </p>
                  {sale.paymentReference && (
                    <p className="text-xs text-text-light/70 dark:text-text-dark/70 font-mono print:text-gray-700">
                      Ref: {sale.paymentReference}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="p-6 print:p-6">
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wide mb-4 print:text-black">
                Items
              </h3>

              <div className="space-y-3">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 p-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg print:bg-white print:border-gray-300"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          {item.service ? (
                            <Scissors className="w-5 h-5 text-primary dark:text-primary print:text-black" />
                          ) : (
                            <Package className="w-5 h-5 text-primary dark:text-primary print:text-black" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-0.5 print:text-black">
                            {item.service?.name || item.product?.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-text-light/60 dark:text-text-dark/60 print:text-gray-600">
                            <span>{sale.currency || 'RWF'} {item.unitPrice.toLocaleString()} × {item.quantity}</span>
                            {item.product?.sku && (
                              <span>SKU: {item.product.sku}</span>
                            )}
                          </div>
                          {item.salonEmployee && !isCustomer && (
                            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1 print:text-gray-500">
                              By: {item.salonEmployee.user?.fullName || item.salonEmployee.roleTitle || 'Staff'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-text-light dark:text-text-dark print:text-black">
                          {sale.currency || 'RWF'} {item.lineTotal.toLocaleString()}
                        </p>
                        {item.discountAmount > 0 && (
                          <p className="text-xs text-success flex items-center gap-1 justify-end mt-0.5 print:text-green-600">
                            <TrendingDown className="w-3 h-3" />
                            -{sale.currency || 'RWF'} {item.discountAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-2" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">No items found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-6 bg-background-light/50 dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark print:bg-gray-50 print:border-t-2 print:border-black">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-sm text-text-light dark:text-text-dark print:text-black">
                  <span>Subtotal</span>
                  <span className="font-medium">{sale.currency || 'RWF'} {subtotal.toLocaleString()}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-success print:text-green-600">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Discount</span>
                    </div>
                    <span className="font-medium">-{sale.currency || 'RWF'} {totalDiscount.toLocaleString()}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-sm text-text-light dark:text-text-dark print:text-black">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Tax</span>
                    </div>
                    <span className="font-medium">{sale.currency || 'RWF'} {tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t-2 border-border-light dark:border-border-dark print:border-black">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-text-light dark:text-text-dark print:text-black">Total</span>
                    <span className="text-2xl font-bold text-primary dark:text-primary print:text-black">
                      {sale.currency || 'RWF'} {Number(sale.totalAmount || calculatedTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            {sale.createdBy && !isCustomer && (
              <div className="px-6 py-4 bg-background-light/30 dark:bg-background-dark/30 border-t border-border-light dark:border-border-dark text-sm text-text-light/60 dark:text-text-dark/60 print:bg-white print:border-t print:border-gray-300 print:text-black">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Processed by: <span className="font-medium text-text-light dark:text-text-dark print:text-black">{sale.createdBy.fullName}</span></span>
                </div>
              </div>
            )}

            <div className="px-6 py-4 text-center text-xs text-text-light/50 dark:text-text-dark/50 border-t border-border-light dark:border-border-dark print:border-t print:border-gray-300 print:text-gray-600">
              <p>Thank you for your business!</p>
              <p className="mt-1 font-mono">ID: {sale.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .print-content,
          .print-content * {
            visibility: visible;
          }

          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 0;
            margin: 0;
          }

          button,
          .print\\:hidden {
            display: none !important;
          }

          .print\\:text-black {
            color: #000 !important;
          }

          .print\\:bg-white {
            background-color: #fff !important;
          }

          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }

          .print\\:border-black {
            border-color: #000 !important;
          }

          .print\\:border-2 {
            border-width: 2px !important;
          }

          .print\\:border-b-2 {
            border-bottom-width: 2px !important;
          }

          .print\\:border-t-2 {
            border-top-width: 2px !important;
          }
        }
      `}</style>
    </div>
  );
}
