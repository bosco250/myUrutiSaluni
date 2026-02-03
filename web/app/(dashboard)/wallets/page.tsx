'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  Wallet as WalletIcon, 
  ArrowUp, 
  ArrowDown, 
  Send, 
  X, 
  Loader2,
  Phone,
  AlertCircle,
  CheckCircle,
  Banknote,
  Receipt,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/hooks/usePermissions';

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  user: {
    fullName: string;
  };
}

interface WalletTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  createdAt: string;
  description: string;
  metadata?: {
    employeeName?: string;
    salonOwnerName?: string;
    commissionId?: string;
    phoneNumber?: string;
    [key: string]: unknown;
  };
}

interface AdminWallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function WalletsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { isAdmin } = usePermissions();
  const isAdminView = isAdmin();
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const adminLimit = 15;

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.get('/wallets/me');
      return response.data.data || response.data;
    },
    enabled: !isAdminView,
  });

  const { data: allWalletsResponse, isLoading: allWalletsLoading } = useQuery<{
    data: AdminWallet[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['admin-all-wallets', adminPage, adminLimit, adminSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(adminPage), limit: String(adminLimit) });
      if (adminSearch) params.set('search', adminSearch);
      const response = await api.get(`/wallets?${params}`);
      return response.data.data || response.data;
    },
    enabled: isAdminView,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['wallet-summary', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return { totalReceived: 0, totalSent: 0, pendingCount: 0 };
      const response = await api.get(`/wallets/${wallet.id}/summary`);
      return response.data.data || response.data;
    },
    enabled: !!wallet?.id,
  });

  const { data: txResponse, isLoading: txLoading } = useQuery<{
    data: WalletTransaction[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['wallet-transactions', wallet?.id, currentPage, itemsPerPage],
    queryFn: async () => {
      if (!wallet?.id) return { data: [], meta: { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 } };
      const response = await api.get(
        `/wallets/${wallet.id}/transactions?page=${currentPage}&limit=${itemsPerPage}`
      );
      return response.data.data || response.data;
    },
    enabled: !!wallet?.id,
  });

  const transactions = txResponse?.data || [];
  const meta = txResponse?.meta || { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 };

  // Calculate stats
  const toNumber = (val: unknown) => Number(val) || 0;
  const balance = toNumber(wallet?.balance);
  const deposits = toNumber(summary?.totalReceived);
  const withdrawals = toNumber(summary?.totalSent);
  const pendingCount = toNumber(summary?.pendingCount);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'commission':
      case 'loan_disbursement':
        return <Banknote className="w-4 h-4" />;
      case 'transfer':
        return <Send className="w-4 h-4" />;
      case 'refund':
        return <Receipt className="w-4 h-4" />;
      case 'loan_repayment':
        return <ArrowUp className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'failed') return 'text-danger bg-danger/10';
    if (status === 'pending') return 'text-warning bg-warning/10';
    
    switch (type) {
      case 'deposit':
      case 'commission':
      case 'refund':
      case 'loan_disbursement':
        return 'text-success bg-success/10';
      case 'withdrawal':
      case 'transfer':
      case 'loan_repayment':
      case 'fee':
        return 'text-danger bg-danger/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const isCredit = (type: string) => ['deposit', 'commission', 'refund', 'loan_disbursement'].includes(type);

  // ============ ADMIN: ALL WALLETS LIST ============
  if (isAdminView) {
    const wallets = allWalletsResponse?.data || [];
    const adminMeta = allWalletsResponse?.meta || { total: 0, page: 1, limit: adminLimit, totalPages: 1 };
    const totalBalance = wallets.reduce((sum, w) => sum + toNumber(w.balance), 0);
    const activeCount = wallets.filter(w => w.isActive).length;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border bg-surface-light dark:bg-surface-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
          <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
                <WalletIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                  Wallet Management
                </h1>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Monitor and manage all wallets across the system
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => { setAdminSearch(e.target.value); setAdminPage(1); }}
                placeholder="Search name, email or wallet ID..."
                className="w-full sm:w-72 pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Admin Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-light dark:bg-surface-dark border border-primary-200 dark:border-primary-800/50 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide font-bold text-primary-600 dark:text-primary-400 mb-1">Total Wallets</p>
            <p className="text-lg font-bold text-text-light dark:text-text-dark">{adminMeta.total}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400 mb-1">Total Balance</p>
            <p className="text-lg font-bold text-text-light dark:text-text-dark">
              RWF {showBalance ? totalBalance.toLocaleString() : '••••••'}
            </p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400 mb-1">Active</p>
            <p className="text-lg font-bold text-text-light dark:text-text-dark">
              {activeCount} <span className="text-xs font-normal text-text-light/50">of {wallets.length}</span>
            </p>
          </div>
        </div>

        {/* All Wallets Table */}
        <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">User</th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Wallet ID</th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Balance</th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Status</th>
                  <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {allWalletsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : wallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                      <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No wallets found</p>
                    </td>
                  </tr>
                ) : (
                  wallets.map((w) => (
                    <tr
                      key={w.id}
                      onClick={() => router.push(`/wallets/${w.id}`)}
                      className="hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-text-light dark:text-text-dark">{w.user?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-text-light/50">{w.user?.email || ''}</p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 ${
                          w.user?.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                          w.user?.role === 'association_admin' ? 'bg-blue-100 text-blue-700' :
                          w.user?.role === 'salon_owner' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{w.user?.role?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-text-light/60 dark:text-text-dark/60">
                        {w.id.slice(0, 8)}...{w.id.slice(-4)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-text-light dark:text-text-dark">
                        {w.currency} {showBalance ? toNumber(w.balance).toLocaleString() : '••••••'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          w.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}>
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-light/60 dark:text-text-dark/60">
                        {format(new Date(w.createdAt), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {adminMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
              <div className="text-xs text-text-light/60">
                Page {adminMeta.page} of {adminMeta.totalPages} • {adminMeta.total} total
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAdminPage(p => Math.max(1, p - 1))} disabled={adminPage === 1 || allWalletsLoading} className="h-7 px-2 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setAdminPage(p => Math.min(adminMeta.totalPages, p + 1))} disabled={adminPage === adminMeta.totalPages || allWalletsLoading} className="h-7 px-2 text-xs">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (walletLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                Wallet
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Manage your digital wallet and view transaction history
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/loans')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              <Banknote className="w-3.5 h-3.5" />
              Loans
            </Button>
            <Button
              onClick={() => router.push('/external-payments')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              External Transaction
            </Button>
            <Button
              onClick={() => setShowTopUpModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Top Up
            </Button>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              variant="primary"
              size="sm"
              disabled={balance < 1000}
              className="flex items-center gap-2 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Compacted & Flat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Balance Card */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-primary-200 dark:border-primary-800/50 rounded-xl p-3 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
             <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-wide font-bold text-primary-600 dark:text-primary-400">Current Balance</p>
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors"
                  title={showBalance ? "Hide Balance" : "Show Balance"}
                >
                  {showBalance ? (
                    <EyeOff className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Eye className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                  )}
                </button>
             </div>
            <div className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded-md group-hover:scale-110 transition-transform">
              <WalletIcon className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
             {wallet?.currency || 'RWF'} {showBalance ? balance.toLocaleString() : '••••••'}
          </p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
               {balance < 1000 ? 'Min withdrawal: 1,000' : 'Available funds'}
             </span>
          </div>
        </div>

        {/* Total Received */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">Total Received</p>
            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md group-hover:scale-110 transition-transform">
              <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">+{deposits.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Commissions & deposits
             </span>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-red-200 dark:border-red-800/50 rounded-xl p-3 hover:border-red-300 dark:hover:border-red-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-red-600 dark:text-red-400">Total Withdrawn</p>
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-md group-hover:scale-110 transition-transform">
              <ArrowUp className="w-3 h-3 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">-{withdrawals.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                Payments & transfers
             </span>
          </div>
        </div>

        {/* Transactions Count */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Transactions</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Receipt className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{transactions.length}</p>
          <div className="flex items-center gap-1 mt-1">
             {pendingCount > 0 ? (
               <span className="text-[10px] font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
                 {pendingCount} pending
               </span>
             ) : (
                <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                   All completed
                </span>
             )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Date
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Type
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                  Description
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Amount
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Balance
                </th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {txLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                    <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No transactions yet</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-light dark:text-text-dark">
                      {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                      <div className="text-[10px] text-text-light/50">
                        {format(new Date(tx.createdAt), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                         <span className={`flex items-center justify-center w-5 h-5 rounded-md ${
                            getTransactionColor(tx.transactionType, tx.status).split(' ')[1]
                         } ${getTransactionColor(tx.transactionType, tx.status).split(' ')[0]}`}>
                            {getTransactionIcon(tx.transactionType)}
                         </span>
                         <span className="capitalize text-text-light dark:text-text-dark">
                            {tx.transactionType.replace('_', ' ')}
                         </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-text-light dark:text-text-dark max-w-xs truncate">
                      {tx.description}
                      {tx.metadata?.employeeName && (
                        <div className="text-[10px] text-text-light/50">
                          To: {tx.metadata.employeeName}
                        </div>
                      )}
                      {tx.metadata?.salonOwnerName && tx.transactionType === 'commission' && (
                        <div className="text-[10px] text-text-light/50">
                          From: {tx.metadata.salonOwnerName}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap font-bold text-right ${
                      isCredit(tx.transactionType) ? 'text-success' : 'text-text-light dark:text-text-dark'
                    }`}>
                      {isCredit(tx.transactionType) ? '+' : '-'}
                      {toNumber(tx.amount).toLocaleString()} RWF
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-text-light/70 dark:text-text-dark/70">
                      {showBalance ? `${toNumber(tx.balanceAfter).toLocaleString()} RWF` : '••••••'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                        tx.status === 'completed' ? 'bg-success/10 text-success' :
                        tx.status === 'failed' ? 'bg-danger/10 text-danger' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Compact Design */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
            <div className="text-xs text-text-light/60">
              Page {meta.page} of {meta.totalPages} • {meta.total} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || txLoading}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={currentPage === meta.totalPages || txLoading}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          wallet={wallet}
          showBalance={showBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
            setShowWithdrawModal(false);
          }}
        />
      )}

      {/* Top Up Modal */}
      {showTopUpModal && (
        <TopUpModal
          wallet={wallet}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
            setShowTopUpModal(false);
          }}
        />
      )}
    </div>
  );
}

function WithdrawModal({
  wallet,
  showBalance,
  onClose,
  onSuccess,
}: {
  wallet: WalletData | undefined;
  showBalance: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const balance = Number(wallet?.balance) || 0;

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string }) => {
      const response = await api.post('/wallets/withdraw', data);
      return response.data;
    },
    onSuccess: () => {
      setSuccess(true);
      toast.success('Withdrawal initiated successfully');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      const message = maybeAxios?.response?.data?.message || 'Failed to process withdrawal';
      setError(message);
      toast.error(message);
    },
  });

  const validatePhone = (phone: string): boolean => {
    // Rwandan Airtel numbers: 078XXXXXXX
    const cleaned = phone.replace(/\s/g, '');
    return /^(078|0?78|\+?2507?8)\d{7}$/.test(cleaned);
  };

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('250')) return cleaned;
    if (cleaned.startsWith('0')) return '250' + cleaned.slice(1);
    return '250' + cleaned;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = Number(amount);
    
    if (!amountNum || amountNum < 1000) {
      setError('Minimum withdrawal amount is 1,000 RWF');
      return;
    }

    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid Rwandan Airtel number (078XXXXXXX)');
      return;
    }

    withdrawMutation.mutate({
      amount: amountNum,
      phoneNumber: formatPhone(phoneNumber),
    });
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6 text-center animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
            Withdrawal Initiated
          </h2>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Your withdrawal of <span className="font-bold text-primary">{Number(amount).toLocaleString()} RWF</span> to{' '}
            <span className="font-semibold">{phoneNumber}</span> is being processed.
          </p>
          <p className="text-xs text-text-light/50">You'll receive a notification once complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Withdraw Funds</h2>
              <p className="text-sm text-text-light/60">Send to Airtel Money</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition">
            <X className="w-5 h-5 opacity-50" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance Info */}
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 text-center border border-border-light dark:border-border-dark">
            <span className="text-xs font-semibold text-text-light/60 uppercase">Available Balance</span>
            <p className="text-2xl font-bold text-primary mt-1">
              {wallet?.currency || 'RWF'} {showBalance ? balance.toLocaleString() : '••••••'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label htmlFor="withdraw-amount" className="block text-sm font-medium mb-1.5">
              Amount (RWF)
            </label>
            <input
              id="withdraw-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (min 1,000)"
              min={1000}
              max={balance}
              className="w-full px-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-lg font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(Math.min(preset, balance)))}
                  disabled={preset > balance}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border-light dark:border-border-dark hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label htmlFor="withdraw-phone" className="block text-sm font-medium mb-1.5">
              Airtel Money Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
              <input
                id="withdraw-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="078 XXX XXXX"
                className="w-full pl-10 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <p className="text-[10px] text-text-light/50 mt-1">
              Enter your Airtel Money registered phone number
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={withdrawMutation.isPending || !amount || !phoneNumber}
            >
              {withdrawMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Withdraw'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Top Up Modal Component - Compacted Design with Airtel Money
function TopUpModal({
  wallet,
  onClose,
  onSuccess,
}: {
  wallet: WalletData | undefined;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'instructions' | 'success'>('form');

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; method: string; type: string; phoneNumber: string; description: string }) => {
      const response = await api.post('/payments/initiate', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all wallet-related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });

      setStep('success');
      toast.success('Top up initiated successfully');
      setTimeout(() => onSuccess(), 2000);
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      const message = maybeAxios?.response?.data?.message || 'Failed to initiate payment';
      setError(message);
      toast.error(message);
    },
  });

  // Validate Rwandan Airtel phone numbers: 072, 073 with various prefixes
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Matches: 072XXXXXXX, 073XXXXXXX (Airtel prefixes only)
    // +25072..., +25073...
    // 25072..., 25073...
    return /^(\+?250)?(0?7[23]\d{7})$/.test(cleaned);
  };

  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const match = cleaned.match(/^(\+?250)?(0?7[23])(\d{7})$/);
    if (match) {
      const prefix = match[2].startsWith('0') ? match[2] : '0' + match[2];
      return `${prefix} ${match[3].slice(0, 3)} ${match[3].slice(3)}`;
    }
    return phone;
  };

  const cleanPhoneForApi = (phone: string): string => {
    // Backend expects generic phone format, let's normalize to 07...
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+250')) return '0' + cleaned.slice(4);
    if (cleaned.startsWith('250')) return '0' + cleaned.slice(3);
    if (cleaned.startsWith('7')) return '0' + cleaned;
    return cleaned;
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amountNum = Number(amount);
    
    if (!amountNum || amountNum < 100) {
      setError('Minimum top-up amount is 100 RWF');
      return;
    }
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }
    if (!validatePhone(phoneNumber)) {
      setError('Enter a valid Airtel number (072... or 073...)');
      return;
    }
    setStep('instructions');
  };

  const handleConfirmPayment = () => {
    depositMutation.mutate({
      amount: Number(amount),
      method: 'airtel_money',
      type: 'wallet_topup',
      phoneNumber: cleanPhoneForApi(phoneNumber),
      description: `Wallet top-up via Airtel Money`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      <div className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-w-md w-full p-5 animate-in zoom-in-95">
        {/* Header - Compacted */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-sm">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-light dark:text-text-dark">Airtel Money Top Up</h2>
              <p className="text-[11px] text-text-light/60 dark:text-text-dark/60">
                {step === 'form' && 'Add funds to your wallet securely'}
                {step === 'instructions' && 'Complete payment on your phone'}
                {step === 'success' && 'Deposit successful!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition">
            <X className="w-4 h-4 opacity-50" />
          </button>
        </div>

        {/* Success State */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <h3 className="text-base font-bold text-text-light dark:text-text-dark">Top Up Successful!</h3>
            <p className="text-xs text-text-light/60 mt-1">RWF {Number(amount).toLocaleString()} added to your wallet</p>
          </div>
        )}

        {/* Error */}
        {error && step !== 'success' && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <form onSubmit={handleProceed} className="space-y-4">
            {/* Amount */}
            <div>
              <label htmlFor="topup-amount" className="block text-xs font-semibold mb-1.5">
                Amount (RWF)
              </label>
              <input
                id="topup-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min 100"
                min={100}
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[2000, 5000, 10000, 20000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`py-1.5 text-[10px] font-semibold rounded-md border transition-colors ${
                      amount === String(preset)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border-light dark:border-border-dark hover:border-primary hover:text-primary'
                    }`}
                  >
                    {preset / 1000}K
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="topup-phone" className="block text-xs font-semibold mb-1.5">
                Airtel Money Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40" />
                <input
                  id="topup-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="072/073 XXX XXXX"
                  className="w-full pl-9 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <p className="text-[10px] text-text-light/50 mt-1">
                Enter your registered Airtel Money number (072... or 073...)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={!amount || !phoneNumber}>
                Continue
              </Button>
            </div>
          </form>
        )}

        {/* Instructions Step */}
        {step === 'instructions' && (
          <div className="space-y-4">
            {/* Amount Display */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4 text-center">
              <span className="text-[10px] font-semibold text-text-light/60 uppercase">Pay via Airtel Money</span>
              <p className="text-2xl font-bold text-red-500 mt-1">
                RWF {Number(amount).toLocaleString()}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 border border-border-light dark:border-border-dark">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500" />
                Complete Payment on your Phone:
              </h4>
              <ol className="text-xs text-text-light/70 dark:text-text-dark/70 space-y-2.5">
                <li className="flex gap-2">
                  <span className="font-bold text-red-500 w-5">1.</span>
                  You will receive a prompt on <b>{formatPhoneDisplay(phoneNumber)}</b>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-500 w-5">2.</span>
                  Check the amount: <b>RWF {Number(amount).toLocaleString()}</b>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-500 w-5">3.</span>
                  Enter your Mobile Money PIN to confirm
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-red-500 w-5">4.</span>
                  Wait for the confirmation SMS
                </li>
              </ol>
            </div>

            <p className="text-[10px] text-center text-text-light/50">
              The payment will be processed automatically once confirmed.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep('form')}>
                Back
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-500/20" 
                onClick={handleConfirmPayment}
                disabled={depositMutation.isPending}
              >
                {depositMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
