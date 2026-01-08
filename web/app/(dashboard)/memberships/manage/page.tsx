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

const statusConfig = {
  new: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    label: 'New',
  },
  active: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/20',
    border: 'border-success',
    label: 'Active',
  },
  pending_renewal: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/20',
    border: 'border-warning',
    label: 'Pending Renewal',
  },
  expired: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger/20',
    border: 'border-danger',
    label: 'Expired',
  },
  suspended: {
    icon: Ban,
    color: 'text-gray-600',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500',
    label: 'Suspended',
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    label: 'Pending',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/20',
    border: 'border-success',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger/20',
    border: 'border-danger',
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
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text-light dark:text-text-dark">
                Membership Management
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                Manage memberships, applications, and membership payments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-dark/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Total Memberships
              </p>
              <p className="text-xl font-black text-text-light dark:text-text-dark mt-2">
                {stats.totalMemberships}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Active
              </p>
              <p className="text-xl font-black text-success mt-2">{stats.activeMemberships}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-warning/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Pending Applications
              </p>
              <p className="text-xl font-black text-warning mt-2">{stats.pendingApplications}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Salon Owners
              </p>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">
                {stats.totalOwners}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light/60 dark:text-text-dark/60">
                Employees
              </p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {stats.totalEmployees}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-1">
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
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
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
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, membership number..."
              className="w-full pl-9 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
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
          onView={setSelectedMembership}
          onActivate={(id) => activateMutation.mutate(id)}
          onSuspend={(id) => suspendMutation.mutate(id)}
          onExpire={(id) => expireMutation.mutate(id)}
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
    </div>
  );
}

// Tab Components
function MembershipsTab({
  memberships,
  onView,
  onActivate,
  onSuspend,
  onExpire,
  onRenew,
  isProcessing,
}: {
  memberships: Membership[];
  onView: (m: Membership) => void;
  onActivate: (id: string) => void;
  onSuspend: (id: string) => void;
  onExpire: (id: string) => void;
  onRenew: (m: Membership) => void;
  isProcessing: boolean;
}) {
  if (memberships.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-text-light dark:text-text-dark">
          No memberships found
        </p>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
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

        return (
          <div
            key={membership.id}
            className={`relative overflow-hidden rounded-2xl border ${config.border} bg-surface-light dark:bg-surface-dark hover:shadow-lg transition p-5`}
          >
            {/* Left rail indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg.replace('/20', '')}`} />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-9 w-9 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center`}
                      >
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black tracking-tight text-text-light dark:text-text-dark truncate">
                          {membership.salon?.name || 'Unknown Salon'}
                        </p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5 truncate">
                          {membership.salon?.owner?.fullName || 'Owner'} •{' '}
                          {membership.membershipNumber || 'No #'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}
                  >
                    {config.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                    <Building2 className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                    <span className="truncate">Category: {membership.category || 'N/A'}</span>
                  </div>
                  {membership.startDate && (
                    <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                      <Clock className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                      <span className="truncate">
                        Start: {new Date(membership.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {membership.endDate && (
                    <div className="flex items-center gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                      <AlertCircle className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                      <span className="truncate">
                        End: {new Date(membership.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {membership.status === 'new' && (
                  <Button
                    onClick={() => onActivate(membership.id)}
                    variant="primary"
                    size="sm"
                    disabled={isProcessing}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Activate
                  </Button>
                )}
                {membership.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onRenew(membership)}
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Renew
                    </Button>
                    <Button
                      onClick={() => onSuspend(membership.id)}
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                      className="text-warning hover:bg-warning/10"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onExpire(membership.id)}
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                      className="text-danger hover:bg-danger/10"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {membership.status === 'expired' && (
                  <Button
                    onClick={() => onRenew(membership)}
                    variant="primary"
                    size="sm"
                    disabled={isProcessing}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Renew
                  </Button>
                )}
                <Button onClick={() => onView(membership)} variant="secondary" size="sm">
                  <Eye className="w-4 h-4" />
                  Details
                </Button>
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
      <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-10 text-center">
        <div className="h-12 w-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-text-light dark:text-text-dark">
          No applications found
        </p>
        <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
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
            className={`relative overflow-hidden rounded-2xl border ${config.border} bg-surface-light dark:bg-surface-dark hover:shadow-md transition p-4`}
          >
            {/* Left rail indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg.replace('/20', '')}`} />

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black tracking-tight text-text-light dark:text-text-dark truncate">
                          {application.businessName || application.applicant.fullName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5 truncate">
                        {application.applicant.fullName} •{' '}
                        <span className="text-primary font-semibold">
                          {application.applicant.membershipNumber || 'Membership # pending'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                    <Mail className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                    <span className="truncate">{application.applicant.email}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                    <Phone className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                    <span className="truncate">{application.phone || 'N/A'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                    <MapPin className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                    <span className="truncate">
                      {(application.city || 'N/A') + ' • ' + (application.district || 'N/A')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                    <FileText className="w-3 h-3 text-text-light/40 dark:text-text-dark/40" />
                    <span className="truncate">{application.registrationNumber || 'N/A'}</span>
                  </span>
                </div>

                {application.rejectionReason && (
                  <div className="mt-3 rounded-xl bg-danger/10 border border-danger/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-danger mb-1">
                      Rejection reason
                    </p>
                    <p className="text-xs text-text-light dark:text-text-dark line-clamp-2">
                      {application.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex lg:flex-col gap-2 lg:items-end flex-shrink-0">
                {application.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => onApprove(application)}
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => onReject(application)}
                      size="sm"
                      disabled={isProcessing}
                      className="gap-2 bg-danger hover:bg-danger/90 text-white"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => onView(application)}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
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
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/20 text-warning">
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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/20 text-warning">
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-md w-full p-6"
          role="presentation"
        >
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-1">
            Renew Membership
          </h2>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-4">
            {membership.salon?.name || 'Selected salon'}
          </p>
          <div className="space-y-4">
            <div>
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
                className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={onClose} variant="secondary" disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={onRenew} variant="primary" disabled={isProcessing || !endDate}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Renew
              </Button>
            </div>
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
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4">
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
              <div className="min-w-0">
                <h3 className="text-xl font-black tracking-tight">
                  {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
                </h3>
                <p className="text-xs text-white/80 mt-1 truncate">
                  {application.businessName || 'Membership Application'} •{' '}
                  {application.applicant?.fullName || 'Applicant'}
                </p>
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

            {!isApprove && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                <label
                  htmlFor={`membership-manage-reject-${application.id}`}
                  className="block text-sm font-semibold text-danger mb-2"
                >
                  Rejection Reason
                </label>
                <textarea
                  id={`membership-manage-reject-${application.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-danger/30 rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger transition resize-none"
                  placeholder="Explain why this application is being rejected..."
                />
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
                    Approve
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
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
