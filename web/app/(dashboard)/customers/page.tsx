'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Grid3x3,
  List,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  X,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';

import Button from '@/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/store/auth-store';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  };
}

type ViewMode = 'table' | 'grid';
type FilterType = 'all' | 'high_value' | 'loyal' | 'recent' | 'inactive';

export default function CustomersPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const { isSalonOwner, isSalonEmployee, isAdmin } = usePermissions();
  const { user } = useAuthStore();

  const {
    data: customers,
    isLoading,
    error,
  } = useQuery<Customer[]>({
    queryKey: ['customers', user?.id],
    queryFn: async () => {
      try {
        // For salon owners/employees, fetch customers from their salons
        if (isSalonOwner() || isSalonEmployee()) {
          // 1. Fetch user's salons
          const salonsResponse = await api.get('/salons');
          const salons = Array.isArray(salonsResponse.data) 
            ? salonsResponse.data 
            : salonsResponse.data?.data || [];
            
          if (!salons.length) return [];

          // 2. Fetch customers for each salon
          const promises = salons.map(async (salon: any) => {
            try {
              // We use limit=1000 to get "all" relevant customers for the dashboard view for now
              // In a real app with massive data, we'd paginate or search server-side
              const res = await api.get(`/salons/${salon.id}/customers?limit=1000`);
              return res.data?.data || [];
            } catch (e) {
              console.error(`Failed to fetch customers for salon ${salon.id}`, e);
              return [];
            }
          });

          const results = await Promise.all(promises);
          
          // 3. Aggregate and deduplicate by customer ID
          const allSalonCustomers = results.flat();
          const uniqueCustomers = new Map();
          
          allSalonCustomers.forEach((sc: any) => {
            // Check if it's a SalonCustomer wrapper (has .customer property) or direct Customer
            const customerData = sc.customer || sc;
             if (customerData?.id && !uniqueCustomers.has(customerData.id)) {
               uniqueCustomers.set(customerData.id, customerData);
             }
          });

          return Array.from(uniqueCustomers.values());
        }

        // For Admins, fetch all customers
        const response = await api.get('/customers');
        
        // Handle both wrapped and unwrapped responses
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (response.data?.data) {
          // If data is not an array, wrap it
          return Array.isArray(response.data.data) ? response.data.data : [];
        }
        return [];
      } catch (err: unknown) {
        throw err;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    let filtered = [...customers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.fullName.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          (customer.email && customer.email.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'high_value':
        filtered = filtered.filter((c) => c.loyaltyPoints >= 1000);
        break;
      case 'loyal':
        filtered = filtered.filter((c) => c.loyaltyPoints >= 500);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter((c) => {
          const created = parseISO(c.createdAt);
          return created >= thirtyDaysAgo;
        });
        break;
      case 'inactive':
        filtered = filtered.filter((c) => c.loyaltyPoints === 0);
        break;
      default:
        break;
    }

    return filtered;
  }, [customers, searchQuery, filterType]);

  const stats = useMemo(() => {
    if (!customers) {
      return {
        total: 0,
        totalLoyaltyPoints: 0,
        activeCustomers: 0,
        highValueCustomers: 0,
        averageLoyaltyPoints: 0,
      };
    }

    const total = customers.length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
    const activeCustomers = customers.filter((c) => c.loyaltyPoints > 0).length;
    const highValueCustomers = customers.filter((c) => c.loyaltyPoints >= 1000).length;
    const averageLoyaltyPoints = total > 0 ? Math.round(totalLoyaltyPoints / total) : 0;

    return {
      total,
      totalLoyaltyPoints,
      activeCustomers,
      highValueCustomers,
      averageLoyaltyPoints,
    };
  }, [customers]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleViewDetails = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const maybeAxios = error as {
      response?: { data?: { message?: string }; status?: number };
      message?: string;
    };
    const errorMessage =
      maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to load customers';
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Error loading customers
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-light dark:text-text-dark">Customers</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60">
              {stats.total}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              className="gap-2"
            >
              {viewMode === 'table' ? (
                <Grid3x3 className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
              <span>{viewMode === 'table' ? 'Grid' : 'Table'}</span>
            </Button>
            <Button
              type="button"
              onClick={() => setShowModal(true)}
              variant="primary"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Customer</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {/* Statistics Cards - Compacted & Flat */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Total</p>
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
                <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.total}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  All users
               </span>
            </div>
          </div>

          {/* Active */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Active</p>
              <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
                <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.activeCustomers}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  Returning
               </span>
            </div>
          </div>

          {/* VIP */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-purple-600 dark:text-purple-400">VIP</p>
              <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform">
                <Star className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.highValueCustomers}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  High value
               </span>
            </div>
          </div>

          {/* Points */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 hover:border-amber-300 dark:hover:border-amber-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-amber-600 dark:text-amber-400">Points</p>
              <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-md group-hover:scale-110 transition-transform">
                <DollarSign className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.totalLoyaltyPoints.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  Total distributed
               </span>
            </div>
          </div>

          {/* Avg */}
          <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Avg</p>
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
                <TrendingUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{stats.averageLoyaltyPoints}</p>
            <div className="flex items-center gap-1 mt-1">
               <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  Points / User
               </span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light/40 w-4 h-4" />
              <input
                id="customers-search"
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filterType === 'all' ? 'primary' : 'secondary'}
                  onClick={() => setFilterType('all')}
                >
                  All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filterType === 'high_value' ? 'primary' : 'secondary'}
                  onClick={() => setFilterType('high_value')}
                >
                  High Value
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filterType === 'loyal' ? 'primary' : 'secondary'}
                  onClick={() => setFilterType('loyal')}
                >
                  Loyal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filterType === 'recent' ? 'primary' : 'secondary'}
                  onClick={() => setFilterType('recent')}
                >
                  Recent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filterType === 'inactive' ? 'primary' : 'secondary'}
                  onClick={() => setFilterType('inactive')}
                >
                  Inactive
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            Showing <span className="font-semibold text-text-light dark:text-text-dark">{paginatedCustomers.length}</span> of{' '}
            <span className="font-semibold text-text-light dark:text-text-dark">{filteredCustomers.length}</span> customers
          </p>
        </div>

        {/* Customer List */}
        {viewMode === 'table' ? (
          <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                  <tr>
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                      Customer
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                      Contact
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                      Loyalty
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                      Joined
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-text-light/60 dark:text-text-dark/60">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-text-light/60 dark:text-text-dark/60">
                         No customers found
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                              {customer.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <p className="font-medium text-text-light dark:text-text-dark leading-none">{customer.fullName}</p>
                               {customer.loyaltyPoints >= 1000 && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                  <span className="text-[9px] text-text-light/50 dark:text-text-dark/50">VIP</span>
                                </div>
                               )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="text-text-light dark:text-text-dark leading-tight flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="text-text-light/50 dark:text-text-dark/50 text-[10px] flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-text-light/30 dark:text-text-dark/30" />
                              {customer.email}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-none ${
                               customer.loyaltyPoints >= 1000
                                 ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                 : customer.loyaltyPoints >= 500
                                   ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                   : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                             }`}>
                             {customer.loyaltyPoints || 0} pts
                           </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-text-light/60 dark:text-text-dark/60">
                          {format(parseISO(customer.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                             <Button
                               onClick={() => handleViewDetails(customer.id)}
                               variant="secondary"
                               size="sm"
                               className="h-8 w-8 p-0 bg-transparent border-none shadow-none text-text-light/40 hover:text-primary hover:bg-primary/5"
                               title="View Details"
                             >
                               <Eye className="w-4 h-4" />
                             </Button>
                             <Button
                               onClick={() => handleEdit(customer)}
                               variant="secondary"
                               size="sm"
                               className="h-8 w-8 p-0 bg-transparent border-none shadow-none text-text-light/40 hover:text-primary hover:bg-primary/5"
                               title="Edit"
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               onClick={() => {
                                 if (confirm('Are you sure you want to delete this customer?')) {
                                   deleteMutation.mutate(customer.id);
                                 }
                               }}
                               variant="secondary"
                               size="sm"
                               className="h-8 w-8 p-0 bg-transparent border-none shadow-none text-text-light/40 hover:text-red-500 hover:bg-red-500/10"
                               title="Delete"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold">
                      {customer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {customer.fullName}
                      </h3>
                      {customer.loyaltyPoints >= 1000 && (
                        <div className="flex items-center mt-0.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-[10px] text-text-light/60 dark:text-text-dark/60 ml-1">
                            VIP Customer
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                    <Phone className="w-3.5 h-3.5" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                      <Mail className="w-3.5 h-3.5" />
                      {customer.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {format(parseISO(customer.createdAt), 'MMM yyyy')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
                  <div>
                    <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">Loyalty Points</p>
                    <p className="text-sm font-bold text-text-light dark:text-text-dark">
                      {customer.loyaltyPoints || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleViewDetails(customer.id)}
                      size="sm"
                      variant="primary"
                      className="h-7 px-2 text-xs"
                    >
                      View
                    </Button>
                    <Button
                      onClick={() => handleEdit(customer)}
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-text-light/60 dark:text-text-dark/60 font-medium">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || filterType !== 'all'
                ? 'No customers found matching your criteria.'
                : 'No customers found. Add your first customer to get started.'}
            </p>
          </div>
        )}

        {showModal && (
          <CustomerModal
            customer={editingCustomer}
            onClose={handleClose}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customers'] });
              handleClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer?: Customer | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: customer?.fullName || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (customer) {
        return api.patch(`/customers/${customer.id}`, data);
      } else {
        return api.post('/customers', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        maybeAxios?.response?.data?.message || maybeAxios?.message || 'Failed to save customer'
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="customer-fullName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Full Name *
            </label>
            <input
              id="customer-fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Phone *
            </label>
            <input
              id="customer-phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} loadingText="Saving..." className="flex-1">
              {customer ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
