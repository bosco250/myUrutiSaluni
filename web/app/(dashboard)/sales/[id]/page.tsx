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
  CreditCard,
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

  const { data: sale, isLoading, error } = useQuery<Sale>({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const response = await api.get(`/sales/${saleId}`);
      return response.data?.data || response.data;
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
    if (!method) return 'Unknown';
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
    } catch (err) {
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
          <p className="text-danger mb-4">
            {error ? 'Failed to load sale details. You may not have permission to view this sale.' : 'Sale not found.'}
          </p>
          <Button onClick={() => router.push('/sales/history')} variant="secondary">
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

  return (
    <div className="flex flex-col items-center py-8 px-4 min-h-[calc(100vh-4rem)]">
      
      {/* Actions Toolbar */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between print:hidden">
        <Button
          onClick={() => router.push('/sales/history')}
          variant="secondary"
          size="sm"
          className="rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="bg-white dark:bg-black">
            <Printer className="w-4 h-4" />
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="bg-white dark:bg-black">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* THERMAL RECEIPT CONTAINER */}
      <div className="w-full max-w-[380px] bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark shadow-xl p-6 font-mono text-sm leading-tight relative print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black">
        
        {/* Receipt Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wider mb-2">
            {sale.salon?.name || 'SALON RECEIPT'}
          </h1>
          {sale.salon?.address && (
            <p className="mb-1 text-text-light/80 dark:text-text-dark/80">{sale.salon.address}</p>
          )}
          {sale.salon?.phone && (
            <p className="mb-1 text-text-light/80 dark:text-text-dark/80">{sale.salon.phone}</p>
          )}
          <div className="mt-4 border-b-2 border-dashed border-border-light dark:border-border-dark pb-4 print:border-black">
             <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
             </div>
             <div className="flex justify-between">
                <span>TIME:</span>
                <span>{new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             </div>
             <div className="flex justify-between">
                <span>SALE ID:</span>
                <span>#{sale.id.slice(0, 8)}</span>
             </div>
             <div className="flex justify-between font-bold mt-1">
                <span>STATUS:</span>
                <span>{sale.status?.toUpperCase() || 'UNKNOWN'}</span>
             </div>
          </div>
        </div>

        {/* Items List */}
        <div className="mb-6">
          <div className="flex justify-between font-bold border-b border-border-light dark:border-border-dark pb-2 mb-2 print:border-black">
             <span>ITEM</span>
             <span>TOTAL</span>
          </div>
          <div className="space-y-3">
             {sale.items?.map((item) => (
               <div key={item.id}>
                 <div className="flex justify-between font-bold">
                    <span>{item.service?.name || item.product?.name}</span>
                    <span>{sale.currency || 'RWF'} {item.lineTotal.toLocaleString()}</span>
                 </div>
                 <div className="text-xs text-text-light/60 dark:text-text-dark/60 flex justify-between print:text-gray-600">
                    <span>{item.quantity} x {item.unitPrice.toLocaleString()}</span>
                    {item.discountAmount > 0 && <span>(Disc: -{item.discountAmount})</span>}
                 </div>
               </div>
             ))}
             {(!sale.items || sale.items.length === 0) && (
               <p className="text-center italic mt-2 text-text-light/60 dark:text-text-dark/60">No items</p>
             )}
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t-2 border-dashed border-border-light dark:border-border-dark pt-4 mb-6 space-y-1 print:border-black">
           <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>{sale.currency || 'RWF'} {subtotal.toLocaleString()}</span>
           </div>
           {totalDiscount > 0 && (
             <div className="flex justify-between">
                <span>DISCOUNT:</span>
                <span>-{sale.currency || 'RWF'} {totalDiscount.toLocaleString()}</span>
             </div>
           )}
           {tax > 0 && (
             <div className="flex justify-between">
                <span>TAX:</span>
                <span>{sale.currency || 'RWF'} {tax.toFixed(2)}</span>
             </div>
           )}
           <div className="flex justify-between text-xl font-bold border-t-2 border-border-light dark:border-border-dark border-double pt-2 mt-2 print:border-black">
              <span>TOTAL:</span>
              <span className="text-primary print:text-black">{sale.currency || 'RWF'} {Number(sale.totalAmount || calculatedTotal).toLocaleString()}</span>
           </div>
        </div>

        {/* Payment & Customer */}
        <div className="mb-8 text-xs">
           <div className="mb-2">
              <div>
                <span className="font-bold">PAYMENT: </span>
                <span>{formatPaymentMethod(sale.paymentMethod).toUpperCase()}</span>
              </div>
              {sale.paymentReference && (
                <div className="mt-0.5">
                  <span className="font-bold">REF/TRANS ID: </span>
                  <span className="font-mono">{sale.paymentReference}</span>
                </div>
              )}
           </div>
           
           {(sale.customer || sale.createdBy) && (
             <div className="border-t border-dashed border-border-light dark:border-border-dark pt-2 mt-2 print:border-black">
                {sale.customer && (
                  <div className="mb-2">
                      <div className="font-bold border-b border-border-light dark:border-border-dark pb-1 mb-1 w-max print:border-black">CUSTOMER</div>
                      <div>{sale.customer.fullName}</div>
                      <div className="text-text-light/80 dark:text-text-dark/80">{sale.customer.phone}</div>
                      {sale.customer.email && <div className="text-text-light/80 dark:text-text-dark/80 italic">{sale.customer.email}</div>}
                  </div>
                )}
                {sale.createdBy && (
                  <div>
                      <span className="font-bold">SERVED BY: </span>
                      <span>{sale.createdBy.fullName}</span>
                      {sale.createdBy.email && <span className="text-text-light/60 dark:text-text-dark/60 ml-1">({sale.createdBy.email})</span>}
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="text-center border-t border-border-light dark:border-border-dark pt-4 print:border-black">
           <p className="font-bold mb-1">THANK YOU!</p>
           <p className="text-xs text-text-light/60 dark:text-text-dark/60">Please come again.</p>
           {/* Barcode Mockup */}
           <div className="mt-4 h-12 bg-text-light/10 dark:bg-text-dark/10 flex items-center justify-center font-mono text-[10px] tracking-[0.5em] text-text-light/40 dark:text-text-dark/40 print:bg-gray-100 print:text-black">
              ||| |||| | ||||| ||
           </div>
           <p className="text-[10px] mt-1 text-center">{sale.id}</p>
        </div>
      </div>

       {/* Print Styles */}
       <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .font-mono,
          .font-mono * {
            visibility: visible;
          }
          .font-mono {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            padding: 0;
            margin: 0;
            box-shadow: none;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
