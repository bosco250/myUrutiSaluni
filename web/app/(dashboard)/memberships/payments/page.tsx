'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

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
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning', label: 'Pending' },
  paid: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/20', border: 'border-success', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-500/20', border: 'border-gray-500', label: 'Cancelled' },
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [selectedPayment, setSelectedPayment] = useState<MembershipPayment | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordPaymentForm>({
    paymentMethod: 'cash',
    paymentReference: '',
    transactionReference: '',
    paidAmount: '',
    notes: '',
  });

  // Fetch payments for the year
  const { data: payments = [], isLoading } = useQuery<MembershipPayment[]>({
    queryKey: ['membership-payments', yearFilter],
    queryFn: async () => {
      const response = await api.get(`/memberships/payments/year/${yearFilter}`);
      return response.data || [];
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { paymentId: string; paymentMethod: string; paymentReference?: string; transactionReference?: string; paidAmount?: number; notes?: string }) => {
      await api.post('/memberships/payments/record', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-payments'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
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

  // Initialize payments flow is handled elsewhere; this page focuses on recording and viewing payments.

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.member?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.member?.membershipNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.member?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalRequired = payments.length * 1500; // Each payment is 1500 RWF
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">Membership Payments</h1>
            <p className="text-text-light/60 dark:text-text-dark/60">Manage annual membership contributions (3000 RWF/year, 2 installments)</p>
          </div>
          <Button
            onClick={() => router.push('/memberships/manage')}
            variant="secondary"
          >
            Back to Management
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Required</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats.totalRequired.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{stats.totalPayments} installments</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Paid</span>
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">
            RWF {stats.totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{stats.paid} paid</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Pending</span>
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Overdue</span>
            <AlertCircle className="w-5 h-5 text-danger" />
          </div>
          <p className="text-2xl font-bold text-danger">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, membership number..."
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="membership-payments-year"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Year
            </label>
            <input
              id="membership-payments-year"
              type="number"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value))}
              min={2020}
              max={2100}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Installment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Paid Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-text-light/60 dark:text-text-dark/60">No payments found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const config = statusConfig[payment.status];
                  const Icon = config.icon;

                  return (
                    <tr key={payment.id} className="hover:bg-background-light dark:hover:bg-background-dark transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-light dark:text-text-dark">
                            {payment.member?.fullName || 'Unknown'}
                          </div>
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {payment.member?.membershipNumber || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        {payment.paymentYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        Installment {payment.installmentNumber} of 2
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        RWF {Number(payment.installmentAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.status === 'pending' && (
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
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Record Payment
                          </Button>
                        )}
                        {payment.status === 'paid' && (
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {payment.paymentMethod && (
                              <div className="capitalize">{payment.paymentMethod.replace('_', ' ')}</div>
                            )}
                            {payment.paidBy && (
                              <div>By: {payment.paidBy.fullName}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-md w-full p-6"
          role="presentation"
        >
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">Record Payment</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Member</p>
              <p className="text-text-light dark:text-text-dark font-medium">{payment.member?.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Amount</p>
              <p className="text-text-light dark:text-text-dark font-medium">RWF {Number(payment.installmentAmount).toLocaleString()}</p>
            </div>
            <div>
              <label
                htmlFor={`membership-record-method-${payment.id}`}
                className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
              >
                Payment Method
              </label>
              <select
                id={`membership-record-method-${payment.id}`}
                value={form.paymentMethod}
                onChange={(e) => onFormChange({ ...form, paymentMethod: e.target.value as 'cash' | 'mobile_money' | 'bank_transfer' | 'card' })}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label
                htmlFor={`membership-record-paymentRef-${payment.id}`}
                className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
              >
                Payment Reference
              </label>
              <input
                id={`membership-record-paymentRef-${payment.id}`}
                type="text"
                value={form.paymentReference}
                onChange={(e) => onFormChange({ ...form, paymentReference: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label
                htmlFor={`membership-record-txRef-${payment.id}`}
                className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
              >
                Transaction Reference
              </label>
              <input
                id={`membership-record-txRef-${payment.id}`}
                type="text"
                value={form.transactionReference}
                onChange={(e) => onFormChange({ ...form, transactionReference: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label
                htmlFor={`membership-record-paidAmount-${payment.id}`}
                className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
              >
                Paid Amount (defaults to installment amount)
              </label>
              <input
                id={`membership-record-paidAmount-${payment.id}`}
                type="number"
                value={form.paidAmount}
                onChange={(e) => onFormChange({ ...form, paidAmount: e.target.value })}
                placeholder={payment.installmentAmount.toString()}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label
                htmlFor={`membership-record-notes-${payment.id}`}
                className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
              >
                Notes
              </label>
              <textarea
                id={`membership-record-notes-${payment.id}`}
                value={form.notes}
                onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                rows={3}
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={onClose} variant="secondary" disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={onRecord} variant="primary" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

