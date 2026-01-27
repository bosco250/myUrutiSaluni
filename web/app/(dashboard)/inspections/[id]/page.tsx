'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

import { AlertTriangle, Edit, ArrowLeft, CheckCircle2, ClipboardCheck, XCircle, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';


interface Inspection {
  id: string;
  status: string;
  complianceStatus: string;
  scheduledDate: string;
  scheduledTime?: string;
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
  certificateExpiryDate?: string;
  checklistItems: any[];
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

export default function InspectionDetailPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER]}>
      <InspectionDetailContent />
    </ProtectedRoute>
  );
}

function InspectionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: inspection, isLoading } = useQuery<Inspection>({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const response = await api.get(`/inspections/${inspectionId}`);
      return response.data?.data || response.data;
    },
    // Prevent fetching if id is 'new' to avoid backend errors
    enabled: !!inspectionId && inspectionId !== 'new',
  });

  const canEdit = user?.role === 'super_admin' || user?.role === 'association_admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-error/10 border border-error/20 rounded-lg p-6 text-center">
          <p className="text-error mb-4">Inspection not found.</p>
          <Button onClick={() => router.push('/inspections')} variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const map: any = {
      scheduled: 'info',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'default',
      failed: 'danger',
    };
    return map[status] || 'default';
  };

  const getComplianceColor = (status: string) => {
    const map: any = {
      compliant: 'success',
      non_compliant: 'danger',
      partially_compliant: 'warning',
      pending: 'default',
    };
    return map[status] || 'default';
  };

  const getSeverityColor = (severity: string) => {
     const map: any = {
      low: 'info',
      medium: 'warning',
      high: 'danger',
      critical: 'danger',
    };
    return map[severity] || 'default';
  };

  // Group checklist items by category
  const checklistByCategory = (inspection.checklistItems || []).reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const infoLabel = "text-[10px] font-bold uppercase tracking-wide text-text-light/50 dark:text-text-dark/50";
  const infoValue = "text-sm font-medium text-text-light dark:text-text-dark truncate";

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push('/inspections')} variant="secondary" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
              Inspection Details
              <Badge variant="default" size="sm" className="font-mono text-xs">
                {inspection.id.substring(0, 8)}...
              </Badge>
            </h1>
          </div>
        </div>
        {canEdit && inspection.status !== 'completed' && (
          <Button onClick={() => router.push(`/inspections/${inspectionId}/edit`)} variant="outline" size="sm">
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Conduct Inspection
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Info & Stats */}
        <div className="space-y-4 lg:col-span-1">
            {/* Status & Score Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className={infoLabel}>Status</p>
                        <Badge variant={getStatusColor(inspection.status)} size="sm" className="mt-1">
                            {inspection.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <div>
                        <p className={infoLabel}>Compliance</p>
                        <Badge variant={getComplianceColor(inspection.complianceStatus)} size="sm" className="mt-1">
                            {inspection.complianceStatus.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                 {inspection.overallScore !== null && inspection.overallScore !== undefined && (
                     <div className="pt-4 border-t border-border-light dark:border-border-dark">
                         <div className="flex items-center justify-between">
                             <div>
                                <p className={infoLabel}>Overall Score</p>
                                <p className="text-3xl font-black text-primary mt-0.5">
                                    {Number(inspection.overallScore).toFixed(1)}%
                                </p>
                             </div>
                              <div className="text-right">
                                <p className={infoLabel}>Points</p>
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                  {Number(inspection.totalScore || 0).toFixed(0)} <span className="text-text-light/50">/ {Number(inspection.maxScore || 0).toFixed(0)}</span>
                                </p>
                              </div>
                         </div>
                     </div>
                 )}
            </div>

            {/* Details Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm">
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Information</h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className={infoLabel}>Salon</p>
                            <p className={infoValue}>{inspection.salon.name}</p>
                        </div>
                         <div>
                            <p className={infoLabel}>Type</p>
                            <p className={infoValue}>{inspection.inspectionType}</p>
                        </div>
                    </div>
                     <div>
                        <p className={infoLabel}>Inspector</p>
                        <p className={infoValue}>{inspection.inspector.fullName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className={infoLabel}>Scheduled</p>
                            <p className={infoValue}>
                                {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
                                {inspection.scheduledTime && <span className="text-xs ml-1 opacity-70">{inspection.scheduledTime}</span>}
                            </p>
                        </div>
                        {inspection.inspectionDate && (
                            <div>
                                <p className={infoLabel}>Inspected On</p>
                                <p className={infoValue}>{format(new Date(inspection.inspectionDate), 'MMM d, yyyy')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Violations (if any) */}
            {inspection.violations && inspection.violations.length > 0 && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-error mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Violations ({inspection.violations.length})
                    </h3>
                    <div className="space-y-2">
                        {inspection.violations.map((violation: any) => (
                        <div
                            key={violation.id}
                            className="p-2 rounded border border-error/20 bg-error/5"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <Badge variant={getSeverityColor(violation.severity)} size="sm">{violation.severity}</Badge>
                                <span className="text-[10px] text-text-light/50 uppercase">{violation.status}</span>
                            </div>
                            <p className="text-xs font-medium text-text-light dark:text-text-dark">{violation.category}</p>
                            <p className="text-[11px] text-text-light/70 dark:text-text-dark/70 leading-tight mt-0.5 line-clamp-2">{violation.description}</p>
                        </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Checklist & Notes */}
        <div className="lg:col-span-2 space-y-4">
             {/* Notes / Findings */}
             {(inspection.findings || inspection.recommendations || inspection.notes) && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark p-4 shadow-sm">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inspection.findings && (
                            <div className="text-xs">
                                <h4 className="font-bold text-text-light dark:text-text-dark mb-1">Findings</h4>
                                <p className="text-text-light/80 dark:text-text-dark/80 whitespace-pre-wrap">{inspection.findings}</p>
                            </div>
                        )}
                         {inspection.recommendations && (
                            <div className="text-xs">
                                <h4 className="font-bold text-text-light dark:text-text-dark mb-1">Recommendations</h4>
                                <p className="text-text-light/80 dark:text-text-dark/80 whitespace-pre-wrap">{inspection.recommendations}</p>
                            </div>
                        )}
                   </div>
                </div>
            )}

            {/* Checklist */}
            {inspection.checklistItems && inspection.checklistItems.length > 0 && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
                        <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Inspection Checklist</h3>
                    </div>
                    <div className="divide-y divide-border-light dark:divide-border-dark">
                        {Object.entries(checklistByCategory).map(([category, items]: [string, any]) => (
                        <div key={category} className="p-0">
                            <div className="px-4 py-2 bg-background-light/30 dark:bg-background-dark/30">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-light/60 dark:text-text-dark/60">{category}</h4>
                            </div>
                            <div className="divide-y divide-border-light/50 dark:divide-border-dark/50">
                                {items.map((item: any) => (
                                    <div key={item.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-background-light/50 dark:hover:bg-background-dark/50 transition-colors">
                                        <div className="mt-0.5">
                                            {item.checked ? (
                                                <CheckSquare className="w-4 h-4 text-success" />
                                            ) : (
                                                <Square className="w-4 h-4 text-text-light/30 dark:text-text-dark/30" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm ${item.checked ? 'text-text-light dark:text-text-dark font-medium' : 'text-text-light/60 dark:text-text-dark/60'}`}>
                                                    {item.item}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {item.required && <Badge variant="danger" size="sm">Required</Badge>}
                                                    {item.score !== undefined && (
                                                        <span className="text-xs font-mono text-text-light/50 dark:text-text-dark/50">
                                                            {item.score}/{item.maxScore}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.notes && <p className="text-xs text-text-light/60 dark:text-text-dark/60 italic mt-0.5">{item.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

