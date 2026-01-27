'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ShieldAlert,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Inspection {
  id: string;
  status: string;
  complianceStatus: string;
  scheduledDate: string;
  inspectionDate?: string;
  inspectionType: string;
  overallScore?: number;
  totalScore?: number;
  maxScore?: number;
  notes?: string;
  findings?: string;
  recommendations?: string;
  violations: any[];
  correctiveActions: any[];
  nextInspectionDate?: string;
  certificateIssued: boolean;
  createdAt: string;
  salon: {
    id: string;
    name: string;
  };
  inspector: {
    id: string;
    fullName: string;
  };
}

export default function InspectionsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]}>
      <InspectionsContent />
    </ProtectedRoute>
  );
}

function InspectionsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSalon, setFilterSalon] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });

  // Fetch salons
  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
  });

  // Fetch inspections
  const { data: inspections = [], isLoading } = useQuery<Inspection[]>({
    queryKey: ['inspections', filterStatus, filterSalon],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSalon) params.append('salonId', filterSalon);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const response = await api.get(`/inspections?${params.toString()}`);
      return response.data?.data || response.data || [];
    },
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['inspection-statistics', filterSalon],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSalon) params.append('salonId', filterSalon);
      const response = await api.get(`/inspections/statistics?${params.toString()}`);
      return response.data || {};
    },
  });

  // Fetch overdue inspections
  const { data: overdueInspections = [] } = useQuery<Inspection[]>({
    queryKey: ['overdue-inspections'],
    queryFn: async () => {
      const response = await api.get('/inspections/overdue');
      return response.data?.data || response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      setDeleteConfirmation({ isOpen: false, id: null });
      success('Inspection deleted successfully');
    },
    onError: () => {
        toastError('Failed to delete inspection');
    }
  });

  const getStatusBadgeVariant = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'scheduled': return 'primary';
      case 'failed': return 'danger';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getComplianceBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
     switch (status) {
      case 'compliant': return 'success';
      case 'non_compliant': return 'danger';
      case 'partially_compliant': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-light dark:text-text-dark">Inspections</h1>
          <p className="text-text-light/60 dark:text-text-dark/60 text-xs font-medium">
            Manage compliance and safety standards
          </p>
        </div>
        <Button
          onClick={() => router.push('/inspections/new')}
          variant="primary"
          size="sm"
          className="shadow-md shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Inspection
        </Button>
      </div>

      {/* Statistics Compact */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: statistics.total || 0, icon: ClipboardCheck, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Compliant', value: statistics.compliant || 0, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Non-Compliant', value: statistics.nonCompliant || 0, icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
            { label: 'Partially', value: statistics.partiallyCompliant || 0, icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Avg Score', value: `${Number(statistics.averageScore || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-3 shadow-sm hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-xl font-black mt-0.5 ${idx === 4 ? 'text-text-light dark:text-text-dark' : stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-md ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts Compact */}
      {overdueInspections.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-lg p-2.5 flex items-center gap-3">
            <div className="bg-error/10 p-1.5 rounded-full">
                <ShieldAlert className="w-4 h-4 text-error" />
            </div>
          <span className="text-xs font-semibold text-error-dark dark:text-error-light">
             {overdueInspections.length} Overdue Inspection{overdueInspections.length > 1 ? 's' : ''} detected.
          </span>
          <Button variant="outline" className="ml-auto text-error border-error/20 hover:bg-error/10 hover:border-error h-7 text-xs px-2" size="sm" onClick={() => {}}>
             View All
          </Button>
        </div>
      )}

      {/* Filters Compact */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-surface-light dark:bg-surface-dark p-2 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
          <div className="p-1.5 bg-background-light dark:bg-background-dark rounded-md mr-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-text-light/60 dark:text-text-dark/60" />
          </div>
          {['all', 'scheduled', 'completed', 'in_progress'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light/60 dark:text-text-dark/60 hover:bg-background-secondary dark:hover:bg-active hover:text-text-light'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64 relative flex-shrink-0">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
             <select
                value={filterSalon}
                onChange={(e) => setFilterSalon(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs font-medium focus:ring-1 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer h-8"
            >
                <option value="">Filter by Salon</option>
                {salons.map((salon: any) => (
                <option key={salon.id} value={salon.id}>
                    {salon.name}
                </option>
                ))}
            </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
           <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
           <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-medium">Loading data...</p>
        </div>
      ) : inspections.length === 0 ? (
        <EmptyState
            icon={<ClipboardCheck className="w-12 h-12" />}
            title="No Inspections"
            description="No inspections found matching filters."
            className="py-12"
            action={
                <Button onClick={() => router.push('/inspections/new')} variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Inspection
                </Button>
            }
        />
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-background-secondary dark:bg-surface-dark/50 text-xs uppercase font-bold text-text-light/50 dark:text-text-dark/50 border-b border-border-light dark:border-border-dark">
                 <tr>
                    <th className="px-4 py-3 min-w-[200px]">Salon</th>
                    <th className="px-4 py-3 hidden md:table-cell">Inspector</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Compliance</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border-light dark:divide-border-dark">
                 {inspections.map((inspection) => (
                    <tr key={inspection.id} className="group hover:bg-background-light dark:hover:bg-active transition-colors">
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                                    inspection.status === 'completed' ? 'bg-success/10 text-success' :
                                    inspection.status === 'failed' ? 'bg-error/10 text-error' :
                                    'bg-primary/10 text-primary'
                                }`}>
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-text-light dark:text-text-dark truncate text-sm">{inspection.salon.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-text-light/50 dark:text-text-dark/50">
                                        <Calendar className="w-3 h-3" />
                                        <span>{format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-text-light/40" />
                                <span className="text-sm text-text-light/80 dark:text-text-dark/80">{inspection.inspector.fullName}</span>
                            </div>
                            <p className="text-xs text-text-light/40 pl-5.5">{inspection.inspectionType}</p>
                        </td>
                         <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(inspection.status)} size="sm" className="capitalize">
                                {inspection.status.replace('_', ' ')}
                            </Badge>
                         </td>
                         <td className="px-4 py-3 hidden sm:table-cell">
                             <Badge variant={getComplianceBadgeVariant(inspection.complianceStatus)} size="sm" className="capitalize" dot>
                                {inspection.complianceStatus.replace('_', ' ')}
                            </Badge>
                         </td>
                         <td className="px-4 py-3 hidden lg:table-cell">
                            {inspection.overallScore !== undefined && inspection.overallScore !== null ? (
                                <div className="flex items-end gap-1.5">
                                    <span className={`text-base font-black leading-none ${
                                        Number(inspection.overallScore) >= 80 ? 'text-success' : 
                                        Number(inspection.overallScore) >= 50 ? 'text-warning' : 'text-error'
                                    }`}>
                                        {Number(inspection.overallScore).toFixed(0)}%
                                    </span>
                                    <span className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium mb-0.5">
                                        ({Number(inspection.totalScore || 0)}/{Number(inspection.maxScore || 0)})
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-text-light/30 italic">N/A</span>
                            )}
                         </td>
                         <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => router.push(`/inspections/${inspection.id}`)}
                                    className="p-1.5 text-text-light/50 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    title="View"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                {inspection.status !== 'completed' && (
                                     <button
                                        onClick={() => router.push(`/inspections/${inspection.id}/edit`)}
                                        className="p-1.5 text-text-light/50 hover:text-warning hover:bg-warning/10 rounded-md transition-colors"
                                        title="Edit"
                                        >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setDeleteConfirmation({ isOpen: true, id: inspection.id })}
                                    className="p-1.5 text-text-light/50 hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                         </td>
                    </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={() => {
            if (deleteConfirmation.id) {
                deleteMutation.mutate(deleteConfirmation.id);
            }
        }}
        title="Delete Inspection"
        message="Are you sure? This processing cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        isProcessing={deleteMutation.isPending}
      />
    </div>
  );
}

