'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  X,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Calendar,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface MembershipApplication {
  id: string;
  applicantId: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  businessName: string;
  businessAddress: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  businessDescription: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: {
    id: string;
    fullName: string;
  };
  reviewedAt?: string;
  createdAt: string;
}

export default function MembershipApplicationsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
      <MembershipApplicationsContent />
    </ProtectedRoute>
  );
}

function MembershipApplicationsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    application: MembershipApplication;
    rejectionReason?: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery<MembershipApplication[]>({
    queryKey: ['membership-applications', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/memberships/applications${params}`);
      return response.data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      const response = await api.patch(`/memberships/applications/${id}/review`, {
        status,
        rejectionReason,
      });
      return response.data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['membership-applications'] });
      queryClient.invalidateQueries({ queryKey: ['membership-status'] });
      setSelectedApplication(null);

      // Show success message
      if (variables.status === 'approved') {
        // Verify the role was updated by checking the applicant
        const applicantId = data.applicant?.id || data.applicantId;
        if (applicantId) {
          try {
            // Fetch the updated user to verify role change
            const userResponse = await api.get(`/users/${applicantId}`);
            const updatedUser = userResponse.data;

            if (updatedUser.role === 'salon_owner') {
              alert(
                '✅ Application approved successfully!\n\n' +
                  `User: ${updatedUser.fullName} (${updatedUser.email})\n` +
                  `Role updated: ${updatedUser.role}\n\n` +
                  '⚠️ Important: The user must log out and log back in to get a new token with the updated role and access new features.'
              );
            } else {
              alert(
                '⚠️ Warning: Application was approved but role update verification failed.\n\n' +
                  `Expected role: salon_owner\n` +
                  `Current role: ${updatedUser.role}\n\n` +
                  'Please check the backend logs for more details.'
              );
            }
          } catch (err) {
            alert(
              '✅ Application approved successfully!\n\n' +
                '⚠️ Could not verify role update. Please check the database manually.\n\n' +
                'The user must log out and log back in to get a new token with the updated role.'
            );
          }
        } else {
          alert(
            '✅ Application approved successfully!\n\n' +
              '⚠️ Important: The user must log out and log back in to get a new token with the updated role and access new features.'
          );
        }
      } else {
        alert('Application rejected successfully.');
      }
    },
    onError: (error: unknown) => {
      const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string };
      alert(
        maybeAxios?.response?.data?.message ||
          maybeAxios?.message ||
          'Failed to review application. Please try again.'
      );
    },
  });

  const filteredApplications =
    applications?.filter((app) => {
      const matchesSearch =
        app.applicant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    }) || [];

  const pendingApps = filteredApplications.filter((a) => a.status === 'pending');
  const approvedApps = filteredApplications.filter((a) => a.status === 'approved');
  const rejectedApps = filteredApplications.filter((a) => a.status === 'rejected');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Membership Applications
              </h1>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                Review and manage salon owner membership applications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-primary/10 text-primary border border-primary/20">
              {filteredApplications.length} Applications
            </span>
          </div>
        </div>
      </div>

      {/* Search + Status Pills */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search by applicant, business, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('all')}
              className="whitespace-nowrap"
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('pending')}
              className="whitespace-nowrap gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Pending
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'approved' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('approved')}
              className="whitespace-nowrap gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approved
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === 'rejected' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('rejected')}
              className="whitespace-nowrap gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Total
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {applications?.length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Pending
              </p>
              <p className="text-2xl font-bold text-warning mt-2">
                {applications?.filter((a) => a.status === 'pending').length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Approved
              </p>
              <p className="text-2xl font-bold text-success mt-2">
                {applications?.filter((a) => a.status === 'approved').length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Rejected
              </p>
              <p className="text-2xl font-bold text-error mt-2">
                {applications?.filter((a) => a.status === 'rejected').length || 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-error/10 text-error flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
          <div className="h-16 w-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p className="text-base font-semibold text-text-light dark:text-text-dark">
            {searchQuery ? 'No applications match your search' : 'No applications found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                  Review Queue
                </p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                  Prioritize pending applications; everything else stays archived.
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                {pendingApps.length} pending
              </span>
            </div>

            {pendingApps.length === 0 ? (
              <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 text-center">
                <div className="h-12 w-12 rounded-lg bg-warning/10 text-warning flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                  No pending applications
                </p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  You’re all caught up.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApps.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onView={() => setSelectedApplication(application)}
                    onReview={(data) => {
                      if (data.status === 'approved') {
                        setConfirmAction({ type: 'approve', application });
                      } else {
                        setConfirmAction({
                          type: 'reject',
                          application,
                          rejectionReason: data.rejectionReason,
                        });
                      }
                    }}
                    isReviewing={reviewMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Archive */}
          <div className="space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <p className="text-sm font-semibold text-text-light dark:text-text-dark">Archive</p>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                Approved and rejected applications.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                  <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">
                    Approved
                  </p>
                  <p className="text-xl font-bold text-success mt-1">{approvedApps.length}</p>
                </div>
                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                  <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">
                    Rejected
                  </p>
                  <p className="text-xl font-bold text-error mt-1">{rejectedApps.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {approvedApps.slice(0, 6).map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onView={() => setSelectedApplication(application)}
                  onReview={() => undefined}
                  isReviewing={reviewMutation.isPending}
                  compact
                />
              ))}
              {rejectedApps.slice(0, 6).map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onView={() => setSelectedApplication(application)}
                  onReview={() => undefined}
                  isReviewing={reviewMutation.isPending}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onReview={(data) => {
            if (data.status === 'approved') {
              setConfirmAction({ type: 'approve', application: selectedApplication });
            } else {
              setConfirmAction({
                type: 'reject',
                application: selectedApplication,
                rejectionReason: data.rejectionReason,
              });
            }
          }}
          isReviewing={reviewMutation.isPending}
        />
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmationModal
          type={confirmAction.type}
          application={confirmAction.application}
          rejectionReason={confirmAction.rejectionReason}
          onConfirm={(rejectionReason) => {
            if (confirmAction.type === 'approve') {
              reviewMutation.mutate({ id: confirmAction.application.id, status: 'approved' });
            } else {
              reviewMutation.mutate({
                id: confirmAction.application.id,
                status: 'rejected',
                rejectionReason,
              });
            }
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  onView,
  onReview,
  isReviewing,
  compact = false,
}: {
  application: MembershipApplication;
  onView: () => void;
  onReview: (data: {
    id: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }) => void;
  isReviewing: boolean;
  compact?: boolean;
}) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning',
      rail: 'bg-warning',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success',
      rail: 'bg-success',
    },
    rejected: {
      icon: XCircle,
      color: 'text-error',
      bg: 'bg-error/10',
      border: 'border-error',
      rail: 'bg-error',
    },
  };

  const config = statusConfig[application.status];
  const Icon = config.icon;

  return (
    <div
      className={`relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-sm transition-shadow overflow-hidden ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.rail}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold text-text-light dark:text-text-dark truncate ${compact ? '' : 'mb-0.5'}`}
                  >
                    {application.businessName || 'Membership Application'}
                  </p>
                  {!compact && (
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">
                      {application.applicant?.fullName || 'Applicant'} •{' '}
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}
            >
              <Icon className="w-3 h-3" />
              {application.status}
            </span>
          </div>

          {!compact && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                <Mail className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                <span className="truncate">{application.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                <Phone className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                <span className="truncate">{application.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                <span className="truncate">
                  {application.city}, {application.district}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {application.status === 'pending' && !compact && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onReview({ id: application.id, status: 'approved' })}
                variant="primary"
                size="sm"
                disabled={isReviewing}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={() => onReview({ id: application.id, status: 'rejected' })}
                variant="secondary"
                size="sm"
                disabled={isReviewing}
                className="text-error hover:bg-error/10"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </div>
          )}
          <Button onClick={onView} variant="secondary" size="sm">
            <Eye className="w-4 h-4" />
            {compact ? 'View' : 'Details'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onReview,
  isReviewing,
}: {
  application: MembershipApplication;
  onClose: () => void;
  onReview: (data: {
    id: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }) => void;
  isReviewing: boolean;
}) {
  const [rejectionReason, setRejectionReason] = useState('');

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning',
      label: 'Pending Review',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success',
      label: 'Approved',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      bg: 'bg-danger/10',
      border: 'border-danger',
      label: 'Rejected',
    },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96svh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4"
          role="presentation"
        >
          {/* Header */}
          <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-11 w-11 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}
                  >
                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight truncate">
                      {application.businessName || 'Membership Application'}
                    </h2>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1 truncate">
                      {application.applicant?.fullName || 'Applicant'} • Submitted{' '}
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}
                      >
                        {config.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                        {application.city}, {application.district}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 p-0 flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `mailto:${application.applicant?.email || application.email}`,
                      '_self'
                    )
                  }
                >
                  <Mail className="w-4 h-4" />
                  Email Applicant
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    window.open(`tel:${application.applicant?.phone || application.phone}`, '_self')
                  }
                >
                  <Phone className="w-4 h-4" />
                  Call Applicant
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(`mailto:${application.email}`, '_self')}
                >
                  <Mail className="w-4 h-4" />
                  Email Business
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Applicant Information */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-light dark:text-text-dark">
                      Applicant
                    </h3>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      Identity and contact
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Full Name
                      </p>
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {application.applicant?.fullName || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Email
                      </p>
                      <a
                        href={`mailto:${application.applicant?.email}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {application.applicant?.email || 'N/A'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Phone
                      </p>
                      <a
                        href={`tel:${application.applicant?.phone}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {application.applicant?.phone || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-light dark:text-text-dark">
                      Business
                    </h3>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      Registration and description
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Business Name
                      </p>
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {application.businessName || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Registration #
                      </p>
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {application.registrationNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                        Tax ID
                      </p>
                      <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                        {application.taxId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {application.businessDescription && (
                    <div className="md:col-span-2 flex items-start gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                          Description
                        </p>
                        <p className="text-sm text-text-light dark:text-text-dark leading-relaxed">
                          {application.businessDescription}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-light dark:text-text-dark">
                    Location
                  </h3>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                    Address and district
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                      Business Address
                    </p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {application.businessAddress || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                      City
                    </p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {application.city || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60 mb-1">
                      District
                    </p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                      {application.district || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    Contact Information
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Business contact details
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                      Phone Number
                    </p>
                    <a
                      href={`tel:${application.phone}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {application.phone || 'N/A'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                      Email Address
                    </p>
                    <a
                      href={`mailto:${application.email}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {application.email || 'N/A'}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Information */}
            {application.status !== 'pending' && (
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                  <div className={`p-2 ${config.bg} rounded-xl`}>
                    <UserCheck className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Review Information
                    </h3>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Application review details
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 ${config.bg} rounded-lg mt-0.5`}>
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                        Status
                      </p>
                      <p className={`text-sm font-semibold capitalize ${config.color}`}>
                        {application.status}
                      </p>
                    </div>
                  </div>
                  {application.reviewedBy && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                        <UserCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                          Reviewed By
                        </p>
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                          {application.reviewedBy.fullName}
                        </p>
                      </div>
                    </div>
                  )}
                  {application.reviewedAt && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                          Reviewed At
                        </p>
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                          {new Date(application.reviewedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {application.rejectionReason && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-danger/10 rounded-lg mt-0.5">
                        <MessageSquare className="w-4 h-4 text-danger" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-text-light dark:text-text-dark leading-relaxed bg-danger/5 border border-danger/20 rounded-lg p-3">
                          {application.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {application.status === 'pending' && (
            <div className="sticky bottom-0 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-3">
              <div className="mb-2">
                <label
                  htmlFor={`membership-reject-reason-${application.id}`}
                  className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Rejection Reason (if rejecting)
                  <span className="text-xs font-normal text-text-light/50 dark:text-text-dark/50">
                    (Optional)
                  </span>
                </label>
                <textarea
                  id={`membership-reject-reason-${application.id}`}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 resize-none"
                  placeholder="Provide a reason for rejection (optional)..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => onReview({ id: application.id, status: 'approved' })}
                  variant="primary"
                  disabled={isReviewing}
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                >
                  {isReviewing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve Application
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    onReview({
                      id: application.id,
                      status: 'rejected',
                      rejectionReason: rejectionReason.trim() || undefined,
                    });
                  }}
                  variant="secondary"
                  disabled={isReviewing}
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2 text-danger hover:bg-danger/10"
                >
                  {isReviewing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject Application
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ConfirmationModal({
  type,
  application,
  rejectionReason,
  onConfirm,
  onCancel,
}: {
  type: 'approve' | 'reject';
  application: MembershipApplication;
  rejectionReason?: string;
  onConfirm: (rejectionReason?: string) => void;
  onCancel: () => void;
}) {
  const isApprove = type === 'approve';
  const [reason, setReason] = useState(rejectionReason || '');

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in"
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4"
          role="presentation"
        >
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-border-light dark:border-border-dark">
            <div
              className={`absolute inset-0 ${
                isApprove
                  ? 'bg-gradient-to-br from-success to-success/70'
                  : 'bg-gradient-to-br from-danger to-danger/70'
              } opacity-90`}
            />
            <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.22),transparent_60%)]" />
            <div className="relative p-5 text-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                  {isApprove ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black tracking-tight">
                    {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
                  </h3>
                  <p className="text-xs text-white/80 mt-1">
                    {isApprove
                      ? 'This will grant SALON_OWNER privileges.'
                      : 'This will reject the application.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancel}
                className="h-9 w-9 p-0 bg-white/10 text-white border border-white/20 hover:bg-white/20 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-text-light/60 dark:text-text-dark/60">
                    Applicant:{' '}
                  </span>
                  <span className="text-text-light dark:text-text-dark">
                    {application.applicant?.fullName}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-light/60 dark:text-text-dark/60">
                    Business:{' '}
                  </span>
                  <span className="text-text-light dark:text-text-dark">
                    {application.businessName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-light/60 dark:text-text-dark/60">
                    Email:{' '}
                  </span>
                  <span className="text-text-light dark:text-text-dark">{application.email}</span>
                </div>
              </div>
            </div>

            {isApprove ? (
              <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-success mb-2">This will:</p>
                <ul className="text-sm text-text-light dark:text-text-dark space-y-1 list-disc list-inside">
                  <li>
                    Change {application.applicant?.fullName}
                    &apos;s role to <strong>SALON_OWNER</strong>
                  </li>
                  <li>Allow them to create and manage salons</li>
                  <li>Grant access to all salon management features</li>
                  <li>Initialize yearly membership payments (3000 RWF/year)</li>
                  <li>Assign a unique membership number</li>
                </ul>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-3">
                  ⚠️ The user must log out and log back in to get a new token with the updated role.
                </p>
              </div>
            ) : (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                <label
                  htmlFor={`membership-reject-reason-confirm-${application.id}`}
                  className="block text-sm font-semibold text-danger mb-2"
                >
                  Rejection Reason
                </label>
                <textarea
                  id={`membership-reject-reason-confirm-${application.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-danger/30 rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger transition resize-none"
                  placeholder="Explain why this application is being rejected..."
                />
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 mt-2">
                  Tip: keep it short and actionable so the applicant knows what to improve.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div className="flex gap-2">
              <Button onClick={onCancel} variant="secondary" size="sm" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => onConfirm(isApprove ? undefined : reason.trim() || undefined)}
                variant={isApprove ? 'primary' : 'secondary'}
                size="sm"
                className={`flex-1 ${!isApprove ? 'bg-danger hover:bg-danger/90 text-white' : ''}`}
              >
                {isApprove ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Approval
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
