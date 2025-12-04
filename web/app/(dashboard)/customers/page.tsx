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
  Eye,
  Filter,
  Download,
  Grid3x3,
  List,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  X,
  ChevronDown,
  MoreVertical,
  Tag,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';

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
  const queryClient = useQueryClient();

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers');
        console.log('[CUSTOMERS PAGE] API Response:', response.data);
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
      } catch (err: any) {
        console.error('[CUSTOMERS PAGE] Error fetching customers:', err);
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
    const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load customers';
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-200 font-semibold mb-2">Error loading customers</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer CRM</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage customer relationships, track interactions, and analyze customer data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {viewMode === 'table' ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span>{viewMode === 'table' ? 'Grid' : 'Table'}</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeCustomers}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.highValueCustomers}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalLoyaltyPoints.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.averageLoyaltyPoints}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('high_value')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === 'high_value'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                High Value
              </button>
              <button
                onClick={() => setFilterType('loyal')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === 'loyal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Loyal
              </button>
              <button
                onClick={() => setFilterType('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === 'recent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setFilterType('inactive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === 'inactive'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Inactive
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-semibold">{filteredCustomers.length}</span> of{' '}
          <span className="font-semibold">{customers?.length || 0}</span> customers
        </p>
      </div>

      {/* Customer List */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Loyalty Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member Since
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {customer.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.fullName}</div>
                          {customer.loyaltyPoints >= 1000 && (
                            <div className="flex items-center mt-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">VIP</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          customer.loyaltyPoints >= 1000
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : customer.loyaltyPoints >= 500
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : customer.loyaltyPoints > 0
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {customer.loyaltyPoints || 0} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(customer.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(customer.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this customer?')) {
                              deleteMutation.mutate(customer.id);
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                    {customer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{customer.fullName}</h3>
                    {customer.loyaltyPoints >= 1000 && (
                      <div className="flex items-center mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">VIP Customer</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  Joined {format(parseISO(customer.createdAt), 'MMM yyyy')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loyalty Points</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{customer.loyaltyPoints || 0}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetails(customer.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save customer');
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : customer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
