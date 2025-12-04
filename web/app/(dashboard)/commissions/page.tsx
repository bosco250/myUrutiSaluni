'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';

interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  saleAmount: number;
  paid: boolean;
  paidAt?: string;
  createdAt: string;
  salonEmployee?: {
    id: string;
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
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
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

  // Fetch commissions
  const { data: commissions = [], isLoading, error } = useQuery<Commission[]>({
    queryKey: ['commissions', statusFilter, employeeFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === 'paid') params.append('paid', 'true');
      if (statusFilter === 'unpaid') params.append('paid', 'false');
      if (employeeFilter !== 'all') params.append('salonEmployeeId', employeeFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await api.get(`/commissions?${params.toString()}`);
      return response.data || [];
    },
  });

  // Fetch employees for filter (if user is owner/admin)
  const { data: employees = [] } = useQuery({
    queryKey: ['salon-employees'],
    queryFn: async () => {
      try {
        // Get user's salons first
        const salonsResponse = await api.get('/salons');
        const salons = salonsResponse.data || [];
        
        // Get employees from all salons
        const allEmployees: any[] = [];
        for (const salon of salons) {
          try {
            const empResponse = await api.get(`/salons/${salon.id}/employees`);
            const salonEmployees = empResponse.data || [];
            allEmployees.push(...salonEmployees);
          } catch (error) {
            // Skip if can't access
          }
        }
        return allEmployees;
      } catch (error) {
        return [];
      }
    },
    enabled: user?.role === UserRole.SALON_OWNER || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ASSOCIATION_ADMIN,
  });

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          commission.id.toLowerCase().includes(query) ||
          commission.salonEmployee?.user?.fullName.toLowerCase().includes(query) ||
          commission.saleItem?.service?.name.toLowerCase().includes(query) ||
          commission.saleItem?.product?.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [commissions, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCommissions = filteredCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidCommissions = filteredCommissions.filter(c => c.paid).reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidCommissions = totalCommissions - paidCommissions;
    const totalSales = filteredCommissions.reduce((sum, c) => sum + Number(c.saleAmount), 0);
    const paidCount = filteredCommissions.filter(c => c.paid).length;
    const unpaidCount = filteredCommissions.length - paidCount;

    return {
      totalCommissions,
      paidCommissions,
      unpaidCommissions,
      totalSales,
      count: filteredCommissions.length,
      paidCount,
      unpaidCount,
    };
  }, [filteredCommissions]);

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const response = await api.post(`/commissions/${commissionId}/mark-paid`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  // Mark multiple as paid
  const markMultipleAsPaidMutation = useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const response = await api.post('/commissions/mark-paid-batch', { commissionIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  const handleMarkAsPaid = (commissionId: string) => {
    if (confirm('Mark this commission as paid?')) {
      markAsPaidMutation.mutate(commissionId);
    }
  };

  const handleMarkSelectedAsPaid = () => {
    const unpaidCommissions = filteredCommissions.filter(c => !c.paid);
    if (unpaidCommissions.length === 0) {
      alert('No unpaid commissions to mark as paid');
      return;
    }
    if (confirm(`Mark ${unpaidCommissions.length} commission(s) as paid?`)) {
      markMultipleAsPaidMutation.mutate(unpaidCommissions.map(c => c.id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading commissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger">Failed to load commissions. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">Commissions</h1>
        <p className="text-text-light/60 dark:text-text-dark/60">Track and manage employee commissions</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Commissions</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats.totalCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{stats.count} records</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Paid</span>
            <Check className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">
            RWF {stats.paidCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{stats.paidCount} paid</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Unpaid</span>
            <X className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">
            RWF {stats.unpaidCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">{stats.unpaidCount} unpaid</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Sales</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats.totalSales.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee, service, product..."
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          {employees.length > 0 && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Employees</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.user?.fullName || emp.roleTitle || 'Employee'}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleMarkSelectedAsPaid}
            variant="primary"
            disabled={stats.unpaidCount === 0 || markMultipleAsPaidMutation.isPending}
            className="w-full"
          >
            {markMultipleAsPaidMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Mark All Unpaid as Paid
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
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
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Sale Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Commission
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
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-text-light/60 dark:text-text-dark/60">No commissions found</p>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-background-light dark:hover:bg-background-dark transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {formatDate(commission.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-light dark:text-text-dark">
                          {commission.salonEmployee?.user?.fullName || commission.salonEmployee?.roleTitle || 'Unknown'}
                        </div>
                        {commission.salonEmployee?.user?.email && (
                          <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                            {commission.salonEmployee.user.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-light dark:text-text-dark">
                        {commission.saleItem?.service?.name || commission.saleItem?.product?.name || 'N/A'}
                      </div>
                      {commission.saleItem?.sale && (
                        <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                          Sale: {commission.saleItem.sale.id.slice(0, 8)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      RWF {Number(commission.saleAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {commission.commissionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-primary">
                        RWF {Number(commission.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          commission.paid
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {commission.paid ? 'Paid' : 'Unpaid'}
                      </span>
                      {commission.paid && commission.paidAt && (
                        <div className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                          {formatDate(commission.paidAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!commission.paid && (
                        <button
                          onClick={() => handleMarkAsPaid(commission.id)}
                          disabled={markAsPaidMutation.isPending}
                          className="text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                        >
                          {markAsPaidMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Mark Paid
                            </>
                          )}
                        </button>
                      )}
                      {commission.saleItem?.sale && (
                        <button
                          onClick={() => router.push(`/sales/${commission.saleItem?.sale?.id}`)}
                          className="text-text-light/60 dark:text-text-dark/60 hover:text-primary ml-3"
                        >
                          View Sale
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filteredCommissions.length > 0 && (
        <div className="mt-6 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">
              Showing {filteredCommissions.length} of {commissions.length} commissions
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

