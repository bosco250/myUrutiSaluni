'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Wallet as WalletIcon,
  ArrowUp,
  ArrowDown,
  Send,
  Loader2,
  Banknote,
  Receipt,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalletDetail {
  id: string;
  balance: number;
  currency: string;
  isActive: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
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
  referenceType?: string;
  referenceId?: string;
  transactionReference?: string;
  metadata?: {
    employeeName?: string;
    salonOwnerName?: string;
    phoneNumber?: string;
    [key: string]: unknown;
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const toNumber = (val: unknown) => Number(val) || 0;

const isCredit = (type: string) =>
  ['deposit', 'commission', 'refund', 'loan_disbursement'].includes(type);

function getTransactionIcon(type: string) {
  switch (type) {
    case 'deposit':         return <ArrowDownLeft className="w-4 h-4" />;
    case 'withdrawal':      return <ArrowUpRight  className="w-4 h-4" />;
    case 'commission':
    case 'loan_disbursement': return <Banknote    className="w-4 h-4" />;
    case 'transfer':        return <Send         className="w-4 h-4" />;
    case 'refund':          return <Receipt      className="w-4 h-4" />;
    case 'loan_repayment':  return <ArrowUp      className="w-4 h-4" />;
    default:                return <TrendingUp   className="w-4 h-4" />;
  }
}

function getTransactionColor(type: string, status: string) {
  if (status === 'failed')  return 'text-danger bg-danger/10';
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
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WalletDetailPage() {
  const { id: walletId } = useParams<{ id: string }>();
  const router            = useRouter();
  const { isAdmin }       = usePermissions();

  const [showBalance, setShowBalance] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showBlockModal, setShowBlockModal]   = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelTx, setPendingCancelTx] = useState<WalletTransaction | null>(null);
  const [selectedTx, setSelectedTx]           = useState<WalletTransaction | null>(null);

  const queryClient = useQueryClient();
  const toast       = useToast();

  // non-admins have no business here
  useEffect(() => {
    if (!isAdmin()) router.push('/wallets');
  }, [isAdmin, router]);

  // ── wallet details (user name / balance / currency) ──────────────────────
  const { data: walletDetail, isLoading: walletLoading } = useQuery<WalletDetail | null>({
    queryKey: ['admin-wallet-detail', walletId],
    queryFn: async () => {
      const res  = await api.get(`/wallets?search=${walletId}&limit=1`);
      const body = res.data.data || res.data;   // unwrap global interceptor if present
      return body?.data?.[0] ?? null;
    },
    enabled: !!walletId && isAdmin(),
  });

  // ── summary stats ─────────────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ['admin-wallet-summary', walletId],
    queryFn: async () => {
      const res = await api.get(`/wallets/${walletId}/summary`);
      return res.data.data || res.data;
    },
    enabled: !!walletId && isAdmin(),
  });

  // ── paginated transaction list ────────────────────────────────────────────
  const { data: txResponse, isLoading: txLoading } = useQuery<{
    data: WalletTransaction[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['admin-wallet-transactions', walletId, currentPage, itemsPerPage],
    queryFn: async () => {
      const res = await api.get(
        `/wallets/${walletId}/transactions?page=${currentPage}&limit=${itemsPerPage}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!walletId && isAdmin(),
  });

  // ── derived values ────────────────────────────────────────────────────────
  const transactions = txResponse?.data || [];
  const meta         = txResponse?.meta || { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 };

  const balance      = toNumber(walletDetail?.balance);
  const deposits     = toNumber(summary?.totalReceived);
  const withdrawals  = toNumber(summary?.totalSent);
  const pendingCount = toNumber(summary?.pendingCount);

  // ── mutations ─────────────────────────────────────────────────────────────
  const blockMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/wallets/${walletId}/status`, {
        isActive: !walletDetail?.isActive,
      });
      return res.data.data || res.data;
    },
    onSuccess: () => {
      toast.success(walletDetail?.isActive ? 'Wallet blocked successfully' : 'Wallet unblocked successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-detail', walletId] });
      setShowBlockModal(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update wallet status';
      toast.error(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!pendingCancelTx) throw new Error('No transaction selected');
      const res = await api.post(`/wallets/transactions/${pendingCancelTx.id}/cancel`);
      return res.data.data || res.data;
    },
    onSuccess: () => {
      toast.success('Transaction cancelled and balance adjusted');
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions', walletId] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-summary', walletId] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-detail', walletId] });
      setShowCancelModal(false);
      setPendingCancelTx(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel transaction';
      toast.error(msg);
    },
  });

  // ── balance-chain verification ────────────────────────────────────────────
  // Transactions arrive sorted DESC (newest first).
  // tx[i].balanceBefore should equal tx[i+1].balanceAfter.
  // A mismatch means something changed between those two rows.
  const hasMismatch = (i: number) =>
    i < transactions.length - 1 &&
    toNumber(transactions[i].balanceBefore) !== toNumber(transactions[i + 1].balanceAfter);

  // ── guards ────────────────────────────────────────────────────────────────
  if (!isAdmin()) return null;

  if (walletLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading wallet…</p>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

      {/* ── back link ── */}
      <button
        onClick={() => router.push('/wallets')}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to All Wallets
      </button>

      {/* ── header ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                  {walletDetail?.user?.fullName || 'Unknown'}&apos;s Wallet
                </h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                  walletDetail?.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {walletDetail?.isActive ? 'Active' : 'Blocked'}
                </span>
              </div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                ID&nbsp;{walletId?.slice(0, 8)}…{walletId?.slice(-4)}&ensp;•&ensp;{walletDetail?.user?.email || ''}
              </p>
            </div>
          </div>
          <Button
            variant={walletDetail?.isActive ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 text-xs self-start"
          >
            <Ban className="w-3.5 h-3.5" />
            {walletDetail?.isActive ? 'Block Wallet' : 'Unblock Wallet'}
          </Button>
        </div>
      </div>

      {/* ── stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">

        {/* Balance */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-primary-200 dark:border-primary-800/50 rounded-xl p-3 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wide font-bold text-primary-600 dark:text-primary-400">Current Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors"
                title={showBalance ? 'Hide Balance' : 'Show Balance'}
              >
                {showBalance
                  ? <EyeOff className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                  : <Eye    className="w-3 h-3 text-primary-600 dark:text-primary-400" />}
              </button>
            </div>
            <div className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded-md group-hover:scale-110 transition-transform">
              <WalletIcon className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">
            {walletDetail?.currency || 'RWF'} {showBalance ? balance.toLocaleString() : '••••••'}
          </p>
          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1">Wallet balance</p>
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
          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1">Commissions & deposits</p>
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
          <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-1">Payments & transfers</p>
        </div>

        {/* Transaction count */}
        <div className="group relative bg-surface-light dark:bg-surface-dark border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-400">Transactions</p>
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform">
              <Receipt className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-text-light dark:text-text-dark leading-tight">{meta.total}</p>
          <div className="mt-1">
            {pendingCount > 0 ? (
              <span className="text-[10px] font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            ) : (
              <span className="text-[10px] text-text-light/50 dark:text-text-dark/50">All completed</span>
            )}
          </div>
        </div>
      </div>

      {/* ── transactions table ── */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Date</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Type</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Description</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Amount</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Balance</th>
                <th className="px-3 py-2.5 font-medium text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">Status</th>
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
                transactions.map((tx, i) => {
                  const [textCls, bgCls] = getTransactionColor(tx.transactionType, tx.status).split(' ');

                  return (
                    <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="hover:bg-background-light dark:hover:bg-background-dark transition-colors cursor-pointer">

                      {/* Date */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-text-light dark:text-text-dark">
                        {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                        <div className="text-[10px] text-text-light/50">
                          {format(new Date(tx.createdAt), 'HH:mm')}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`flex items-center justify-center w-5 h-5 rounded-md ${bgCls} ${textCls}`}>
                            {getTransactionIcon(tx.transactionType)}
                          </span>
                          <span className="capitalize text-text-light dark:text-text-dark">
                            {tx.transactionType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2.5 text-text-light dark:text-text-dark max-w-xs truncate">
                        {tx.description}
                        {tx.metadata?.employeeName && (
                          <div className="text-[10px] text-text-light/50">To: {tx.metadata.employeeName}</div>
                        )}
                        {tx.metadata?.salonOwnerName && tx.transactionType === 'commission' && (
                          <div className="text-[10px] text-text-light/50">From: {tx.metadata.salonOwnerName}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className={`px-3 py-2.5 whitespace-nowrap font-bold text-right ${isCredit(tx.transactionType) ? 'text-success' : 'text-text-light dark:text-text-dark'}`}>
                        {isCredit(tx.transactionType) ? '+' : '-'}
                        {toNumber(tx.amount).toLocaleString()} RWF
                      </td>

                      {/* Balance + mismatch flag */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right text-text-light/70 dark:text-text-dark/70">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{showBalance ? `${toNumber(tx.balanceAfter).toLocaleString()} RWF` : '••••••'}</span>
                          {hasMismatch(i) && (
                            <span title={`Balance gap: opening ${toNumber(tx.balanceBefore).toLocaleString()} ≠ previous closing ${toNumber(transactions[i + 1].balanceAfter).toLocaleString()}`}>
                              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status + Actions */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                            tx.status === 'completed'  ? 'bg-success/10 text-success'  :
                            tx.status === 'failed'     ? 'bg-danger/10 text-danger'    :
                            tx.status === 'cancelled'  ? 'bg-danger/10 text-danger'    :
                                                         'bg-warning/10 text-warning'
                          }`}>
                            {tx.status}
                          </span>
                          {tx.status === 'pending' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPendingCancelTx(tx); setShowCancelModal(true); }}
                              className="text-[10px] text-warning hover:text-danger transition-colors underline"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || txLoading} className="h-7 px-2 text-xs">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))} disabled={currentPage === meta.totalPages || txLoading} className="h-7 px-2 text-xs">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Block / Unblock Wallet */}
      <ConfirmationModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={() => blockMutation.mutate()}
        title={walletDetail?.isActive ? 'Block This Wallet' : 'Unblock This Wallet'}
        message={
          walletDetail?.isActive
            ? `Blocking this wallet will prevent ${walletDetail?.user?.fullName || 'this user'} from making withdrawals or receiving new transactions. You can unblock it at any time.`
            : `Unblocking this wallet will restore full transaction capabilities for ${walletDetail?.user?.fullName || 'this user'}.`
        }
        confirmLabel={walletDetail?.isActive ? 'Block Wallet' : 'Unblock Wallet'}
        variant={walletDetail?.isActive ? 'danger' : 'primary'}
        isProcessing={blockMutation.isPending}
      />

      {/* Cancel Pending Transaction */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setPendingCancelTx(null); }}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Pending Transaction"
        message={`Cancel this ${pendingCancelTx?.transactionType?.replace(/_/g, ' ') || 'transaction'} of ${toNumber(pendingCancelTx?.amount).toLocaleString()} RWF? ${
          ['withdrawal', 'transfer', 'loan_repayment', 'fee'].includes(pendingCancelTx?.transactionType || '')
            ? 'The deducted amount will be refunded to the wallet.'
            : 'The credited amount will be deducted from the wallet.'
        } This action cannot be undone.`}
        confirmLabel="Cancel Transaction"
        variant="danger"
        isProcessing={cancelMutation.isPending}
      />

      {/* Transaction Detail Modal */}
      <Modal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Details" size="md">
        {selectedTx && (
          <div className="space-y-4">
            {/* ID + Status */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-text-light/60 dark:text-text-dark/60 break-all">
                {selectedTx.id}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex-shrink-0 ${
                selectedTx.status === 'completed'  ? 'bg-success/10 text-success'  :
                selectedTx.status === 'failed'     ? 'bg-danger/10 text-danger'    :
                selectedTx.status === 'cancelled'  ? 'bg-danger/10 text-danger'    :
                                                     'bg-warning/10 text-warning'
              }`}>
                {selectedTx.status}
              </span>
            </div>

            {/* Type + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 mb-1">Type</p>
                <div className="flex items-center gap-1.5">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-md ${
                    getTransactionColor(selectedTx.transactionType, selectedTx.status).split(' ')[1]
                  } ${getTransactionColor(selectedTx.transactionType, selectedTx.status).split(' ')[0]}`}>
                    {getTransactionIcon(selectedTx.transactionType)}
                  </span>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark capitalize">
                    {selectedTx.transactionType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 mb-1">Date</p>
                <p className="text-sm text-text-light dark:text-text-dark">
                  {format(new Date(selectedTx.createdAt), 'MMM dd, yyyy')}
                </p>
                <p className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                  {format(new Date(selectedTx.createdAt), 'HH:mm:ss')}
                </p>
              </div>
            </div>

            {/* Amount + Balance flow */}
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
              <div className="text-center mb-3">
                <p className={`text-2xl font-bold ${isCredit(selectedTx.transactionType) ? 'text-success' : 'text-danger'}`}>
                  {isCredit(selectedTx.transactionType) ? '+' : '-'}{toNumber(selectedTx.amount).toLocaleString()} RWF
                </p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-center">
                  <p className="text-text-light/50 dark:text-text-dark/50">Before</p>
                  <p className="font-medium text-text-light dark:text-text-dark">{toNumber(selectedTx.balanceBefore).toLocaleString()} RWF</p>
                </div>
                <span className="text-text-light/30 dark:text-text-dark/30 text-lg">→</span>
                <div className="text-center">
                  <p className="text-text-light/50 dark:text-text-dark/50">After</p>
                  <p className="font-bold text-text-light dark:text-text-dark">{toNumber(selectedTx.balanceAfter).toLocaleString()} RWF</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedTx.description && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 mb-1">Description</p>
                <p className="text-sm text-text-light dark:text-text-dark">{selectedTx.description}</p>
              </div>
            )}

            {/* References */}
            {(selectedTx.referenceType || selectedTx.referenceId || selectedTx.transactionReference) && (
              <div className="border-t border-border-light dark:border-border-dark pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">References</p>
                {selectedTx.referenceType && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60">Reference Type</span>
                    <span className="text-xs font-mono text-text-light dark:text-text-dark">{selectedTx.referenceType}</span>
                  </div>
                )}
                {selectedTx.referenceId && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60">Reference ID</span>
                    <span className="text-xs font-mono text-text-light dark:text-text-dark">{selectedTx.referenceId.slice(0, 8)}…{selectedTx.referenceId.slice(-4)}</span>
                  </div>
                )}
                {selectedTx.transactionReference && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60">Tx Reference</span>
                    <span className="text-xs font-mono text-text-light dark:text-text-dark">{selectedTx.transactionReference}</span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
              <div className="border-t border-border-light dark:border-border-dark pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">Details</p>
                {Object.entries(selectedTx.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-xs text-text-light/60 dark:text-text-dark/60 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-xs font-mono text-text-light dark:text-text-dark truncate ml-2 max-w-[55%]">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
