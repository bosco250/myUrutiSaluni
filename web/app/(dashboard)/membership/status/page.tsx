'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  DollarSign,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { SelfServicePaymentModal } from '@/components/memberships/SelfServicePaymentModal';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading membership status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-danger" />
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">
            Error Loading Status
          </h2>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Failed to load your membership status. Please try again later.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // If user is already a salon owner and is a member, show success
  if (isSalonOwner() && membershipStatus?.isMember) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-success/10 border border-success/20 rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto">
           <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle className="w-8 h-8 text-success" />
           </div>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
            You're an Approved Member!
            </h2>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-6 max-w-md mx-auto">
            Your membership has been approved. You can now add salons and manage your busines effectively.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/salons')} variant="primary" className="shadow-lg shadow-success/20">
                Go to Salons
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="secondary">
                Dashboard
            </Button>
            </div>
        </div>
      </div>
    );
  }

  // If no application exists
  if (!membershipStatus?.application) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-3">
              No Application Found
            </h2>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-8 max-w-md mx-auto">
              You haven't submitted a membership application yet. Apply now to become a registered salon owner.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/membership/apply')} variant="primary" className="shadow-lg shadow-primary/20">
                    Apply for Membership <ArrowRight className="w-4 h-4 ml-2" />
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
  const isApprovedButUnpaid = app.status === 'approved' && !membershipStatus.isMember;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      title: 'Pending Review',
      message: 'Your application is currently being reviewed by our team.',
    },
    approved: isApprovedButUnpaid ? {
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      title: 'Action Required',
      message: 'Application approved pending membership fee payment.',
    } : {
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      title: 'Application Approved',
      message: 'Congratulations! Your membership has been approved.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger/20',
      title: 'Application Rejected',
      message: 'Your membership application has been rejected.',
    },
  };

  const config = statusConfig[app.status];
  const Icon = config.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
             <Button
                onClick={() => router.push('/dashboard')}
                variant="secondary"
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0 flex items-center justify-center rounded-lg"
            >
                <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
                 <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Membership Status</h1>
                 <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Track your application progress
                 </p>
            </div>
        </div>
        <div className="flex gap-2">
             {app.status === 'approved' && !isApprovedButUnpaid && (
                  <Button onClick={() => router.push('/salons')} variant="primary" size="sm">
                    Go to Salons
                  </Button>
             )}
             {app.status === 'rejected' && (
                  <Button onClick={() => router.push('/membership/apply')} variant="primary" size="sm">
                    Apply Again
                  </Button>
             )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Status & Details */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Status Card */}
            <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-5`}>
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${config.color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                         <h2 className={`text-lg font-bold ${config.color} mb-1`}>{config.title}</h2>
                         <p className="text-sm text-text-light/70 dark:text-text-dark/70 leading-relaxed">
                            {config.message}
                         </p>

                         {app.status === 'rejected' && app.rejectionReason && (
                            <div className="mt-4 bg-background-light/50 dark:bg-background-dark/50 border border-danger/10 rounded-lg p-3">
                                <p className="text-xs font-bold text-danger uppercase mb-1">Reason for Rejection</p>
                                <p className="text-sm text-text-light/90 dark:text-text-dark/90">{app.rejectionReason}</p>
                            </div>
                        )}

                        {isApprovedButUnpaid && (
                            <div className="mt-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-warning">
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-bold text-sm">Payment Required</span>
                                </div>
                                <p className="text-sm text-text-light/80 dark:text-text-dark/80 mb-3">
                                    Please pay the <strong>3,000 RWF</strong> membership fee to activate your account.
                                </p>
                                <Button onClick={() => setShowPaymentModal(true)} variant="primary" size="sm" className="w-full sm:w-auto">
                                    Pay Now
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Application Details */}
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 sm:p-6 shadow-sm">
                 <div className="flex items-center gap-2 pb-4 border-b border-border-light dark:border-border-dark mb-4">
                     <FileText className="w-5 h-5 text-primary" />
                     <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Application Details</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                           <div className="flex items-center gap-2 mb-2 text-primary/80">
                               <Building2 className="w-4 h-4" />
                               <span className="text-xs font-bold uppercase tracking-wide">Business Info</span>
                           </div>
                           <div className="space-y-3 pl-6 border-l border-border-light dark:border-border-dark">
                                <div>
                                    <p className="text-[10px] text-text-light/50 uppercase">Name</p>
                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{app.businessName}</p>
                                </div>
                                {app.registrationNumber && (
                                    <div>
                                        <p className="text-[10px] text-text-light/50 uppercase">Reg. Number</p>
                                        <p className="text-sm text-text-light dark:text-text-dark">{app.registrationNumber}</p>
                                    </div>
                                )}
                                {app.taxId && (
                                     <div>
                                        <p className="text-[10px] text-text-light/50 uppercase">Tax ID</p>
                                        <p className="text-sm text-text-light dark:text-text-dark">{app.taxId}</p>
                                    </div>
                                )}
                           </div>
                      </div>

                      <div>
                           <div className="flex items-center gap-2 mb-2 text-primary/80">
                               <MapPin className="w-4 h-4" />
                               <span className="text-xs font-bold uppercase tracking-wide">Location & Contact</span>
                           </div>
                           <div className="space-y-3 pl-6 border-l border-border-light dark:border-border-dark">
                                <div>
                                    <p className="text-[10px] text-text-light/50 uppercase">Address</p>
                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{app.businessAddress}</p>
                                    <p className="text-xs text-text-light/70">{app.city}, {app.district}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-light/50 uppercase">Phone</p>
                                    <p className="text-sm text-text-light dark:text-text-dark">{app.phone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-light/50 uppercase">Email</p>
                                    <p className="text-sm text-text-light dark:text-text-dark">{app.email}</p>
                                </div>
                           </div>
                      </div>
                 </div>

                 {app.businessDescription && (
                     <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
                          <p className="text-xs font-bold uppercase tracking-wide text-text-light/50 mb-2">Description</p>
                          <p className="text-sm text-text-light/80 dark:text-text-dark/80 leading-relaxed italic">
                              "{app.businessDescription}"
                          </p>
                     </div>
                 )}
            </div>
        </div>

        {/* Sidebar: Timeline */}
        <div className="space-y-6">
             <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 pb-3 border-b border-border-light dark:border-border-dark mb-4">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wide">Timeline</h3>
                  </div>

                  <div className="relative space-y-6 pl-2">
                       {/* Vertical Line */}
                       <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border-light dark:bg-border-dark" />

                       <div className="relative flex gap-3">
                           <div className="w-5 h-5 rounded-full bg-primary border-4 border-surface-light dark:border-surface-dark flex-shrink-0 z-10" />
                           <div>
                               <p className="text-sm font-medium text-text-light dark:text-text-dark">Submitted</p>
                               <p className="text-xs text-text-light/50">{new Date(app.createdAt).toLocaleDateString()}</p>
                               <p className="text-[10px] text-text-light/40">{new Date(app.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                           </div>
                       </div>

                       {app.reviewedAt && (
                           <div className="relative flex gap-3">
                               <div className={`w-5 h-5 rounded-full border-4 border-surface-light dark:border-surface-dark flex-shrink-0 z-10 ${
                                   app.status === 'approved' ? 'bg-success' : 'bg-danger'
                               }`} />
                               <div>
                                   <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                       {app.status === 'approved' ? 'Approved' : 'Rejected'}
                                   </p>
                                   <p className="text-xs text-text-light/50">{new Date(app.reviewedAt).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-text-light/40">{new Date(app.reviewedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               </div>
                           </div>
                       )}

                       {app.status === 'pending' && (
                           <div className="relative flex gap-3 opacity-50">
                               <div className="w-5 h-5 rounded-full bg-surface-light dark:bg-surface-dark border-2 border-dashed border-text-light/30 flex-shrink-0 z-10" />
                               <div>
                                   <p className="text-sm font-medium text-text-light dark:text-text-dark">Result</p>
                                   <p className="text-xs text-text-light/50">Pending...</p>
                               </div>
                           </div>
                       )}
                  </div>
             </div>
        </div>
      </div>
      
      <SelfServicePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        requiredAmount={3000}
        email={user?.email}
      />
    </div>
  );
}
