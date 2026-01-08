'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';

interface Loan {
  id: string;
  loanNumber: string;
  principalAmount: number;
  status: string;
  applicationDate: string;
  applicant: {
    fullName: string;
  };
  loanProduct: {
    name: string;
  };
}

export default function LoansPage() {
  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading loans...</p>
        </div>
      </div>
    );
  }

  const activeLoans =
    loans?.filter((loan) => loan.status === 'active' || loan.status === 'disbursed').length || 0;
  const totalLoaned = loans?.reduce((sum, loan) => sum + loan.principalAmount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                Loans
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Micro-lending applications and loan management.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Apply for Loan
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Active Loans
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {activeLoans}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Total Loaned
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                RWF {totalLoaned.toLocaleString()}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-warning/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Pending
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {loans?.filter((l) => l.status === 'pending').length || 0}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-text-light dark:text-text-dark">
              Loan Applications
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
              Review loans by status, applicant, and product.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background-light/60 dark:bg-background-dark/40">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Loan #
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Applicant
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loans?.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-background-light/50 dark:hover:bg-background-dark/30 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-light dark:text-text-dark">
                    {loan.loanNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                    {loan.applicant?.fullName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                    {loan.loanProduct?.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-light dark:text-text-dark">
                    RWF {loan.principalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        loan.status === 'active' || loan.status === 'disbursed'
                          ? 'bg-success/10 text-success'
                          : loan.status === 'pending'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/70 dark:text-text-dark/70'
                      }`}
                    >
                      {loan.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-light/60 dark:text-text-dark/60">
                    {format(new Date(loan.applicationDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Button type="button" variant="secondary" size="sm">
                      View
                    </Button>
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

