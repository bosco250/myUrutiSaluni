'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Eye,
  Users,
  UserCheck,
  Loader2,
  RefreshCw,
  Ban,
  X,
  FileText,
  Mail,
  Phone,
  MapPin,
  DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Membership {
  id: string;
  salonId: string;
  salon: {
    id: string;
    name: string;
    owner: {
      id: string;
      fullName: string;
      email: string;
    };
  };
  category: string;
  status: 'new' | 'active' | 'pending_renewal' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  membershipNumber: string;
  createdAt: string;
  updatedAt: string;
}

interface MembershipApplication {
  id: string;
  applicantId: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    membershipNumber?: string;
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

interface OwnerUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  membershipNumber?: string;
}

interface SalonEmployee {
  id: string;
  salonId: string;
  salonName: string;
  roleTitle?: string;
  user?: {
    fullName?: string;
    email?: string;
  };
  [key: string]: unknown;
}

interface PaymentStatus {
  memberId: string;
  totalRequired: number;
  totalPaid: number;
  remaining: number;
  isComplete: boolean;
}

const statusConfig = {
  new: {
    icon: Clock,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    label: 'New',
  },
  active: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
    label: 'Active',
  },
  pending_renewal: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
    label: 'Pending Renewal',
  },
  expired: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error',
    label: 'Expired',
  },
  suspended: {
    icon: Ban,
    color: 'text-text-light/60 dark:text-text-dark/60',
    bg: 'bg-text-light/5 dark:bg-text-dark/5',
    border: 'border-border-light dark:border-border-dark',
    label: 'Suspended',
  },
  pending: {
    icon: Clock,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
    label: 'Pending',
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
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error',
    label: 'Rejected',
  },
};

export default function MembershipManagementPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}>
      <MembershipManagementContent />
    </ProtectedRoute>
  );
}

function MembershipManagementContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'memberships' | 'applications' | 'owners' | 'employees'
  >('memberships');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(
    null
  );
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    application: MembershipApplication;
    rejectionReason?: string;
  } | null>(null);

  // Fetch memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery<Membership[]>({
    queryKey: ['memberships'],
    queryFn: async () => {
      const response = await api.get('/memberships');
      return response.data || [];
    },
  });

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<
    MembershipApplication[]
  >({
    queryKey: ['membership-applications'],
    queryFn: async () => {
      const response = await api.get('/memberships/applications');
      return response.data || [];
    },
  });

  // Fetch salon owners (users with SALON_OWNER role)
  const { data: salonOwners = [] } = useQuery<OwnerUser[]>({
    queryKey: ['salon-owners'],
    queryFn: async () => {
      try {
        const response = await api.get('/users?role=SALON_OWNER');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch all salon employees
  const { data: salonEmployees = [] } = useQuery<SalonEmployee[]>({
    queryKey: ['all-salon-employees'],
    queryFn: async () => {
      try {
        const salonsResponse = await api.get('/salons');
        const salons = (salonsResponse.data || []) as Array<{ id: string; name: string }>;
        const allEmployees: SalonEmployee[] = [];

        for (const salon of salons) {
          try {
            const empResponse = await api.get(`/salons/${salon.id}/employees`);
            const employees = (empResponse.data || []) as Array<
              Record<string, unknown> & { id: string }
            >;
            allEmployees.push(
              ...employees.map((emp) => ({
                ...(emp as Record<string, unknown>),
                id: emp.id,
                salonName: salon.name,
                salonId: salon.id,
              }))
            );
          } catch (error) {
            // Skip if can't access
          }
        }
        return allEmployees;
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch payment statuses for membership owners
  const { data: paymentStatuses = {} } = useQuery<Record<string, PaymentStatus>>({
    queryKey: ['membership-payment-statuses', memberships.map(m => m.salon?.owner?.id).filter(Boolean)],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const statusMap: Record<string, PaymentStatus> = {};
      
      // Get unique owner IDs from memberships
      const ownerIds = Array.from(new Set(memberships.map(m => m.salon?.owner?.id).filter(Boolean)));
      
      for (const ownerId of ownerIds) {
        try {
          const response = await api.get(`/memberships/payments/status/${ownerId}/${currentYear}`);
          statusMap[ownerId] = {
            memberId: ownerId,
            ...response.data,
          };
        } catch {
          // Default to no payment if API fails
          statusMap[ownerId] = {
            memberId: ownerId,
            totalRequired: 3000,
            totalPaid: 0,
            remaining: 3000,
            isComplete: false,
          };
        }
      }
      
      return statusMap;
    },
    enabled: memberships.length > 0,
  });
  // Mutations
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/memberships/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/memberships/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });

  const expireMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/memberships/${id}/expire`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      await api.patch(`/memberships/${id}/renew`, { endDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      setShowRenewModal(false);
      setSelectedMembership(null);
    },
  });

  const reviewApplicationMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      await api.patch(`/memberships/applications/${id}/review`, { status, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-applications'] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      setSelectedApplication(null);
    },
  });

  // Filter memberships
  const filteredMemberships = useMemo(() => {
    return memberships.filter((membership) => {
      const matchesSearch =
        membership.salon?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.membershipNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.salon?.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.salon?.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || membership.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [memberships, searchQuery, statusFilter]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  // Suspend/Expire Confirmation State
  const [suspendExpireConfirm, setSuspendExpireConfirm] = useState<{
    type: 'suspend' | 'expire';
    membership: Membership;
  } | null>(null);

  const requestSuspend = (id: string) => {
    const membership = filteredMemberships.find(m => m.id === id);
    if (membership) {
        setSuspendExpireConfirm({ type: 'suspend', membership });
    }
  };

  const requestExpire = (id: string) => {
    const membership = filteredMemberships.find(m => m.id === id);
    if (membership) {
        setSuspendExpireConfirm({ type: 'expire', membership });
    }
  };

  const handleConfirmSuspendExpire = () => {
    if (!suspendExpireConfirm) return;
    if (suspendExpireConfirm.type === 'suspend') {
        suspendMutation.mutate(suspendExpireConfirm.membership.id);
    } else {
        expireMutation.mutate(suspendExpireConfirm.membership.id);
    }
    setSuspendExpireConfirm(null);
  };

  // Statistics
  const stats = useMemo(() => {
    const activeMemberships = memberships.filter((m) => m.status === 'active').length;
    const pendingApplications = applications.filter((a) => a.status === 'pending').length;
    const totalOwners = salonOwners.length;
    const totalEmployees = salonEmployees.length;

    return {
      totalMemberships: memberships.length,
      activeMemberships,
      pendingApplications,
      totalOwners,
      totalEmployees,
    };
  }, [memberships, applications, salonOwners, salonEmployees]);

  const handleRenew = () => {
    if (selectedMembership && renewEndDate) {
      renewMutation.mutate({ id: selectedMembership.id, endDate: renewEndDate });
    }
  };

  const handleApproveApplication = (application: MembershipApplication) => {
    setConfirmAction({ type: 'approve', application });
  };

  const handleRejectApplication = (application: MembershipApplication) => {
    setConfirmAction({ type: 'reject', application });
  };

  if (membershipsLoading || applicationsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading membership data...</p>
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
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Membership Management
              </h1>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                Manage memberships, applications, and membership payments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <Button
              onClick={() => router.push('/memberships/payments')}
              size="sm"
              className="gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Payments
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Total Memberships
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {stats.totalMemberships}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Active
              </p>
              <p className="text-2xl font-bold text-success mt-2">{stats.activeMemberships}</p>
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
                Pending Applications
              </p>
              <p className="text-2xl font-bold text-warning mt-2">{stats.pendingApplications}</p>
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
                Salon Owners
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {stats.totalOwners}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Employees
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {stats.totalEmployees}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1">
        <div className="flex gap-1">
          {(
            [
              { id: 'memberships', label: 'Memberships', icon: Building2 },
              { id: 'applications', label: 'Applications', icon: Clock },
              { id: 'owners', label: 'Owners', icon: UserCheck },
              { id: 'employees', label: 'Employees', icon: Users },
            ] as Array<{
              id: 'memberships' | 'applications' | 'owners' | 'employees';
              label: string;
              icon: LucideIcon;
            }>
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:bg-background-light dark:hover:bg-background-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, membership number..."
              className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Status Pill Buttons */}
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
            {activeTab === 'memberships' && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'active' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('active')}
                  className="whitespace-nowrap"
                >
                  <CheckCircle className="w-4 h-4" />
                  Active
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'new' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('new')}
                  className="whitespace-nowrap"
                >
                  <Clock className="w-4 h-4" />
                  New
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'expired' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('expired')}
                  className="whitespace-nowrap"
                >
                  <XCircle className="w-4 h-4" />
                  Expired
                </Button>
              </>
            )}
            {activeTab === 'applications' && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('pending')}
                  className="whitespace-nowrap"
                >
                  <Clock className="w-4 h-4" />
                  Pending
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'approved' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('approved')}
                  className="whitespace-nowrap"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approved
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === 'rejected' ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter('rejected')}
                  className="whitespace-nowrap"
                >
                  <XCircle className="w-4 h-4" />
                  Rejected
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'memberships' && (
        <MembershipsTab
          memberships={filteredMemberships}
          paymentStatuses={paymentStatuses}
          onView={setSelectedMembership}
          onActivate={(id) => activateMutation.mutate(id)}
          onSuspend={requestSuspend}
          onExpire={requestExpire}
          onRenew={(membership) => {
            setSelectedMembership(membership);
            setShowRenewModal(true);
          }}
          isProcessing={
            activateMutation.isPending || suspendMutation.isPending || expireMutation.isPending
          }
        />
      )}

      {activeTab === 'applications' && (
        <ApplicationsTab
          applications={filteredApplications}
          onView={setSelectedApplication}
          onApprove={handleApproveApplication}
          onReject={handleRejectApplication}
          isProcessing={reviewApplicationMutation.isPending}
        />
      )}

      {activeTab === 'owners' && <OwnersTab owners={salonOwners} memberships={memberships} />}

      {activeTab === 'employees' && (
        <EmployeesTab employees={salonEmployees} memberships={memberships} />
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedMembership && (
        <RenewMembershipModal
          membership={selectedMembership}
          endDate={renewEndDate}
          onEndDateChange={setRenewEndDate}
          onRenew={handleRenew}
          onClose={() => {
            setShowRenewModal(false);
            setSelectedMembership(null);
            setRenewEndDate('');
          }}
          isProcessing={renewMutation.isPending}
        />
      )}

      {/* Detail Modals */}
      {selectedMembership && !showRenewModal && (
        <MembershipDetailModal
          membership={selectedMembership}
          onClose={() => setSelectedMembership(null)}
        />
      )}

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onApprove={() => handleApproveApplication(selectedApplication)}
          onReject={() => handleRejectApplication(selectedApplication)}
          isProcessing={reviewApplicationMutation.isPending}
        />
      )}

      {confirmAction && (
        <ConfirmReviewModal
          type={confirmAction.type}
          application={confirmAction.application}
          rejectionReason={confirmAction.rejectionReason}
          onCancel={() => setConfirmAction(null)}
          onConfirm={(rejectionReason) => {
            if (confirmAction.type === 'approve') {
              reviewApplicationMutation.mutate({
                id: confirmAction.application.id,
                status: 'approved',
              });
            } else {
              reviewApplicationMutation.mutate({
                id: confirmAction.application.id,
                status: 'rejected',
                rejectionReason,
              });
            }
            setConfirmAction(null);
          }}
        />
      )}

      {/* Suspend/Expire Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!suspendExpireConfirm}
        onClose={() => setSuspendExpireConfirm(null)}
        onConfirm={handleConfirmSuspendExpire}
        title={suspendExpireConfirm?.type === 'expire' ? 'Expire Membership' : 'Suspend Membership'}
        message={suspendExpireConfirm ? 
            (suspendExpireConfirm.type === 'expire' 
                ? `Are you sure you want to expire membership #${suspendExpireConfirm.membership.membershipNumber}? This action cannot be undone if the membership is still valid.` 
                : `Are you sure you want to suspend membership #${suspendExpireConfirm.membership.membershipNumber}? The member will lose access temporarily.`)
            : ''
        }
        variant={suspendExpireConfirm?.type === 'expire' ? 'danger' : 'warning'}
        confirmLabel={suspendExpireConfirm?.type === 'expire' ? 'Expire' : 'Suspend'}
        isProcessing={suspendMutation.isPending || expireMutation.isPending}
      />
    </div>
  );
}

// Tab Components
function MembershipsTab({
  memberships,
  paymentStatuses,
  onView,
  onActivate,
  onSuspend,
  onExpire,
  onRenew,
  isProcessing,
}: {
  memberships: Membership[];
  paymentStatuses: Record<string, PaymentStatus>;
  onView: (m: Membership) => void;
  onActivate: (id: string) => void;
  onSuspend: (id: string) => void;
  onExpire: (id: string) => void;
  onRenew: (m: Membership) => void;
  isProcessing: boolean;
}) {
  if (memberships.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <div className="h-16 w-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <p className="text-base font-semibold text-text-light dark:text-text-dark">
          No memberships found
        </p>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-2">
          Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {memberships.map((membership) => {
        const config = statusConfig[membership.status];
        const Icon = config.icon;
        const paymentStatus = membership.salon?.owner?.id ? paymentStatuses[membership.salon.owner.id] : null;
        const isPaid = paymentStatus?.isComplete;
        const paidAmount = paymentStatus?.totalPaid || 0;
        const totalAmount = paymentStatus?.totalRequired || 3000;
        
        return (
          <div
            key={membership.id}
            className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-sm transition-shadow overflow-hidden"
          >
            {/* Left accent rail */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg.replace('/10', '')}`} />

            <div className="p-3 pl-4">
              <div className="flex items-center justify-between gap-3">
                {/* Main content */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`h-8 w-8 rounded ${config.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {membership.salon?.name || 'Unknown Salon'}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-light/60 dark:text-text-dark/60">
                      <span>{membership.salon?.owner?.fullName || 'Owner'}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">
                        {membership.membershipNumber || 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{membership.category || 'Standard'}</span>
                      {paymentStatus && (
                        <>
                          <span>•</span>
                          <span className={`${isPaid ? 'text-success' : 'text-error'} font-medium`}>
                            {paidAmount.toLocaleString()} / {totalAmount.toLocaleString()} RWF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {membership.status === 'new' && (
                    (isPaid || paidAmount >= 1500) ? (
                      <Button
                        onClick={() => onActivate(membership.id)}
                        variant="primary"
                        size="sm"
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          const url = `/memberships/payments?search=${membership.membershipNumber || ''}`;
                          window.location.href = url;
                        }}
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-error border-1 border-error/50 hover:bg-error/10 hover:border-error"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Record Payment
                      </Button>
                    )
                  )}
                  {membership.status === 'active' && (
                    <>
                      <Button
                        onClick={() => onRenew(membership)}
                        variant="secondary"
                        size="sm"
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Renew
                      </Button>
                      <Button
                        onClick={() => onSuspend(membership.id)}
                        variant="secondary"
                        size="sm"
                        disabled={isProcessing}
                        className="text-warning hover:bg-warning/10"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => onExpire(membership.id)}
                        variant="secondary"
                        size="sm"
                        disabled={isProcessing}
                        className="text-error hover:bg-error/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {membership.status === 'expired' && (
                    <Button
                      onClick={() => onRenew(membership)}
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      className="gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Renew
                    </Button>
                  )}
                  <Button
                    onClick={() => onView(membership)}
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationsTab({
  applications,
  onView,
  onApprove,
  onReject,
  isProcessing,
}: {
  applications: MembershipApplication[];
  onView: (a: MembershipApplication) => void;
  onApprove: (a: MembershipApplication) => void;
  onReject: (a: MembershipApplication) => void;
  isProcessing: boolean;
}) {
  if (applications.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <div className="h-16 w-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <p className="text-base font-semibold text-text-light dark:text-text-dark">
          No applications found
        </p>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-2">
          Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => {
        const config = statusConfig[application.status];
        const Icon = config.icon;

        return (
          <div
            key={application.id}
            className="relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-sm transition-shadow overflow-hidden"
          >
            {/* Left accent rail */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg.replace('/10', '')}`} />

            <div className="p-3 pl-4">
              <div className="flex items-center justify-between gap-3">
                {/* Main content */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`h-8 w-8 rounded ${config.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {application.businessName || application.applicant.fullName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-light/60 dark:text-text-dark/60">
                      <span>{application.applicant.fullName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {application.applicant.email}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {application.phone || 'N/A'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {application.city || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {application.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => onApprove(application)}
                        variant="primary"
                        size="sm"
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => onReject(application)}
                        size="sm"
                        disabled={isProcessing}
                        className="gap-1.5 bg-error hover:bg-error/90 text-white"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => onView(application)}
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OwnersTab({ owners, memberships }: { owners: OwnerUser[]; memberships: Membership[] }) {
  if (owners.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <UserCheck className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">
          No salon owners found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Membership #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Salon Membership Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {owners.map((owner) => {
            const ownerMemberships = memberships.filter((m) => m.salon?.owner?.id === owner.id);
            const activeMembership = ownerMemberships.find((m) => m.status === 'active');

            return (
              <tr
                key={owner.id}
                className="hover:bg-background-light dark:hover:bg-background-dark"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                  {owner.membershipNumber || (
                    <span className="text-text-light/40 dark:text-text-dark/40 italic">
                      Not assigned
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                  {owner.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                  {owner.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                  {owner.phone || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {activeMembership ? (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-success/10 text-success border border-success/20">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-warning/10 text-warning border border-warning/20">
                        No Active Membership
                      </span>
                    )}
                    {owner.membershipNumber && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(
                              `/reports/membership-certificate/${owner.id}`,
                              {
                                responseType: 'blob',
                              }
                            );
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute(
                              'download',
                              `membership-certificate-${owner.membershipNumber}.pdf`
                            );
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error) {
                            alert('Failed to download certificate');
                          }
                        }}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition"
                        title="Download Certificate"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmployeesTab({
  employees,
  memberships,
}: {
  employees: SalonEmployee[];
  memberships: Membership[];
}) {
  if (employees.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">
          No employees found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Salon
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">
              Salon Membership
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {employees.map((employee) => {
            const salonMembership = memberships.find(
              (m) => m.salonId === employee.salonId && m.status === 'active'
            );

            return (
              <tr
                key={employee.id}
                className="hover:bg-background-light dark:hover:bg-background-dark"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-light dark:text-text-dark">
                  {employee.user?.fullName || employee.roleTitle || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                  {employee.salonName || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                  {employee.roleTitle || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {salonMembership ? (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-success/10 text-success border border-success/20">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-warning/10 text-warning border border-warning/20">
                      No Active Membership
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Modal Components
function RenewMembershipModal({
  membership,
  endDate,
  onEndDateChange,
  onRenew,
  onClose,
  isProcessing,
}: {
  membership: Membership;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onRenew: () => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-w-md w-full"
          role="presentation"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
                  Renew Membership
                </h2>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  {membership.salon?.name || 'Selected salon'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <label
              htmlFor={`membership-renew-endDate-${membership.id}`}
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              New End Date
            </label>
            <input
              id={`membership-renew-endDate-${membership.id}`}
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-background-light/50 dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark rounded-b-xl flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={onRenew}
              variant="primary"
              disabled={isProcessing || !endDate}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Renew Membership
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfirmReviewModal({
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  isApprove ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}
              >
                {isApprove ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                  {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
                </h3>
                <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                  {application.businessName || 'Membership Application'}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancel}
                className="h-9 w-9 p-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 min-w-[80px]">
                  Applicant:
                </span>
                <span className="text-sm text-text-light dark:text-text-dark font-medium">
                  {application.applicant?.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 min-w-[80px]">
                  Business:
                </span>
                <span className="text-sm text-text-light dark:text-text-dark">
                  {application.businessName || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 min-w-[80px]">
                  Email:
                </span>
                <span className="text-sm text-text-light dark:text-text-dark">
                  {application.email}
                </span>
              </div>
            </div>

            {!isApprove && (
              <div className="bg-error/5 border border-error/20 rounded-lg p-4">
                <label
                  htmlFor={`membership-manage-reject-${application.id}`}
                  className="block text-sm font-medium text-error mb-2"
                >
                  Rejection Reason
                </label>
                <textarea
                  id={`membership-manage-reject-${application.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-error/30 rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error transition resize-none"
                  placeholder="Explain why this application is being rejected..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-background-light/50 dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark rounded-b-xl flex gap-3">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(isApprove ? undefined : reason.trim() || undefined)}
              variant={isApprove ? 'primary' : 'secondary'}
              className={`flex-1 gap-2 ${!isApprove ? 'bg-error hover:bg-error/90 text-white' : ''}`}
            >
              {isApprove ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve Application
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
      </div>
    </>
  );
}

function MembershipDetailModal({
  membership,
  onClose,
}: {
  membership: Membership;
  onClose: () => void;
}) {
  const config = statusConfig[membership.status];
  const Icon = config.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          role="presentation"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
              Membership Details
            </h2>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Status
              </h3>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-semibold ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Salon Information
              </h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Salon Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {membership.salon?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Owner</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {membership.salon?.owner?.fullName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Owner Email</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {membership.salon?.owner?.email || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Membership Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Membership Number
                  </p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {membership.membershipNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Category</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {membership.category || 'N/A'}
                  </p>
                </div>
                {membership.startDate && (
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Start Date</p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {new Date(membership.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {membership.endDate && (
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">End Date</p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {new Date(membership.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onApprove,
  onReject,
  isProcessing,
}: {
  application: MembershipApplication;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}) {
  const config = statusConfig[application.status];
  const Icon = config.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          role="presentation"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
              Application Details
            </h2>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Status
              </h3>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-semibold ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Applicant Information
              </h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.applicant.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Membership Number
                  </p>
                  <div className="flex items-center gap-2">
                    <p className=" dark:text-text-dark font-medium text-primary">
                      {application.applicant.membershipNumber || (
                        <span className="text-text-light/40 dark:text-text-dark/40 italic">
                          Will be assigned upon approval
                        </span>
                      )}
                    </p>
                    {application.applicant.membershipNumber &&
                      application.status === 'approved' && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(
                                `/reports/membership-certificate/${application.applicantId}`,
                                {
                                  responseType: 'blob',
                                }
                              );
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute(
                                'download',
                                `membership-certificate-${application.applicant.membershipNumber}.pdf`
                              );
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            } catch (error) {
                              alert('Failed to download certificate');
                            }
                          }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded transition"
                          title="Download Certificate"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Email</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.applicant.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Phone</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.phone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                Business Information
              </h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Business Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.businessName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Address</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.businessAddress || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">City</p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {application.city || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">District</p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {application.district || 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                    Registration Number
                  </p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.registrationNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Tax ID</p>
                  <p className="text-text-light dark:text-text-dark font-medium">
                    {application.taxId || 'N/A'}
                  </p>
                </div>
                {application.businessDescription && (
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Description</p>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {application.businessDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {application.rejectionReason && (
              <div>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                  Rejection Reason
                </h3>
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                  <p className="text-text-light dark:text-text-dark">
                    {application.rejectionReason}
                  </p>
                </div>
              </div>
            )}
            {application.status === 'pending' && (
              <div className="flex gap-2 justify-end">
                <Button onClick={onClose} variant="secondary" disabled={isProcessing}>
                  Close
                </Button>
                <Button onClick={onReject} variant="secondary" disabled={isProcessing}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={onApprove} variant="primary" disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
