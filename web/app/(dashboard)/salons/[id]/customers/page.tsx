'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search,
  Filter,
  Download,
  User,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Eye,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { format, parseISO } from 'date-fns';

interface SalonCustomer {
  id: string;
  salonId: string;
  customerId: string;
  visitCount: number;
  lastVisitDate: string | null;
  firstVisitDate: string | null;
  totalSpent: number;
  tags: string[];
  notes: string | null;
  preferences: Record<string, unknown>;
  birthday: string | null;
  anniversaryDate: string | null;
  followUpDate: string | null;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    loyaltyPoints: number;
  };
  averageOrderValue?: number;
  averageDaysBetweenVisits?: number;
  daysSinceLastVisit?: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  averageCLV: number;
  averageVisitFrequency: number;
  topCustomers: SalonCustomer[];
}

export default function SalonCustomersPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <SalonCustomersContent />
    </ProtectedRoute>
  );
}

function SalonCustomersContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'lastVisit' | 'totalSpent' | 'visitCount' | 'name'>(
    'lastVisit'
  );
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [minVisits, setMinVisits] = useState('');
  const [minSpent, setMinSpent] = useState('');
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState('');

  // Fetch salon customers
  const { data: customersData, isLoading } = useQuery<{
    data: SalonCustomer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [
      'salon-customers',
      salonId,
      searchQuery,
      selectedTags,
      sortBy,
      sortOrder,
      page,
      minVisits,
      minSpent,
      daysSinceLastVisit,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (selectedTags.length > 0) queryParams.append('tags', selectedTags.join(','));
      if (minVisits) queryParams.append('minVisits', minVisits);
      if (minSpent) queryParams.append('minSpent', minSpent);
      if (daysSinceLastVisit) queryParams.append('daysSinceLastVisit', daysSinceLastVisit);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '20');

      const response = await api.get(`/salons/${salonId}/customers?${queryParams.toString()}`);
      return response.data?.data || response.data;
    },
    enabled: !!salonId,
  });

  // Fetch analytics
  const { data: analytics } = useQuery<CustomerAnalytics>({
    queryKey: ['salon-customer-analytics', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/analytics`);
      return response.data?.data || response.data;
    },
    enabled: !!salonId,
  });

  // Export customers
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salon-customers-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const customers = useMemo(() => {
    const data = customersData?.data || customersData;
    return Array.isArray(data) ? data : [];
  }, [customersData]);
  const totalPages = customersData?.totalPages || 0;

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach((c) => {
      (c.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [customers]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            onClick={() => router.push(`/salons/${salonId}`)}
            variant="secondary"
            size="sm"
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
              Customer Management
            </h1>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Manage your salon&apos;s customers, track visits, and analyze customer behavior
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => exportMutation.mutate()}
            variant="outline"
            disabled={exportMutation.isPending}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                  Total Customers
                </p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                  {analytics.totalCustomers}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                  Active (30d)
                </p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                  {analytics.activeCustomers}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                  Avg CLV
                </p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                  RWF {Math.round(analytics.averageCLV).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                  Churned (90d)
                </p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                  {analytics.churnedCustomers}
                </p>
              </div>
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light/40 dark:text-text-dark/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-text-light/40 dark:placeholder:text-text-dark/40"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Filters'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Button
                    key={tag}
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      );
                      setPage(1);
                    }}
                    size="sm"
                    variant={selectedTags.includes(tag) ? 'primary' : 'secondary'}
                    className={`rounded-full ${
                      selectedTags.includes(tag)
                        ? ''
                        : 'hover:bg-primary/10'
                    }`}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as 'lastVisit' | 'totalSpent' | 'visitCount' | 'name');
                setSortOrder(order as 'ASC' | 'DESC');
                setPage(1);
              }}
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            >
              <option value="lastVisit-DESC">Last Visit (Newest)</option>
              <option value="lastVisit-ASC">Last Visit (Oldest)</option>
              <option value="totalSpent-DESC">Total Spent (High)</option>
              <option value="totalSpent-ASC">Total Spent (Low)</option>
              <option value="visitCount-DESC">Visits (Most)</option>
              <option value="visitCount-ASC">Visits (Least)</option>
              <option value="name-ASC">Name (A-Z)</option>
              <option value="name-DESC">Name (Z-A)</option>
            </select>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-light dark:border-border-dark">
              <div>
                <label
                  htmlFor="min-visits"
                  className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
                >
                  Min Visits
                </label>
                <input
                  id="min-visits"
                  type="number"
                  value={minVisits}
                  onChange={(e) => {
                    setMinVisits(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              <div>
                <label
                  htmlFor="min-spent"
                  className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
                >
                  Min Spent (RWF)
                </label>
                <input
                  id="min-spent"
                  type="number"
                  value={minSpent}
                  onChange={(e) => {
                    setMinSpent(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              <div>
                <label
                  htmlFor="days-since-last-visit"
                  className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
                >
                  Days Since Last Visit
                </label>
                <input
                  id="days-since-last-visit"
                  type="number"
                  value={daysSinceLastVisit}
                  onChange={(e) => {
                    setDaysSinceLastVisit(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customers List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading customers...</p>
        </div>
      ) : customers.length > 0 ? (
        <>
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
                <thead className="bg-background-secondary/50 dark:bg-background-dark/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                  {customers.map((sc) => (
                    <tr key={sc.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold shadow-sm">
                            {sc.customer.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-text-light dark:text-text-dark">
                              {sc.customer.fullName}
                            </div>
                            {sc.averageOrderValue && (
                              <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                                Avg: RWF {Math.round(sc.averageOrderValue).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-light dark:text-text-dark flex items-center gap-2">
                          <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                          {sc.customer.phone}
                        </div>
                        {sc.customer.email && (
                          <div className="text-sm text-text-light/60 dark:text-text-dark/60 flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                            {sc.customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-light dark:text-text-dark">
                          {sc.visitCount || 0}
                        </div>
                        {sc.averageDaysBetweenVisits && (
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            ~{sc.averageDaysBetweenVisits} days between
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-text-light dark:text-text-dark">
                          RWF {Number(sc.totalSpent || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sc.lastVisitDate ? (
                          <div className="text-sm text-text-light dark:text-text-dark">
                            {format(parseISO(sc.lastVisitDate), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <div className="text-sm text-text-light/40 dark:text-text-dark/40">Never</div>
                        )}
                        {sc.daysSinceLastVisit !== undefined && (
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {sc.daysSinceLastVisit} days ago
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(sc.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => router.push(`/salons/${salonId}/customers/${sc.customerId}`)}
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View Details"
                            aria-label="View customer details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                Showing page {page} of {totalPages} ({customersData?.total || 0} total customers)
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl">
          <User className="w-12 h-12 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <p className="text-text-light/60 dark:text-text-dark/60 mb-4">
            {searchQuery || selectedTags.length > 0
              ? 'No customers found matching your criteria.'
              : 'No customers found. Customer data is automatically synced from sales and appointments.'}
          </p>
        </div>
      )}
    </div>
  );
}
