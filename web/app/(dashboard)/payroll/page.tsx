'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Calculator,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  TrendingUp,
  FileText,
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface PayrollRun {
  id: string;
  salonId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: 'draft' | 'processed' | 'paid' | 'cancelled';
  processedAt?: string;
  processedById?: string;
  items: PayrollItem[];
  salon?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface PayrollItem {
  id: string;
  salonEmployeeId: string;
  baseSalary: number;
  commissionAmount: number;
  overtimeAmount: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  paid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  salonEmployee?: {
    id: string;
    user?: {
      fullName: string;
      email?: string;
    };
    roleTitle?: string;
  };
}

interface Salon {
  id: string;
  name: string;
}

export default function PayrollPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}>
      <PayrollContent />
    </ProtectedRoute>
  );
}

function PayrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRun | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get salonId from URL query params
  useEffect(() => {
    const salonIdParam = searchParams?.get('salonId');
    if (salonIdParam) {
      setSelectedSalonId(salonIdParam);
    }
  }, [searchParams]);

  // Fetch user's salons
  const { data: salons = [], isLoading: isLoadingSalons } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
  });

  // Set default salon if only one
  useMemo(() => {
    if (salons.length === 1 && !selectedSalonId) {
      setSelectedSalonId(salons[0].id);
    }
  }, [salons, selectedSalonId]);

  // Fetch payroll history
  const { data: payrollHistory = [], isLoading: isLoadingHistory } = useQuery<PayrollRun[]>({
    queryKey: ['payroll-history', selectedSalonId],
    queryFn: async () => {
      if (!selectedSalonId) return [];
      const response = await api.get(`/payroll/salon/${selectedSalonId}`);
      return response.data || [];
    },
    enabled: !!selectedSalonId,
  });

  // Calculate payroll mutation
  const calculateMutation = useMutation({
    mutationFn: async (data: { salonId: string; periodStart: string; periodEnd: string }) => {
      const response = await api.post('/payroll/calculate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-history', selectedSalonId] });
      setShowCalculateModal(false);
      setPeriodStart('');
      setPeriodEnd('');
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (data: { id: string; paymentMethod: string; paymentReference?: string }) => {
      const response = await api.post(`/payroll/${data.id}/mark-paid`, {
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference || '',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-history', selectedSalonId] });
      setShowPaymentModal(false);
      setSelectedPayroll(null);
    },
    onError: (error: any) => {
      console.error('Failed to mark payroll as paid:', error);
      alert(error?.response?.data?.message || 'Failed to mark payroll as paid. Please try again.');
    },
  });

  // Calculate totals
  const stats = useMemo(() => {
    const totalGross = payrollHistory.reduce((sum, run) => sum + Number(run.totalAmount), 0);
    const paidRuns = payrollHistory.filter((run) => run.status === 'paid');
    const totalPaid = paidRuns.reduce((sum, run) => sum + Number(run.totalAmount), 0);
    const pendingRuns = payrollHistory.filter((run) => run.status === 'processed');
    const totalPending = pendingRuns.reduce((sum, run) => sum + Number(run.totalAmount), 0);

    return {
      totalGross,
      totalPaid,
      totalPending,
      totalRuns: payrollHistory.length,
      paidCount: paidRuns.length,
      pendingCount: pendingRuns.length,
    };
  }, [payrollHistory]);

  // Pagination
  const totalPages = Math.ceil(payrollHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayroll = payrollHistory.slice(startIndex, endIndex);

  // Reset to page 1 when salon changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSalonId]);

  const handleCalculate = () => {
    if (!selectedSalonId || !periodStart || !periodEnd) {
      alert('Please select a salon and period dates');
      return;
    }
    calculateMutation.mutate({
      salonId: selectedSalonId,
      periodStart,
      periodEnd,
    });
  };

  const handleMarkAsPaid = (payroll: PayrollRun) => {
    setSelectedPayroll(payroll);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (paymentMethod: string, paymentReference: string) => {
    if (!selectedPayroll) {
      alert('No payroll selected');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    markPaidMutation.mutate({
      id: selectedPayroll.id,
      paymentMethod,
      paymentReference: paymentReference || '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
              Payroll Management
            </h1>
            <p className="text-text-light/60 dark:text-text-dark/60">
              Calculate and manage employee payroll with salary and commissions
            </p>
          </div>
          <Button
            onClick={() => setShowCalculateModal(true)}
            icon="add"
            className="flex items-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            Calculate Payroll
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Payroll</span>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {formatCurrency(stats.totalGross)}
            </p>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              {stats.totalRuns} payroll run{stats.totalRuns !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">Paid</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {formatCurrency(stats.totalPaid)}
            </p>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              {stats.paidCount} paid
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">Pending</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {formatCurrency(stats.totalPending)}
            </p>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              {stats.pendingCount} pending
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">Employees</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {payrollHistory.length > 0
                ? new Set(payrollHistory.flatMap((run) => run.items.map((item) => item.salonEmployeeId))).size
                : 0}
            </p>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">Active employees</p>
          </div>
        </div>
      </div>

      {/* Salon Filter */}
      {salons.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
            Select Salon
          </label>
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a salon...</option>
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payroll History */}
      {isLoadingHistory ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading payroll history...</p>
          </div>
        </div>
      ) : payrollHistory.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 text-text-light/20 dark:text-text-dark/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            No Payroll Records
          </h3>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            {selectedSalonId
              ? 'Calculate your first payroll run to get started'
              : 'Select a salon to view payroll history'}
          </p>
          {selectedSalonId && (
            <Button onClick={() => setShowCalculateModal(true)}>Calculate Payroll</Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedPayroll.map((payroll) => (
              <PayrollCard
                key={payroll.id}
                payroll={payroll}
                onViewDetails={() => setSelectedPayroll(payroll)}
                onMarkAsPaid={() => handleMarkAsPaid(payroll)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {payrollHistory.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm text-text-light/60 dark:text-text-dark/60">
                Showing {startIndex + 1} - {Math.min(endIndex, payrollHistory.length)} of{' '}
                {payrollHistory.length}
              </div>
            </div>
          )}
        </>
      )}

      {/* Calculate Payroll Modal */}
      {showCalculateModal && (
        <CalculatePayrollModal
          salons={salons}
          selectedSalonId={selectedSalonId}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onSalonChange={setSelectedSalonId}
          onPeriodStartChange={setPeriodStart}
          onPeriodEndChange={setPeriodEnd}
          onCalculate={handleCalculate}
          onClose={() => {
            setShowCalculateModal(false);
            setPeriodStart('');
            setPeriodEnd('');
          }}
          isLoading={calculateMutation.isPending}
        />
      )}

      {/* Payroll Details Modal */}
      {selectedPayroll && !showPaymentModal && (
        <PayrollDetailsModal
          payroll={selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
          onMarkAsPaid={() => handleMarkAsPaid(selectedPayroll)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPayroll && (
        <PaymentModal
          payroll={selectedPayroll}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayroll(null);
          }}
          onSubmit={handlePaymentSubmit}
          isLoading={markPaidMutation.isPending}
        />
      )}
    </div>
  );
}

function PayrollCard({
  payroll,
  onViewDetails,
  onMarkAsPaid,
}: {
  payroll: PayrollRun;
  onViewDetails: () => void;
  onMarkAsPaid: () => void;
}) {
  const statusColors = {
    draft: 'bg-text-light/60 dark:bg-text-dark/60',
    processed: 'bg-warning',
    paid: 'bg-success',
    cancelled: 'bg-danger',
  };

  const statusLabels = {
    draft: 'Draft',
    processed: 'Pending Payment',
    paid: 'Paid',
    cancelled: 'Cancelled',
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
              {payroll.salon?.name || 'Salon Payroll'}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColors[payroll.status]}`}
            >
              {statusLabels[payroll.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-light/60 dark:text-text-dark/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
                {new Date(payroll.periodEnd).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{payroll.items.length} employee{payroll.items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
            <p className="text-2xl font-bold text-text-light dark:text-text-dark mb-1">
              {formatCurrency(Number(payroll.totalAmount))}
            </p>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Total Payroll</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="w-4 h-4" />
          View Details
        </Button>
        {payroll.status === 'processed' && (
          <Button variant="primary" size="sm" onClick={onMarkAsPaid}>
            <CreditCard className="w-4 h-4" />
            Mark as Paid
          </Button>
        )}
      </div>
    </div>
  );
}

function CalculatePayrollModal({
  salons,
  selectedSalonId,
  periodStart,
  periodEnd,
  onSalonChange,
  onPeriodStartChange,
  onPeriodEndChange,
  onCalculate,
  onClose,
  isLoading,
}: {
  salons: Salon[];
  selectedSalonId: string;
  periodStart: string;
  periodEnd: string;
  onSalonChange: (id: string) => void;
  onPeriodStartChange: (date: string) => void;
  onPeriodEndChange: (date: string) => void;
  onCalculate: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Calculate Payroll
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                Calculate payroll for a specific period
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
              Salon <span className="text-danger">*</span>
            </label>
            <select
              value={selectedSalonId}
              onChange={(e) => onSalonChange(e.target.value)}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select a salon...</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                Period Start <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => onPeriodStartChange(e.target.value)}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
                Period End <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => onPeriodEndChange(e.target.value)}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              This will calculate payroll for all active employees in the selected salon, including:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-text-light/60 dark:text-text-dark/60 list-disc list-inside">
              <li>Base salary (if configured)</li>
              <li>Unpaid commissions for the period</li>
              <li>Overtime (if applicable)</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onCalculate}
              disabled={!selectedSalonId || !periodStart || !periodEnd || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Calculate Payroll
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollDetailsModal({
  payroll,
  onClose,
  onMarkAsPaid,
}: {
  payroll: PayrollRun;
  onClose: () => void;
  onMarkAsPaid: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Payroll Details
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
                {new Date(payroll.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {formatCurrency(Number(payroll.totalAmount))}
                </p>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Employees</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {payroll.items.length}
                </p>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-xl p-4">
                <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">Status</p>
                <p className="text-lg font-semibold text-text-light dark:text-text-dark capitalize">
                  {payroll.status}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">
              Employee Breakdown
            </h3>
            <div className="space-y-3">
              {payroll.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-text-light dark:text-text-dark">
                        {item.salonEmployee?.user?.fullName || item.salonEmployee?.roleTitle || 'Employee'}
                      </p>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        {item.salonEmployee?.roleTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-text-light dark:text-text-dark">
                        {formatCurrency(Number(item.netPay))}
                      </p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60">Net Pay</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm pt-3 border-t border-border-light dark:border-border-dark">
                    <div>
                      <p className="text-text-light/60 dark:text-text-dark/60">Base Salary</p>
                      <p className="font-semibold text-text-light dark:text-text-dark">
                        {formatCurrency(Number(item.baseSalary))}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light/60 dark:text-text-dark/60">Commissions</p>
                      <p className="font-semibold text-text-light dark:text-text-dark">
                        {formatCurrency(Number(item.commissionAmount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light/60 dark:text-text-dark/60">Overtime</p>
                      <p className="font-semibold text-text-light dark:text-text-dark">
                        {formatCurrency(Number(item.overtimeAmount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-light/60 dark:text-text-dark/60">Deductions</p>
                      <p className="font-semibold text-text-light dark:text-text-dark">
                        {formatCurrency(Number(item.deductions))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {payroll.status === 'processed' && (
            <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
              <Button variant="primary" onClick={onMarkAsPaid} className="w-full">
                <CreditCard className="w-5 h-5" />
                Mark as Paid
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  payroll,
  onClose,
  onSubmit,
  isLoading,
}: {
  payroll: PayrollRun;
  onClose: () => void;
  onSubmit: (paymentMethod: string, paymentReference: string) => void;
  isLoading: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentMethod, paymentReference);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Mark as Paid
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                Record payment for this payroll
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
              Payment Method <span className="text-danger">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
              Payment Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter transaction ID or reference"
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">Total Amount:</p>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              {formatCurrency(Number(payroll.totalAmount))}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <Button variant="outline" onClick={onClose} className="flex-1" type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

