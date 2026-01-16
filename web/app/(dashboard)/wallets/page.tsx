'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Wallet, ArrowUp, ArrowDown } from 'lucide-react';
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
  balanceAfter: number;
  status: string;
  createdAt: string;
  description: string;
}

export default function WalletsPage() {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.get(`/wallets/${user.id}`);
      return response.data.data;
    },
  });

  const { data: transactions } = useQuery<WalletTransaction[]>({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const response = await api.get(`/wallets/${wallet.id}/transactions`);
      return response.data.data;
    },
    enabled: !!wallet?.id,
  });

  if (walletLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                Wallet
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Manage your digital wallet and view transaction history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.22),transparent_60%)]" />
          <div className="relative text-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">
                Current Balance
              </p>
              <div className="h-9 w-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black mt-3">
              {wallet?.currency} {wallet?.balance.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Deposits
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {wallet?.currency}{' '}
                {transactions
                  ?.filter((t) => t.transactionType === 'deposit')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString() || '0'}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <ArrowUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-danger/10 via-transparent to-danger/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Withdrawals
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {wallet?.currency}{' '}
                {transactions
                  ?.filter((t) => t.transactionType === 'withdrawal')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString() || '0'}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-text-light dark:text-text-dark">
              Transaction History
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Your latest wallet activity.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm">
            Export
          </Button>
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
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {transactions?.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-background-light/50 dark:hover:bg-background-dark/30 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                    {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                      {transaction.transactionType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">
                    {transaction.description}
                  </td>
                  <td
                    className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${
                      transaction.transactionType === 'deposit' ||
                      transaction.transactionType === 'commission'
                        ? 'text-success'
                        : 'text-danger'
                    }`}
                  >
                    {transaction.transactionType === 'deposit' ||
                    transaction.transactionType === 'commission'
                      ? '+'
                      : '-'}
                    {wallet?.currency} {transaction.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                    {wallet?.currency} {transaction.balanceAfter.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

