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
  Clock,
  TrendingUp,
  Filter,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSalon, setFilterSalon] = useState<string>('');

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

  // Fetch upcoming inspections
  const { data: upcomingInspections = [] } = useQuery<Inspection[]>({
    queryKey: ['upcoming-inspections'],
    queryFn: async () => {
      const response = await api.get('/inspections/upcoming?days=30');
      return response.data?.data || response.data || [];
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
    },
  });

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Salon Inspections</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Schedule and manage salon compliance inspections
          </p>
        </div>
        <button
          onClick={() => router.push('/inspections/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Schedule Inspection
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Inspections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.total || 0}
                </p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliant</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {statistics.compliant || 0}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {statistics.nonCompliant || 0}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Partially Compliant</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {statistics.partiallyCompliant || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.averageScore?.toFixed(1) || 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {overdueInspections.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">
              {overdueInspections.length} Overdue Inspection{overdueInspections.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <select
            value={filterSalon}
            onChange={(e) => setFilterSalon(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Salons</option>
            {salons.map((salon: any) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('scheduled')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'scheduled'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterStatus === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading inspections...</p>
          </div>
        </div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Inspections</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Schedule your first salon inspection to begin compliance monitoring.
          </p>
          <button
            onClick={() => router.push('/inspections/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Schedule First Inspection
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <div
              key={inspection.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {inspection.salon.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>Inspector: {inspection.inspector.fullName}</span>
                        <span>•</span>
                        <span>Type: {inspection.inspectionType}</span>
                        <span>•</span>
                        <span>
                          Scheduled: {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}>
                        {inspection.status.replace('_', ' ')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getComplianceColor(inspection.complianceStatus)}`}>
                        {inspection.complianceStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {inspection.overallScore !== null && inspection.overallScore !== undefined && (
                    <div className="ml-12 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {inspection.overallScore.toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({inspection.totalScore?.toFixed(0) || 0}/{inspection.maxScore?.toFixed(0) || 0})
                        </span>
                      </div>
                    </div>
                  )}

                  {inspection.violations && inspection.violations.length > 0 && (
                    <div className="ml-12 mb-3">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {inspection.violations.length} Violation{inspection.violations.length > 1 ? 's' : ''} Found
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 ml-12 text-xs text-gray-500 dark:text-gray-400">
                    {inspection.inspectionDate && (
                      <>
                        <span>
                          Inspected: {format(new Date(inspection.inspectionDate), 'MMM d, yyyy')}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>Created: {format(new Date(inspection.createdAt), 'MMM d, yyyy')}</span>
                    {inspection.nextInspectionDate && (
                      <>
                        <span>•</span>
                        <span>
                          Next: {format(new Date(inspection.nextInspectionDate), 'MMM d, yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => router.push(`/inspections/${inspection.id}`)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {inspection.status !== 'completed' && (
                    <button
                      onClick={() => router.push(`/inspections/${inspection.id}/edit`)}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this inspection?')) {
                        deleteMutation.mutate(inspection.id);
                      }
                    }}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

