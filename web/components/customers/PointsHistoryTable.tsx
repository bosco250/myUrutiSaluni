'use client';

import { format } from 'date-fns';
import { DollarSign, Calendar, Gift, Edit, TrendingUp, TrendingDown } from 'lucide-react';

interface PointsTransaction {
  id: string;
  points: number;
  balanceAfter: number;
  sourceType: 'sale' | 'appointment' | 'redemption' | 'manual' | 'bonus' | 'correction';
  sourceId: string | null;
  description: string | null;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  createdAt: string;
}

interface PointsHistoryTableProps {
  transactions: PointsTransaction[];
  isLoading?: boolean;
}

export default function PointsHistoryTable({
  transactions,
  isLoading = false,
}: PointsHistoryTableProps) {
  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'sale':
        return <DollarSign className="w-4 h-4" />;
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'redemption':
        return <TrendingDown className="w-4 h-4" />;
      case 'bonus':
        return <Gift className="w-4 h-4" />;
      case 'manual':
      case 'correction':
        return <Edit className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'sale':
        return 'Sale';
      case 'appointment':
        return 'Appointment';
      case 'redemption':
        return 'Redemption';
      case 'bonus':
        return 'Bonus';
      case 'manual':
        return 'Manual';
      case 'correction':
        return 'Correction';
      default:
        return sourceType;
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'sale':
      case 'appointment':
      case 'bonus':
        return 'text-success';
      case 'redemption':
        return 'text-warning';
      case 'manual':
      case 'correction':
        return 'text-primary';
      default:
        return 'text-text-light/60 dark:text-text-dark/60';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-light/60 dark:text-text-dark/60">Loading points history...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-12 h-12 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
        <p className="text-text-light/60 dark:text-text-dark/60 font-medium">
          No points transactions yet
        </p>
        <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-2">
          Points will appear here when earned or redeemed
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Points
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Balance After
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase tracking-wider">
              Adjusted By
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {transactions.map((transaction) => (
            <tr
              key={transaction.id}
              className="hover:bg-background-light dark:hover:bg-background-dark transition"
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className={getSourceColor(transaction.sourceType)}>
                    {getSourceIcon(transaction.sourceType)}
                  </span>
                  <span className="text-sm text-text-light dark:text-text-dark">
                    {getSourceLabel(transaction.sourceType)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`text-sm font-medium ${
                    transaction.points > 0
                      ? 'text-success'
                      : transaction.points < 0
                      ? 'text-warning'
                      : 'text-text-light/60 dark:text-text-dark/60'
                  }`}
                >
                  {transaction.points > 0 ? '+' : ''}
                  {transaction.points.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                {transaction.balanceAfter.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-light/80 dark:text-text-dark/80">
                {transaction.description || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                {transaction.createdBy ? transaction.createdBy.fullName : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

