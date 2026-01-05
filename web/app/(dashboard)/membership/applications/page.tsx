'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, Filter, CheckCircle, XCircle, Clock, Eye, AlertCircle, X, User, Building2, MapPin, Phone, Mail, FileText, Calendar, UserCheck, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
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
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(null);
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
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) => {
      const response = await api.patch(`/memberships/applications/${id}/review`, { status, rejectionReason });
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
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to review application. Please try again.');
    },
  });

  const filteredApplications = applications?.filter((app) => {
    const matchesSearch =
      app.applicant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-text-light dark:text-text-dark mb-2">Membership Applications</h1>
          <p className="text-text-light/60 dark:text-text-dark/60">
            Review and manage salon owner membership applications
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search by name, business, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Total</p>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{applications?.length || 0}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Pending</p>
          <p className="text-2xl font-bold text-warning">
            {applications?.filter(a => a.status === 'pending').length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Approved</p>
          <p className="text-2xl font-bold text-success">
            {applications?.filter(a => a.status === 'approved').length || 0}
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4">
          <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-danger">
            {applications?.filter(a => a.status === 'rejected').length || 0}
          </p>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
          <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">
            {searchQuery ? 'No applications match your search' : 'No applications found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onView={() => setSelectedApplication(application)}
              onReview={(data) => {
                if (data.status === 'approved') {
                  setConfirmAction({ type: 'approve', application });
                } else {
                  setConfirmAction({ type: 'reject', application, rejectionReason: data.rejectionReason });
                }
              }}
              isReviewing={reviewMutation.isPending}
            />
          ))}
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
              setConfirmAction({ type: 'reject', application: selectedApplication, rejectionReason: data.rejectionReason });
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
          onConfirm={() => {
            if (confirmAction.type === 'approve') {
              reviewMutation.mutate({ id: confirmAction.application.id, status: 'approved' });
            } else {
              reviewMutation.mutate({
                id: confirmAction.application.id,
                status: 'rejected',
                rejectionReason: confirmAction.rejectionReason,
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
}: {
  application: MembershipApplication;
  onView: () => void;
  onReview: (data: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) => void;
  isReviewing: boolean;
}) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning' },
    approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success' },
    rejected: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger' },
  };

  const config = statusConfig[application.status];
  const Icon = config.icon;

  return (
    <div className={`bg-surface-light dark:bg-surface-dark border ${config.border} rounded-2xl p-6 hover:shadow-lg transition`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Icon className={`w-6 h-6 ${config.color}`} />
            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
              {application.businessName || 'No Business Name'}
            </h3>
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${config.bg} ${config.color} ${config.border}`}>
              {application.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-light/80 dark:text-text-dark/80 mb-4">
            <p><span className="font-medium">Applicant:</span> {application.applicant?.fullName}</p>
            <p><span className="font-medium">Email:</span> {application.email}</p>
            <p><span className="font-medium">Phone:</span> {application.phone}</p>
            <p><span className="font-medium">Location:</span> {application.city}, {application.district}</p>
            <p><span className="font-medium">Submitted:</span> {new Date(application.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {application.status === 'pending' && (
            <>
              <Button
                onClick={() => onReview({ id: application.id, status: 'approved' })}
                variant="primary"
                disabled={isReviewing}
                className="text-sm flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={() => {
                  const reason = prompt('Please provide a reason for rejection:');
                  if (reason && reason.trim()) {
                    onReview({ id: application.id, status: 'rejected', rejectionReason: reason });
                  }
                }}
                variant="secondary"
                disabled={isReviewing}
                className="text-sm flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </>
          )}
          <Button
            onClick={onView}
            variant="secondary"
            className="text-sm flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Details
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
  onReview: (data: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) => void;
  isReviewing: boolean;
}) {
  const [rejectionReason, setRejectionReason] = useState('');

  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning', label: 'Pending Review' },
    approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger', label: 'Rejected' },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border-light dark:border-border-dark bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                      {application.businessName || 'Membership Application'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${config.bg} ${config.color} ${config.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                      <span className="text-xs text-text-light/50 dark:text-text-dark/50">
                        Submitted {new Date(application.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-colors ml-4"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Applicant Information */}
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Applicant Information</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Personal details of the applicant</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Full Name</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.applicant?.fullName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Email</p>
                    <a href={`mailto:${application.applicant?.email}`} className="text-sm font-semibold text-primary hover:underline">
                      {application.applicant?.email || 'N/A'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Phone</p>
                    <a href={`tel:${application.applicant?.phone}`} className="text-sm font-semibold text-primary hover:underline">
                      {application.applicant?.phone || 'N/A'}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Business Information</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Details about the business</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Business Name</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.businessName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Registration Number</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.registrationNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Tax ID</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.taxId || 'N/A'}</p>
                  </div>
                </div>
                {application.businessDescription && (
                  <div className="md:col-span-2 flex items-start gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Business Description</p>
                      <p className="text-sm text-text-light dark:text-text-dark leading-relaxed">{application.businessDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Location Information</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Business address and location</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Business Address</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.businessAddress || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">City</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.city || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">District</p>
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.district || 'N/A'}</p>
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
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Contact Information</h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Business contact details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Phone Number</p>
                    <a href={`tel:${application.phone}`} className="text-sm font-semibold text-primary hover:underline">
                      {application.phone || 'N/A'}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Email Address</p>
                    <a href={`mailto:${application.email}`} className="text-sm font-semibold text-primary hover:underline">
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
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Review Information</h3>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Application review details</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 ${config.bg} rounded-lg mt-0.5`}>
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Status</p>
                      <p className={`text-sm font-semibold capitalize ${config.color}`}>{application.status}</p>
                    </div>
                  </div>
                  {application.reviewedBy && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                        <UserCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Reviewed By</p>
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">{application.reviewedBy.fullName}</p>
                      </div>
                    </div>
                  )}
                  {application.reviewedAt && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg mt-0.5">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Reviewed At</p>
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
                        <p className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 mb-1">Rejection Reason</p>
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
            <div className="border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Rejection Reason (if rejecting)
                  <span className="text-xs font-normal text-text-light/50 dark:text-text-dark/50">(Optional)</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 resize-none"
                  placeholder="Provide a reason for rejection (optional)..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => onReview({ id: application.id, status: 'approved' })}
                  variant="primary"
                  disabled={isReviewing}
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
                  className="flex-1 flex items-center justify-center gap-2"
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
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isApprove = type === 'approve';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-xl ${isApprove ? 'bg-success/20' : 'bg-danger/20'}`}>
              {isApprove ? (
                <CheckCircle className={`w-6 h-6 ${isApprove ? 'text-success' : 'text-danger'}`} />
              ) : (
                <XCircle className={`w-6 h-6 ${isApprove ? 'text-success' : 'text-danger'}`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                {isApprove ? 'Approve Membership Application?' : 'Reject Membership Application?'}
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                {isApprove
                  ? 'This action will approve the membership application and grant salon owner privileges.'
                  : 'This action will reject the membership application.'}
              </p>
            </div>
          </div>

          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-text-light/60 dark:text-text-dark/60">Applicant: </span>
                <span className="text-text-light dark:text-text-dark">{application.applicant?.fullName}</span>
              </div>
              <div>
                <span className="font-medium text-text-light/60 dark:text-text-dark/60">Business: </span>
                <span className="text-text-light dark:text-text-dark">{application.businessName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-light/60 dark:text-text-dark/60">Email: </span>
                <span className="text-text-light dark:text-text-dark">{application.email}</span>
              </div>
            </div>
          </div>

          {isApprove ? (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-success mb-2">This will:</p>
              <ul className="text-sm text-text-light dark:text-text-dark space-y-1 list-disc list-inside">
                <li>Change {application.applicant?.fullName}'s role to <strong>SALON_OWNER</strong></li>
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
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-danger mb-2">Rejection Reason:</p>
              <p className="text-sm text-text-light dark:text-text-dark">
                {rejectionReason || (
                  <span className="text-text-light/40 dark:text-text-dark/40 italic">No reason provided</span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              variant={isApprove ? 'primary' : 'secondary'}
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
    </>
  );
}

