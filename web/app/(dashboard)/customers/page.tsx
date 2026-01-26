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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Total
                </p>
                <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="h-8 w-8 flex items-center justify-center bg-primary/10 rounded-md">
                <User className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Active
                </p>
                <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.activeCustomers}
                </p>
              </div>
              <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 rounded-md">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  VIP
                </p>
                <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.highValueCustomers}
                </p>
              </div>
              <div className="h-8 w-8 flex items-center justify-center bg-purple-500/10 rounded-md">
                <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Points
                </p>
                <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.totalLoyaltyPoints.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-8 flex items-center justify-center bg-amber-500/10 rounded-md">
                <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light/50 dark:text-text-dark/50 uppercase tracking-widest">
                  Avg
                </p>
                <p className="text-xl font-black text-text-light dark:text-text-dark mt-1">
                  {stats.averageLoyaltyPoints}
                </p>
              </div>
              <div className="h-8 w-8 flex items-center justify-center bg-blue-500/10 rounded-md">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
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
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
                <thead className="bg-surface-light dark:bg-surface-dark">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Loyalty Points
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Member Since
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-text-light/60 dark:text-text-dark/60">
                            Loading customers...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <User className="w-10 h-10 text-text-light/40 dark:text-text-dark/40 mb-1" />
                          <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
                            No customers found
                          </p>
                          <p className="text-xs text-text-light/40 dark:text-text-dark/40">
                            {searchQuery || filterType !== 'all'
                              ? 'Try adjusting your search or filters'
                              : 'Get started by adding your first customer'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-primary/5 transition group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-xs">
                              {customer.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-text-light dark:text-text-dark">
                                {customer.fullName}
                              </div>
                              {customer.loyaltyPoints >= 1000 && (
                                <div className="flex items-center mt-0.5">
                                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                  <span className="text-[10px] text-text-light/60 dark:text-text-dark/60 ml-0.5">
                                    VIP
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-text-light dark:text-text-dark flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="text-xs text-text-light/60 dark:text-text-dark/60 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                              {customer.email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              customer.loyaltyPoints >= 1000
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : customer.loyaltyPoints >= 500
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                  : customer.loyaltyPoints > 0
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-text-light/10 text-text-light/60 dark:text-text-dark/60'
                            }`}
                          >
                            {customer.loyaltyPoints || 0} pts
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-text-light/60 dark:text-text-dark/60">
                          {format(parseISO(customer.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => handleViewDetails(customer.id)}
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(customer)}
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this customer?')) {
                                  deleteMutation.mutate(customer.id);
                                }
                              }}
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
