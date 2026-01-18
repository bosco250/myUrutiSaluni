'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  Filter,
  DollarSign,
  User,
  Calendar,
  Check,
  X,
  Loader2,
  Download,
  Users,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Receipt,
  Scissors,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Skeleton';

interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  saleAmount: number;
  paid: boolean;
  paidAt?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
  paymentReference?: string;
  payrollItemId?: string;
  saleItemId?: string;
  createdAt: string;
  metadata?: {
    source?: 'sale' | 'appointment';
    saleId?: string;
    appointmentId?: string;
    serviceId?: string;
    productId?: string;
    [key: string]: any;
  };
  salonEmployee?: {
    id: string;
    salonId?: string;
    salon?: {
      id: string;
      name: string;
    };
    user?: {
      fullName: string;
      email?: string;
    };
    roleTitle?: string;
  };
  saleItem?: {
    id: string;
    service?: {
      name: string;
    };
    product?: {
      name: string;
    };
    lineTotal: number;
    sale?: {
      id: string;
      totalAmount: number;
      createdAt: string;
    };
  };
}

interface CommissionSummary {
  totalCommissions: number;
  paidCommissions: number;
  unpaidCommissions: number;
  totalSales: number;
  count: number;
}

export default function CommissionsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <CommissionsContent />
    </ProtectedRoute>
  );
}

function CommissionsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Date utilities
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (filter: string): { start: string; end: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        return { start: formatLocalDate(today), end: formatLocalDate(today) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: formatLocalDate(yesterday), end: formatLocalDate(yesterday) };
      }
      case 'thisWeek': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        return { start: formatLocalDate(start), end: formatLocalDate(today) };
      }
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatLocalDate(start), end: formatLocalDate(today) };
      }
      case 'lastMonth': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: formatLocalDate(start), end: formatLocalDate(end) };
      }
      case 'thisYear': {
        const start = new Date(today.getFullYear(), 0, 1);
        return { start: formatLocalDate(start), end: formatLocalDate(today) };
      }
      default:
        return { start: '', end: '' };
    }
  };

  const handleQuickFilter = async (filter: string) => {
    setSelectedQuickFilter(filter);
    if (filter === 'all') {
      setDateRange({ start: '', end: '' });
    } else {
      setDateRange(getDateRange(filter));
    }
    await refetch();
  };

  // Queries
  const {
    data: commissions = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<Commission[]>({
    queryKey: ['commissions', statusFilter, employeeFilter, dateRange.start, dateRange.end],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('paid', statusFilter === 'paid' ? 'true' : 'false');
        if (user?.role !== UserRole.SALON_EMPLOYEE && employeeFilter && employeeFilter !== 'all') {
          params.append('salonEmployeeId', employeeFilter);
        }
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);

        const response = await api.get(`/commissions?${params.toString()}`);
        return response.data || [];
      } catch (err: any) {
        throw new Error(err?.response?.data?.message || err?.message || 'Failed to load commissions');
      }
    },
    enabled: !!user,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['salon-employees', user?.id],
    queryFn: async () => {
      try {
        const salonsResponse = await api.get('/salons');
        const salons = salonsResponse.data || [];
        const allEmployees: any[] = [];
        for (const salon of salons) {
          try {
            const empResponse = await api.get(`/salons/${salon.id}/employees`);
            allEmployees.push(...(empResponse.data || []));
          } catch {}
        }
        return allEmployees;
      } catch {
        return [];
      }
    },
    enabled: [UserRole.SALON_OWNER, UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN].includes(user?.role as UserRole),
  });

  // Filtering & Pagination
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          commission.id.toLowerCase().includes(query) ||
          commission.salonEmployee?.user?.fullName.toLowerCase().includes(query) ||
          commission.saleItem?.service?.name.toLowerCase().includes(query) ||
          commission.saleItem?.product?.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [commissions, searchQuery]);

  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCommissions = filteredCommissions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, employeeFilter, dateRange]);

  // Statistics
  const toNumber = (val: any) => Number(val) || 0;
  
  const stats = useMemo(() => {
    const total = filteredCommissions.reduce((sum, c) => sum + toNumber(c.amount), 0);
    const paid = filteredCommissions.filter(c => c.paid).reduce((sum, c) => sum + toNumber(c.amount), 0);
    const sales = filteredCommissions.reduce((sum, c) => sum + toNumber(c.saleItem?.sale?.totalAmount || c.saleAmount), 0);
    
    return {
      total,
      paid,
      unpaid: total - paid,
      sales,
      count: filteredCommissions.length,
      paidCount: filteredCommissions.filter(c => c.paid).length,
      unpaidCount: filteredCommissions.filter(c => !c.paid).length,
    };
  }, [filteredCommissions]);

  // Payment Logic
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const markAsPaidMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = data.ids 
        ? '/commissions/mark-paid-batch' 
        : `/commissions/${data.id}/mark-paid`;
      // Only send required fields to backend, not id/ids
      const body = data.ids 
        ? { commissionIds: data.ids, paymentMethod: data.paymentMethod, paymentReference: data.paymentReference } 
        : { paymentMethod: data.paymentMethod, paymentReference: data.paymentReference };
      return api.post(endpoint, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setShowPaymentModal(false);
      setSelectedCommission(null);
      setPaymentError(null);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Payment failed. Please try again.';
      setPaymentError(message);
    },
  });

  const handlePayment = (commission?: Commission) => {
    if (commission) {
      setSelectedCommission(commission);
    } else {
      const unpaid = filteredCommissions.filter(c => !c.paid);
      if (!unpaid.length) return;
      setSelectedCommission({ id: 'batch', amount: stats.unpaid } as any);
    }
    setShowPaymentModal(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            {user?.role === UserRole.SALON_EMPLOYEE ? 'My Commissions' : 'Commissions'}
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
            Track earnings, payments, and sales performance
          </p>
        </div>
        {user?.role !== UserRole.SALON_EMPLOYEE && (
          <Button 
            onClick={() => handlePayment()} 
            disabled={stats.unpaidCount === 0}
            variant="primary"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Paid
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total Earnings</span>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats.total.toLocaleString()} <span className="text-sm font-normal text-text-light/60">RWF</span>
          </p>
          <div className="mt-2 text-xs text-text-light/60 dark:text-text-dark/60 flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            {stats.count} records
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Paid</span>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-success">
            {stats.paid.toLocaleString()} <span className="text-sm font-normal text-text-light/60">RWF</span>
          </p>
          <div className="mt-2 text-xs text-text-light/60 dark:text-text-dark/60">
            {stats.paidCount} transactions
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Pending</span>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-warning">
            {stats.unpaid.toLocaleString()} <span className="text-sm font-normal text-text-light/60">RWF</span>
          </p>
          <div className="mt-2 text-xs text-text-light/60 dark:text-text-dark/60">
            {stats.unpaidCount} pending
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Related Sales</span>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <TrendingUp className="w-4 h-4 text-text-light dark:text-text-dark" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats.sales.toLocaleString()} <span className="text-sm font-normal text-text-light/60">RWF</span>
          </p>
          <div className="mt-2 text-xs text-text-light/60 dark:text-text-dark/60">
            Total sales value
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
            {['all', 'today', 'thisWeek', 'thisMonth'].map((filter) => (
              <button
                key={filter}
                onClick={() => handleQuickFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedQuickFilter === filter
                    ? 'bg-primary text-white'
                    : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {filter === 'all' ? 'All Time' : filter.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
              </button>
            ))}
            <div className="h-6 w-px bg-border-light dark:bg-border-dark mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10 border-primary text-primary' : ''}
            >
              <Filter className="w-3.5 h-3.5 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commissions..."
              className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-light dark:border-border-dark animate-in slide-in-from-top-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>

            {user?.role !== UserRole.SALON_EMPLOYEE && employees.length > 0 && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm"
              >
                <option value="all">All Employees</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.user?.fullName || emp.roleTitle}</option>
                ))}
              </select>
            )}

            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setSelectedQuickFilter('custom');
                }}
                className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }));
                  setSelectedQuickFilter('custom');
                }}
                className="px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-background-light/50 dark:bg-background-dark/50 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Date</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Employee</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Source</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Item</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Rate</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60 text-right">Commission</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60">Status</th>
                <th className="px-6 py-3 font-medium text-text-light/60 dark:text-text-dark/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 opacity-50" />
                      <p>No commissions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((commission) => {
                  const source = commission.metadata?.source || (commission.saleItemId ? 'sale' : 'appointment');
                  return (
                    <tr key={commission.id} className="hover:bg-background-light/50 dark:hover:bg-background-dark/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-text-light dark:text-text-dark">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{commission.salonEmployee?.user?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-text-light/60">{commission.salonEmployee?.roleTitle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
                          source === 'sale' 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        }`}>
                          {source === 'sale' ? <Receipt className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {source === 'sale' ? 'Sale' : 'Appointment'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-light dark:text-text-dark">
                          {commission.saleItem?.service?.name || commission.saleItem?.product?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-text-light/60">
                          Sale: {toNumber(commission.saleItem?.lineTotal || commission.saleAmount).toLocaleString()} RWF
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-light/60">
                        {toNumber(commission.commissionRate).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-primary">
                        {toNumber(commission.amount).toLocaleString()} RWF
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                          commission.paid 
                            ? 'bg-success/10 text-success ring-1 ring-success/20' 
                            : 'bg-warning/10 text-warning ring-1 ring-warning/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${commission.paid ? 'bg-success' : 'bg-warning'}`} />
                          {commission.paid ? 'Paid' : 'Pending'}
                        </span>
                        {commission.paid && commission.paidAt && (
                          <div className="text-[10px] text-text-light/40 mt-1">
                            {new Date(commission.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!commission.paid && user?.role !== UserRole.SALON_EMPLOYEE && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => handlePayment(commission)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <span className="text-xs text-text-light/60">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCommission && (
        <CommissionPaymentModal
          commission={selectedCommission}
          totalAmount={selectedCommission.id === 'batch' ? selectedCommission.amount : toNumber(selectedCommission.amount)}
          count={selectedCommission.id === 'batch' ? stats.unpaidCount : 1}
          error={paymentError}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCommission(null);
            setPaymentError(null);
          }}
          onSubmit={(method: string, ref: string) => markAsPaidMutation.mutate({
            id: selectedCommission.id !== 'batch' ? selectedCommission.id : undefined,
            ids: selectedCommission.id === 'batch' ? filteredCommissions.filter(c => !c.paid).map(c => c.id) : undefined,
            paymentMethod: method,
            paymentReference: ref
          })}
          isLoading={markAsPaidMutation.isPending}
        />
      )}
    </div>
  );
}

function CommissionPaymentModal({
  commission,
  totalAmount,
  count,
  error,
  onClose,
  onSubmit,
  isLoading,
}: any) {
  const router = useRouter();
  const [method, setMethod] = useState<'wallet' | 'mobile_money'>('wallet');
  const [reference, setReference] = useState('');

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: async () => {
      const response = await api.get('/wallets/my-wallet');
      return response.data;
    },
  });

  const walletBalance = walletData?.balance ? Number(walletData.balance) : 0;
  const hasInsufficientBalance = walletBalance < totalAmount;

  // Payment methods config
  const paymentMethods = [
    { 
      id: 'wallet' as const, 
      label: 'Wallet', 
      icon: Wallet,
      description: `Balance: RWF ${walletBalance.toLocaleString()}`,
      disabled: hasInsufficientBalance,
    },
    { 
      id: 'mobile_money' as const, 
      label: 'Airtel Money', 
      icon: CreditCard,
      description: 'Direct transfer',
      disabled: false,
    },
  ];

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
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Pay Commission</h2>
              <p className="text-sm text-text-light/60">
                {count > 1 ? `${count} pending commissions` : 'Single commission payment'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition">
            <X className="w-5 h-5 opacity-50" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {error.toLowerCase().includes('insufficient') && (
                <button 
                  onClick={() => { onClose(); router.push('/wallets'); }}
                  className="block mt-1 text-primary hover:underline font-semibold"
                >
                  → Top up your wallet
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 text-center border border-border-light dark:border-border-dark">
            <span className="text-xs font-semibold text-text-light/60 uppercase">Total to Pay</span>
            <p className="text-3xl font-bold text-primary mt-1">
              RWF {totalAmount.toLocaleString()}
            </p>
          </div>

          {/* Wallet Balance Warning */}
          {method === 'wallet' && hasInsufficientBalance && !error && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-warning">Insufficient Balance</p>
                  <p className="text-text-light/70 dark:text-text-dark/70 mt-0.5">
                    Your wallet has RWF {walletBalance.toLocaleString()}, but you need RWF {totalAmount.toLocaleString()}.
                  </p>
                  <button 
                    onClick={() => { onClose(); router.push('/wallets'); }}
                    className="mt-2 text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Top up your wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div>
            <p className="block text-sm font-medium mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const isSelected = method === pm.id;
                const isDisabled = pm.disabled && pm.id === 'wallet';
                return (
                  <button
                    key={pm.id}
                    onClick={() => !isDisabled && setMethod(pm.id)}
                    disabled={isLoading}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    } ${isDisabled ? 'opacity-50' : ''}`}
                    type="button"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-text-light/60'}`} />
                      <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : ''}`}>
                        {pm.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-light/50 dark:text-text-dark/50">
                      {walletLoading && pm.id === 'wallet' ? 'Loading...' : pm.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Input (for Airtel) */}
          {method === 'mobile_money' && (
            <div>
              <label htmlFor="commission-payment-reference" className="block text-sm font-medium mb-1.5">
                Transaction Reference
              </label>
              <input
                id="commission-payment-reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Airtel Money Transaction ID"
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button 
              variant="primary" 
              className="flex-1" 
              onClick={() => onSubmit(method, reference)}
              disabled={isLoading || (method === 'wallet' && hasInsufficientBalance)}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
