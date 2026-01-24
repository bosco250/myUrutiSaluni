'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bell,
  Download,
  Edit,
  Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Membership {
  id: string;
  salonId: string;
  salon: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
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
  const { success, error: toastError, info } = useToast();
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

  const sendReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/memberships/${id}/reminder`);
    },
    onSuccess: () => {
      success('Reminder sent successfully');
    },
    onError: (error: any) => {
      toastError(
        'Failed to send reminder: ' + (error.response?.data?.message || error.message)
      );
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate paginated memberships
  const totalPages = Math.ceil(filteredMemberships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMemberships = filteredMemberships.slice(startIndex, endIndex);

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
      <div className="bg-surface-light dark:bg-surface-dark  rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/memberships')}
              className="h-9 w-9 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer group"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-text-light/60 dark:text-text-dark/60 group-hover:text-primary transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-light dark:text-text-dark leading-none pb-1">
                Membership Management
              </h1>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Manage all salon memberships and association applications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push('/memberships/payments')}
              variant="primary"
              size="sm"
              className="h-8 gap-2 bg-gradient-to-r from-primary to-primary/80 border-none shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Payments
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Memberships */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total Memberships</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark">{stats.totalMemberships}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
        </div>

        {/* Active */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Active Memberships</p>
            <p className="text-xl font-bold text-success">{stats.activeMemberships}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Pending Apps</p>
            <p className="text-xl font-bold text-warning">{stats.pendingApplications}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
        </div>

        {/* Owners */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Salon Owners</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark">{stats.totalOwners}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg group-hover:scale-110 transition-transform">
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Employees */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3.5 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide">Total Employees</p>
            <p className="text-xl font-bold text-text-light dark:text-text-dark">{stats.totalEmployees}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-1.5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'memberships' as const, label: 'Memberships', icon: Building2 },
            { id: 'applications' as const, label: 'Applications', icon: Clock },
            { id: 'owners' as const, label: 'Owners', icon: UserCheck },
            { id: 'employees' as const, label: 'Employees', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusFilter('all');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:bg-background-light dark:hover:bg-background-dark hover:text-text-light'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-surface-light dark:bg-surface-dark  border-border-light dark:border-border-dark rounded-xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          {/* Search */}
          <div className="w-full lg:flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memberships, names, or ID numbers..."
              className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Contextual Status Filters */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:border-primary/50'
              }`}
            >
              All
            </button>
            
            {activeTab === 'memberships' && (
              <>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    statusFilter === 'active'
                      ? 'bg-success text-white shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:bg-success/5 hover:text-success'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('new')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    statusFilter === 'new'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:bg-primary/5 hover:text-primary'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  New
                </button>
                <button
                  onClick={() => setStatusFilter('expired')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    statusFilter === 'expired'
                      ? 'bg-error text-white shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:bg-error/5 hover:text-error'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  Expired
                </button>
              </>
            )}

            {activeTab === 'applications' && (
              <>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    statusFilter === 'pending'
                      ? 'bg-warning text-white shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:bg-warning/5 hover:text-warning'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    statusFilter === 'approved'
                      ? 'bg-success text-white shadow-sm'
                      : 'bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:bg-success/5 hover:text-success'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      {activeTab === 'memberships' && (
        <>
          <MembershipsTab
            memberships={paginatedMemberships}
            paymentStatuses={paymentStatuses}
            onView={setSelectedMembership}
            onActivate={(id) => activateMutation.mutate(id)}
            onSuspend={requestSuspend}
            onExpire={requestExpire}
            onRenew={(membership) => {
              setSelectedMembership(membership);
              setShowRenewModal(true);
            }}
            onSendReminder={(id) => sendReminderMutation.mutate(id)}
            isProcessing={
              activateMutation.isPending || 
              suspendMutation.isPending || 
              expireMutation.isPending || 
              sendReminderMutation.isPending
            }
            success={success}
            toastError={toastError}
            info={info}
          />

          {/* Pagination Controls */}
          {filteredMemberships.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2 text-sm text-text-light/60 dark:text-text-dark/60">
                <span>Showing</span>
                <span className="font-medium text-text-light dark:text-text-dark">
                  {Math.min(startIndex + 1, filteredMemberships.length)}
                </span>
                <span>to</span>
                <span className="font-medium text-text-light dark:text-text-dark">
                  {Math.min(endIndex, filteredMemberships.length)}
                </span>
                <span>of</span>
                <span className="font-medium text-text-light dark:text-text-dark">
                  {filteredMemberships.length}
                </span>
                <span>items</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-light/60 dark:text-text-dark/60">Rows:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 pl-2 pr-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {currentPage}
                    </span>
                    <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                      / {totalPages}
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
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

      {activeTab === 'owners' && <OwnersTab owners={salonOwners} memberships={memberships} success={success} toastError={toastError} info={info} />}

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
          onDownloadCertificate={async () => {
            try {
              const ownerId = selectedMembership.salon?.owner?.id;
              if (!ownerId) {
                toastError('Owner not found');
                return;
              }
              info('Generating certificate. Please wait...', { title: 'Downloading' });
              const response = await api.get(
                `/reports/membership-certificate/${ownerId}`,
                { responseType: 'blob' }
              );
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.download = `membership-certificate-${selectedMembership.membershipNumber}.pdf`;
              link.click();
              window.URL.revokeObjectURL(url);
              success(`Certificate for ${selectedMembership.salon?.name || 'membership'} downloaded successfully`);
            } catch (error) {
              toastError('Failed to download certificate');
            }
          }}
          onSendReminder={() => sendReminderMutation.mutate(selectedMembership.id)}
          paymentStatus={selectedMembership.salon?.owner?.id ? paymentStatuses[selectedMembership.salon.owner.id] : undefined}
          isProcessing={sendReminderMutation.isPending}
          success={success}
          toastError={toastError}
          info={info}
        />
      )}

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onApprove={() => handleApproveApplication(selectedApplication)}
          onReject={() => handleRejectApplication(selectedApplication)}
          isProcessing={reviewApplicationMutation.isPending}
          success={success}
          toastError={toastError}
          info={info}
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
  onSendReminder,
  isProcessing,
  success,
  toastError,
  info,
}: {
  memberships: Membership[];
  paymentStatuses: Record<string, PaymentStatus>;
  onView: (m: Membership) => void;
  onActivate: (id: string) => void;
  onSuspend: (id: string) => void;
  onExpire: (id: string) => void;
  onRenew: (m: Membership) => void;
  onSendReminder: (id: string) => void;
  isProcessing: boolean;
  success: (message: string, options?: any) => void;
  toastError: (message: string, options?: any) => void;
  info: (message: string, options?: any) => void;
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
    <div className="space-y-2">
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
            className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2.5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-none">
                      {membership.salon?.name || 'Unknown Salon'}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border.replace('border-', 'border-')}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light/60 dark:text-text-dark/60 font-medium font-inter">
                    <span className="truncate max-w-[120px]">{membership.salon?.owner?.fullName || 'Owner'}</span>
                    <span className="text-text-light/20">•</span>
                    <span className="text-primary font-bold">{membership.membershipNumber || 'N/A'}</span>
                    <span className="text-text-light/20">•</span>
                    <span className="bg-background-light dark:bg-background-dark px-1 rounded border border-border-light dark:border-border-dark">{membership.category || 'Standard'}</span>
                    {paymentStatus && (
                      <>
                        <span className="text-text-light/20">•</span>
                        <span className={`${isPaid ? 'text-success' : 'text-error'} font-bold`}>
                          {paidAmount.toLocaleString()} / {totalAmount.toLocaleString()} RWF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {membership.status === 'new' && (
                  (isPaid || paidAmount >= 1500) ? (
                    <Button
                      onClick={() => onActivate(membership.id)}
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      className="h-7 px-2.5 text-[11px] gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Activate
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const searchTerm = membership.salon?.owner?.fullName || membership.membershipNumber || '';
                        window.location.href = `/memberships/payments?search=${encodeURIComponent(searchTerm)}`;
                      }}
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] gap-1.5 text-error border-error/20 hover:bg-error/5"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Pay
                    </Button>
                  )
                )}
                
                {membership.status === 'active' && (
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onRenew(membership)}
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-[11px] gap-1 dark:text-text-dark/80"
                      title="Renew"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renew
                    </Button>
                    <button
                      onClick={async () => {
                        try {
                          const ownerId = membership.salon?.owner?.id;
                          if (!ownerId) return toastError('Owner not found');
                          info('Generating certificate...', { title: 'Downloading' });
                          const response = await api.get(`/reports/membership-certificate/${ownerId}`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `certificate-${membership.membershipNumber}.pdf`;
                          link.click();
                          window.URL.revokeObjectURL(url);
                          success(`Certificate ready`);
                        } catch (error) {
                          toastError('Download failed');
                        }
                      }}
                      className="p-1.5 text-text-light/40 dark:text-text-dark/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      title="Certificate"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSendReminder(membership.id)}
                      className="p-1.5 text-text-light/40 dark:text-text-dark/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      title="Send Reminder"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSuspend(membership.id)}
                      className="p-1.5 text-text-light/40 dark:text-text-dark/40 hover:text-warning hover:bg-warning/5 rounded-lg transition-all"
                      title="Suspend"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <Button
                  onClick={() => onView(membership)}
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View Details"
                >
                  <Eye className="w-3.5 h-3.5" />
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
    <div className="space-y-2">
      {applications.map((application) => {
        const config = statusConfig[application.status];
        const Icon = config.icon;

        return (
          <div
            key={application.id}
            className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2.5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-none">
                      {application.businessName || application.applicant.fullName}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light/60 dark:text-text-dark/60 font-medium">
                    <span className="truncate max-w-[120px]">{application.applicant.fullName}</span>
                    <span className="text-text-light/20">•</span>
                    <span className="flex items-center gap-1 font-inter">
                      <Mail className="w-3 h-3 text-text-light/40" />
                      {application.applicant.email}
                    </span>
                    <span className="text-text-light/20">•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-text-light/40" />
                      {application.phone || 'N/A'}
                    </span>
                    <span className="text-text-light/20">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-text-light/40" />
                      {application.city || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {application.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onApprove(application)}
                      variant="primary"
                      size="sm"
                      disabled={isProcessing}
                      className="h-7 px-2.5 text-[11px] gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => onReject(application)}
                      size="sm"
                      disabled={isProcessing}
                      className="h-7 px-2.5 text-[11px] gap-1.5 bg-error/10 hover:bg-error/20 text-error border-none"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
                <Button
                  onClick={() => onView(application)}
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center"
                  title="View Application"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OwnersTab({ owners, memberships, success, toastError, info }: { owners: OwnerUser[]; memberships: Membership[]; success: (message: string, options?: any) => void; toastError: (message: string, options?: any) => void; info: (message: string, options?: any) => void }) {
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
    <div className="space-y-2">
      {owners.map((owner) => {
        const ownerMemberships = memberships.filter((m) => m.salon?.owner?.id === owner.id);
        const activeMembership = ownerMemberships.find((m) => m.status === 'active');

        return (
          <div
            key={owner.id}
            className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2.5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-none">
                      {owner.fullName}
                    </h3>
                    {owner.membershipNumber && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {owner.membershipNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light/60 dark:text-text-dark/60 font-medium font-inter">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-text-light/40" />
                      {owner.email}
                    </span>
                    <span className="text-text-light/20">•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-text-light/40" />
                      {owner.phone || 'N/A'}
                    </span>
                    <span className="text-text-light/20">•</span>
                    {activeMembership ? (
                      <span className="text-success font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active Salon
                      </span>
                    ) : (
                      <span className="text-warning font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No Active Salon
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {owner.membershipNumber && (
                  <button
                    onClick={async () => {
                      try {
                        info('Preparing certificate...', { title: 'Downloading' });
                        const response = await api.get(`/reports/membership-certificate/${owner.id}`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `membership-certificate-${owner.membershipNumber}.pdf`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                        success('Certificate ready');
                      } catch (error) {
                        toastError('Download failed');
                      }
                    }}
                    className="p-1.5 text-text-light/40 dark:text-text-dark/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    title="Download Certificate"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center"
                  title="View Owner Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
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
    <div className="space-y-2">
      {employees.map((employee) => {
        const salonMembership = memberships.find(
          (m) => m.salonId === employee.salonId && m.status === 'active'
        );

        return (
          <div
            key={employee.id}
            className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-2.5 hover:shadow-md hover:border-primary/30 transition-all font-inter"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-none">
                      {employee.user?.fullName || employee.roleTitle || 'Unknown'}
                    </h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 uppercase">
                      {employee.roleTitle || 'STAFF'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light/60 dark:text-text-dark/60 font-medium">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-text-light/40" />
                      {employee.salonName || 'N/A'}
                    </span>
                    <span className="text-text-light/20">•</span>
                    {salonMembership ? (
                      <span className="text-success font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active Salon
                      </span>
                    ) : (
                      <span className="text-warning font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Inactive Salon
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View Staff Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
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
  onDownloadCertificate,
  onSendReminder,
  isProcessing,
  paymentStatus,
  success,
  toastError,
  info,
}: {
  membership: Membership;
  onClose: () => void;
  onDownloadCertificate?: () => void;
  onSendReminder?: () => void;
  isProcessing: boolean;
  paymentStatus?: PaymentStatus;
  success: (message: string, options?: any) => void;
  toastError: (message: string, options?: any) => void;
  info: (message: string, options?: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'activity'>('overview');
  const config = statusConfig[membership.status];
  const Icon = config.icon;

  const daysUntilExpiry = membership.endDate
    ? Math.ceil(
        (new Date(membership.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in"
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 flex flex-col"
          role="presentation"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                Membership Details
              </h2>
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 -mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 font-medium text-xs transition-colors relative ${
                  activeTab === 'overview'
                    ? 'text-primary'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Overview
                {activeTab === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-2 font-medium text-xs transition-colors relative ${
                  activeTab === 'details'
                    ? 'text-primary'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Details
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-2 font-medium text-xs transition-colors relative ${
                  activeTab === 'activity'
                    ? 'text-primary'
                    : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                Activity
                {activeTab === 'activity' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Status with Alert */}
                <div>
                  <h3 className="text-xs font-bold text-text-light dark:text-text-dark mb-2 uppercase tracking-wide">
                    Membership Status
                  </h3>
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      membership.status === 'active'
                        ? 'bg-success/5 border-success/20'
                        : membership.status === 'expired'
                          ? 'bg-error/5 border-error/20'
                          : 'bg-warning/5 border-warning/20'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${config.color} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold ${config.color} text-sm`}>{config.label}</span>
                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-bold border border-warning/20">
                            <AlertCircle className="w-3 h-3" />
                            Expires soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                        {daysUntilExpiry !== null && daysUntilExpiry > 0
                          ? `Valid for ${daysUntilExpiry} days.`
                          : daysUntilExpiry !== null && daysUntilExpiry <= 0
                            ? `Expired ${Math.abs(daysUntilExpiry)} days ago.`
                            : 'Currently inactive.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Payment Status Card */}
                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1.5">
                      Payment Status
                    </p>
                    <div className="flex items-center gap-2">
                      {paymentStatus?.isComplete ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : paymentStatus?.totalPaid && paymentStatus.totalPaid > 0 ? (
                        <Clock className="w-4 h-4 text-warning" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error" />
                      )}
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-bold leading-none ${
                            paymentStatus?.isComplete
                              ? 'text-success'
                              : paymentStatus?.totalPaid && paymentStatus.totalPaid > 0
                                ? 'text-warning'
                                : 'text-error'
                          }`}
                        >
                          {paymentStatus?.isComplete
                            ? 'Paid'
                            : paymentStatus?.totalPaid && paymentStatus.totalPaid > 0
                              ? 'Partial'
                              : 'Pending'}
                        </span>
                        {paymentStatus && !paymentStatus.isComplete && paymentStatus.totalPaid > 0 && (
                          <span className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60 mt-0.5">
                            RWF {paymentStatus.totalPaid.toLocaleString()} paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Remaining Card */}
                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1.5">
                      Time Remaining
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                      <span
                        className={`text-sm font-bold ${
                          daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                            ? 'text-warning'
                            : daysUntilExpiry !== null && daysUntilExpiry <= 0
                              ? 'text-error'
                              : 'text-text-light dark:text-text-dark'
                        }`}
                      >
                        {daysUntilExpiry !== null && daysUntilExpiry > 0
                          ? `${daysUntilExpiry} days`
                          : daysUntilExpiry !== null && daysUntilExpiry <= 0
                            ? 'Expired'
                            : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Salon Information */}
                <div>
                  <h3 className="text-xs font-bold text-text-light dark:text-text-dark mb-2 uppercase tracking-wide">
                    Salon Information
                  </h3>
                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                          Salon Name
                        </p>
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                          {membership.salon?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {membership.salon?.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                            Address
                          </p>
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                            {membership.salon.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {membership.salon?.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                            Phone
                          </p>
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                            {membership.salon.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-text-light/60 dark:text-text-dark/60">
                          Owner
                        </p>
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                            {membership.salon?.owner?.fullName || 'N/A'}
                          </p>
                          {membership.salon?.owner?.email && (
                            <p className="text-xs text-text-light/60 dark:text-text-dark/60 truncate">
                              {membership.salon.owner.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-text-light dark:text-text-dark mb-2 uppercase tracking-wide">
                    Membership Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Membership Number
                      </p>
                      <p className="text-text-light dark:text-text-dark font-mono text-sm">
                        {membership.membershipNumber}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Category
                      </p>
                      <p className="text-text-light dark:text-text-dark text-sm font-medium">
                        {membership.category || 'N/A'}
                      </p>
                    </div>
                    {membership.startDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                        <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                          Start Date
                        </p>
                        <p className="text-text-light dark:text-text-dark text-sm font-medium">
                          {new Date(membership.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {membership.endDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                        <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                          End Date
                        </p>
                        <p className="text-text-light dark:text-text-dark text-sm font-medium">
                          {new Date(membership.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-text-light dark:text-text-dark mb-2 uppercase tracking-wide">
                    Timestamps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Created
                      </p>
                      <p className="text-text-light dark:text-text-dark text-sm font-medium">
                        {new Date(membership.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Last Updated
                      </p>
                      <p className="text-text-light dark:text-text-dark text-sm font-medium">
                        {new Date(membership.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-light dark:text-text-dark mb-2 uppercase tracking-wide">
                  Recent Activity
                </h3>
                <div className="flex flex-col items-center justify-center py-8 text-center bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg border-dashed">
                  <div className="w-8 h-8 mb-2 text-text-light/30 dark:text-text-dark/30">
                    <Clock className="w-full h-full" />
                  </div>
                  <p className="text-xs font-bold text-text-light dark:text-text-dark mb-1">
                    No activity recorded
                  </p>
                  <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 max-w-[200px]">
                    Activity logs will appear here once actions are performed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-border-light dark:border-border-dark flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary" size="sm">
              Close
            </Button>
            {membership.status === 'active' && onDownloadCertificate && (
              <Button onClick={onDownloadCertificate} variant="secondary" size="sm" className="flex items-center gap-1.5 text-success border-success/50 hover:bg-success/10 hover:border-success">
                <Download className="w-3.5 h-3.5" />
                Download Certificate
              </Button>
            )}
            {onSendReminder && (
              <Button onClick={onSendReminder} variant="secondary" size="sm" className="flex items-center gap-1.5" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                Send Reminder
              </Button>
            )}
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
  success,
  toastError,
  info,
}: {
  application: MembershipApplication;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
  success: (message: string, options?: any) => void;
  toastError: (message: string, options?: any) => void;
  info: (message: string, options?: any) => void;
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
                               info('Generating certificate. Please wait...', { title: 'Downloading' });
                               link.click();
                               link.remove();
                               success(`Certificate for ${application.businessName || application.applicant?.fullName || 'member'} downloaded successfully`);
                             } catch (error) {
                               toastError('Failed to download certificate');
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
