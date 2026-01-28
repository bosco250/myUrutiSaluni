'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  MoreVertical,
  Eye,  Edit,  Users,  Ban,
  X,  Download,
  Mail,  Phone,
  MapPin,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DollarSign } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { SelfServicePaymentModal } from '@/components/memberships/SelfServicePaymentModal';
import { useToast } from '@/components/ui/Toast';
import {
  MEMBERSHIP_ANNUAL_FEE,
  MEMBERSHIP_STATUS_CONFIG,
  formatCurrency,
} from '@/lib/membership-config';

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
      email?: string;
    };
  };
  category: string;
  status: 'new' | 'active' | 'pending_renewal' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  membershipNumber: string;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  lastReminderSent?: string;
  createdAt: string;
  updatedAt: string;
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
    color: 'text-gray-900/60 dark:text-text-dark/60',
    bg: 'bg-text-light/5 dark:bg-text-dark/5',
    border: 'border-gray-300 dark:border-border-dark',
    label: 'Suspended',
  },
};

export default function MembershipsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.DISTRICT_LEADER,
        UserRole.SALON_OWNER,
      ]}
    >
      <MembershipsPageContent />
    </ProtectedRoute>
  );
}

function MembershipsPageContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [showQuickActions, setShowQuickActions] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(MEMBERSHIP_ANNUAL_FEE);
  const reminderShownRef = useRef(false); // Track if reminder has been shown
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { canManageUsers } = usePermissions();
  const { success, error: toastError, info } = useToast();
  const { data: membershipStatus } = useMembershipStatus();

  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ['memberships'],
    queryFn: async () => {
      const response = await api.get('/memberships');
      // Handle both wrapped (response.data.data) and unwrapped (response.data) responses
      const data = response.data?.data || response.data;

      // Process response data

      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    refetchOnMount: true, // Always refetch when component mounts to get latest data
    staleTime: 30 * 1000, // 30 seconds - data is considered stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Fetch payment statuses for membership owners
  const { data: paymentStatuses = {} } = useQuery<Record<string, PaymentStatus>>({
    queryKey: [
      'membership-payment-statuses-dashboard',
      memberships?.map((m) => m.salon?.owner?.id).filter(Boolean),
    ],
    queryFn: async () => {
      if (!memberships) return {};
      const currentYear = new Date().getFullYear();
      const statusMap: Record<string, PaymentStatus> = {};

      const ownerIds = Array.from(
        new Set(memberships.map((m) => m.salon?.owner?.id).filter(Boolean))
      );

      for (const ownerId of ownerIds) {
        try {
          const response = await api.get(`/memberships/payments/status/${ownerId}/${currentYear}`);
          statusMap[ownerId] = {
            memberId: ownerId,
            ...response.data,
          };
        } catch {
          statusMap[ownerId] = {
            memberId: ownerId,
            totalRequired: MEMBERSHIP_ANNUAL_FEE,
            totalPaid: 0,
            remaining: MEMBERSHIP_ANNUAL_FEE,
            isComplete: false,
          };
        }
      }

      return statusMap;
    },
    enabled: !!memberships && memberships.length > 0,
  });

  // Check for expiring membership (User Notification)
  useEffect(() => {
    if (reminderShownRef.current || !memberships || !user || !user.role || user.role === UserRole.SUPER_ADMIN) return;

    const myMembership = memberships.find(m => m.salon?.owner?.id === user.id);
    if (!myMembership) return;

    if (myMembership.status === 'expired' || myMembership.status === 'pending_renewal') {
       reminderShownRef.current = true;
       toastError('Your membership has expired. Please renew to restore access.', { title: 'Membership Expired', persistent: true });
    } else if (myMembership.endDate) {
       const daysUntil = Math.ceil((new Date(myMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
       if (daysUntil <= 30 && daysUntil > 0) {
           reminderShownRef.current = true;
           info(`Your membership expires in ${daysUntil} days. Please renew to avoid interruption.`, { title: 'Renewal Reminder', duration: 8000 });
       }
    }
  }, [memberships, user, toastError, info]);

  const [activationError, setActivationError] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    membershipNumber?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/memberships/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
    onError: (error: any) => {
      // Extract specific payment error details if available
      const message = error.response?.data?.message || 'Failed to activate membership';

      setActivationError({
        isOpen: true,
        title: 'Activation Failed',
        message: message,
      });
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
      setConfirmationAction(null);
    },
    onError: (error: any) => {
       setConfirmationAction(null);
       toastError("Failed to update membership: " + (error.response?.data?.message || error.message));
    }
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

  // Confirmation Logic
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'suspend' | 'expire';
    id: string;
    title: string;
    message: string;
    variant: 'warning' | 'danger';
  } | null>(null);

  const requestSuspend = (id: string, number: string) => {
    setConfirmationAction({
        type: 'suspend',
        id,
        title: 'Suspend Membership',
        message: `Are you sure you want to suspend membership #${number}? The member will lose access temporarily.`,
        variant: 'warning'
    });
  };

  const requestExpire = (id: string, number: string) => {
    setConfirmationAction({
        type: 'expire',
        id,
        title: 'Expire Membership',
        message: `Are you sure you want to expire membership #${number} immediately? This action cannot be undone if the membership is still valid.`,
        variant: 'danger'
    });
  };

  const handleConfirmAction = () => {
     if (!confirmationAction) return;
     if (confirmationAction.type === 'suspend') {
         suspendMutation.mutate(confirmationAction.id);
     } else {
         expireMutation.mutate(confirmationAction.id);
     }
  };

  // Certificate download handler
  const handleDownloadCertificate = async (userId: string) => {
    info('Generating certificate...', { title: 'Please wait' });
    try {
      const response = await api.get(`/reports/membership-certificate/${userId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membership-certificate-${userId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('Certificate downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading certificate:', error);
      toastError('Failed to download certificate: ' + (error.response?.data?.message || error.message));
    }
  };

  // Pay new membership handler
  const handlePayNew = () => {
    setPaymentAmount(MEMBERSHIP_ANNUAL_FEE);
    setShowPaymentModal(true);
  };

  const filteredMemberships =
    memberships?.filter((membership) => {
      const matchesSearch =
        membership.salon?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.membershipNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.salon?.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || membership.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || membership.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    }) || [];

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredMemberships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMemberships = filteredMemberships.slice(startIndex, endIndex);

  const needsAttentionMemberships = paginatedMemberships.filter(
    (m) => m.status === 'pending_renewal' || m.status === 'expired' || m.status === 'new'
  );
  const otherMemberships = paginatedMemberships.filter(
    (m) => !(m.status === 'pending_renewal' || m.status === 'expired' || m.status === 'new')
  );

  // Calculate statistics with trends
  const stats = useMemo(() => {
    if (!memberships) return null;

    const total = memberships.length;
    const active = memberships.filter((m) => m.status === 'active').length;
    const newMemberships = memberships.filter((m) => m.status === 'new').length;
    const expired = memberships.filter((m) => m.status === 'expired').length;
    const suspended = memberships.filter((m) => m.status === 'suspended').length;

    // Calculate expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = memberships.filter((m) => {
      if (!m.endDate || m.status === 'expired') return false;
      const endDate = new Date(m.endDate);
      return endDate >= now && endDate <= thirtyDaysFromNow;
    }).length;

    const pendingRenewal = memberships.filter((m) => m.status === 'pending_renewal').length;

    return {
      total,
      active,
      new: newMemberships,
      expired,
      suspended,
      expiringSoon,
      pendingRenewal,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [memberships]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!memberships) return [];
    const uniqueCategories = Array.from(
      new Set(memberships.map((m) => m.category).filter(Boolean))
    );
    return uniqueCategories;
  }, [memberships]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Skeleton variant="text" width={300} height={40} className="mb-2" />
          <Skeleton variant="text" width={400} height={20} />
        </div>

        {/* Stats Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-3"
            >
              <Skeleton variant="text" width={60} height={12} className="mb-1" />
              <Skeleton variant="text" width={40} height={24} />
            </div>
          ))}
        </div>

        {/* Card Skeletons */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Membership Status Banners */}
      {membershipStatus && (
        <>
          {/* No membership application */}
          {!membershipStatus.application && (
            <div className="mb-3 bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-primary font-semibold text-sm mb-1">Apply for Membership</p>
                <p className="text-xs text-primary/80">
                  You have not applied for membership. Apply now to unlock full features.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => router.push('/membership/apply')}>
                Apply Now
              </Button>
            </div>
          )}

          {/* Membership application pending */}
          {membershipStatus.application?.status === 'pending' && (
            <div className="mb-3 bg-warning/10 border border-warning/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-warning font-semibold text-sm mb-1">Application Pending</p>
                <p className="text-xs text-warning/80">
                  Your membership application is being reviewed. You&apos;ll be notified once
                  it&apos;s approved.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/membership/status')}
              >
                View Status
              </Button>
            </div>
          )}

          {/* Membership application rejected */}
          {membershipStatus.application?.status === 'rejected' && (
            <div className="mb-3 bg-danger/10 border border-danger/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-danger font-semibold text-sm mb-1">Application Not Approved</p>
                <p className="text-xs text-danger/80">
                  Your membership application was not approved. You can re-apply with updated
                  information.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => router.push('/membership/apply')}>
                Apply Again
              </Button>
            </div>
          )}
        </>
      )}

      {/* Hero */}
      <div className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-text-dark">
              Memberships
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark text-gray-900/60 dark:text-text-dark/60">
              {filteredMemberships.length}
            </span>
          </div>

          {canManageUsers() && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/memberships/manage')}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Manage
              </Button>
              <Button
                onClick={() => {
                  // Export memberships as CSV
                  if (!memberships || memberships.length === 0) {
                    alert('No memberships to export');
                    return;
                  }
                  
                  const headers = ['Membership Number', 'Salon Name', 'Owner', 'Status', 'Start Date', 'End Date', 'Category'];
                  const csvContent = [
                    headers.join(','),
                    ...memberships.map(m => [
                      m.membershipNumber || 'N/A',
                      `"${(m.salon?.name || 'N/A').replace(/"/g, '""')}"`,
                      `"${(m.salon?.owner?.fullName || 'N/A').replace(/"/g, '""')}"`,
                      m.status,
                      m.startDate ? new Date(m.startDate).toLocaleDateString() : 'N/A',
                      m.endDate ? new Date(m.endDate).toLocaleDateString() : 'N/A',
                      m.category || 'N/A',
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `memberships-export-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                Total
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-text-dark mt-1">
                {stats?.total || 0}
              </p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">
                {stats?.activePercentage || 0}% active
              </p>
            </div>
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                Active
              </p>
              <p className="text-xl font-bold text-success mt-1">{stats?.active || 0}</p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">
                In good standing
              </p>
            </div>
            <div className="h-8 w-8 rounded-md bg-success/10 text-success flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                New
              </p>
              <p className="text-xl font-bold text-primary mt-1">{stats?.new || 0}</p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">Pending</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                Renewal
              </p>
              <p className="text-xl font-bold text-warning mt-1">{stats?.pendingRenewal || 0}</p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">Follow-up</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-warning/10 text-warning flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                Expired
              </p>
              <p className="text-xl font-bold text-error mt-1">{stats?.expired || 0}</p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">Needs action</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-error/10 text-error flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-900/60 dark:text-text-dark/60">
                Suspended
              </p>
              <p className="text-xl font-bold text-gray-900/60 dark:text-text-dark/60 mt-1">
                {stats?.suspended || 0}
              </p>
              <p className="text-[10px] text-gray-900/50 dark:text-text-dark/50 mt-0.5">On hold</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-text-light/10 dark:bg-text-dark/10 text-gray-900/60 dark:text-text-dark/60 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Status Pills */}
      <div className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg p-2">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search by salon, owner, or membership #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-text-dark placeholder:text-gray-900/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
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
              variant={statusFilter === 'pending_renewal' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('pending_renewal')}
              className="whitespace-nowrap"
            >
              <AlertCircle className="w-4 h-4" />
              Pending renewal
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
              variant={statusFilter === 'suspended' ? 'primary' : 'secondary'}
              onClick={() => setStatusFilter('suspended')}
              className="whitespace-nowrap"
            >
              <Ban className="w-4 h-4" />
              Suspended
            </Button>
          </div>

          {categories.length > 0 && (
            <div className="lg:w-56">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3.5 py-2 bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>



      {/* Alert for expiring memberships */}
      {(stats?.expiringSoon || 0) > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-2 sm:gap-4">
            <div className="p-2 sm:p-2 bg-warning/20 rounded-xl flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-text-dark mb-1">
                {stats?.expiringSoon} Membership{(stats?.expiringSoon || 0) !== 1 ? 's' : ''}{' '}
                Expiring Soon
              </h3>
              <p className="text-sm text-gray-900/60 dark:text-text-dark/60 mb-3">
                {stats?.expiringSoon} membership{(stats?.expiringSoon || 0) !== 1 ? 's' : ''} will
                expire in the next 30 days. Consider sending renewal reminders.
              </p>
              <Button
                onClick={() => setStatusFilter('pending_renewal')}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                View Expiring Memberships
                <Clock className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Memberships List */}
      {filteredMemberships.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-full h-full text-gray-900/20 dark:text-text-dark/20" />}
          title={
            searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No memberships match your filters'
              : 'No memberships found'
          }
          description={
            searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? "Try adjusting your search criteria or filters to find what you're looking for."
              : 'Get started by creating your first membership or inviting salons to join the association.'
          }
          action={
            !searchQuery &&
            statusFilter === 'all' &&
            categoryFilter === 'all' &&
            canManageUsers() ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push('/memberships/manage')}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Membership
                </Button>
                <Button
                  onClick={() => router.push('/salons')}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  View Salons
                </Button>
              </div>
            ) : searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' ? (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                variant="secondary"
              >
                Clear Filters
              </Button>
            ) : undefined
          }
          className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-2xl"
        />
      ) : (
        <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800">
                <tr>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Salon / Owner</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Membership #</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Status</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Payment</th>
                   <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Expiry</th>
                   <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-900/60 dark:text-white/60 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedMemberships.map((membership) => {
                   const config = statusConfig[membership.status];
                   const Icon = config.icon;
                   const pStatus = membership.salon?.owner?.id ? paymentStatuses[membership.salon.owner.id] : undefined;
                   const isPaid = pStatus?.isComplete;
                   const paidAmount = pStatus?.totalPaid || 0;
                   const daysUntilExpiry = membership.endDate
                     ? Math.ceil((new Date(membership.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                     : null;

                   return (
                     <tr key={membership.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                       <td className="px-3 py-1.5 align-top">
                          <div className="flex flex-col">
                             <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                               {membership.salon?.name || 'Unknown Salon'}
                             </span>
                             <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                {membership.salon?.owner?.fullName || 'N/A'}
                             </div>
                             {membership.salon?.phone && (
                               <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Phone className="w-3 h-3" />
                                  {membership.salon.phone}
                               </div>
                             )}
                          </div>
                       </td>
                       <td className="px-3 py-1.5 align-top">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                               {membership.membershipNumber}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">{membership.category}</span>
                          </div>
                       </td>
                       <td className="px-3 py-1.5 align-top">
                          <Badge
                            variant={
                                config.color === 'text-success'
                                  ? 'success'
                                  : config.color === 'text-warning'
                                    ? 'warning'
                                    : config.color === 'text-error'
                                      ? 'danger'
                                      : 'default'
                            } 
                            size="sm"
                            className="px-1.5 py-0.5 text-[10px] h-auto whitespace-nowrap"
                          >
                           <Icon className="w-3 h-3 mr-1" />
                           {config.label}
                          </Badge>
                       </td>
                       <td className="px-3 py-1.5 align-top">
                          <div className="flex flex-col">
                             {pStatus ? (
                                <>
                                   <div className={`flex items-center gap-1 text-xs font-semibold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                      {isPaid ? <CheckCircle className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                      {paidAmount.toLocaleString()} RWF
                                   </div>
                                </>
                             ) : (
                                <span className="text-xs text-gray-400 italic">No info</span>
                             )}
                          </div>
                       </td>
                       <td className="px-3 py-1.5 align-top">
                          <div className="flex flex-col">
                             <span className={`text-xs ${
                                daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 ? 'text-amber-600 font-medium' :
                                daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-600 font-medium' : 'text-gray-500'
                             }`}>
                                {membership.endDate ? new Date(membership.endDate).toLocaleDateString() : 'N/A'}
                             </span>
                             {daysUntilExpiry !== null && (
                                <span className="text-[10px] text-gray-400">
                                   {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : `${Math.abs(daysUntilExpiry)} days ago`}
                                </span>
                             )}
                          </div>
                       </td>
                       <td className="px-3 py-1.5 align-top text-right">
                          <div className="flex items-center justify-end gap-2 text-right">
                             {/* OWNER ACTIONS */}
                             {user?.id === membership.salon?.owner?.id && (
                                <>
                                  {/* Owner Pay (New & Unpaid) -> Modal */}
                                  {membership.status === 'new' && (!isPaid && paidAmount < 1500) && (
                                     <Button 
                                       onClick={() => {
                                         setPaymentAmount(MEMBERSHIP_ANNUAL_FEE);
                                         setShowPaymentModal(true);
                                       }} 
                                       variant="secondary" 
                                       size="sm" 
                                       className="h-8 px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm"
                                     >
                                       Pay Fee
                                     </Button>
                                  )}
                                  {/* Owner Certificate (Active) */}
                                  {membership.status === 'active' && (
                                     <Button 
                                       onClick={() => handleDownloadCertificate(membership.salon.owner.id)} 
                                       variant="secondary" 
                                       size="sm" 
                                       className="h-8 px-3 text-xs text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 shadow-sm"
                                     >
                                        Certificate
                                     </Button>
                                  )}
                                  {/* Owner Renew (Expired/Suspended) -> Modal */}
                                  {['expired', 'suspended', 'pending_renewal'].includes(membership.status) && (
                                      <Button 
                                        onClick={() => {
                                          setPaymentAmount(MEMBERSHIP_ANNUAL_FEE);
                                          setShowPaymentModal(true);
                                        }} 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 px-3 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-sm"
                                      >
                                        Renew
                                      </Button>
                                  )}
                                </>
                             )}

                             {/* ADMIN ACTIONS */}
                             {canManageUsers() && (
                                <>
                                   {/* Admin Pay (New & Unpaid) -> Redirect (Navigation) */}
                                   {membership.status === 'new' && (!isPaid && paidAmount < 1500) && (
                                      <Button 
                                        onClick={() => router.push(`/memberships/payments?search=${membership.membershipNumber}`)} 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 px-3 text-xs text-red-600 border border-red-200 hover:bg-red-50"
                                      >
                                        Pay
                                      </Button>
                                   )}
                                   {/* Admin Activate (New & Paid) */}
                                   {membership.status === 'new' && (isPaid || paidAmount >= 1500) && (
                                      <Button onClick={() => activateMutation.mutate(membership.id)} size="sm" className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white border-none shadow-sm">
                                        Activate
                                      </Button>
                                   )}
                                   {/* Admin Renew (Expired) -> Redirect/Modal? (Usually Admin might pay or renew directly. I'll use Modal for consistency with Owner if pure Renew, or redirect if Payment needed. Original was Renew button. I'll use Modal for Renew as it's easier). */}
                                   {/* Actually, user said 'navigating to different role'. Admin Pay -> Navigation. Admin Renew -> Navigation? */}
                                   {['expired', 'suspended', 'pending_renewal'].includes(membership.status) && (
                                      <Button 
                                        onClick={() => router.push(`/memberships/payments?search=${membership.membershipNumber}`)} 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 px-3 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50"
                                      >
                                        Renew
                                      </Button>
                                   )}
                                </>
                             )}

                             {/* COMMON ACTIONS (View) */}
                             <Button onClick={() => setSelectedMembership(membership)} variant="secondary" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 border-gray-200" title="View Details">
                               <Eye className="w-4 h-4" />
                             </Button>

                             {/* ADMIN MANAGEMENT */}
                             {canManageUsers() && (
                                <>
                                  <Button onClick={() => sendReminderMutation.mutate(membership.id)} variant="secondary" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 border-gray-200" title="Send Reminder">
                                    <Bell className="w-4 h-4" />
                                  </Button>
                                  {membership.status === 'active' && (
                                      <>
                                          <Button onClick={() => requestSuspend(membership.id, membership.membershipNumber)} variant="secondary" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-amber-600 border-gray-200" title="Suspend">
                                            <Ban className="w-4 h-4" />
                                          </Button>
                                          <Button onClick={() => requestExpire(membership.id, membership.membershipNumber)} variant="secondary" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 border-gray-200" title="Expire">
                                            <XCircle className="w-4 h-4" />
                                          </Button>
                                      </>
                                  )}
                                </>
                             )}
                          </div>
                       </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Pagination Controls */}
      {filteredMemberships.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-gray-300 dark:border-border-dark">
          <div className="flex items-center gap-2 text-sm text-gray-900/60 dark:text-text-dark/60">
            <span>Showing</span>
            <span className="font-medium text-gray-900 dark:text-text-dark">
              {Math.min(startIndex + 1, filteredMemberships.length)}
            </span>
            <span>to</span>
            <span className="font-medium text-gray-900 dark:text-text-dark">
              {Math.min(endIndex, filteredMemberships.length)}
            </span>
            <span>of</span>
            <span className="font-medium text-gray-900 dark:text-text-dark">
              {filteredMemberships.length}
            </span>
            <span>items</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900/60 dark:text-text-dark/60">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 pl-2 pr-8 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
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
                <span className="text-sm font-medium text-gray-900 dark:text-text-dark">
                  {currentPage}
                </span>
                <span className="text-sm text-gray-900/60 dark:text-text-dark/60">
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

      {/* Activation Error Modal */}
      <Modal
        isOpen={activationError.isOpen}
        onClose={() => setActivationError((prev) => ({ ...prev, isOpen: false }))}
        title={activationError.title}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-error/10 text-error p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Activation stopped</p>
              <p>{activationError.message}</p>
            </div>
          </div>

          <p className="text-sm text-gray-900/80 dark:text-text-dark/80">
            Memberships cannot be activated until the required payment is recorded.
          </p>

          <ModalFooter>
            <div className="flex gap-3 justify-end w-full">
              <Button
                variant="secondary"
                onClick={() => setActivationError((prev) => ({ ...prev, isOpen: false }))}
              >
                Close
              </Button>
              {activationError.membershipNumber && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const url = `/memberships/payments?search=${activationError.membershipNumber}`;
                    router.push(url);
                  }}
                  className="gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Go to Payments
                </Button>
              )}
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmationAction}
        onClose={() => setConfirmationAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmationAction?.title || ''}
        message={confirmationAction?.message || ''}
        variant={confirmationAction?.variant}
        isProcessing={suspendMutation.isPending || expireMutation.isPending}
        confirmLabel={confirmationAction?.type === 'expire' ? 'Expire' : 'Suspend'}
      />

      {/* Membership Detail Modal */}
      {selectedMembership && (
        <MembershipDetailModal
          membership={selectedMembership}
          onClose={() => setSelectedMembership(null)}
          currentUserId={user?.id}
          canManage={canManageUsers()}
          onDownloadCertificate={
            selectedMembership.salon?.owner?.id
              ? () => handleDownloadCertificate(selectedMembership.salon.owner.id)
              : undefined
          }
          paymentStatus={
            selectedMembership.salon?.owner?.id
              ? paymentStatuses[selectedMembership.salon.owner.id]
              : undefined
          }
          onSendReminder={canManageUsers() ? () => sendReminderMutation.mutate(selectedMembership.id) : undefined}
        />
      )}
      
      <SelfServicePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        requiredAmount={paymentAmount}
        email={user?.email}
      />
    </div>
  );
}

function MembershipCard({
  membership,
  paymentStatus,
  onView,
  onActivate,
  onSuspend,
  onExpire,
  onRenew,
  onDownloadCertificate,
  onPayNew,
  canManage,
  isProcessing,
  showQuickActions,
  onToggleQuickActions,
  onError,
  currentUserId,
  onSendReminder,
}: {
  membership: Membership;
  paymentStatus?: PaymentStatus;
  onView: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onExpire: () => void;
  onRenew: () => void;
  onDownloadCertificate?: () => void;
  onPayNew?: () => void;
  canManage: boolean;
  isProcessing: boolean;
  showQuickActions: boolean;
  onToggleQuickActions: () => void;
  onError?: (message: string) => void;
  currentUserId?: string;
  onSendReminder?: () => void;
}) {
  const config = statusConfig[membership.status];
  const Icon = config.icon;

  const isPaid = paymentStatus?.isComplete;
  const paidAmount = paymentStatus?.totalPaid || 0;
  const totalAmount = paymentStatus?.totalRequired || 3000;
  const railClass =
    membership.status === 'active'
      ? 'bg-success'
      : membership.status === 'pending_renewal'
        ? 'bg-warning'
        : membership.status === 'expired'
          ? 'bg-error'
          : membership.status === 'new'
            ? 'bg-primary'
            : 'bg-text-light/30 dark:bg-text-dark/30';

  // Calculate days until expiry
  const daysUntilExpiry = membership.endDate
    ? Math.ceil(
        (new Date(membership.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!membership.startDate || !membership.endDate) return 0;
    const start = new Date(membership.startDate).getTime();
    const end = new Date(membership.endDate).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const progress = getProgressPercentage();

  // Condensed layout
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-surface-dark hover:shadow-md transition-all">
      <div className={`absolute inset-y-0 left-0 w-1 ${railClass}`} />

      <div className="relative p-3 flex flex-col gap-3">
        {/* Header Row: Icon + Name + Actions */}
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${config.bg} flex-shrink-0`}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-text-dark truncate">
                {membership.salon?.name || 'Unknown Salon'}
              </h3>
              <Badge
                 variant={
                    config.color === 'text-success'
                      ? 'success'
                      : config.color === 'text-warning'
                        ? 'warning'
                        : config.color === 'text-error'
                          ? 'danger'
                          : 'default'
                  } 
                  size="sm"
                  className="px-1.5 py-0 text-[10px] h-5"
                >
                {config.label}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-900/60 dark:text-text-dark/60 font-medium">
              #{membership.membershipNumber}
            </p>
          </div>

          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canManage &&
              membership.status === 'new' &&
              (isPaid || paidAmount >= 1500 ? (
                <Button onClick={onActivate} size="sm" disabled={isProcessing} className="h-7 px-2 text-xs gap-1.5">
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
                  className="h-7 px-2 text-xs gap-1.5 text-error border-1 border-error/50 hover:bg-error/10 hover:border-error"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Pay
                </Button>
              ))}

            {canManage ? (
              <div className="relative">
                <Button
                  onClick={onToggleQuickActions}
                  variant="secondary" 
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-background-light dark:hover:bg-background-dark border-none bg-transparent"
                  aria-label="Open actions"
                >
                  <MoreVertical className="w-4 h-4 text-gray-900/60 dark:text-text-dark/60" />
                </Button>

                {showQuickActions && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-lg shadow-xl z-20 py-1 animate-in fade-in slide-in-from-top-1">
                    {membership.status === 'active' && (
                      <>
                        <button
                          onClick={() => {
                            onSuspend();
                            onToggleQuickActions();
                          }}
                          disabled={isProcessing}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend
                        </button>
                        <button
                          onClick={() => {
                            onExpire();
                            onToggleQuickActions();
                          }}
                          disabled={isProcessing}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Expire
                        </button>
                        {onDownloadCertificate && (
                          <button
                            onClick={() => {
                              onDownloadCertificate();
                              onToggleQuickActions();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-success hover:bg-background-light dark:hover:bg-background-dark transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Certificate
                          </button>
                        )}
                        <div className="my-1 border-t border-gray-300 dark:border-border-dark" />
                      </>
                    )}
                    
                    {(membership.status === 'expired' || 
                      membership.status === 'pending_renewal' || 
                      membership.status === 'suspended') && (
                      <>
                         <button
                            onClick={() => {
                              onRenew();
                              onToggleQuickActions();
                            }}
                            disabled={isProcessing}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Renew Membership
                          </button>
                          {(membership.status === 'expired' || membership.status === 'suspended') && (
                             <button
                                onClick={() => {
                                  onActivate();
                                  onToggleQuickActions();
                                }}
                                disabled={isProcessing}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Re-Activate
                              </button>
                          )}
                          <div className="my-1 border-t border-gray-300 dark:border-border-dark" />
                      </>
                    )}

                    {canManage && onSendReminder && (
                      <button
                        onClick={() => {
                          onSendReminder();
                          onToggleQuickActions();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                      >
                         <Bell className="w-3.5 h-3.5" />
                         Send Reminder
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onView();
                        onToggleQuickActions();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900 dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {/* Pay button for new memberships owned by current user */}
                {membership.status === 'new' && currentUserId === membership.salon?.owner?.id && onPayNew && !isPaid && (
                  <Button onClick={onPayNew} variant="secondary" size="sm" className="h-7 px-2 text-xs gap-1.5 text-error border-1 border-error/50 hover:bg-error/10 hover:border-error">
                    <DollarSign className="w-3.5 h-3.5" />
                    Pay
                  </Button>
                )}
                {/* Renew button for expired or pending renewal */}
                {(membership.status === 'expired' || membership.status === 'pending_renewal') && (
                  <Button onClick={onRenew} variant="primary" size="sm" className="h-7 px-2 text-xs gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Renew
                  </Button>
                )}
                {/* Certificate download button for active memberships owned by current user */}
                {membership.status === 'active' && currentUserId === membership.salon?.owner?.id && onDownloadCertificate && (
                  <Button onClick={onDownloadCertificate} variant="secondary" size="sm" className="h-7 px-2 text-xs gap-1.5 text-success border-success/50 hover:bg-success/10 hover:border-success">
                    <Download className="w-3.5 h-3.5" />
                    Certificate
                  </Button>
                )}
                <Button onClick={onView} variant="secondary" size="sm" className="h-7 w-7 p-0">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-2 border-t border-gray-300/50 dark:border-border-dark/50">
           {/* Owner */}
           <div className="flex items-center gap-1.5 overflow-hidden">
              <Users className="w-3 h-3 text-gray-900/40 dark:text-text-dark/40 flex-shrink-0" />
              <span className="text-xs text-gray-900/80 dark:text-text-dark/80 truncate font-medium">
                {membership.salon?.owner?.fullName || 'N/A'}
              </span>
           </div>

           {/* Payment Status */}
           <div className="flex items-center gap-1.5 overflow-hidden justify-end">
              {paymentStatus ? (
                <>
                   {isPaid ? (
                      <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                   ) : (
                      <DollarSign className="w-3 h-3 text-error flex-shrink-0" />
                   )}
                   <span className={`text-xs font-medium truncate ${isPaid ? 'text-success' : 'text-error'}`}>
                     {paidAmount.toLocaleString()} RWF
                   </span>
                </>
              ) : (
                <span className="text-xs text-gray-900/40 dark:text-text-dark/40 italic">No payment info</span>
              )}
           </div>

           {/* Membership Status/Expiry */}
           <div className="col-span-2 flex items-center gap-1.5">
              <Clock className={`w-3 h-3 ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                  ? 'text-warning'
                  : daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? 'text-error'
                    : 'text-gray-900/40 dark:text-text-dark/40'
              } flex-shrink-0`} />
              
              <span className={`text-xs truncate ${
                 daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                  ? 'text-warning font-medium'
                  : daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? 'text-error font-medium'
                    : 'text-gray-900/70 dark:text-text-dark/70'
              }`}>
                {membership.status === 'new' 
                  ? 'Payment pending' 
                  : membership.endDate && daysUntilExpiry !== null
                    ? daysUntilExpiry > 0 
                      ? `Expires in ${daysUntilExpiry} days` 
                      : `Expired ${Math.abs(daysUntilExpiry!)} days ago`
                    : 'Not activated'}
              </span>
           </div>
        </div>

        {/* Compact Progress Bar */}
        {membership.status === 'active' && membership.startDate && membership.endDate && (
             <div className="mt-0.5">
                <div className="flex items-center justify-between text-[10px] text-gray-900/50 dark:text-text-dark/50 mb-1">
                   <span>{new Date(membership.startDate).toLocaleDateString()}</span>
                   <span>{new Date(membership.endDate).toLocaleDateString()}</span>
                </div>
                <div className="h-1 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progress >= 80 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
             </div>
        )}

        {/* Restore Meta Information (Phone, Reminder, Category) */}
        <div className="mt-1 pt-2 border-t border-gray-300/50 dark:border-border-dark/50 flex flex-wrap gap-x-3 gap-y-1">
             {membership.category && (
               <div className="inline-flex items-center gap-1 text-[10px] text-gray-900/60 dark:text-text-dark/60">
                 <Building2 className="w-2.5 h-2.5" />
                 <span className="capitalize">{membership.category}</span>
               </div>
             )}
             {membership.salon?.phone && (
              <div className="inline-flex items-center gap-1 text-[10px] text-gray-900/60 dark:text-text-dark/60">
                <Phone className="w-2.5 h-2.5" />
                <span>{membership.salon.phone}</span>
              </div>
            )}
            {membership.lastReminderSent && (
              <div className="inline-flex items-center gap-1 text-[10px] text-gray-900/60 dark:text-text-dark/60" title="Last Reminder Sent">
                <Mail className="w-2.5 h-2.5" />
                <span>{new Date(membership.lastReminderSent).toLocaleDateString()}</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// Compact version of meta info, removed for space saving unless critical
function MembershipCardMeta({
    membership
}: { membership: Membership }) {
  if (!membership.lastReminderSent && !membership.salon?.phone) return null;
   return (
       <div className="mt-2 pt-2 border-t border-gray-300 dark:border-border-dark flex flex-wrap gap-2">
            {membership.lastReminderSent && (
              <div className="inline-flex items-center gap-1 text-[10px] text-gray-900/60 dark:text-text-dark/60">
                <Mail className="w-2.5 h-2.5" />
                <span>{new Date(membership.lastReminderSent).toLocaleDateString()}</span>
              </div>
            )}
            {membership.salon?.phone && (
              <div className="inline-flex items-center gap-1 text-[10px] text-gray-900/60 dark:text-text-dark/60">
                <Phone className="w-2.5 h-2.5" />
                <span>{membership.salon.phone}</span>
              </div>
            )}
       </div>
   )

}

function MembershipDetailModal({
  membership,
  onClose,
  onDownloadCertificate,
  canManage,
  currentUserId,
  paymentStatus,
  onSendReminder,
}: {
  membership: Membership;
  onClose: () => void;
  onDownloadCertificate?: () => void;
  canManage: boolean;
  currentUserId?: string;
  paymentStatus?: PaymentStatus;
  onSendReminder?: () => void;
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
          className="bg-white dark:bg-surface-dark border border-gray-300 dark:border-border-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 flex flex-col"
          role="presentation"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-300 dark:border-border-dark">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark">
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
                    : 'text-gray-900/60 dark:text-text-dark/60 hover:text-gray-900 dark:hover:text-text-dark'
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
                    : 'text-gray-900/60 dark:text-text-dark/60 hover:text-gray-900 dark:hover:text-text-dark'
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
                    : 'text-gray-900/60 dark:text-text-dark/60 hover:text-gray-900 dark:hover:text-text-dark'
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
                  <h3 className="text-xs font-bold text-gray-900 dark:text-text-dark mb-2 uppercase tracking-wide">
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
                      <p className="text-xs text-gray-900/60 dark:text-text-dark/60 mt-0.5">
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
                  <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1.5">
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
                          <span className="text-[10px] font-medium text-gray-900/60 dark:text-text-dark/60 mt-0.5">
                            RWF {paymentStatus.totalPaid.toLocaleString()} paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Remaining Card */}
                  <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1.5">
                      Time Remaining
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-900/40 dark:text-text-dark/40" />
                      <span
                        className={`text-sm font-bold ${
                          daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                            ? 'text-warning'
                            : daysUntilExpiry !== null && daysUntilExpiry <= 0
                              ? 'text-error'
                              : 'text-gray-900 dark:text-text-dark'
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
                  <h3 className="text-xs font-bold text-gray-900 dark:text-text-dark mb-2 uppercase tracking-wide">
                    Salon Information
                  </h3>
                  <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-900/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-900/60 dark:text-text-dark/60">
                          Salon Name
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-text-dark truncate">
                          {membership.salon?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {membership.salon?.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-900/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-900/60 dark:text-text-dark/60">
                            Address
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-text-dark truncate">
                            {membership.salon.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {membership.salon?.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-900/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-900/60 dark:text-text-dark/60">
                            Phone
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-text-dark truncate">
                            {membership.salon.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-gray-900/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-900/60 dark:text-text-dark/60">
                          Owner
                        </p>
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-gray-900 dark:text-text-dark truncate">
                            {membership.salon?.owner?.fullName || 'N/A'}
                          </p>
                          {membership.salon?.owner?.email && (
                            <p className="text-xs text-gray-900/60 dark:text-text-dark/60 truncate">
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
                  <h3 className="text-xs font-bold text-gray-900 dark:text-text-dark mb-2 uppercase tracking-wide">
                    Membership Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Membership Number
                      </p>
                      <p className="text-gray-900 dark:text-text-dark font-mono text-sm">
                        {membership.membershipNumber}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Category
                      </p>
                      <p className="text-gray-900 dark:text-text-dark text-sm font-medium">
                        {membership.category || 'N/A'}
                      </p>
                    </div>
                    {membership.startDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                        <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                          Start Date
                        </p>
                        <p className="text-gray-900 dark:text-text-dark text-sm font-medium">
                          {new Date(membership.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {membership.endDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                        <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                          End Date
                        </p>
                        <p className="text-gray-900 dark:text-text-dark text-sm font-medium">
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
                  <h3 className="text-xs font-bold text-gray-900 dark:text-text-dark mb-2 uppercase tracking-wide">
                    Timestamps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Created
                      </p>
                      <p className="text-gray-900 dark:text-text-dark text-sm font-medium">
                        {new Date(membership.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg p-3">
                      <p className="text-[10px] font-bold text-gray-900/60 dark:text-text-dark/60 uppercase tracking-wide mb-1">
                        Last Updated
                      </p>
                      <p className="text-gray-900 dark:text-text-dark text-sm font-medium">
                        {new Date(membership.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-text-dark mb-2 uppercase tracking-wide">
                  Recent Activity
                </h3>
                <div className="flex flex-col items-center justify-center py-8 text-center bg-background-light dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg border-dashed">
                  <div className="w-8 h-8 mb-2 text-gray-900/30 dark:text-text-dark/30">
                    <Clock className="w-full h-full" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-text-dark mb-1">
                    No activity recorded
                  </p>
                  <p className="text-[10px] text-gray-900/60 dark:text-text-dark/60 max-w-[200px]">
                    Activity logs will appear here once actions are performed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-gray-300 dark:border-border-dark flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary" size="sm">
              Close
            </Button>
            {membership.status === 'active' && currentUserId === membership.salon?.owner?.id && onDownloadCertificate && (
              <Button onClick={onDownloadCertificate} variant="secondary" size="sm" className="flex items-center gap-1.5 text-success border-success/50 hover:bg-success/10 hover:border-success">
                <Download className="w-3.5 h-3.5" />
                Download Certificate
              </Button>
            )}
            {canManage && (
              <>
                {onSendReminder && (
                  <Button onClick={onSendReminder} variant="secondary" size="sm" className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" />
                    Send Reminder
                  </Button>
                )}
                <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  Edit Membership
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
