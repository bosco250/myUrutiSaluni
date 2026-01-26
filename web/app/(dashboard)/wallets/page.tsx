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
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';

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

export default function WalletsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await api.get('/wallets/me');
      return response.data;
    },
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
      return response.data;
    },
    enabled: !!wallet?.id,
  });

  const transactions = txResponse?.data || [];
  const meta = txResponse?.meta || { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 };

  // Calculate stats
  const toNumber = (val: unknown) => Number(val) || 0;
  const balance = toNumber(wallet?.balance);
  const deposits = transactions
    .filter((t) => ['deposit', 'commission', 'refund'].includes(t.transactionType))
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const withdrawals = transactions
    .filter((t) => ['withdrawal', 'transfer'].includes(t.transactionType))
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4" />;
      case 'commission':
        return <Banknote className="w-4 h-4" />;
      case 'transfer':
        return <Send className="w-4 h-4" />;
      case 'refund':
        return <Receipt className="w-4 h-4" />;
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
        return 'text-success bg-success/10';
      case 'withdrawal':
      case 'transfer':
        return 'text-danger bg-danger/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const isCredit = (type: string) => ['deposit', 'commission', 'refund'].includes(type);

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
              onClick={() => router.push('/external-payments')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              External Transaction
            </Button>
            <Button
              onClick={() => setShowTopUpModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowDown className="w-4 h-4" />
              Top Up
            </Button>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              variant="primary"
              disabled={balance < 1000}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.22),transparent_60%)]" />
          <div className="relative text-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">
                Current Balance
              </p>
              <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <WalletIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black mt-3">
              {wallet?.currency || 'RWF'} {balance.toLocaleString()}
            </p>
            {balance < 1000 && (
              <p className="text-[10px] text-white/60 mt-1">Min withdrawal: 1,000 RWF</p>
            )}
          </div>
        </div>

        {/* Total Received */}
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Total Received
              </p>
              <p className="text-xl font-black text-success mt-2">
                +{deposits.toLocaleString()} <span className="text-sm font-normal">RWF</span>
              </p>
              <p className="text-[10px] text-text-light/50 mt-1">
                Commissions & deposits
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-danger/10 via-transparent to-danger/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Total Withdrawn
              </p>
              <p className="text-xl font-black text-danger mt-2">
                -{withdrawals.toLocaleString()} <span className="text-sm font-normal">RWF</span>
              </p>
              <p className="text-[10px] text-text-light/50 mt-1">
                Payments & transfers
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <ArrowUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Transactions Count */}
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Transactions
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {transactions.length}
              </p>
              {pendingCount > 0 && (
                <p className="text-[10px] text-warning mt-1">
                  {pendingCount} pending
                </p>
              )}
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-text-light dark:text-text-dark">
              Transaction History
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Your latest wallet activity
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background-light/60 dark:bg-background-dark/40">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {txLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-light/40 dark:text-text-dark/40">
                    <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No transactions yet</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-background-light/50 dark:hover:bg-background-dark/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
                      <div className="text-[10px] text-text-light/50">
                        {format(new Date(tx.createdAt), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getTransactionColor(tx.transactionType, tx.status)}`}>
                        {getTransactionIcon(tx.transactionType)}
                        {tx.transactionType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark max-w-xs truncate">
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
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${
                      isCredit(tx.transactionType) ? 'text-success' : 'text-danger'
                    }`}>
                      {isCredit(tx.transactionType) ? '+' : '-'}
                      {toNumber(tx.amount).toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-light/70 dark:text-text-dark/70">
                      {toNumber(tx.balanceAfter).toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
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
  onClose,
  onSuccess,
}: {
  wallet: WalletData | undefined;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
      setTimeout(() => {
        onSuccess();
      }, 2000);
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybeAxios?.response?.data?.message || 'Failed to process withdrawal');
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
              {wallet?.currency || 'RWF'} {balance.toLocaleString()}
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
      setTimeout(() => onSuccess(), 2000);
    },
    onError: (err: unknown) => {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      setError(maybeAxios?.response?.data?.message || 'Failed to initiate payment');
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
