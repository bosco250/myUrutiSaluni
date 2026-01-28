'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
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
  Eye,
  Loader2,
  FileText,
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/components/ui/Toast';

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
    <ProtectedRoute
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}
    >
      <PayrollContent />
    </ProtectedRoute>
  );
}

function PayrollContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data?.data || response.data || [];
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
      return response.data?.data || response.data || [];
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
      toast.success('Payroll calculated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to calculate payroll');
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
      toast.success('Payroll marked as paid successfully');
    },
    onError: (error: unknown) => {
      const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        maybeAxios?.response?.data?.message ||
          maybeAxios?.message ||
          'Failed to mark payroll as paid. Please try again.'
      );
    },
  });

  // Calculate totals
  const stats = useMemo(() => {
    const historyArray = Array.isArray(payrollHistory) ? payrollHistory : [];
    const totalGross = historyArray.reduce((sum, run) => sum + Number(run.totalAmount), 0);
    const paidRuns = historyArray.filter((run) => run.status === 'paid');
    const totalPaid = paidRuns.reduce((sum, run) => sum + Number(run.totalAmount), 0);
    const pendingRuns = historyArray.filter((run) => run.status === 'processed');
    const totalPending = pendingRuns.reduce((sum, run) => sum + Number(run.totalAmount), 0);

    return {
      totalGross,
      totalPaid,
      totalPending,
      totalRuns: historyArray.length,
      paidCount: paidRuns.length,
      pendingCount: pendingRuns.length,
    };
  }, [payrollHistory]);

  // Pagination
  const historyArray = Array.isArray(payrollHistory) ? payrollHistory : [];
  const totalPages = Math.ceil(historyArray.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayroll = historyArray.slice(startIndex, endIndex);

  // Reset to page 1 when salon changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSalonId]);

  const handleCalculate = () => {
    if (!selectedSalonId || !periodStart || !periodEnd) {
      toast.error('Please select a salon and period dates');
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
      toast.error('No payroll selected');
      return;
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    markPaidMutation.mutate({
      id: selectedPayroll.id,
      paymentMethod,
      paymentReference: paymentReference || '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header / Hero */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Payroll</h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
            Calculate and manage payroll including salary and commissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCalculateModal(true)} size="sm" className="gap-2">
            <Calculator className="w-4 h-4" />
            Calculate Payroll
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Total Payroll */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 dark:text-indigo-400">Total Payroll</p>
            <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.totalGross.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
              {stats.totalRuns} run{stats.totalRuns !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Paid */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Paid</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.totalPaid.toLocaleString()} RWF</p>
           <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
              {stats.paidCount} paid
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-orange-600 dark:text-orange-400">Pending</p>
            <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.totalPending.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
              {stats.pendingCount} pending
            </span>
          </div>
        </div>

        {/* Employees */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Employees</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
             {Array.isArray(payrollHistory) && payrollHistory.length > 0
                  ? new Set(
                      payrollHistory.flatMap((run) => run.items.map((item) => item.salonEmployeeId))
                    ).size
                  : 0}
          </p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
              Active employees
            </span>
          </div>
        </div>
      </div>

      {/* Salon Filter */}
      {salons.length > 1 && (
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <label
            htmlFor="payroll-salon-filter"
            className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
          >
            Select Salon
          </label>
          <select
            id="payroll-salon-filter"
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="w-full md:w-80 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-text-light dark:text-text-dark">No payroll yet</h3>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2 mb-5">
            {selectedSalonId
              ? 'Calculate your first payroll run to get started'
              : 'Select a salon to view payroll history'}
          </p>
          {selectedSalonId && (
            <Button onClick={() => setShowCalculateModal(true)} size="sm" className="gap-2">
              <Calculator className="w-4 h-4" />
              Calculate Payroll
            </Button>
          )}
        </div>
      ) : (
        <>
      {/* Payroll Table */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Run Period
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Processed Date
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Employees
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Status
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Total Amount
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedPayroll.map((payroll) => {
                const statusColors = {
                  draft: 'bg-text-light/10 text-text-light dark:bg-text-dark/10 dark:text-text-dark',
                  processed: 'bg-warning/10 text-warning',
                  paid: 'bg-success/10 text-success',
                  cancelled: 'bg-danger/10 text-danger',
                };

                const statusLabels = {
                  draft: 'Draft',
                  processed: 'Pending',
                  paid: 'Paid',
                  cancelled: 'Cancelled',
                };

                return (
                  <tr
                    key={payroll.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light dark:text-text-dark">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                        <span>
                          {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
                          {new Date(payroll.periodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light/60 dark:text-text-dark/60">
                      {new Date(payroll.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light/60 dark:text-text-dark/60">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                        {payroll.items.length}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                          statusColors[payroll.status]
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            payroll.status === 'processed'
                              ? 'bg-warning'
                              : payroll.status === 'paid'
                              ? 'bg-success'
                              : payroll.status === 'cancelled'
                              ? 'bg-danger'
                              : 'bg-text-light/40 dark:bg-text-dark/40'
                          }`}
                        />
                        {statusLabels[payroll.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-text-light dark:text-text-dark">
                      {formatCurrency(Number(payroll.totalAmount))}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedPayroll(payroll)}
                          className="p-1.5 rounded hover:bg-background-light dark:hover:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {payroll.status === 'processed' && (
                          <button
                            onClick={() => handleMarkAsPaid(payroll)}
                            className="p-1.5 rounded hover:bg-background-light dark:hover:bg-background-dark text-text-light/60 dark:text-text-dark/60 hover:text-success hover:bg-success/10 transition-colors"
                            title="Mark as Paid"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {payrollHistory.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
              <span>
                Showing{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {startIndex + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {Math.min(endIndex, payrollHistory.length)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {payrollHistory.length}
                </span>{' '}
                results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <div className="text-xs font-medium text-text-light dark:text-text-dark">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Hero Header */}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Calculate Payroll</h2>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Compute a payroll run for a date range.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-light/50 transition-colors hover:bg-background-light hover:text-text-light dark:text-text-dark/50 dark:hover:bg-background-dark dark:hover:text-text-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" role="presentation">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Period</p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="payroll-calc-salon"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
                >
                  Salon <span className="text-danger">*</span>
                </label>
                <select
                  id="payroll-calc-salon"
                  value={selectedSalonId}
                  onChange={(e) => onSalonChange(e.target.value)}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="payroll-calc-start"
                    className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Period Start <span className="text-danger">*</span>
                  </label>
                  <input
                    id="payroll-calc-start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => onPeriodStartChange(e.target.value)}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="payroll-calc-end"
                    className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
                  >
                    Period End <span className="text-danger">*</span>
                  </label>
                  <input
                    id="payroll-calc-end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => onPeriodEndChange(e.target.value)}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-xs text-text-light/70 dark:text-text-dark/70">
              This will calculate payroll for all active employees in the selected salon, including:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-text-light/60 dark:text-text-dark/60 list-disc list-inside">
              <li>Base salary (if configured)</li>
              <li>Unpaid commissions for the period</li>
              <li>Overtime (if applicable)</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onCalculate}
              disabled={!selectedSalonId || !periodStart || !periodEnd || isLoading}
              loading={isLoading}
              loadingText="Calculating..."
              className="flex-1"
            >
              <Calculator className="w-4 h-4" />
              Calculate
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Payroll Details</h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
              {new Date(payroll.periodStart).toLocaleDateString()} -{' '}
              {new Date(payroll.periodEnd).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-light/50 transition-colors hover:bg-background-light hover:text-text-light dark:text-text-dark/50 dark:hover:bg-background-dark dark:hover:text-text-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" role="presentation">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-px bg-border-light dark:bg-border-dark border-b border-border-light dark:border-border-dark">
             <div className="bg-surface-light dark:bg-surface-dark p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-text-light/50 dark:text-text-dark/50 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-text-light dark:text-text-dark">{formatCurrency(Number(payroll.totalAmount))}</p>
             </div>
             <div className="bg-surface-light dark:bg-surface-dark p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-text-light/50 dark:text-text-dark/50 mb-1">Employees</p>
                <p className="text-lg font-bold text-text-light dark:text-text-dark">{payroll.items.length}</p>
             </div>
             <div className="bg-surface-light dark:bg-surface-dark p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-text-light/50 dark:text-text-dark/50 mb-1">Status</p>
                <p className="text-lg font-bold capitalize text-text-light dark:text-text-dark">{payroll.status}</p>
             </div>
          </div>

          <div className="p-0">
             <table className="w-full text-xs text-left">
              <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
                <tr>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Employee</th>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Base Salary</th>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Commissions</th>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Overtime</th>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Deductions</th>
                   <th className="px-5 py-3 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {payroll.items.map((item) => (
                  <tr key={item.id} className="hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                    <td className="px-5 py-3">
                       <p className="font-semibold text-text-light dark:text-text-dark">
                          {item.salonEmployee?.user?.fullName || item.salonEmployee?.roleTitle || 'Employee'}
                        </p>
                       <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-0.5">{item.salonEmployee?.roleTitle}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-text-light/80 dark:text-text-dark/80">{formatCurrency(Number(item.baseSalary))}</td>
                    <td className="px-5 py-3 text-right text-text-light/80 dark:text-text-dark/80">{formatCurrency(Number(item.commissionAmount))}</td>
                    <td className="px-5 py-3 text-right text-text-light/80 dark:text-text-dark/80">{formatCurrency(Number(item.overtimeAmount))}</td>
                    <td className="px-5 py-3 text-right text-danger/80">{formatCurrency(Number(item.deductions))}</td>
                    <td className="px-5 py-3 text-right font-bold text-text-light dark:text-text-dark">{formatCurrency(Number(item.netPay))}</td>
                  </tr>
                ))}
              </tbody>
             </table>
          </div>
        </div>

        {payroll.status === 'processed' && (
          <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex justify-end">
            <Button variant="primary" onClick={onMarkAsPaid} className="gap-2">
              <CreditCard className="w-4 h-4" />
              Mark as Paid
            </Button>
          </div>
        )}
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
  const [paymentMethod, setPaymentMethod] = useState<string>('wallet');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentMethod, paymentReference);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Mark as Paid</h2>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Record payment details for this payroll run.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-light/50 transition-colors hover:bg-background-light hover:text-text-light dark:text-text-dark/50 dark:hover:bg-background-dark dark:hover:text-text-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-5"
          role="presentation"
        >
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Payment</p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="payroll-payment-method"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
                >
                  Payment Method <span className="text-danger">*</span>
                </label>
                  <select
                  id="payroll-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="wallet">Wallet</option>
                  <option value="airtel_money">Airtel Money</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="payroll-payment-reference"
                  className="block text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-2"
                >
                  Reference / Transaction ID
                </label>
                <input
                  id="payroll-payment-reference"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter transaction ID or reference"
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
              Total Amount
            </p>
            <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
              {formatCurrency(Number(payroll.totalAmount))}
            </p>
          </div>

          <div className="h-px bg-border-light dark:bg-border-dark" />

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1" type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isLoading}
              loadingText="Processing..."
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Paid
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
