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
} from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch commissions
  // Backend automatically filters to employee's own commissions for SALON_EMPLOYEE role
  const {
    data: commissions = [],
    isLoading,
    error,
  } = useQuery<Commission[]>({
    queryKey: ['commissions', statusFilter, employeeFilter, dateRange, user?.role, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === 'paid') params.append('paid', 'true');
      if (statusFilter === 'unpaid') params.append('paid', 'false');
      // Only add employee filter for non-employees (owners/admins)
      // Backend automatically filters for employees based on their user ID
      if (user?.role !== UserRole.SALON_EMPLOYEE && employeeFilter && employeeFilter !== 'all') {
        params.append('salonEmployeeId', employeeFilter);
      }
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await api.get(`/commissions?${params.toString()}`);
      return response.data || [];
    },
    enabled: !!user,
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
    enabled:
      user?.role === UserRole.SALON_OWNER ||
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.ASSOCIATION_ADMIN,
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCommissions = filteredCommissions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, employeeFilter, dateRange.start, dateRange.end]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCommissions = filteredCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidCommissions = filteredCommissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidCommissions = totalCommissions - paidCommissions;
    const totalSales = filteredCommissions.reduce((sum, c) => sum + Number(c.saleAmount), 0);
    const paidCount = filteredCommissions.filter((c) => c.paid).length;
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

  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: {
      commissionId: string;
      paymentMethod?: string;
      paymentReference?: string;
    }) => {
      const response = await api.post(`/commissions/${data.commissionId}/mark-paid`, {
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setShowPaymentModal(false);
      setSelectedCommission(null);
    },
  });

  // Mark multiple as paid
  const markMultipleAsPaidMutation = useMutation({
    mutationFn: async (data: {
      commissionIds: string[];
      paymentMethod?: string;
      paymentReference?: string;
    }) => {
      const response = await api.post('/commissions/mark-paid-batch', {
        commissionIds: data.commissionIds,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setShowPaymentModal(false);
      setSelectedCommission(null);
    },
  });

  const handleMarkAsPaid = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowPaymentModal(true);
  };

  const handleMarkSelectedAsPaid = () => {
    const unpaidCommissions = filteredCommissions.filter((c) => !c.paid);
    if (unpaidCommissions.length === 0) {
      return;
    }
    setSelectedCommission({ ...unpaidCommissions[0], id: 'batch' } as any);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (paymentMethod: string, paymentReference: string) => {
    if (!selectedCommission) return;

    if (selectedCommission.id === 'batch') {
      const unpaidCommissions = filteredCommissions.filter((c) => !c.paid);
      markMultipleAsPaidMutation.mutate({
        commissionIds: unpaidCommissions.map((c) => c.id),
        paymentMethod,
        paymentReference,
      });
    } else {
      markAsPaidMutation.mutate({
        commissionId: selectedCommission.id,
        paymentMethod,
        paymentReference,
      });
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
    const errorMessage =
      (error as any)?.response?.data?.message || (error as any)?.message || 'Unknown error';
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center">
          <p className="text-danger font-semibold mb-2">Failed to load commissions</p>
          <p className="text-danger/80 text-sm mb-2">{errorMessage}</p>
          {user?.role === UserRole.SALON_EMPLOYEE && (
            <p className="text-text-light/60 dark:text-text-dark/60 text-xs">
              If you don't have an employee record, please contact your salon owner to set up your
              employee profile.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
          {user?.role === UserRole.SALON_EMPLOYEE ? 'My Commissions' : 'Commissions'}
        </h1>
        <p className="text-text-light/60 dark:text-text-dark/60">
          {user?.role === UserRole.SALON_EMPLOYEE
            ? 'View your commission earnings and payment history'
            : 'Track and manage employee commissions'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">
              Total Commissions
            </span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">
            RWF {stats.totalCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
            {stats.count} records
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Paid</span>
            <Check className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">
            RWF {stats.paidCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
            {stats.paidCount} paid
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Unpaid</span>
            <X className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">
            RWF {stats.unpaidCommissions.toLocaleString()}
          </p>
          <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
            {stats.unpaidCount} unpaid
          </p>
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
          {employees.length > 0 && user?.role !== UserRole.SALON_EMPLOYEE && (
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
          {user?.role !== UserRole.SALON_EMPLOYEE && (
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
                  Source
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
                  Payment Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-text-light/60 dark:text-text-dark/60">
                        {user?.role === UserRole.SALON_EMPLOYEE
                          ? 'You have no commissions yet'
                          : 'No commissions found'}
                      </p>
                      {user?.role === UserRole.SALON_EMPLOYEE && (
                        <p className="text-xs text-text-light/40 dark:text-text-dark/40">
                          Commissions will appear here when sales or appointments are completed with
                          you assigned
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((commission) => {
                  // Determine source from metadata or saleItem
                  const source =
                    commission.metadata?.source || (commission.saleItemId ? 'sale' : 'appointment');
                  const sourceId =
                    commission.metadata?.saleId ||
                    commission.metadata?.appointmentId ||
                    commission.saleItem?.sale?.id;

                  return (
                    <tr
                      key={commission.id}
                      className="hover:bg-background-light dark:hover:bg-background-dark transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                        {formatDate(commission.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-light dark:text-text-dark">
                            {commission.salonEmployee?.user?.fullName ||
                              commission.salonEmployee?.roleTitle ||
                              'Unknown'}
                          </div>
                          {commission.salonEmployee?.user?.email && (
                            <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                              {commission.salonEmployee.user.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {source === 'sale' ? (
                            <Receipt className="w-4 h-4 text-primary" />
                          ) : (
                            <Scissors className="w-4 h-4 text-success" />
                          )}
                          <div>
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                source === 'sale'
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : 'bg-success/10 text-success border border-success/20'
                              }`}
                            >
                              {source === 'sale' ? 'Sale' : 'Appointment'}
                            </div>
                            {sourceId && (
                              <div className="mt-1">
                                {source === 'sale' ? (
                                  <button
                                    onClick={() => router.push(`/sales/${sourceId}`)}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Sale
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => router.push(`/appointments/${sourceId}`)}
                                    className="text-xs text-success hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Appointment
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-light dark:text-text-dark">
                          {commission.saleItem?.service?.name ||
                            commission.saleItem?.product?.name ||
                            'N/A'}
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
                        {commission.paid ? (
                          <div>
                            {commission.paymentMethod && (
                              <div className="text-xs text-text-light dark:text-text-dark capitalize">
                                {commission.paymentMethod.replace('_', ' ')}
                              </div>
                            )}
                            {commission.paymentReference && (
                              <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                                Ref: {commission.paymentReference}
                              </div>
                            )}
                            {commission.payrollItemId && (
                              <div className="text-xs text-text-light/60 dark:text-text-dark/60">
                                Via Payroll
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!commission.paid && user?.role !== UserRole.SALON_EMPLOYEE && (
                          <button
                            onClick={() => handleMarkAsPaid(commission)}
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
                        {user?.role === UserRole.SALON_EMPLOYEE && !commission.paid && (
                          <span className="text-xs text-text-light/40 dark:text-text-dark/40">
                            Pending payment
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and Summary */}
      {filteredCommissions.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Pagination Controls */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCommissions.length)} of{' '}
                  {filteredCommissions.length} commission
                  {filteredCommissions.length !== 1 ? 's' : ''}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCommission && (
        <CommissionPaymentModal
          commission={selectedCommission}
          isBatch={selectedCommission.id === 'batch'}
          batchCount={
            selectedCommission.id === 'batch'
              ? filteredCommissions.filter((c) => !c.paid).length
              : 1
          }
          totalAmount={
            selectedCommission.id === 'batch'
              ? filteredCommissions
                  .filter((c) => !c.paid)
                  .reduce((sum, c) => sum + Number(c.amount), 0)
              : Number(selectedCommission.amount)
          }
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCommission(null);
          }}
          onSubmit={handlePaymentSubmit}
          isLoading={markAsPaidMutation.isPending || markMultipleAsPaidMutation.isPending}
        />
      )}
    </div>
  );
}

function CommissionPaymentModal({
  commission,
  isBatch,
  batchCount,
  totalAmount,
  onClose,
  onSubmit,
  isLoading,
}: {
  commission: Commission;
  isBatch: boolean;
  batchCount: number;
  totalAmount: number;
  onClose: () => void;
  onSubmit: (paymentMethod: string, paymentReference: string) => void;
  isLoading: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentMethod, paymentReference);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Mark as Paid
              </h2>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                {isBatch
                  ? `Record payment for ${batchCount} commission(s)`
                  : 'Record payment for this commission'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
              Payment Method <span className="text-danger">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2">
              Payment Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter transaction ID or reference"
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-2">
              {isBatch ? 'Total Amount:' : 'Commission Amount:'}
            </p>
            <p className="text-2xl font-bold text-text-light dark:text-text-dark">
              RWF {totalAmount.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <Button variant="outline" onClick={onClose} className="flex-1" type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
