'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wallet, 
  TrendingUp, 
  Briefcase, 
  Calendar,
  User,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Zap,
  Star,
  DollarSign,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from '@/components/charts/LazyCharts';

// Types for the detailed view
interface WorkHistory {
  salonName: string;
  role: string;
  period: string;
  performance: number; // 0-100
  avgMonthlyCommission: number;
  totalAppointments: number;
  status: 'active' | 'previous';
}

interface LoanAudit {
  id: string;
  loanNumber: string;
  principalAmount: number;
  status: string;
  purpose: string;
  applicationDate: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    joinDate: string;
    nationalId?: string;
    address?: string;
  };
  loanProduct: {
    name: string;
    interest: string;
    repayment: string;
  };
  analytics: {
    score: number;
    riskLevel: string;
    averageEarnings: number;
    appointmentConsistency: number; // %
    customerRetention: number; // %
    workHistory: WorkHistory[];
  };
  stats: {
    type: 'business' | 'individual' | 'consumer';
    totalAppointments?: number;
    completedAppointments?: number;
    totalRevenue?: number;
    totalEarnings?: number;
    ownedSalons?: any[];
    workplaces?: string[];
  };
  monthlyTrend: { month: string; amount: number }[];
  highResTrends: {
    daily: { date: string; amount: number }[];
    weekly: { week: string; amount: number }[];
    peakPerformanceDay: string;
    maxDailyYield: number;
  };
  decisionSupport: {
    repayment: {
      monthlyInstallment: number;
      totalRepayment: number;
      debtServiceRatio: number;
      disposableIncome: number;
      riskThreshold: number;
    };
    stability: {
      tenureMonths: number;
      stabilityScore: number;
      customerReach: number;
      loyaltyIndex: number;
    };
    recommendation: {
      status: string;
      confidence: number;
      keyFactor: string;
    };
  };
}

export default function LoanAuditPage() {
  const params = useParams();
  const id = params.id as string;
  
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <LoanAuditContent applicationId={id} />
    </ProtectedRoute>
  );
}

function LoanAuditContent({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState('bank_transfer');
  const [disbursementRef, setDisbursementRef] = useState('');

  // Fetch application details and aggregated analytics
  const { data: audit, isLoading, refetch } = useQuery<LoanAudit>({
    queryKey: ['loans', 'audit', applicationId],
    queryFn: async () => {
      const response = await api.get(`/loans/${applicationId}/audit`);
      const { loan, applicant, creditScore, performance, stats } = response.data.data;
      
      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        principalAmount: Number(loan.principalAmount),
        status: loan.status,
        purpose: loan.metadata?.purpose || 'No purpose stated.',
        applicationDate: loan.applicationDate,
        applicant: {
          id: applicant.id,
          fullName: applicant.fullName,
          email: applicant.email || 'N/A',
          phone: applicant.phone || 'N/A',
          joinDate: applicant.createdAt,
          nationalId: applicant.nationalId,
          address: `${applicant.address || ''}, ${applicant.district || ''}`,
        },
        loanProduct: {
          name: loan.loanProduct.name,
          interest: `${loan.interestRate}% Flat`,
          repayment: `${loan.termMonths} Months`,
        },
        analytics: {
          score: creditScore.score,
          riskLevel: creditScore.riskLevel,
          averageEarnings: loan.applicant.role === 'salon_owner' ? (stats.totalRevenue || 0) / 6 : (stats.totalEarnings || 0) / 6,
          appointmentConsistency: performance.completionRate,
          customerRetention: 85,
          workHistory: loan.applicant.role === 'salon_owner' 
            ? stats.ownedSalons?.map((s: any) => ({
                salonName: s.name,
                role: 'Proprietor',
                period: 'Active',
                performance: 100,
                avgMonthlyCommission: stats.totalRevenue / (Math.max(stats.ownedSalons.length, 1) * 6),
                totalAppointments: stats.totalAppointments / Math.max(stats.ownedSalons.length, 1),
                status: 'active'
              }))
            : [
                {
                  salonName: loan.salon?.name || 'Assigned Salon',
                  role: applicant.role.replace('_', ' '),
                  period: `Since ${format(new Date(applicant.createdAt), 'MMM yyyy')}`,
                  performance: Math.round(performance.completionRate),
                  avgMonthlyCommission: (stats.totalEarnings || 0) / 6,
                  totalAppointments: performance.completedAppointments,
                  status: 'active'
                }
              ]
        },
        stats: stats,
        monthlyTrend: response.data.data.monthlyTrend,
        highResTrends: response.data.data.highResTrends,
        decisionSupport: response.data.data.decisionSupport
      };
    },
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/loans/${applicationId}/approve`, { approvedById: user?.id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowApproveModal(false);
      refetch();
    },
  });

  const disburseMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/loans/${applicationId}/disburse`, { 
        method: disbursementMethod,
        reference: disbursementRef || undefined
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowDisburseModal(false);
      refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/loans/${applicationId}/reject`, { 
        rejectedById: user?.id,
        reason: rejectReason 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowRejectModal(false);
      router.push('/loans/applications');
    },
  });

  // Check if user is an admin (can take actions) vs applicant (view-only)
  const isAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN' ||
                  user?.role === 'association_admin' || user?.role === 'ASSOCIATION_ADMIN' ||
                  user?.role === 'district_leader' || user?.role === 'DISTRICT_LEADER';

  // Determine action buttons based on status and user role
  const getActionButtons = () => {
    if (!audit) return null;
    
    // Status badge helper
    const getStatusBadge = () => {
      switch (audit.status) {
        case 'pending':
        case 'draft':
          return (
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-black uppercase tracking-widest">
              <Clock className="inline-block mr-1.5 h-3 w-3" /> Pending Review
            </div>
          );
        case 'approved':
          return (
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 className="inline-block mr-1.5 h-3 w-3" /> Approved - Awaiting Disbursement
            </div>
          );
        case 'disbursed':
        case 'active':
          return (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 className="inline-block mr-1.5 h-3 w-3" /> Loan Active
            </div>
          );
        case 'cancelled':
          return (
            <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-[10px] font-black uppercase tracking-widest">
              <XCircle className="inline-block mr-1.5 h-3 w-3" /> Application Rejected
            </div>
          );
        default:
          return null;
      }
    };

    // For non-admin users (salon owners viewing their own loan), show only status badge
    if (!isAdmin) {
      return getStatusBadge();
    }
    
    // For admin users, show action buttons based on status
    switch (audit.status) {
      case 'pending':
      case 'draft':
        return (
          <>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectModal(true)}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-rose-600 border-rose-500/30 hover:bg-rose-500/5"
            >
              <XCircle className="mr-1.5 h-3 w-3" /> Reject
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setShowApproveModal(true)}
              className="h-9 px-6 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              <CheckCircle2 className="mr-1.5 h-3 w-3" /> Approve
            </Button>
          </>
        );
      case 'approved':
        return (
          <Button 
            variant="primary" 
            onClick={() => setShowDisburseModal(true)}
            className="h-9 px-6 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
          >
            <DollarSign className="mr-1.5 h-3 w-3" /> Disburse Funds
          </Button>
        );
      case 'disbursed':
      case 'active':
        return (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 className="inline-block mr-1.5 h-3 w-3" /> Loan Active
          </div>
        );
      case 'cancelled':
        return (
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-[10px] font-black uppercase tracking-widest">
            <XCircle className="inline-block mr-1.5 h-3 w-3" /> Application Rejected
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading || !audit) {
    return (
      <div className="p-12 text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-text-light/40">Synthesizing Applicant Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24">
      {/* Top Nav & Context */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="space-y-1">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-light/60 hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-2.5 h-2.5 transition-transform group-hover:-translate-x-1" />
            Back to Registry
          </button>
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5 capitalize">
                <User className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-xl font-black tracking-tighter text-text-light dark:text-text-dark uppercase leading-none">
                  {audit.applicant.fullName}
                </h1>
                <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                  KYC VERIFIED <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> • Ref: {audit.loanNumber}
                </p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {getActionButtons()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Metrics & History */}
        <div className="lg:col-span-8 space-y-4">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             <MetricBlock 
                label={audit.stats.type === 'business' ? "Salon Revenue (Total)" : "Total Earnings"} 
                value={`RWF ${(audit.stats.totalRevenue || audit.stats.totalEarnings || 0).toLocaleString()}`} 
                subtext={audit.stats.type === 'business' ? "Gross salon intake" : "Net professional commission"}
                icon={Wallet}
                color="blue"
             />
             <MetricBlock 
                label="Yield Consistency" 
                value={`${audit.analytics.appointmentConsistency}%`} 
                subtext="Performance rating"
                icon={Zap}
                color="emerald"
             />
             <MetricBlock 
                label={audit.stats.type === 'business' ? "Salon Count" : "Workplaces"} 
                value={audit.stats.type === 'business' ? audit.stats.ownedSalons?.length || 0 : audit.stats.workplaces?.length || 0} 
                subtext="Economic footprint"
                icon={Briefcase}
                color="amber"
             />
          </div>

          {/* Performance Trajectory */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm overflow-hidden">
             <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light/70 dark:text-text-dark/70">Performance Trajectory</h3>
                  <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase mt-0.5 tracking-tight">Real-time monthly yield audit</p>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">Amount (RWF)</span>
                </div>
             </div>
             
             <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={audit.monthlyTrend}>
                      <defs>
                         <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: 'currentColor' }} 
                        className="opacity-40"
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--surface-dark)', 
                          border: 'none', 
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '8px'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorEarnings)" 
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Detailed Work History */}
          <div className="space-y-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-text-light/60 px-1">Professional Portfolio</h3>
             <div className="space-y-2">
                {audit.analytics.workHistory.map((work, idx) => (
                   <div key={idx} className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 transition-all hover:border-primary/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex items-start gap-4">
                            <div className={`mt-1 p-1.5 rounded-lg ${work.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-text-light/5 text-text-light/30'}`}>
                               <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <h4 className="font-black text-[11px] text-text-light dark:text-text-dark uppercase tracking-tight">{work.salonName}</h4>
                                  {work.status === 'active' && (
                                     <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">Active Node</span>
                                  )}
                               </div>
                               <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-widest mt-0.5">{work.role} • {work.period}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-8 px-2 sm:px-0">
                            <div className="text-center">
                               <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-1">Performance</p>
                               <div className="h-1.5 w-24 bg-background-light dark:bg-background-dark rounded-full overflow-hidden border border-border-light dark:border-border-dark">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${work.performance}%` }} />
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-0.5">Yield</p>
                               <p className="text-xs font-black text-text-light dark:text-text-dark">RWF {work.avgMonthlyCommission.toLocaleString()}</p>
                            </div>
                         </div>
                      </div>

                      {/* Velocity Add-on */}
                      <div className="mt-4 pt-3 border-t border-border-light/50 dark:border-border-dark/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                         <div>
                            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-1">Peak Daily Yield</p>
                            <p className="text-[11px] font-black text-text-light dark:text-text-dark">RWF {audit.highResTrends.maxDailyYield.toLocaleString()}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-1">Peak Productivity Day</p>
                            <p className="text-[11px] font-black text-emerald-600 uppercase">{audit.highResTrends.peakPerformanceDay}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest mb-1">Weekly Audited Volume</p>
                            <p className="text-[11px] font-black text-text-light dark:text-text-dark">RWF {(audit.highResTrends.weekly[0]?.amount || 0).toLocaleString()}</p>
                         </div>
                         <div className="flex items-center justify-end">
                            <div className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                               Velocity Audit Pass
                            </div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Application Context & Governance */}
        <div className="lg:col-span-4 space-y-4">
           {/* Application Card */}
           <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                 <DollarSign className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-primary mb-3">Request Assessment</h3>
              <div className="space-y-4">
                 <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Capital Requirement</p>
                        <p className="text-2xl font-black text-text-light dark:text-text-dark tracking-tighter">
                          RWF {audit.principalAmount.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Monthly Installment</p>
                        <p className="text-sm font-black text-text-light dark:text-text-dark tracking-tighter">
                          RWF {audit.decisionSupport.repayment.monthlyInstallment.toLocaleString()}
                        </p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 pt-3 border-t border-primary/10">
                    <RulePoint label="Product" value={audit.loanProduct.name} />
                    <RulePoint label="DSR %" value={`${audit.decisionSupport.repayment.debtServiceRatio}%`} />
                    <RulePoint label="Term" value={audit.loanProduct.repayment} />
                    <RulePoint label="Credit Score" value={`${audit.analytics.score}/1000`} />
                 </div>
              </div>
           </div>

           {/* AI Decision recommendation */}
           <div className={`rounded-xl p-4 border ${
             audit.decisionSupport.recommendation.status === 'AUTO_APPROVE' 
             ? 'bg-emerald-500/5 border-emerald-500/20' 
             : audit.decisionSupport.recommendation.status === 'HIGH_RISK_REJECT'
             ? 'bg-rose-500/5 border-rose-500/20'
             : 'bg-amber-500/5 border-amber-500/20'
           }`}>
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light/70 dark:text-text-dark/70">System Recommendation</h3>
                 <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                   audit.decisionSupport.recommendation.status === 'AUTO_APPROVE' ? 'bg-emerald-600 text-white' :
                   audit.decisionSupport.recommendation.status === 'HIGH_RISK_REJECT' ? 'bg-rose-600 text-white' :
                   'bg-amber-600 text-white'
                 }`}>
                    {audit.decisionSupport.recommendation.status.replace('_', ' ')}
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-light/60 uppercase">Confidence Rating</span>
                    <span className="text-[11px] font-black text-text-light dark:text-text-dark">{audit.decisionSupport.recommendation.confidence}%</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-light/60 uppercase">Critical Trigger</span>
                    <span className="text-[11px] font-black text-text-light dark:text-text-dark uppercase">{audit.decisionSupport.recommendation.keyFactor}</span>
                 </div>
                 <div className="mt-3 pt-3 border-t border-border-light/20 dark:border-border-dark/20">
                    <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase leading-snug">
                       Applicant yields {audit.decisionSupport.repayment.debtServiceRatio}% of income to repayment. 
                       Disposable buffer of RWF {audit.decisionSupport.repayment.disposableIncome.toLocaleString()} confirmed.
                    </p>
                 </div>
              </div>
           </div>

           {/* Risk & Compliance */}
           <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light/60 mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                 Risk Intelligence
              </h3>
              
              <div className="space-y-4 text-left">
                <div className="space-y-0.5 pb-3 border-b border-border-light dark:border-border-dark text-left">
                  <p className="text-[10px] font-black text-text-light/60 uppercase tracking-widest">KYC Verification</p>
                  <p className="text-[11px] font-black text-text-light dark:text-text-dark uppercase">NID: {audit.applicant.nationalId || 'PENDING'}</p>
                  <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-tight truncate">{audit.applicant.address || 'Address unverified'}</p>
                </div>
                <RiskRow 
                  label="Risk Grade" 
                  value={audit.analytics.riskLevel.toUpperCase()} 
                  status={audit.analytics.riskLevel === 'excellent' ? 'safe' : audit.analytics.riskLevel === 'poor' ? 'high' : 'low'} 
                />
                <RiskRow label="Historical Defaults" value="0 Cases" status="low" />
                <RiskRow 
                  label="Stability Score" 
                  value={`${audit.decisionSupport.stability.stabilityScore}%`} 
                  status={audit.decisionSupport.stability.stabilityScore > 70 ? 'safe' : 'low'} 
                />
                <RiskRow 
                  label="Customer Reach" 
                  value={`${audit.decisionSupport.stability.customerReach} Unique`} 
                  status="safe" 
                />
                <RiskRow label="Identity Verification" value="Biometric Match" status="safe" />
              </div>

              <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark space-y-3">
                 <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-amber-500/10 text-amber-700">
                       <Clock className="w-2.5 h-2.5" />
                    </div>
                    <p className="text-[10px] font-bold text-text-light/60 uppercase tracking-tight leading-tight">
                       Final audit required by Association before disbursement batch 24B.
                    </p>
                 </div>
              </div>
           </div>

           {/* Purpose Footer */}
           <div className="px-1 border-t border-border-light/10 dark:border-border-dark/10 pt-4">
              <p className="text-[10px] font-black text-text-light/50 uppercase tracking-[0.2em] mb-2">Operational Context</p>
              <p className="text-[11px] font-bold text-text-light/70 italic leading-relaxed">
                 "{audit.purpose}"
              </p>
           </div>
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light dark:border-border-dark">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-tight">Approve Application</h3>
              <p className="text-[11px] text-text-light/60 dark:text-text-dark/60 mt-2">
                You are about to approve this loan application for <strong className="text-text-light dark:text-text-dark">RWF {audit.principalAmount.toLocaleString()}</strong>.
              </p>
            </div>
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-light/60">Applicant</span>
                <span className="font-bold text-text-light dark:text-text-dark">{audit.applicant.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-text-light/60">Credit Score</span>
                <span className="font-bold text-emerald-600">{audit.analytics.score}/1000</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2">
                <span className="text-text-light/60">Recommendation</span>
                <span className="font-bold text-text-light dark:text-text-dark uppercase">{audit.decisionSupport.recommendation.status.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowApproveModal(false)}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => approveMutation.mutate()}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Approval</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light dark:border-border-dark">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-tight">Reject Application</h3>
              <p className="text-[11px] text-text-light/60 dark:text-text-dark/60 mt-2">
                Please provide a reason for rejecting this loan application.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-[10px] font-black text-text-light/60 uppercase tracking-widest mb-2">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="w-full h-24 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark placeholder:text-text-light/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectModal(false)}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => rejectMutation.mutate()}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-2" /> Confirm Rejection</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disbursement Modal */}
      {showDisburseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light dark:border-border-dark">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-black text-text-light dark:text-text-dark uppercase tracking-tight">Disburse Funds</h3>
              <p className="text-[11px] text-text-light/60 dark:text-text-dark/60 mt-2">
                Confirm disbursement of <strong className="text-text-light dark:text-text-dark">RWF {audit.principalAmount.toLocaleString()}</strong> to {audit.applicant.fullName}.
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black text-text-light/60 uppercase tracking-widest mb-2">Disbursement Method</label>
                <select
                  value={disbursementMethod}
                  onChange={(e) => setDisbursementMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-light/60 uppercase tracking-widest mb-2">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  placeholder="Transaction reference..."
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark placeholder:text-text-light/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDisburseModal(false)}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                disabled={disburseMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => disburseMutation.mutate()}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                disabled={disburseMutation.isPending}
              >
                {disburseMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><DollarSign className="w-4 h-4 mr-2" /> Confirm Disbursement</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Internal Components
function MetricBlock({ label, value, subtext, icon: Icon, color }: any) {
  const themes = {
    blue: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20'
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 shadow-sm transition-all hover:bg-background-light/50">
       <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${themes[color as keyof typeof themes]}`}>
             <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
             <p className="text-[10px] font-black text-text-light/60 uppercase tracking-widest leading-none mb-1">{label}</p>
             <p className="text-sm font-black text-text-light dark:text-text-dark tracking-tight truncate">{value}</p>
             <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-tight leading-none mt-1">{subtext}</p>
          </div>
       </div>
    </div>
  );
}

function RulePoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
       <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-0.5">{label}</p>
       <p className="text-[11px] font-black text-text-light dark:text-text-dark uppercase">{value}</p>
    </div>
  );
}

function RiskRow({ label, value, status }: { label: string; value: string, status: 'low' | 'safe' | 'high' }) {
  const statusColors = {
    low: 'text-emerald-600',
    safe: 'text-blue-600',
    high: 'text-rose-600'
  };

  return (
    <div className="flex items-center justify-between gap-4">
       <span className="text-[10px] font-bold text-text-light/60 uppercase tracking-tight">{label}</span>
       <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-text-light dark:text-text-dark uppercase">{value}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${statusColors[status]} bg-current`} />
       </div>
    </div>
  );
}
