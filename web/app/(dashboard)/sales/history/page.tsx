'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Building2,
  Loader2,
  ArrowLeft,
  Receipt,
  BarChart3,
  ChevronLeft,
  ChevronRight,
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
  };
  salon?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    fullName: string;
  };
  employees?: Array<{
    id: string;
    name: string;
  }>;
  totalCommission?: number;
  items?: SaleItem[];
}

interface Salon {
  id: string;
  name: string;
}

export default function SalesHistoryPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER]}>
      <SalesHistoryContent />
    </ProtectedRoute>
  );
}

function SalesHistoryContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [salonFilter, setSalonFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch salons for filter
  const { data: salons = [] } = useQuery<Salon[]>({
    queryKey: ['salons'],
    queryFn: async () => {
      try {
        const response = await api.get('/salons');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Check if we need to fetch all sales for client-side filtering
  const hasClientSideFilters = searchQuery || statusFilter !== 'all' || paymentMethodFilter !== 'all' || dateRange.start || dateRange.end;
  
  // Get customer record for customer users
  const { data: customer } = useQuery({
    queryKey: ['customer-by-user', user?.id],
    queryFn: async () => {
      if (user?.role === 'customer') {
        const response = await api.get(`/customers/by-user/${user.id}`);
        return response.data;
      }
      return null;
    },
    enabled: user?.role === 'customer',
  });

  // Fetch sales with pagination (or all if client-side filters are active)
  const { data: salesData, isLoading, error } = useQuery<{
    data: Sale[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['sales', user?.role, customer?.id, salonFilter, hasClientSideFilters ? 'all' : currentPage, hasClientSideFilters ? 10000 : itemsPerPage],
    queryFn: async () => {
      try {
        // For customers, fetch their own sales
        if (user?.role === 'customer' && customer?.id) {
          const params = new URLSearchParams();
          if (hasClientSideFilters) {
            params.append('page', '1');
            params.append('limit', '10000');
          } else {
            params.append('page', currentPage.toString());
            params.append('limit', itemsPerPage.toString());
          }
          const response = await api.get(`/sales/customer/${customer.id}?${params.toString()}`);
          return response.data;
        }
        
        // For other roles, use the regular sales endpoint
        const params = new URLSearchParams();
        if (salonFilter !== 'all') {
          params.append('salonId', salonFilter);
        }
        // If client-side filters are active, fetch all sales (with high limit)
        // Otherwise, use pagination
        if (hasClientSideFilters) {
          params.append('page', '1');
          params.append('limit', '10000'); // High limit to get all sales
        } else {
          params.append('page', currentPage.toString());
          params.append('limit', itemsPerPage.toString());
        }
        
        const response = await api.get(`/sales?${params.toString()}`);
        console.log('[SALES HISTORY] Raw API Response:', JSON.stringify(response.data, null, 2));
        console.log('[SALES HISTORY] Response structure:', {
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          isArray: Array.isArray(response.data),
          isArrayData: Array.isArray(response.data?.data),
          hasStatusCode: 'statusCode' in (response.data || {}),
          keys: response.data ? Object.keys(response.data) : [],
          type: typeof response.data,
        });
        
        // Check if sales have items
        const salesWithItems = response.data?.data?.data || response.data?.data || [];
        if (Array.isArray(salesWithItems) && salesWithItems.length > 0) {
          console.log('[SALES HISTORY] Sample sale items check:', {
            firstSaleId: salesWithItems[0]?.id,
            firstSaleHasItems: !!salesWithItems[0]?.items,
            firstSaleItemCount: salesWithItems[0]?.items?.length || 0,
            firstSaleItems: salesWithItems[0]?.items,
          });
        }
        
        // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
        // The actual paginated response is in response.data.data
        let responseData = response.data;
        
        // If response is wrapped by interceptor (has statusCode and data property)
        if (response.data && typeof response.data === 'object' && 'statusCode' in response.data && 'data' in response.data) {
          responseData = response.data.data;
          console.log('[SALES HISTORY] Unwrapped interceptor response, responseData:', {
            isArray: Array.isArray(responseData),
            hasData: !!responseData?.data,
            keys: responseData ? Object.keys(responseData) : [],
            type: typeof responseData,
          });
        }
        
        // Ensure responseData has the expected structure
        if (!responseData || typeof responseData !== 'object') {
          console.error('[SALES HISTORY] Invalid response data:', responseData, 'Type:', typeof responseData);
          return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
        
        // If responseData is an array (old format or backend returned array), wrap it
        if (Array.isArray(responseData)) {
          // This should not happen - backend should always return paginated object
          // But handle it gracefully to prevent errors
          console.warn('[SALES HISTORY] ⚠️ Received array instead of paginated object (this is handled gracefully)');
          console.warn('[SALES HISTORY] Array length:', responseData.length);
          console.warn('[SALES HISTORY] Request URL:', `/sales?${params.toString()}`);
          // Wrap it to match expected format
          return {
            data: responseData,
            total: responseData.length,
            page: currentPage,
            limit: itemsPerPage,
            totalPages: Math.ceil(responseData.length / itemsPerPage),
          };
        }
        
        // Check if responseData has the expected paginated structure
        if (!('data' in responseData) || !('total' in responseData)) {
          console.error('[SALES HISTORY] ResponseData does not have expected paginated structure:', {
            responseData,
            keys: Object.keys(responseData),
            hasData: 'data' in responseData,
            hasTotal: 'total' in responseData,
          });
          // If it's an object but not the right structure, try to extract data
          if (Array.isArray(responseData.data)) {
            return {
              data: responseData.data,
              total: responseData.total || responseData.data.length,
              page: responseData.page || 1,
              limit: responseData.limit || itemsPerPage,
              totalPages: responseData.totalPages || Math.ceil((responseData.total || responseData.data.length) / (responseData.limit || itemsPerPage)),
            };
          }
          return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
        
        // Ensure all required fields exist
        const result = {
          data: responseData.data || [],
          total: responseData.total || 0,
          page: responseData.page || 1,
          limit: responseData.limit || itemsPerPage,
          totalPages: responseData.totalPages || Math.ceil((responseData.total || 0) / (responseData.limit || itemsPerPage)),
        };
        
        console.log('[SALES HISTORY] Processed result:', {
          dataLength: result.data.length,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
        return result;
      } catch (error) {
        console.error('[SALES HISTORY] Error fetching sales:', error);
        return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
    },
  });

  const sales = salesData?.data || [];
  const totalSales = salesData?.total || 0;

  // Filter sales and ensure they're sorted by date (most recent first)
  const filteredSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      // Search filter
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

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // Salon filter
      if (salonFilter !== 'all' && sale.salon?.id !== salonFilter) {
        return false;
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const saleDate = new Date(sale.createdAt);
        if (dateRange.start && saleDate < new Date(dateRange.start)) {
          return false;
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (saleDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
    
    // Sort by date (most recent first) to ensure correct order after filtering
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [sales, searchQuery, statusFilter, paymentMethodFilter, salonFilter, dateRange]);

  // Calculate statistics from filtered sales (client-side filtering)
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const filteredCount = filteredSales.length;
    const averageSale = filteredCount > 0 ? totalRevenue / filteredCount : 0;
    const cashSales = filteredSales.filter(s => s.paymentMethod === 'cash').length;
    const cardSales = filteredSales.filter(s => s.paymentMethod === 'card').length;
    const mobileMoneySales = filteredSales.filter(s => s.paymentMethod === 'mobile_money').length;

    return {
      totalRevenue,
      totalSales: filteredCount,
      averageSale,
      cashSales,
      cardSales,
      mobileMoneySales,
    };
  }, [filteredSales]);

  // Paginate filtered sales
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSales.slice(startIndex, endIndex);
  }, [filteredSales, currentPage, itemsPerPage]);

  const filteredTotalPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading sales history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger">Failed to load sales history. Please try again.</p>
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
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={() => router.push('/sales')}
                variant="secondary"
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Sales History</h1>
            </div>
            <p className="text-text-light/60 dark:text-text-dark/60">View and manage all sales transactions</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <Button
              onClick={() => router.push('/sales/analytics')}
              variant="secondary"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/sales')}
              variant="primary"
            >
              <Receipt className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats.totalRevenue.toLocaleString()} RWF
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Sales</span>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.totalSales}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Average Sale</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            {stats.averageSale.toFixed(0)} RWF
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Payment Methods</span>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-text-light dark:text-text-dark">
            Cash: {stats.cashSales} • Card: {stats.cardSales} • Mobile: {stats.mobileMoneySales}
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleFilterChange();
                }}
                placeholder="Search by ID, customer, phone, reference..."
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleFilterChange();
            }}
            className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          {salons.length > 0 && (
            <select
              value={salonFilter}
              onChange={(e) => {
                setSalonFilter(e.target.value);
                handleFilterChange();
              }}
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Salons</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                handleFilterChange();
              }}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                handleFilterChange();
              }}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>
      )}

      {/* Sales Table */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Sale ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Salon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-text-light/60 dark:text-text-dark/60">No sales found</p>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-background-light dark:hover:bg-background-dark transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-text-light/60 dark:text-text-dark/60">
                        {sale.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.customer ? (
                        <div>
                          <div className="text-sm font-medium text-text-light dark:text-text-dark">
                            {sale.customer.fullName}
                          </div>
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {sale.customer.phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-text-light/40 dark:text-text-dark/40">Walk-in</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {sale.salon?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.employees && sale.employees.length > 0 ? (
                        <div className="text-sm text-text-light dark:text-text-dark">
                          {sale.employees.map((emp, idx) => (
                            <span key={emp.id}>
                              {emp.name}
                              {idx < sale.employees.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-text-light/40 dark:text-text-dark/40">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-primary">
                        {sale.currency || 'RWF'} {sale.totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {sale.items && sale.items.length > 0 ? (
                        <div className="text-sm text-text-light dark:text-text-dark">
                          <div className="font-medium mb-1">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</div>
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60 space-y-1">
                            {sale.items.slice(0, 2).map((item, idx) => (
                              <div key={item.id || idx}>
                                {item.service?.name || item.product?.name || 'Unknown'} 
                                <span className="text-text-light/40 dark:text-text-dark/40">
                                  {' '}({item.quantity}×)
                                </span>
                              </div>
                            ))}
                            {sale.items.length > 2 && (
                              <div className="text-text-light/40 dark:text-text-dark/40">
                                +{sale.items.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-text-light/40 dark:text-text-dark/40">No items</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-success">
                        {sale.currency || 'RWF'} {(sale.totalCommission || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-text-light dark:text-text-dark">
                        {formatPaymentMethod(sale.paymentMethod)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.status === 'completed'
                            ? 'bg-success/20 text-success'
                            : sale.status === 'pending'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-danger/20 text-danger'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(`/sales/${sale.id}`)}
                          className="text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(`/reports/receipt/${sale.id}`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `receipt-${sale.id.slice(0, 8)}-${new Date(sale.createdAt).toISOString().split('T')[0]}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (error: any) {
                              alert(error.response?.data?.message || 'Failed to download receipt');
                            }
                          }}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and Summary */}
      {filteredSales.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Pagination Controls */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} sales
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                    let pageNum;
                    if (filteredTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= filteredTotalPages - 2) {
                      pageNum = filteredTotalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(filteredTotalPages, prev + 1))}
                  disabled={currentPage >= filteredTotalPages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                Total: {totalSales} sales in database
              </span>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    if (salonFilter !== 'all') params.append('salonId', salonFilter);
                    if (dateRange.start) params.append('startDate', dateRange.start);
                    if (dateRange.end) params.append('endDate', dateRange.end);
                    
                    const response = await api.get(`/reports/sales?${params.toString()}`, {
                      responseType: 'blob',
                    });
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Failed to export report:', error);
                    alert('Failed to export sales report. Please try again.');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

