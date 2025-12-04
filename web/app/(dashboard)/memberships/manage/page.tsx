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
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Download,
  Loader2,
  RefreshCw,
  Ban,
  Check,
  X,
  FileText,
  QrCode,
  DollarSign,
} from 'lucide-react';

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

const statusConfig = {
  new: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500/20', border: 'border-blue-500', label: 'New' },
  active: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/20', border: 'border-success', label: 'Active' },
  pending_renewal: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning', label: 'Pending Renewal' },
  expired: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger', label: 'Expired' },
  suspended: { icon: Ban, color: 'text-gray-600', bg: 'bg-gray-500/20', border: 'border-gray-500', label: 'Suspended' },
  pending: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500/20', border: 'border-blue-500', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/20', border: 'border-success', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger', label: 'Rejected' },
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
  const [activeTab, setActiveTab] = useState<'memberships' | 'applications' | 'owners' | 'employees'>('memberships');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<MembershipApplication | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState('');

  // Fetch memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery<Membership[]>({
    queryKey: ['memberships'],
    queryFn: async () => {
      const response = await api.get('/memberships');
      return response.data || [];
    },
  });

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<MembershipApplication[]>({
    queryKey: ['membership-applications'],
    queryFn: async () => {
      const response = await api.get('/memberships/applications');
      return response.data || [];
    },
  });

  // Fetch salon owners (users with SALON_OWNER role)
  const { data: salonOwners = [] } = useQuery({
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
  const { data: salonEmployees = [] } = useQuery({
    queryKey: ['all-salon-employees'],
    queryFn: async () => {
      try {
        const salonsResponse = await api.get('/salons');
        const salons = salonsResponse.data || [];
        const allEmployees: any[] = [];
        
        for (const salon of salons) {
          try {
            const empResponse = await api.get(`/salons/${salon.id}/employees`);
            const employees = empResponse.data || [];
            allEmployees.push(...employees.map((emp: any) => ({
              ...emp,
              salonName: salon.name,
              salonId: salon.id,
            })));
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
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) => {
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
    const activeMemberships = memberships.filter(m => m.status === 'active').length;
    const pendingApplications = applications.filter(a => a.status === 'pending').length;
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
    if (confirm(`Approve membership application for ${application.applicant.fullName}?`)) {
      reviewApplicationMutation.mutate({ id: application.id, status: 'approved' });
    }
  };

  const handleRejectApplication = (application: MembershipApplication) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      reviewApplicationMutation.mutate({ id: application.id, status: 'rejected', rejectionReason: reason });
    }
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">Membership Management</h1>
            <p className="text-text-light/60 dark:text-text-dark/60">Manage salon owner and employee memberships</p>
          </div>
          <Button
            onClick={() => router.push('/memberships/payments')}
            variant="primary"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            View Payments
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Total Memberships</span>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.totalMemberships}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Active</span>
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">{stats.activeMemberships}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Pending Applications</span>
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{stats.pendingApplications}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Salon Owners</span>
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.totalOwners}</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-light/60 dark:text-text-dark/60">Employees</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-text-light dark:text-text-dark">{stats.totalEmployees}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1 mb-6">
        <div className="flex gap-1">
          {[
            { id: 'memberships', label: 'Memberships', icon: Building2 },
            { id: 'applications', label: 'Applications', icon: Clock },
            { id: 'owners', label: 'Salon Owners', icon: UserCheck },
            { id: 'employees', label: 'Employees', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40 dark:text-text-dark/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Status</option>
              {activeTab === 'memberships' && (
                <>
                  <option value="new">New</option>
                  <option value="active">Active</option>
                  <option value="pending_renewal">Pending Renewal</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </>
              )}
              {activeTab === 'applications' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>
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
          isProcessing={activateMutation.isPending || suspendMutation.isPending || expireMutation.isPending}
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

      {activeTab === 'owners' && (
        <OwnersTab owners={salonOwners} memberships={memberships} />
      )}

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
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">No memberships found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memberships.map((membership) => {
        const config = statusConfig[membership.status];
        const Icon = config.icon;

        return (
          <div
            key={membership.id}
            className={`bg-surface-light dark:bg-surface-dark border ${config.border} rounded-xl p-6`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-6 h-6 ${config.color}`} />
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    {membership.salon?.name || 'Unknown Salon'}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-text-light/80 dark:text-text-dark/80 mb-4">
                  <p><span className="font-medium">Membership #:</span> {membership.membershipNumber}</p>
                  <p><span className="font-medium">Owner:</span> {membership.salon?.owner?.fullName}</p>
                  <p><span className="font-medium">Category:</span> {membership.category || 'N/A'}</p>
                  {membership.startDate && (
                    <p><span className="font-medium">Start:</span> {new Date(membership.startDate).toLocaleDateString()}</p>
                  )}
                  {membership.endDate && (
                    <p><span className="font-medium">End:</span> {new Date(membership.endDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {membership.status === 'new' && (
                  <Button onClick={() => onActivate(membership.id)} variant="primary" disabled={isProcessing}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}
                {membership.status === 'active' && (
                  <>
                    <Button onClick={() => onRenew(membership)} variant="secondary" disabled={isProcessing}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renew
                    </Button>
                    <Button onClick={() => onSuspend(membership.id)} variant="secondary" disabled={isProcessing}>
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend
                    </Button>
                    <Button onClick={() => onExpire(membership.id)} variant="secondary" disabled={isProcessing}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Expire
                    </Button>
                  </>
                )}
                {membership.status === 'expired' && (
                  <Button onClick={() => onRenew(membership)} variant="primary" disabled={isProcessing}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Renew
                  </Button>
                )}
                <Button onClick={() => onView(membership)} variant="secondary">
                  <Eye className="w-4 h-4 mr-2" />
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
        <Clock className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">No applications found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => {
        const config = statusConfig[application.status];
        const Icon = config.icon;

        return (
          <div
            key={application.id}
            className={`bg-surface-light dark:bg-surface-dark border ${config.border} rounded-xl p-6`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-6 h-6 ${config.color}`} />
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                    {application.businessName || application.applicant.fullName}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-text-light/80 dark:text-text-dark/80 mb-4">
                  <p><span className="font-medium">Applicant:</span> {application.applicant.fullName}</p>
                  <p><span className="font-medium">Membership #:</span> 
                    <span className="text-primary font-medium ml-1">
                      {application.applicant.membershipNumber || 'Will be assigned'}
                    </span>
                  </p>
                  <p><span className="font-medium">Email:</span> {application.applicant.email}</p>
                  <p><span className="font-medium">Phone:</span> {application.phone || 'N/A'}</p>
                  <p><span className="font-medium">City:</span> {application.city || 'N/A'}</p>
                  <p><span className="font-medium">District:</span> {application.district || 'N/A'}</p>
                  <p><span className="font-medium">Registration #:</span> {application.registrationNumber || 'N/A'}</p>
                </div>
                {application.rejectionReason && (
                  <div className="mt-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                    <p className="text-sm text-danger"><span className="font-medium">Rejection Reason:</span> {application.rejectionReason}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {application.status === 'pending' && (
                  <>
                    <Button onClick={() => onApprove(application)} variant="primary" disabled={isProcessing}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button onClick={() => onReject(application)} variant="secondary" disabled={isProcessing}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                <Button onClick={() => onView(application)} variant="secondary">
                  <Eye className="w-4 h-4 mr-2" />
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

function OwnersTab({ owners, memberships }: { owners: any[]; memberships: Membership[] }) {
  if (owners.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <UserCheck className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">No salon owners found</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Membership #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Salon Membership Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {owners.map((owner) => {
            const ownerMemberships = memberships.filter(m => m.salon?.owner?.id === owner.id);
            const activeMembership = ownerMemberships.find(m => m.status === 'active');

            return (
              <tr key={owner.id} className="hover:bg-background-light dark:hover:bg-background-dark">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                  {owner.membershipNumber || (
                    <span className="text-text-light/40 dark:text-text-dark/40 italic">Not assigned</span>
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
                            const response = await api.get(`/reports/membership-certificate/${owner.id}`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `membership-certificate-${owner.membershipNumber}.pdf`);
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

function EmployeesTab({ employees, memberships }: { employees: any[]; memberships: Membership[] }) {
  if (employees.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-text-light/20 dark:text-text-dark/20" />
        <p className="text-text-light/60 dark:text-text-dark/60 text-lg font-medium">No employees found</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Salon</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-light/60 dark:text-text-dark/60 uppercase">Salon Membership</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {employees.map((employee) => {
            const salonMembership = memberships.find(m => m.salonId === employee.salonId && m.status === 'active');

            return (
              <tr key={employee.id} className="hover:bg-background-light dark:hover:bg-background-dark">
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">Renew Membership</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                New End Date
              </label>
              <input
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Membership Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg">
              <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Status</h3>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-semibold ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Salon Information</h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Salon Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{membership.salon?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Owner</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{membership.salon?.owner?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Owner Email</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{membership.salon?.owner?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Membership Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Membership Number</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{membership.membershipNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Category</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{membership.category || 'N/A'}</p>
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Application Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg">
              <X className="w-5 h-5 text-text-light/60 dark:text-text-dark/60" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Status</h3>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className={`font-semibold ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Applicant Information</h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.applicant.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Membership Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-text-light dark:text-text-dark font-medium text-primary">
                      {application.applicant.membershipNumber || (
                        <span className="text-text-light/40 dark:text-text-dark/40 italic">Will be assigned upon approval</span>
                      )}
                    </p>
                    {application.applicant.membershipNumber && application.status === 'approved' && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(`/reports/membership-certificate/${application.applicantId}`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `membership-certificate-${application.applicant.membershipNumber}.pdf`);
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
                  <p className="text-text-light dark:text-text-dark font-medium">{application.applicant.email}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Phone</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Business Information</h3>
              <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Business Name</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Address</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.businessAddress || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">City</p>
                    <p className="text-text-light dark:text-text-dark font-medium">{application.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">District</p>
                    <p className="text-text-light dark:text-text-dark font-medium">{application.district || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Registration Number</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.registrationNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60">Tax ID</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{application.taxId || 'N/A'}</p>
                </div>
                {application.businessDescription && (
                  <div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">Description</p>
                    <p className="text-text-light dark:text-text-dark font-medium">{application.businessDescription}</p>
                  </div>
                )}
              </div>
            </div>
            {application.rejectionReason && (
              <div>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">Rejection Reason</h3>
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                  <p className="text-text-light dark:text-text-dark">{application.rejectionReason}</p>
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
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
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

