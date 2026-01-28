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
import { useToast } from '@/components/ui/Toast';

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
        return response.data.data || [];
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
        const salons = salonsResponse.data.data || [];
        const allEmployees: any[] = [];
        for (const salon of salons) {
          try {
            const empResponse = await api.get(`/salons/${salon.id}/employees`);
            allEmployees.push(...(empResponse.data.data || []));
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

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredCommissions.length) return;

    const headers = [
      'Date',
      'Time',
      'Employee',
      'Role',
      'Source',
      'Item',
      'Sale Amount (RWF)',
      'Rate (%)',
      'Commission (RWF)',
      'Status',
      'Paid Date'
    ];

    const rows = filteredCommissions.map(c => {
      const date = new Date(c.createdAt);
      const source = c.metadata?.source || (c.saleItemId ? 'sale' : 'appointment');
      
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        c.salonEmployee?.user?.fullName || 'Unknown',
        c.salonEmployee?.roleTitle || '-',
        source,
        c.saleItem?.service?.name || c.saleItem?.product?.name || 'N/A',
        toNumber(c.saleItem?.lineTotal || c.saleAmount),
        toNumber(c.commissionRate),
        toNumber(c.amount),
        c.paid ? 'Paid' : 'Pending',
        c.paidAt ? new Date(c.paidAt).toLocaleDateString() : '-'
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `commissions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payment Logic
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { success, error: errorToast } = useToast();

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
      success('Commission payment successful');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Payment failed. Please try again.';
      setPaymentError(message);
      errorToast(`Commission payment failed: ${message}`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-3">Loading commissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-light dark:text-text-dark">
            {user?.role === UserRole.SALON_EMPLOYEE ? 'My Commissions' : 'Commissions'}
          </h1>
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-0.5">
            Track earnings, payments, and sales performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredCommissions.length === 0}
            className="flex items-center gap-1.5 text-xs h-8"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {user?.role !== UserRole.SALON_EMPLOYEE && (
            <Button
              onClick={() => handlePayment()}
              disabled={stats.unpaidCount === 0}
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark All Paid
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        {/* Total Earnings Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 dark:text-indigo-400">Total Earnings</p>
            <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.total.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
              {stats.count} records
            </span>
          </div>
        </div>

        {/* Paid Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Paid</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.paid.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
              {stats.paidCount} txns
            </span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-orange-600 dark:text-orange-400">Pending</p>
            <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md group-hover:scale-110 transition-transform">
              <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.unpaid.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
              {stats.unpaidCount} pending
            </span>
          </div>
        </div>

        {/* Related Sales Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-purple-600 dark:text-purple-400">Total Sales</p>
            <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Receipt className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.sales.toLocaleString()} RWF</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50 truncate">
              Original sales value
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto scrollbar-hide">
          {['all', 'today', 'thisWeek', 'thisMonth'].map((filter) => (
            <button
              key={filter}
              onClick={() => handleQuickFilter(filter)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedQuickFilter === filter
                  ? 'bg-primary text-white'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark'
              }`}
            >
              {filter === 'all' ? 'All Time' : filter.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
            </button>
          ))}
          <div className="h-5 w-px bg-border-light dark:bg-border-dark mx-1" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              showFilters
                ? 'bg-primary/10 text-primary'
                : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filters
          </button>
        </div>

        <div className="relative w-full lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commissions..."
            className="w-full h-9 pl-8 pr-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
          </select>

          {user?.role !== UserRole.SALON_EMPLOYEE && employees.length > 0 && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 px-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
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
              className="h-9 px-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange(prev => ({ ...prev, end: e.target.value }));
                setSelectedQuickFilter('custom');
              }}
              className="h-9 px-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Date</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Employee</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Source</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Item</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Rate</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Commission</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Status</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Receipt className="w-6 h-6 text-text-light/20 dark:text-text-dark/20" />
                      <p className="text-xs text-text-light/40 dark:text-text-dark/40">No commissions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((commission) => {
                  const source = commission.metadata?.source || (commission.saleItemId ? 'sale' : 'appointment');
                  return (
                    <tr key={commission.id} className="hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap text-text-light dark:text-text-dark">
                        <span className="text-xs">{new Date(commission.createdAt).toLocaleDateString()}</span>
                        <span className="block text-[10px] text-text-light/40 dark:text-text-dark/40">{new Date(commission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-text-light dark:text-text-dark">{commission.salonEmployee?.user?.fullName || 'Unknown'}</span>
                        <span className="block text-[10px] text-text-light/40 dark:text-text-dark/40">{commission.salonEmployee?.roleTitle}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          source === 'sale'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/70 dark:text-text-dark/70'
                        }`}>
                          {source === 'sale' ? <Receipt className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                          {source === 'sale' ? 'Sale' : 'Appt'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-text-light dark:text-text-dark">
                          {commission.saleItem?.service?.name || commission.saleItem?.product?.name || 'N/A'}
                        </span>
                        <span className="block text-[10px] text-text-light/40 dark:text-text-dark/40">
                          {toNumber(commission.saleItem?.lineTotal || commission.saleAmount).toLocaleString()} RWF
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-text-light/60 dark:text-text-dark/60 tabular-nums">
                        {toNumber(commission.commissionRate).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-primary tabular-nums">
                        {toNumber(commission.amount).toLocaleString()} RWF
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          commission.paid
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${commission.paid ? 'bg-success' : 'bg-warning'}`} />
                          {commission.paid ? 'Paid' : 'Pending'}
                        </span>
                        {commission.paid && commission.paidAt && (
                          <span className="block text-[10px] text-text-light/30 dark:text-text-dark/30 mt-0.5">
                            {new Date(commission.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {!commission.paid && user?.role !== UserRole.SALON_EMPLOYEE && (
                          <button
                            className="px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handlePayment(commission)}
                          >
                            Mark Paid
                          </button>
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
        {/* Pagination */}
        {filteredCommissions.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
              <span>
                Showing{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {Math.min(currentPage * itemsPerPage, filteredCommissions.length)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-text-light dark:text-text-dark">
                  {filteredCommissions.length}
                </span>{' '}
                results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
      const response = await api.get('/wallets/me');
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
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl max-w-sm w-full p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">Pay Commission</h2>
            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-0.5">
              {count > 1 ? `${count} pending commissions` : 'Single commission payment'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-background-light dark:hover:bg-background-dark transition-colors">
            <X className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {error.toLowerCase().includes('insufficient') && (
                <button
                  onClick={() => { onClose(); router.push('/wallets'); }}
                  className="block mt-1 text-primary hover:underline font-semibold text-xs"
                >
                  Top up your wallet
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Amount Display */}
          <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 text-center border border-border-light dark:border-border-dark">
            <span className="text-[10px] font-semibold text-text-light/50 dark:text-text-dark/50 uppercase">Total to Pay</span>
            <p className="text-xl font-bold text-primary mt-0.5">
              RWF {totalAmount.toLocaleString()}
            </p>
          </div>

          {/* Wallet Balance Warning */}
          {method === 'wallet' && hasInsufficientBalance && !error && (
            <div className="p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-warning">Insufficient Balance</p>
                  <p className="text-text-light/60 dark:text-text-dark/60 mt-0.5">
                    Wallet: RWF {walletBalance.toLocaleString()} / Need: RWF {totalAmount.toLocaleString()}
                  </p>
                  <button
                    onClick={() => { onClose(); router.push('/wallets'); }}
                    className="mt-1.5 text-primary hover:underline font-semibold flex items-center gap-1 text-xs"
                  >
                    <Wallet className="w-3 h-3" />
                    Top up wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div>
            <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1.5">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const isSelected = method === pm.id;
                const isDisabled = pm.disabled && pm.id === 'wallet';
                return (
                  <button
                    key={pm.id}
                    onClick={() => !isDisabled && setMethod(pm.id)}
                    disabled={isLoading}
                    className={`p-2.5 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/5 border-primary'
                        : 'border-border-light dark:border-border-dark hover:border-text-light/20 dark:hover:border-text-dark/20'
                    } ${isDisabled ? 'opacity-40' : ''}`}
                    type="button"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-text-light/50 dark:text-text-dark/50'}`} />
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
                        {pm.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-light/40 dark:text-text-dark/40">
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
              <label htmlFor="commission-payment-reference" className="block text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                Transaction Reference
              </label>
              <input
                id="commission-payment-reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Airtel Money Transaction ID"
                className="w-full h-9 px-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onSubmit(method, reference)}
              disabled={isLoading || (method === 'wallet' && hasInsufficientBalance)}
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Pay Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
