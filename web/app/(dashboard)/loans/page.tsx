'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Plus, CreditCard, TrendingUp, AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';

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

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: any;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
}) {
  const styles = {
    blue: {
      border: 'border-blue-200 dark:border-blue-800/50',
      hover: 'hover:border-blue-300 dark:hover:border-blue-700',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-600 dark:text-blue-400',
      label: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      border: 'border-emerald-200 dark:border-emerald-800/50',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      label: 'text-emerald-600 dark:text-emerald-400',
    },
    yellow: {
      border: 'border-amber-200 dark:border-amber-800/50',
      hover: 'hover:border-amber-300 dark:hover:border-amber-700',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600 dark:text-amber-400',
      label: 'text-amber-600 dark:text-amber-400',
    },
    purple: {
      border: 'border-purple-200 dark:border-purple-800/50',
      hover: 'hover:border-purple-300 dark:hover:border-purple-700',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconText: 'text-purple-600 dark:text-purple-400',
      label: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
      border: 'border-orange-200 dark:border-orange-800/50',
      hover: 'hover:border-orange-300 dark:hover:border-orange-700',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconText: 'text-orange-600 dark:text-orange-400',
      label: 'text-orange-600 dark:text-orange-400',
    }
  };

  const style = styles[color] || styles.blue;

  return (
    <div className={`group relative bg-surface-light dark:bg-surface-dark border ${style.border} ${style.hover} rounded-xl p-4 transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] uppercase tracking-widest font-black ${style.label}`}>{title}</p>
        <div className={`p-1.5 ${style.iconBg} rounded-lg group-hover:scale-110 transition-transform`}>
          <Icon className={`w-3.5 h-3.5 ${style.iconText}`} />
        </div>
      </div>
      <div>
        <p className="text-lg font-black text-text-light dark:text-text-dark leading-tight">{value}</p>
        {subtext && <p className="text-[9px] font-bold text-text-light/40 dark:text-text-dark/40 mt-1 uppercase tracking-tighter">{subtext}</p>}
      </div>
    </div>
  );
}

export default function LoansPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <LoansContent />
    </ProtectedRoute>
  );
}

function LoansContent() {
  const router = useRouter();
  const { canManageLoanProducts } = usePermissions();
  
  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark animate-pulse" />)}
         </div>
      </div>
    );
  }

  const activeLoans =
    loans?.filter((loan) => loan.status === 'active' || loan.status === 'disbursed').length || 0;
  const totalLoaned = loans?.reduce((sum, loan) => sum + loan.principalAmount, 0) || 0;
  const pendingLoans = loans?.filter((l) => l.status === 'pending').length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header - Compacted & Flat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tighter text-text-light dark:text-text-dark uppercase leading-none">
              Micro-Lending
            </h1>
            <p className="text-[8px] font-black text-text-light/30 dark:text-text-dark/30 uppercase tracking-[0.2em] mt-0.5">
              Pipeline Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {canManageLoanProducts() && (
             <Button 
               type="button" 
               variant="secondary" 
               onClick={() => router.push('/loans/products')}
               className="h-8 px-4 text-[9px] font-black uppercase tracking-widest"
             >
               <Settings className="mr-1.5 h-3 w-3" />
               Catalog
             </Button>
           )}
           <Button 
             type="button" 
             variant="primary" 
             onClick={() => router.push('/loans/new')}
             className="h-8 px-4 text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/10"
           >
             <Plus className="mr-1.5 h-3 w-3" />
             New Application
           </Button>
        </div>
      </div>

      {/* Stats - Compacted & Flat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Active Loans" 
          value={activeLoans} 
          subtext="In dispersal or active"
          icon={CreditCard}
          color="blue"
        />
        <StatCard 
          title="Total Loaned" 
          value={`RWF ${totalLoaned.toLocaleString()}`} 
          subtext="Net Principle Disbursed"
          icon={TrendingUp}
          color="green"
        />
        <StatCard 
          title="Pending Reviews" 
          value={pendingLoans} 
          subtext="Awaiting verification"
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Data Table - Compacted & Flat */}
      <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
        <div className="px-3 py-2.5 border-b border-border-light dark:border-border-dark bg-background-light/5 flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-text-light/40">
            Pipeline Activity
          </h2>
          <button 
            onClick={() => router.push('/loans/applications')}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
          >
            View All
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <tr>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 whitespace-nowrap">
                   Loan Ref
                </th>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                   Applicant
                </th>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                   Product
                </th>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                   Principle
                </th>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-center">
                   Status
                </th>
                <th className="px-3 py-2.5 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                   App Date
                </th>
                <th className="px-3 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loans?.map((loan) => (
                <tr key={loan.id} className="group transition-colors hover:bg-background-light/30 dark:hover:bg-background-dark/20">
                  <td className="px-3 py-2.5 font-black text-text-light dark:text-text-dark whitespace-nowrap">
                    {loan.loanNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-text-light dark:text-text-dark">{loan.applicant?.fullName}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/40 uppercase">
                      {loan.loanProduct?.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-text-light dark:text-text-dark">
                    {loan.principalAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border ${
                      loan.status === 'active' || loan.status === 'disbursed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : loan.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-text-light/5 text-text-light/40 border-border-light'
                    }`}>
                      {loan.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] font-bold text-text-light/40 uppercase whitespace-nowrap">
                    {format(new Date(loan.applicationDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => router.push(`/loans/applications/${loan.id}`)}
                      className="h-7 px-3 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Audit
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
