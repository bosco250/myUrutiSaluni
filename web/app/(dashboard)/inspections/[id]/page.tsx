'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  ArrowLeft,
  ClipboardCheck,
  Building2,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Edit,
  CheckSquare,
  Square,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';

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
    enabled: !!inspectionId,
  });

  const canEdit = user?.role === 'super_admin' || user?.role === 'association_admin';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading inspection details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-400 mb-4">Inspection not found.</p>
          <Button onClick={() => router.push('/inspections')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inspections
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[status] || colors.scheduled;
  };

  const getComplianceColor = (status: string) => {
    const colors: Record<string, string> = {
      compliant: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      partially_compliant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[status] || colors.pending;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[severity] || colors.low;
  };

  // Group checklist items by category
  const checklistByCategory = (inspection.checklistItems || []).reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/inspections')} variant="secondary" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inspection Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Inspection ID: <span className="font-mono">{inspection.id}</span>
            </p>
          </div>
        </div>
        {canEdit && inspection.status !== 'completed' && (
          <Button onClick={() => router.push(`/inspections/${inspectionId}/edit`)} variant="secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edit Inspection
          </Button>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}>
                {inspection.status.replace('_', ' ')}
              </span>
            </div>
            <ClipboardCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Compliance</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getComplianceColor(inspection.complianceStatus)}`}>
                {inspection.complianceStatus.replace('_', ' ')}
              </span>
            </div>
            {inspection.complianceStatus === 'compliant' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
          </div>
        </div>
        {inspection.overallScore !== null && inspection.overallScore !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {inspection.overallScore.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {inspection.totalScore?.toFixed(0) || 0}/{inspection.maxScore?.toFixed(0) || 0} points
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        )}
      </div>

      {/* Inspection Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Inspection Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salon</p>
            <p className="font-medium text-gray-900 dark:text-white">{inspection.salon.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inspector</p>
            <p className="font-medium text-gray-900 dark:text-white">{inspection.inspector.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Scheduled Date</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {format(new Date(inspection.scheduledDate), 'PPpp')}
              {inspection.scheduledTime && ` at ${inspection.scheduledTime}`}
            </p>
          </div>
          {inspection.inspectionDate && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inspection Date</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(new Date(inspection.inspectionDate), 'PPpp')}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inspection Type</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {inspection.inspectionType}
            </p>
          </div>
          {inspection.nextInspectionDate && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Inspection</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(new Date(inspection.nextInspectionDate), 'PP')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Checklist */}
      {inspection.checklistItems && inspection.checklistItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Inspection Checklist</h2>
          <div className="space-y-6">
            {Object.entries(checklistByCategory).map(([category, items]: [string, any]) => (
              <div key={category}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{category}</h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.checked
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {item.checked ? (
                        <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{item.item}</p>
                          {item.required && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded">
                              Required
                            </span>
                          )}
                          {item.score !== undefined && item.maxScore !== undefined && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({item.score}/{item.maxScore} pts)
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violations */}
      {inspection.violations && inspection.violations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Violations</h2>
          <div className="space-y-3">
            {inspection.violations.map((violation: any) => (
              <div
                key={violation.id}
                className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(violation.severity)}`}>
                        {violation.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        violation.status === 'resolved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {violation.status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">{violation.category}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{violation.description}</p>
                    {violation.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Due: {format(new Date(violation.dueDate), 'PP')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings & Recommendations */}
      {(inspection.findings || inspection.recommendations || inspection.notes) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notes & Findings</h2>
          {inspection.findings && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Findings</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {inspection.findings}
              </p>
            </div>
          )}
          {inspection.recommendations && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Recommendations</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {inspection.recommendations}
              </p>
            </div>
          )}
          {inspection.notes && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Additional Notes</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {inspection.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

