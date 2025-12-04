'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Wallet, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

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

  const { data: transactions, isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['wallet-transactions', wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const response = await api.get(`/wallets/${wallet.id}/transactions`);
      return response.data.data;
    },
    enabled: !!wallet?.id,
  });

  if (walletLoading) {
    return <div className="text-center py-12">Loading wallet...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-600 mt-2">Manage your digital wallet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Wallet className="w-8 h-8" />
            <span className="text-sm opacity-90">Current Balance</span>
          </div>
          <p className="text-3xl font-bold">
            {wallet?.currency} {wallet?.balance.toLocaleString() || '0'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deposits</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {wallet?.currency}{' '}
                {transactions
                  ?.filter((t) => t.transactionType === 'deposit')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString() || '0'}
              </p>
            </div>
            <ArrowUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {wallet?.currency}{' '}
                {transactions
                  ?.filter((t) => t.transactionType === 'withdrawal')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString() || '0'}
              </p>
            </div>
            <ArrowDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance After
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions?.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {transaction.transactionType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.transactionType === 'deposit' ||
                      transaction.transactionType === 'commission'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.transactionType === 'deposit' ||
                    transaction.transactionType === 'commission'
                      ? '+'
                      : '-'}
                    {wallet?.currency} {transaction.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {wallet?.currency} {transaction.balanceAfter.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
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

