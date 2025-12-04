'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  Calendar,
  User
} from 'lucide-react';

interface MembershipApplication {
  id: string;
  applicantId: string;
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
  reviewedAt?: string;
  createdAt: string;
}

interface MembershipStatus {
  isMember: boolean;
  application: MembershipApplication | null;
}

export default function MembershipStatusPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER, UserRole.SALON_OWNER]}>
      <MembershipStatusContent />
    </ProtectedRoute>
  );
}

function MembershipStatusContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isSalonOwner } = usePermissions();

  // Fetch membership status - refetch on mount to get latest data
  const { data: membershipStatus, isLoading, error } = useQuery<MembershipStatus>({
    queryKey: ['membership-status', user?.id],
    queryFn: async () => {
      const response = await api.get('/memberships/status');
      return response.data;
    },
    enabled: !!user,
    retry: false,
    refetchOnMount: true, // Always refetch when component mounts
    staleTime: 0, // Data is immediately stale, so it will refetch
  });

  // Fetch full application details if application exists
  const { data: application } = useQuery<MembershipApplication>({
    queryKey: ['membership-application', user?.id],
    queryFn: async () => {
      const response = await api.get('/memberships/applications/my');
      return response.data;
    },
    enabled: !!user && !!membershipStatus?.application,
    retry: false,
    refetchOnMount: true, // Always refetch when component mounts
    staleTime: 0, // Data is immediately stale, so it will refetch
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading membership status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-danger/10 border border-danger rounded-2xl p-6 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-danger" />
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
            Error Loading Status
          </h2>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Failed to load your membership status. Please try again later.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // If user is already a salon owner and is a member, show success
  if (isSalonOwner() && membershipStatus?.isMember) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-success/10 border border-success rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-16 h-16 text-success flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
                You're an Approved Member!
              </h2>
              <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
                Your membership has been approved. You can now add salons and manage your business.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => router.push('/salons')} variant="primary">
                  Go to Salons
                </Button>
                <Button onClick={() => router.push('/dashboard')} variant="secondary">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no application exists
  if (!membershipStatus?.application) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
              No Application Found
            </h2>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
              You haven't submitted a membership application yet. Apply now to become a salon owner.
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Button onClick={() => router.push('/membership/apply')} variant="primary">
              Apply for Membership
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="secondary">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show application status
  const app = application || membershipStatus.application;
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning',
      title: 'Application Pending Review',
      message: 'Your membership application is currently under review. We will notify you once a decision has been made.',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success',
      title: 'Application Approved!',
      message: 'Congratulations! Your membership has been approved. You can now add salons and employees.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger',
      title: 'Application Rejected',
      message: app.rejectionReason || 'Your membership application has been rejected. You can submit a new application.',
    },
  };

  const config = statusConfig[app.status];
  const Icon = config.icon;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-4 shadow-lg">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-light dark:text-text-dark mb-3">
          Membership Status
        </h1>
        <p className="text-lg text-text-light/70 dark:text-text-dark/70 max-w-2xl mx-auto">
          Check the status of your membership application
        </p>
      </div>

      {/* Status Card */}
      <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-8 mb-6`}>
        <div className="flex items-start gap-4">
          <Icon className={`w-16 h-16 ${config.color} flex-shrink-0`} />
          <div className="flex-1">
            <h2 className={`text-3xl font-bold ${config.color} mb-2`}>{config.title}</h2>
            <p className="text-text-light/70 dark:text-text-dark/70 mb-6 text-lg">{config.message}</p>

            {app.status === 'rejected' && app.rejectionReason && (
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark mb-1">Rejection Reason:</p>
                <p className="text-sm text-text-light/80 dark:text-text-dark/80">{app.rejectionReason}</p>
              </div>
            )}

            <div className="flex gap-4">
              {app.status === 'approved' && (
                <>
                  <Button onClick={() => router.push('/salons')} variant="primary">
                    Go to Salons
                  </Button>
                  <Button onClick={() => router.push('/dashboard')} variant="secondary">
                    Go to Dashboard
                  </Button>
                </>
              )}
              {app.status === 'rejected' && (
                <>
                  <Button onClick={() => router.push('/membership/apply')} variant="primary">
                    Apply Again
                  </Button>
                  <Button onClick={() => router.push('/dashboard')} variant="secondary">
                    Go to Dashboard
                  </Button>
                </>
              )}
              {app.status === 'pending' && (
                <Button onClick={() => router.push('/dashboard')} variant="secondary">
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Details Card */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light dark:border-border-dark">
          <div className="p-2 bg-primary/10 rounded-xl">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
              Application Details
            </h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60">
              Your submitted information
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Information */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Business Name</span>
              </div>
              <p className="text-text-light dark:text-text-dark font-medium">{app.businessName}</p>
            </div>

            {app.registrationNumber && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                  <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Registration Number</span>
                </div>
                <p className="text-text-light dark:text-text-dark">{app.registrationNumber}</p>
              </div>
            )}

            {app.taxId && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                  <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Tax ID</span>
                </div>
                <p className="text-text-light dark:text-text-dark">{app.taxId}</p>
              </div>
            )}

            {app.businessDescription && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                  <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Description</span>
                </div>
                <p className="text-text-light dark:text-text-dark text-sm">{app.businessDescription}</p>
              </div>
            )}
          </div>

          {/* Location & Contact */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Address</span>
              </div>
              <p className="text-text-light dark:text-text-dark">{app.businessAddress}</p>
              <p className="text-text-light/80 dark:text-text-dark/80 text-sm mt-1">
                {app.city}, {app.district}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Phone</span>
              </div>
              <p className="text-text-light dark:text-text-dark">{app.phone}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-text-light/60 dark:text-text-dark/60" />
                <span className="text-sm font-semibold text-text-light/60 dark:text-text-dark/60">Email</span>
              </div>
              <p className="text-text-light dark:text-text-dark">{app.email}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-text-light dark:text-text-dark">Timeline</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <div>
                <p className="text-sm font-medium text-text-light dark:text-text-dark">Application Submitted</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                  {new Date(app.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {app.reviewedAt && (
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${app.status === 'approved' ? 'bg-success' : 'bg-danger'}`}></div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                    Application {app.status === 'approved' ? 'Approved' : 'Rejected'}
                  </p>
                  <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                    {new Date(app.reviewedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

