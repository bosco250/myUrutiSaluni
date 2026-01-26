'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Building2,
  Clock,
  DollarSign,
  CheckCircle,
  Smartphone,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  paid: boolean;
  paidAt: string;
  paymentMethod: string;
  paymentReference: string;
  salonEmployee?: {
    id: string;
    user?: { fullName: string; email: string };
    salon?: { name: string };
  };
  saleItem?: {
    service?: { name: string };
    product?: { name: string };
  };
  createdAt: string;
  metadata?: {
    verified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    [key: string]: any;
  };
}

interface PaginatedResponse {
  data: Commission[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ExternalPaymentsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
      ]}
    >
      <ExternalPaymentsContent />
    </ProtectedRoute>
  );
}

function ExternalPaymentsContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/commissions/${id}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-payments'] });
    },
  });

  // Fetch external payments with server-side pagination
  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['external-payments', page, dateRange, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('paid', 'true');
      params.append('paymentMethod', 'mobile_money');
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());
      
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const res = await api.get(`/commissions?${params.toString()}`);
      return res.data;
    },
    enabled: !!user,
  });

  const commissions = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 };

  // Client-side filtering for search
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          c.id.toLowerCase().includes(query) ||
          c.paymentReference?.toLowerCase().includes(query) ||
          c.salonEmployee?.user?.fullName?.toLowerCase().includes(query) ||
          c.salonEmployee?.salon?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [commissions, searchQuery]);

  const toNumber = (val: any) => Number(val) || 0;
  const totalOnPage = filteredCommissions.reduce((sum, c) => sum + toNumber(c.amount), 0);
  const totalVerified = filteredCommissions.filter(c => c.metadata?.verified).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
          className="h-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            External Payments
            <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded">
              Airtel Money
            </span>
          </h1>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
            Commission payments made via external providers
          </p>
        </div>
      </div>

      {/* Stats Grid - Compact 3-column */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {/* Total Transactions Card */}
        <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">Total Transactions</p>
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark">{meta.total}</h3>
            </div>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Page Total Card */}
        <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">Page Total</p>
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                {totalOnPage.toLocaleString()} RWF
              </h3>
            </div>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="group relative bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-1">Verified (Page)</p>
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                {totalVerified} / {filteredCommissions.length}
              </h3>
            </div>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
            <input
              type="text"
              placeholder="Search reference, employee, salon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg"
            />
            <span className="text-xs text-text-light/40">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-light/50 dark:bg-background-dark/50 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Employee</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Salon</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Reference</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-text-light/60 uppercase tracking-wide">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <CreditCard className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
                      No external payments found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-background-light/50 dark:hover:bg-background-dark/50 transition-all"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-text-light/40" />
                        <div>
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">
                            {new Date(payment.paidAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-text-light/60">
                            {new Date(payment.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">
                          {payment.salonEmployee?.user?.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3 h-3 text-text-light/40" />
                        <span className="text-sm text-text-light/70">
                          {payment.salonEmployee?.salon?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                        {payment.paymentReference || 'N/A'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-success">
                        {toNumber(payment.amount).toLocaleString()} RWF
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.metadata?.verified ? (
                         <span className="bg-success/10 text-success px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1" title={`Verified by ${payment.metadata.verifiedBy || 'Admin'} at ${payment.metadata.verifiedAt ? new Date(payment.metadata.verifiedAt).toLocaleDateString() : 'Unknown date'}`}>
                           <ShieldCheck className="w-3 h-3" />
                           Verified
                         </span>
                      ) : (
                         <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] bg-warning/10 text-warning hover:bg-warning/20 border-warning/20"
                            onClick={() => verifyMutation.mutate(payment.id)}
                            disabled={verifyMutation.isPending}
                         >
                            {verifyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                         </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <div className="text-xs text-text-light/60">
              Page {meta.page} of {meta.totalPages} • {meta.total} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
