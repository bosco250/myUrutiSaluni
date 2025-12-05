'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Receipt,
  Printer,
  Download,
  User,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  Loader2,
  Package,
  Scissors,
  Users,
  Check,
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
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <SaleDetailContent />
    </ProtectedRoute>
  );
}

function SaleDetailContent() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;

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
      month: 'long',
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
    try {
      const response = await api.get(`/reports/receipt/${saleId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${saleId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF receipt. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading sale details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger mb-4">Failed to load sale details.</p>
          <Button onClick={() => router.push('/sales/history')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales History
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/sales/history')}
            variant="secondary"
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Sale Details</h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
              Sale ID: <span className="font-mono">{sale.id}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Button onClick={handleDownloadPDF} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={() => router.push('/sales')} variant="primary">
            <Receipt className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Receipt Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-lg overflow-hidden print:shadow-none">
        {/* Receipt Header */}
        <div className="bg-primary/10 p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
                {sale.salon?.name || 'Salon Receipt'}
              </h2>
              {sale.salon?.address && (
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">{sale.salon.address}</p>
              )}
              {sale.salon?.phone && (
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">{sale.salon.phone}</p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-flex px-3 py-1 bg-success/20 text-success rounded-full text-sm font-semibold mb-2">
                <Check className="w-4 h-4 mr-1" />
                {sale.status.toUpperCase()}
              </div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                {formatDate(sale.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Sale Information */}
        <div className="p-6 space-y-6">
          {/* Customer & Employee Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sale.customer && (
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Customer</h3>
                </div>
                <p className="text-text-light dark:text-text-dark">{sale.customer.fullName}</p>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">{sale.customer.phone}</p>
                {sale.customer.email && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{sale.customer.email}</p>
                )}
              </div>
            )}
            {sale.createdBy && (
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Processed By</h3>
                </div>
                <p className="text-text-light dark:text-text-dark">{sale.createdBy.fullName}</p>
                {sale.createdBy.email && (
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">{sale.createdBy.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Sale Items */}
          <div>
            <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Items</h3>
            <div className="space-y-2">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-background-light dark:bg-background-dark rounded-xl p-4 border border-border-light dark:border-border-dark"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.service ? (
                            <>
                              <Scissors className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-text-light dark:text-text-dark">
                                {item.service.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-text-light dark:text-text-dark">
                                {item.product?.name}
                              </span>
                              {item.product?.sku && (
                                <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                                  (SKU: {item.product.sku})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {item.salonEmployee && (
                          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                            Assigned to: {item.salonEmployee.user?.fullName || item.salonEmployee.roleTitle || 'Employee'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-text-light dark:text-text-dark">
                          {sale.currency || 'RWF'} {item.lineTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-text-light/60 dark:text-text-dark/60">
                      <span>
                        {sale.currency || 'RWF'} {item.unitPrice.toLocaleString()} × {item.quantity}
                      </span>
                      {item.discountAmount > 0 && (
                        <span className="text-success">-{sale.currency || 'RWF'} {item.discountAmount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-light/60 dark:text-text-dark/60 text-center py-4">No items found</p>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t border-border-light dark:border-border-dark pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-text-light dark:text-text-dark">
                <span>Subtotal</span>
                <span>{sale.currency || 'RWF'} {subtotal.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-text-light dark:text-text-dark">
                  <span>Discount</span>
                  <span className="text-success">-{sale.currency || 'RWF'} {totalDiscount.toLocaleString()}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-text-light dark:text-text-dark">
                  <span>Tax</span>
                  <span>{sale.currency || 'RWF'} {tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-text-light dark:text-text-dark pt-2 border-t border-border-light dark:border-border-dark">
                <span>Total</span>
                <span className="text-primary">{sale.currency || 'RWF'} {Number(sale.totalAmount || calculatedTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-text-light dark:text-text-dark">Payment Information</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-light/60 dark:text-text-dark/60">Payment Method</span>
                <span className="text-text-light dark:text-text-dark font-medium">
                  {formatPaymentMethod(sale.paymentMethod)}
                </span>
              </div>
              {sale.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Reference</span>
                  <span className="text-text-light dark:text-text-dark font-mono text-sm">
                    {sale.paymentReference}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background-light dark:bg-background-dark p-6 border-t border-border-light dark:border-border-dark text-center">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            Thank you for your business!
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-2">
            Sale ID: <span className="font-mono">{sale.id}</span>
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

