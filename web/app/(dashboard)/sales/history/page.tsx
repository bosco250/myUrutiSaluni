'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  CreditCard,
  Loader2,
  ArrowLeft,
  Receipt,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  Banknote,
  Smartphone,
  Clock,
  Hash,
  ArrowUpRight,
  Calendar,
  User,
  Scissors
} from 'lucide-react';

interface SaleItem {
  id: string;
  service?: { id: string; name: string };
  product?: { id: string; name: string };
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
  customer?: { id: string; fullName: string; phone: string };
  salon?: { id: string; name: string };
  createdBy?: { id: string; fullName: string };
  employees?: Array<{ id: string; name: string }>;
  totalCommission?: number;
  items?: SaleItem[];
}

interface Salon {
  id: string;
  name: string;
}

export default function SalesHistoryPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
        UserRole.CUSTOMER,
      ]}
    >
      <SalesHistoryContent />
    </ProtectedRoute>
  );
}

function SalesHistoryContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

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
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        return { start: formatLocalDate(startOfWeek), end: formatLocalDate(today) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatLocalDate(startOfMonth), end: formatLocalDate(today) };
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: formatLocalDate(startOfLastMonth), end: formatLocalDate(endOfLastMonth) };
      }
      case 'thisYear': {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return { start: formatLocalDate(startOfYear), end: formatLocalDate(today) };
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
      const range = getDateRange(filter);
      if (range.start && range.end) setDateRange(range);
    }
    handleFilterChange();
    await refetch();
  };

  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
      } catch {
        return [];
      }
    },
  });

  const hasClientSideFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    dateRange.start ||
    dateRange.end;

  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer-by-user', user?.id],
    queryFn: async () => {
      if (user?.role === 'customer') {
        const response = await api.get(`/customers/by-user/${user.id}`);
        // Handle response wrapping { data: Customer }
        const body = response.data;
        return body?.data || body;
      }
      return null;
    },
    enabled: !!user?.id && user?.role === 'customer',
  });

  const {
    data: salesData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<{
    data: Sale[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [
      'sales',
      user?.role,
      customer?.id,
      salonFilter,
      dateRange.start,
      dateRange.end,
      hasClientSideFilters ? 'all' : currentPage,
      hasClientSideFilters ? 10000 : itemsPerPage,
    ],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', hasClientSideFilters ? '1' : currentPage.toString());
        params.append('limit', hasClientSideFilters ? '10000' : itemsPerPage.toString());

        let url = '/sales';
        if (user?.role === 'customer' && customer?.id) {
          url = `/sales/customer/${customer.id}`;
        } else {
          if (salonFilter !== 'all') params.append('salonId', salonFilter);
          if (dateRange.start) params.append('startDate', dateRange.start);
          if (dateRange.end) params.append('endDate', dateRange.end);
        }

        const response = await api.get(`${url}?${params.toString()}`);
        let responseData = response.data;

        // Standard unwrapping for NestJS wrapped responses
        if (responseData && typeof responseData === 'object' && 'data' in responseData && 'statusCode' in responseData) {
          responseData = responseData.data;
        }

        // Handle case where data might be direct array (unlikely with pagination)
        if (Array.isArray(responseData)) {
          return {
            data: responseData,
            total: responseData.length,
            page: 1,
            limit: 10000,
            totalPages: 1
          };
        }

        // Handle standard pagination structure { data: Sale[], total: number, ... }
        return {
          data: responseData?.data || [],
          total: responseData?.total || 0,
          page: responseData?.page || 1,
          limit: responseData?.limit || itemsPerPage,
          totalPages: responseData?.totalPages || Math.ceil((responseData?.total || 0) / itemsPerPage)
        };
      } catch (err: unknown) {
        const errorData = (err as { response?: { data?: { message?: string } } })?.response?.data;
        const message = errorData?.message || (err as Error)?.message || 'Failed to load sales.';
        // Only toast error if it's not a loading state issue
        if (user?.role !== 'customer' || customer?.id) {
            toast.error(message);
        }
        throw new Error(message);
      }
    },
    enabled: !!user?.role && (user.role !== 'customer' || !!customer?.id),
  });

  const { sales, totalSales } = useMemo(() => {
    return {
      sales: salesData?.data || [],
      totalSales: salesData?.total || 0,
    };
  }, [salesData]);

  const filteredSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          sale.id.toLowerCase().includes(query) ||
          sale.customer?.fullName.toLowerCase().includes(query) ||
          sale.customer?.phone.includes(query) ||
          sale.paymentReference?.toLowerCase().includes(query) ||
          sale.salon?.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (statusFilter !== 'all' && sale.status !== statusFilter) return false;
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) return false;
      if (salonFilter !== 'all' && sale.salon?.id !== salonFilter) return false;
      if (dateRange.start || dateRange.end) {
        const saleDate = new Date(sale.createdAt);
        if (dateRange.start && saleDate < new Date(dateRange.start)) return false;
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (saleDate > endDate) return false;
        }
      }
      return true;
    });
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sales, searchQuery, statusFilter, paymentMethodFilter, salonFilter, dateRange]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + (Number(sale.totalAmount) || 0),
      0
    );
    const filteredCount = filteredSales.length;
    const averageSale = filteredCount > 0 ? totalRevenue / filteredCount : 0;
    const cashSales = filteredSales.filter((s) => s.paymentMethod === 'cash').length;
    const cardSales = filteredSales.filter((s) => s.paymentMethod === 'card').length;
    const mobileMoneySales = filteredSales.filter((s) => s.paymentMethod === 'mobile_money').length;
    return {
      totalRevenue,
      totalSales: filteredCount,
      averageSale,
      cashSales,
      cardSales,
      mobileMoneySales,
    };
  }, [filteredSales]);

  const paginatedSales = useMemo(() => {
    if (hasClientSideFilters) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredSales.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredSales;
  }, [filteredSales, currentPage, itemsPerPage, hasClientSideFilters]);

  const totalPages = useMemo(() => {
    if (hasClientSideFilters) return Math.ceil(filteredSales.length / itemsPerPage);
    return salesData?.totalPages || Math.ceil((salesData?.total || 0) / itemsPerPage) || 1;
  }, [
    hasClientSideFilters,
    filteredSales.length,
    itemsPerPage,
    salesData?.totalPages,
    salesData?.total,
  ]);

  const handleFilterChange = () => setCurrentPage(1);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  
  const formatPaymentMethod = (method: string) =>
    method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-3.5 h-3.5" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'mobile_money':
        return <Smartphone className="w-3.5 h-3.5" />;
      default:
        return <DollarSign className="w-3.5 h-3.5" />;
    }
  };

  const handleDownloadCSV = () => {
    if (!filteredSales.length) return;

    const headers = [
      'Date',
      'ID',
      'Customer',
      'Phone',
      'Items',
      'Total Amount',
      'Status',
      'Payment Method',
      'Salon'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredSales.map(sale => {
        const items = sale.items?.map(i => i.service?.name || i.product?.name).join('; ') || '';
        // Escape quotes in strings
        const escape = (str: string) => str.replace(/"/g, '""');
        
        const row = [
          `"${new Date(sale.createdAt).toLocaleString()}"`,
          `"${sale.id}"`,
          `"${escape(sale.customer?.fullName || 'Walk-in')}"`,
          `"${escape(sale.customer?.phone || '')}"`,
          `"${escape(items)}"`,
          sale.totalAmount,
          sale.status,
          sale.paymentMethod,
          `"${escape(sale.salon?.name || '')}"`
        ];
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading State
  const isActuallyLoading = isLoading || (user?.role === 'customer' && isLoadingCustomer);
  
  if (isActuallyLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error State
  const combinedError = error || customerError;
  if (combinedError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <X className="w-10 h-10 text-error mx-auto mb-3" />
          <h3 className="text-lg font-bold text-error mb-2">Failed to load sales history</h3>
          <p className="text-sm text-error/80 mb-4">
            {(combinedError as Error)?.message || 'Unknown error'}
          </p>
          <Button
            onClick={() => refetch()}
            variant="primary"
            className="flex items-center gap-2 mx-auto"
          >
            <Loader2 className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const quickFilters = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'thisMonth', label: 'This Month' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user?.role !== UserRole.CUSTOMER && (
            <Button
              onClick={() => router.push('/sales')}
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-3">
              {user?.role === UserRole.CUSTOMER ? 'My Purchases' : 'Sales History'}
            </h1>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
              {user?.role === UserRole.CUSTOMER
                ? 'View your purchase history and receipts'
                : 'Track and manage transaction history'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {user?.role !== UserRole.CUSTOMER ? (
            <>
              <Button
                onClick={handleDownloadCSV}
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => router.push('/sales/analytics')}
                variant="secondary"
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={() => router.push('/sales')}
                variant="primary"
                size="sm"
              >
                <Receipt className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </>
          ) : (
            <Button
                onClick={handleDownloadCSV}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Total Revenue */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Total Revenue</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">RWF {stats.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Gross sales volume
             </span>
          </div>
        </div>

        {/* Transactions */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Transactions</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Receipt className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.totalSales}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               Completed orders
            </span>
          </div>
        </div>

        {/* Average Value */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-purple-600 dark:text-purple-400">Avg. Value</p>
            <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform">
              <TrendingUp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">RWF {stats.averageSale.toFixed(0)}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Per transaction
             </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-orange-200 dark:border-orange-800/50 rounded-xl p-3 hover:border-orange-300 dark:hover:border-orange-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-orange-600 dark:text-orange-400">Breakdown</p>
            <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md group-hover:scale-110 transition-transform">
              <BarChart3 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">{stats.cashSales}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">{stats.cardSales}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
               <span className="text-[10px] font-medium text-text-light dark:text-text-dark">{stats.mobileMoneySales}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto scrollbar-hide">
            {quickFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => handleQuickFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedQuickFilter === f.key
                    ? 'bg-primary text-white'
                    : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {f.label}
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
              Filters
            </Button>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange();
              }}
              placeholder="Search sales..."
              className="w-full pl-9 pr-4 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-3 pt-3 border-t border-border-light dark:border-border-dark animate-in slide-in-from-top-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
              className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                handleFilterChange();
              }}
              className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
            </select>

            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={async (e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }));
                  setSelectedQuickFilter('custom');
                  handleFilterChange();
                  await refetch();
                }}
                className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs w-full"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={async (e) => {
                   setDateRange(prev => ({ ...prev, end: e.target.value }));
                   setSelectedQuickFilter('custom');
                   handleFilterChange();
                   await refetch();
                }}
                className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs w-full"
              />
            </div>
            
             {salons.length > 0 && user?.role !== UserRole.CUSTOMER && (
               <div className="col-span-2">
                <select
                  value={salonFilter}
                  onChange={(e) => {
                    setSalonFilter(e.target.value);
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs"
                >
                  <option value="all">All Salons</option>
                  {salons.map((salon) => (
                    <option key={salon.id} value={salon.id}>
                      {salon.name}
                    </option>
                  ))}
                </select>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Sales List */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Date</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">ID</th>
                {user?.role !== UserRole.CUSTOMER && (
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Customer</th>
                )}
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Items</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Amount</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Status</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedSales.length === 0 ? (
                 <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 opacity-50" />
                      <p>No sales found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-background-light dark:hover:bg-background-dark transition-colors group">
                    <td className="px-3 py-2.5 text-text-light dark:text-text-dark whitespace-nowrap">
                       <div className="flex items-center gap-2">
                         <Calendar className="w-3.5 h-3.5 text-text-light/40" />
                         {formatDate(sale.createdAt)}
                       </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-light/60 dark:text-text-dark/60">
                      #{sale.id.slice(0, 8)}
                    </td>
                    {user?.role !== UserRole.CUSTOMER && (
                      <td className="px-3 py-2.5 text-text-light dark:text-text-dark">
                         <div className="flex items-center gap-2">
                           <User className="w-3.5 h-3.5 text-text-light/40" />
                           {sale.customer?.fullName || 'Walk-in Customer'}
                         </div>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-text-light/80 dark:text-text-dark/80 max-w-[200px] truncate">
                       {sale.items?.map(i => i.service?.name || i.product?.name).join(', ') || 'No items'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-text-light dark:text-text-dark">
                      {sale.currency || 'RWF'} {Number(sale.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                       <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                          sale.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : sale.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                       <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => router.push(`/sales/${sale.id}`)}
                         >
                           <Eye className="w-3.5 h-3.5 text-primary" />
                         </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-border-light/50 dark:divide-border-dark/50">
          {paginatedSales.map((sale) => (
            <div 
              key={sale.id}
              className="p-4 hover:bg-background-light/50 dark:hover:bg-background-dark/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/sales/${sale.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                    {sale.currency || 'RWF'} {Number(sale.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-text-light/60 mt-1 flex items-center gap-1.5">
                     <Clock className="w-3 h-3" /> {formatDate(sale.createdAt)}
                  </div>
                </div>
                 <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      sale.status === 'completed'
                        ? 'bg-success/10 text-success border-success/20'
                        : sale.status === 'pending'
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-error/10 text-error border-error/20'
                    }`}
                  >
                    {sale.status}
                  </span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                 <div className="flex items-center gap-1">
                   {getPaymentIcon(sale.paymentMethod)}
                   {formatPaymentMethod(sale.paymentMethod)}
                 </div>
                 <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */ }
        {filteredSales.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border-light dark:border-border-dark bg-background-light/30 dark:bg-background-dark/30">
          <span className="text-xs text-text-light/60 dark:text-text-dark/60">
             Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(
                currentPage * itemsPerPage,
                hasClientSideFilters ? filteredSales.length : totalSales
              )}{' '}
              of {hasClientSideFilters ? filteredSales.length : totalSales} results
          </span>
          
           <div className="flex items-center gap-2">
             <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium px-2">
                 Page {currentPage}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
           </div>
        </div>
        )}
      </div>

       {/* Export Button */}
      {filteredSales.length > 0 && user?.role !== UserRole.CUSTOMER && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (salonFilter !== 'all') params.append('salonId', salonFilter);
                if (dateRange.start) params.append('startDate', dateRange.start);
                if (dateRange.end) params.append('endDate', dateRange.end);
                const response = await api.get(`/reports/sales?${params.toString()}`, {
                  responseType: 'blob',
                });
                const url = window.URL.createObjectURL(
                  new Blob([response.data], { type: 'application/pdf' })
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch {
                alert('Failed to export sales report.');
              }
            }}
          >
            <Download className="w-3.5 h-3.5 mr-2" /> Export Report
          </Button>
        </div>
      )}
    </div>
  );
}
