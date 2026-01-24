'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  Filter,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import {
  MEMBERSHIP_INSTALLMENT_AMOUNT,
  PAYMENT_STATUS_CONFIG,
  formatCurrency,
} from '@/lib/membership-config';

interface MembershipPayment {
  id: string;
  memberId: string;
  member: {
    id: string;
    fullName: string;
    email: string;
    membershipNumber: string;
  };
  membershipId?: string;
  membership?: {
    id: string;
    membershipNumber: string;
  };
  paymentYear: number;
  installmentNumber: number;
  totalAmount: number;
  installmentAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAmount: number;
  paidDate?: string;
  paymentMethod?: 'cash' | 'mobile_money' | 'bank_transfer' | 'card';
  paymentReference?: string;
  transactionReference?: string;
  paidBy?: {
    id: string;
    fullName: string;
  };
  notes?: string;
  createdAt: string;
}

type RecordPaymentForm = {
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer' | 'card';
  paymentReference: string;
  transactionReference: string;
  paidAmount: string;
  notes: string;
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning', label: 'Pending' },
  paid: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-error', bg: 'bg-error/10', border: 'border-error', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'text-text-light/60 dark:text-text-dark/60', bg: 'bg-text-light/5 dark:bg-text-dark/5', border: 'border-border-light dark:border-border-dark', label: 'Cancelled' },
};

export default function MembershipPaymentsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}>
      <MembershipPaymentsContent />
    </ProtectedRoute>
  );
}

function MembershipPaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // Initialize search from URL parameter (e.g., ?search=MEM-2025-12345)
  const initialSearch = searchParams.get('search') || '';
  
  // If there's a search param, default to 'all' years to ensure the result is found
  // Otherwise default to current year
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [selectedPayment, setSelectedPayment] = useState<MembershipPayment | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordPaymentForm>({
    paymentMethod: 'cash',
    paymentReference: '',
    transactionReference: '',
    paidAmount: '',
    notes: '',
  });

  // Fetch payments - either for specific year or all payments
  const { data: payments = [], isLoading } = useQuery<MembershipPayment[]>({
    queryKey: ['membership-payments', yearFilter],
    queryFn: async () => {
      if (yearFilter === 'all') {
        const response = await api.get('/memberships/payments/all');
        return response.data || [];
      } else {
        const response = await api.get(`/memberships/payments/year/${yearFilter}`);
        return response.data || [];
      }
    },
  });

  // Reading file content next
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { paymentId: string; paymentMethod: string; paymentReference?: string; transactionReference?: string; paidAmount?: number; notes?: string }) => {
      await api.post('/memberships/payments/record', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-payments'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      // Also invalidate payment statuses so manage page updates
      queryClient.invalidateQueries({ queryKey: ['membership-payment-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['membership-payment-statuses-dashboard'] });
      setShowRecordModal(false);
      setSelectedPayment(null);
      setRecordForm({
        paymentMethod: 'cash',
        paymentReference: '',
        transactionReference: '',
        paidAmount: '',
        notes: '',
      });
    },
  });

  const toast = useToast();
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await api.delete(`/memberships/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-payments'] });
      toast.success('Payment record cancelled successfully');
      setPaymentToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel payment');
      setPaymentToDelete(null);
    },
  });



  // Initialize payments for all members (admin function)
  const initializePaymentsMutation = useMutation({
    mutationFn: async () => {
      // Fetch all salon owners and initialize payments for each
      const response = await api.post('/memberships/payments/initialize-all-members');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-payments'] });
      alert('Payment records initialized successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to initialize payments');
    },
  });

  // Initialize payments flow is handled elsewhere; this page focuses on recording and viewing payments.

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        payment.member?.fullName?.toLowerCase().includes(searchLower) ||
        payment.member?.membershipNumber?.toLowerCase().includes(searchLower) ||
        payment.member?.email?.toLowerCase().includes(searchLower) ||
        // Also search by salon membership number (MEM-YYYY-XXXXXX format)
        payment.membership?.membershipNumber?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, yearFilter]);

  // Calculate paginated payments
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Statistics
  const stats = useMemo(() => {
    const totalRequired = payments.length * MEMBERSHIP_INSTALLMENT_AMOUNT;
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const pending = payments.filter(p => p.status === 'pending').length;
    const overdue = payments.filter(p => p.status === 'overdue').length;
    const paid = payments.filter(p => p.status === 'paid').length;

    return {
      totalRequired,
      totalPaid,
      remaining: totalRequired - totalPaid,
      pending,
      overdue,
      paid,
      totalPayments: payments.length,
    };
  }, [payments]);

  const handleRecordPayment = () => {
    if (!selectedPayment) return;

    const paidAmount = recordForm.paidAmount
      ? parseFloat(recordForm.paidAmount)
      : selectedPayment.installmentAmount;

    // Validate amount
    if (paidAmount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }
    if (paidAmount > selectedPayment.installmentAmount * 2) {
      alert(`Amount cannot exceed ${formatCurrency(selectedPayment.installmentAmount * 2)}`);
      return;
    }

    recordPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      paymentMethod: recordForm.paymentMethod,
      paymentReference: recordForm.paymentReference || undefined,
      transactionReference: recordForm.transactionReference || undefined,
      paidAmount,
      notes: recordForm.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading payments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/memberships')}
              className="h-9 w-9 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer group"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 group-hover:text-primary transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-light dark:text-text-dark leading-none pb-1">
                Membership Payments
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Manage annual contributions (3000 RWF/year, 2 installments)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Required */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total Required</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark">RWF {stats.totalRequired.toLocaleString()}</p>
            <p className="text-[10px] text-text-light/40 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-text-light/40" />
              {stats.totalPayments} installments
            </p>
          </div>
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total Paid</p>
            <p className="text-xl font-bold text-success">RWF {stats.totalPaid.toLocaleString()}</p>
            <p className="text-[10px] text-success/60 flex items-center gap-1 font-semibold">
              <span className="h-1 w-1 rounded-full bg-success/60" />
              {stats.paid} paid
            </p>
          </div>
          <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Pending</p>
            <p className="text-xl font-bold text-warning">{stats.pending}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Overdue</p>
            <p className="text-xl font-bold text-error">{stats.overdue}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-red-500/20 to-rose-600/20 rounded-lg group-hover:scale-110 transition-transform">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-light dark:bg-surface-dark  rounded-xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          {/* Search */}
          <div className="w-full lg:flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, ID, or email..."
              className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="relative flex-1 lg:w-44 group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-semibold text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="relative flex-1 lg:w-36 group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary" />
              <select
                value={yearFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setYearFilter(val === 'all' ? 'all' : parseInt(val));
                }}
                className="w-full pl-9 pr-8 h-9 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-semibold text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Years</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-2">
        {filteredPayments.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center shadow-sm">
            <div className="h-16 w-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-text-light dark:text-text-dark">
              {searchQuery ? 'No payments match your search' : 'No payments found'}
            </p>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-2 max-w-sm mx-auto">
              {searchQuery 
                ? 'Try adjusting your search or changing the year filter to "All Years"'
                : 'No payment records exist for the selected criteria.'
              }
            </p>
            {!searchQuery && payments.length === 0 && (
              <Button
                onClick={() => initializePaymentsMutation.mutate()}
                disabled={initializePaymentsMutation.isPending}
                variant="primary"
                size="sm"
                className="gap-2 mt-4"
              >
                {initializePaymentsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Initialize All Payments
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          paginatedPayments.map((payment) => {
            const config = statusConfig[payment.status];
            const Icon = config.icon;

            return (
              <div
                key={payment.id}
                className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2.5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-none">
                          {payment.member?.fullName || 'Unknown Member'}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light/60 dark:text-text-dark/60 font-medium font-inter">
                        <span className="text-primary font-bold">{payment.member?.membershipNumber || 'N/A'}</span>
                        <span className="text-text-light/20">•</span>
                        <span>Year {payment.paymentYear}</span>
                        <span className="text-text-light/20">•</span>
                        <span>Installment {payment.installmentNumber}</span>
                        <span className="text-text-light/20">•</span>
                        <span className="font-bold text-text-light dark:text-text-dark">RWF {Number(payment.installmentAmount).toLocaleString()}</span>
                        <span className="text-text-light/20">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-text-light/40" />
                          Due: {new Date(payment.dueDate).toLocaleDateString()}
                        </span>
                        {payment.paidDate && (
                          <>
                            <span className="text-text-light/20">•</span>
                            <span className="text-success font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Paid: {new Date(payment.paidDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 sm:ml-auto">
                    {payment.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => setPaymentToDelete(payment.id)}
                          disabled={deletePaymentMutation.isPending}
                          size="sm"
                          className="h-7 px-2.5 text-[11px] gap-1.5 shadow-sm bg-error/10 border border-error/20 text-error hover:bg-error/20 font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRecordForm({
                              paymentMethod: 'cash',
                              paymentReference: '',
                              transactionReference: '',
                              paidAmount: payment.installmentAmount.toString(),
                              notes: '',
                            });
                            setShowRecordModal(true);
                          }}
                          variant="primary"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] gap-1.5 shadow-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record
                        </Button>
                      </div>
                    )}
                    {payment.status === 'paid' && (
                      <div className="text-[10px] bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark px-2 py-1 rounded-lg text-text-light/60 dark:text-text-dark/60 font-medium">
                        {payment.paymentMethod?.replace('_', ' ').toUpperCase()} • {payment.paidBy?.fullName}
                      </div>
                    )}
                    {payment.status === 'cancelled' && (
                       <div className="flex items-center gap-1.5 text-[10px] bg-error/5 border border-error/20 px-2 py-1 rounded-lg text-error/60 font-medium italic">
                         <Ban className="w-3 h-3" />
                         Cancelled
                       </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredPayments.length > 0 && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden">
          <div className="px-2 flex items-center gap-2 text-[11px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-wider">
            <span>Showing {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
              <span className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[11px] font-bold text-text-light dark:text-text-dark focus:outline-none cursor-pointer"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark hover:bg-primary/5 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                <span className="text-[11px] font-bold text-primary">{currentPage}</span>
                <span className="text-[10px] font-bold text-primary/40">/ {totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark hover:bg-primary/5 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete)}
        title="Cancel Payment Record"
        message="Are you sure you want to cancel this payment record? This status will change to 'Cancelled' record will remain for audit purposes."
        confirmLabel="Yes, Cancel Record"
        cancelLabel="No, Keep"
        variant="danger"
        isProcessing={deletePaymentMutation.isPending}
      />

      {/* Record Payment Modal */}
      {showRecordModal && selectedPayment && (
        <RecordPaymentModal
          payment={selectedPayment}
          form={recordForm}
          onFormChange={setRecordForm}
          onRecord={handleRecordPayment}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedPayment(null);
          }}
          isProcessing={recordPaymentMutation.isPending}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({
  payment,
  form,
  onFormChange,
  onRecord,
  onClose,
  isProcessing,
}: {
  payment: MembershipPayment;
  form: RecordPaymentForm;
  onFormChange: (form: RecordPaymentForm) => void;
  onRecord: () => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-xl w-full overflow-hidden pointer-events-auto animate-in fade-in zoom-in duration-200">
          {/* Header - Increased Padding */}
          <div className="px-6 py-5 border-b border-border-light dark:border-border-dark bg-gradient-to-r from-success/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark leading-none">Record Payment</h2>
                <p className="text-[11px] text-text-light/60 dark:text-text-dark/60 mt-1">Complete membership installment details</p>
              </div>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-md hover:bg-error/10 hover:text-error flex items-center justify-center transition-colors text-text-light/30">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Member & Amount Context - Clearly Visible */}
            <div className="bg-background-light dark:bg-background-dark/50 border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-wider">Member Details</p>
                <p className="text-sm font-bold text-text-light dark:text-text-dark truncate">{payment.member?.fullName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">{payment.member?.membershipNumber}</span>
                  <span className="text-[10px] text-text-light/40 font-semibold uppercase">Year {payment.paymentYear} • Inst #{payment.installmentNumber}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-[10px] font-bold text-text-light/40 uppercase tracking-wider">Total Due</p>
                <p className="text-xl font-black text-success">RWF {Number(payment.installmentAmount).toLocaleString()}</p>
              </div>
            </div>

            {/* 3-Column Fields Section */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-light/50 uppercase px-1">Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => onFormChange({ ...form, paymentMethod: e.target.value as any })}
                  className="w-full h-8 px-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary/20 outline-none cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">MoMo</option>
                  <option value="bank_transfer">Bank</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-light/50 uppercase px-1">Amount</label>
                <input
                  type="number"
                  value={form.paidAmount}
                  onChange={(e) => onFormChange({ ...form, paidAmount: e.target.value })}
                  className="w-full h-8 px-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-light/50 uppercase px-1">Reference</label>
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) => onFormChange({ ...form, paymentReference: e.target.value })}
                  placeholder="ID#"
                  className="w-full h-8 px-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-light/50 uppercase px-1">Transaction Link</label>
                <input
                  type="text"
                  value={form.transactionReference}
                  onChange={(e) => onFormChange({ ...form, transactionReference: e.target.value })}
                  placeholder="TXN ID"
                  className="w-full h-8 px-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-light/50 uppercase px-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
                  placeholder="..."
                  className="w-full h-8 px-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer - Simplified */}
          <div className="px-6 py-3 border-t border-border-light dark:border-border-dark bg-background-light/30 dark:bg-background-dark/30 flex items-center justify-end gap-2">
            <button 
              onClick={onClose} 
              disabled={isProcessing} 
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-light/60 hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              Cancel
            </button>
              <Button
                onClick={onRecord}
                variant="primary"
                size="sm"
                disabled={isProcessing}
                className="h-7 px-4 bg-success hover:bg-success/90 border-none shadow-sm text-[10px] font-bold"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <CheckCircle className="w-3 h-3 mr-1.5" />}
                Confirm
              </Button>
          </div>
        </div>
      </div>
    </>
  );
}

