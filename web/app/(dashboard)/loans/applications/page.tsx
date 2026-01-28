'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Plus, 
  CreditCard, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Download,
  FileText,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface LoanApplication {
  id: string;
  loanNumber: string;
  principalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  applicationDate: string;
  applicant: {
    fullName: string;
    email?: string;
  };
  loanProduct: {
    name: string;
    code: string;
  };
  salon?: {
    name: string;
  };
}

export default function LoanApplicationsHub() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]}>
      <ApplicationsHubContent />
    </ProtectedRoute>
  );
}

function ApplicationsHubContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { userRole } = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'disbursed'>('all');

  const { data: applications, isLoading } = useQuery<LoanApplication[]>({
    queryKey: ['loans', 'applications'],
    queryFn: async () => {
      const response = await api.get('/loans');
      return response.data.data;
    },
  });

  const filteredApps = applications?.filter(app => {
    const matchesSearch = app.applicant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.loanNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || app.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'disbursed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-text-light/5 text-text-light/40 border-border-light';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'rejected': return <XCircle className="w-3 h-3 mr-1" />;
      case 'pending': return <Clock className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-1">
             <FileText className="w-3 h-3" />
             Governance Hub
          </div>
          <h1 className="text-xl font-black tracking-tighter text-text-light dark:text-text-dark uppercase">
            Loan Applications
          </h1>
          <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest">
            Audit and verify incoming micro-lending requests.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="secondary" size="sm" className="h-8 px-4 text-[9px] font-black uppercase tracking-widest">
              <Download className="mr-2 h-3 w-3" />
              Download Registry
           </Button>
           <Button 
                variant="primary" 
                size="sm" 
                onClick={() => router.push('/loans/new')}
                className="h-8 px-6 text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/10"
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Record
           </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/30" />
            <input 
              type="text" 
              placeholder="Search by Applicant or Ref #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg py-1.5 pl-9 pr-4 text-xs font-bold text-text-light dark:text-text-dark focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
            />
         </div>
         
         <div className="flex items-center gap-1">
            {['all', 'pending', 'approved', 'rejected', 'disbursed'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  activeFilter === filter 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-light/40 hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                {filter}
              </button>
            ))}
         </div>
      </div>

      {/* Main Table Content */}
      <div className="border border-border-light dark:border-border-dark rounded-xl overflow-hidden bg-surface-light dark:bg-surface-dark shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center">
             <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
             <p className="text-[10px] font-bold text-text-light/60 uppercase tracking-widest">Hydrating Applications Registry...</p>
          </div>
        ) : filteredApps && filteredApps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-background-light/5 border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60">Reference</th>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60">Applicant & Node</th>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60">Credit Line</th>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60 text-right">Yield (RWF)</th>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60 text-center">Lifecycle</th>
                  <th className="px-4 py-2.5 font-bold text-[10px] uppercase tracking-widest text-text-light/60">Registry Date</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredApps.map((app) => (
                   <tr 
                    key={app.id} 
                    onClick={() => router.push(`/loans/applications/${app.id}`)}
                    className="group hover:bg-background-light/30 dark:hover:bg-background-dark/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-black text-text-light dark:text-text-dark tracking-tight">
                       {app.loanNumber}
                    </td>
                    <td className="px-4 py-2.5">
                       <div className="font-black text-[11px] text-text-light dark:text-text-dark uppercase tracking-tight leading-none">{app.applicant.fullName}</div>
                       <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-black text-primary/70 uppercase tracking-tighter px-1 rounded bg-primary/5 border border-primary/10">
                             {app.salon?.name || 'Independent Agent'}
                          </span>
                       </div>
                    </td>
                    <td className="px-4 py-2.5">
                       <span className="font-black text-text-light/70 dark:text-text-dark/70 uppercase text-[10px]">{app.loanProduct.name}</span>
                       <div className="text-[9px] font-bold text-text-light/40 uppercase tracking-widest mt-0.5">{app.loanProduct.code}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-text-light dark:text-text-dark">
                       {Number(app.principalAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${getStatusStyle(app.status)}`}>
                          {getStatusIcon(app.status)}
                          {app.status}
                       </span>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase">
                       {format(new Date(app.applicationDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       <div className="inline-flex items-center gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black uppercase tracking-widest">Audit</span>
                          <ChevronRight className="w-3 h-3" />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
             <div className="w-12 h-12 bg-background-light dark:bg-background-dark rounded-2xl flex items-center justify-center mx-auto border border-border-light dark:border-border-dark shadow-sm">
                <Search className="w-5 h-5 text-text-light/40" />
             </div>
             <div className="space-y-1">
                <p className="text-[11px] font-black text-text-light dark:text-text-dark uppercase tracking-tight">Registry Node Empty</p>
                <p className="text-[10px] font-bold text-text-light/60 uppercase tracking-widest">Adjust your search parameters or registry filters.</p>
             </div>
             <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} className="h-8 px-6 text-[10px] font-black uppercase tracking-widest">
                Reset Filters
             </Button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-1 text-[10px] font-black text-text-light/40 uppercase tracking-[0.2em]">
         <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-primary" />
               Total: {filteredApps?.length || 0}
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
               <div className="w-1 h-1 rounded-full bg-amber-500" />
               Audit Required: {filteredApps?.filter(a => a.status === 'pending').length || 0}
            </span>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-text-light/20 tracking-normal font-bold lowercase">v1.8.2-stable</span>
            Page 1 of 1
         </div>
      </div>
    </div>
  );
}
