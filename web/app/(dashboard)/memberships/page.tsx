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
  Eye,
  Edit,
  Users,
  Ban,
  X,
  Download,
  Mail,
  Phone,
  MapPin,
  UserPlus,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

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
  const queryClient = useQueryClient();
  const { canManageUsers } = usePermissions();

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

  const needsAttentionMemberships = filteredMemberships.filter(
    (m) => m.status === 'pending_renewal' || m.status === 'expired' || m.status === 'new'
  );
  const otherMemberships = filteredMemberships.filter(
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-4"
            >
              <Skeleton variant="text" width={80} height={16} className="mb-2" />
              <Skeleton variant="text" width={60} height={32} />
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
      {/* Hero */}
      <div className="border-b border-border-light dark:border-border-dark pb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
                  Memberships
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark">
                  {filteredMemberships.length} total
                </span>
              </div>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1.5">
                Manage salon memberships, monitor status, and track renewal schedules
              </p>
            </div>
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
                  /* Export functionality */
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

      {/* Search + Status Pills */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
            <input
              type="text"
              placeholder="Search by salon, owner, or membership #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
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
                className="w-full px-3.5 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none cursor-pointer"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Total
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {stats?.total || 0}
              </p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                {stats?.activePercentage || 0}% active
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
              <p className="text-2xl font-bold text-success mt-2">{stats?.active || 0}</p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">In good standing</p>
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
                New
              </p>
              <p className="text-2xl font-bold text-primary mt-2">{stats?.new || 0}</p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">Pending</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Renewal
              </p>
              <p className="text-2xl font-bold text-warning mt-2">{stats?.pendingRenewal || 0}</p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">Follow-up</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Expired
              </p>
              <p className="text-2xl font-bold text-error mt-2">{stats?.expired || 0}</p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">Needs action</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-error/10 text-error flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-light/60 dark:text-text-dark/60">
                Suspended
              </p>
              <p className="text-2xl font-bold text-text-light/60 dark:text-text-dark/60 mt-2">{stats?.suspended || 0}</p>
              <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">On hold</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert for expiring memberships */}
      {(stats?.expiringSoon || 0) > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-warning/20 rounded-xl flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-text-light dark:text-text-dark mb-1">
                {stats?.expiringSoon} Membership{(stats?.expiringSoon || 0) !== 1 ? 's' : ''}{' '}
                Expiring Soon
              </h3>
              <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-3">
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
          icon={<Building2 className="w-full h-full text-text-light/20 dark:text-text-dark/20" />}
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
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-text-light dark:text-text-dark">
                  Needs attention
                </p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Prioritize renewals, expiries, and new memberships.
                </p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                {needsAttentionMemberships.length} items
              </span>
            </div>

            {needsAttentionMemberships.length === 0 ? (
              <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-8 text-center">
                <div className="h-10 w-10 rounded-2xl bg-success/10 text-success flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                  Nothing needs attention right now
                </p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Great — renewals and expiries are under control.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {needsAttentionMemberships.map((membership) => (
                  <MembershipCard
                    key={membership.id}
                    membership={membership}
                    onView={() => setSelectedMembership(membership)}
                    onActivate={() => activateMutation.mutate(membership.id)}
                    onSuspend={() => suspendMutation.mutate(membership.id)}
                    onExpire={() => expireMutation.mutate(membership.id)}
                    canManage={canManageUsers()}
                    isProcessing={
                      activateMutation.isPending ||
                      suspendMutation.isPending ||
                      expireMutation.isPending
                    }
                    showQuickActions={showQuickActions === membership.id}
                    onToggleQuickActions={() =>
                      setShowQuickActions(showQuickActions === membership.id ? null : membership.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Archive */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-text-light dark:text-text-dark">All others</p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Active and suspended memberships.
                </p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {otherMemberships.length} items
              </span>
            </div>

            {otherMemberships.length === 0 ? (
              <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-8 text-center">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                  No memberships in this section
                </p>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">
                  Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {otherMemberships.map((membership) => (
                  <MembershipCard
                    key={membership.id}
                    membership={membership}
                    onView={() => setSelectedMembership(membership)}
                    onActivate={() => activateMutation.mutate(membership.id)}
                    onSuspend={() => suspendMutation.mutate(membership.id)}
                    onExpire={() => expireMutation.mutate(membership.id)}
                    canManage={canManageUsers()}
                    isProcessing={
                      activateMutation.isPending ||
                      suspendMutation.isPending ||
                      expireMutation.isPending
                    }
                    showQuickActions={showQuickActions === membership.id}
                    onToggleQuickActions={() =>
                      setShowQuickActions(showQuickActions === membership.id ? null : membership.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Membership Detail Modal */}
      {selectedMembership && (
        <MembershipDetailModal
          membership={selectedMembership}
          onClose={() => setSelectedMembership(null)}
        />
      )}
    </div>
  );
}

function MembershipCard({
  membership,
  onView,
  onActivate,
  onSuspend,
  onExpire,
  canManage,
  isProcessing,
  showQuickActions,
  onToggleQuickActions,
}: {
  membership: Membership;
  onView: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onExpire: () => void;
  canManage: boolean;
  isProcessing: boolean;
  showQuickActions: boolean;
  onToggleQuickActions: () => void;
}) {
  const config = statusConfig[membership.status];
  const Icon = config.icon;
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

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:shadow-md transition-all">
      <div className={`absolute inset-y-0 left-0 w-1 ${railClass}`} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center ${config.bg} flex-shrink-0`}
            >
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-base font-semibold text-text-light dark:text-text-dark truncate">
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
                >
                  {config.label}
                </Badge>
              </div>

              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                #{membership.membershipNumber}
              </p>
              
              <div className="flex items-center gap-2 mt-2">
                {membership.paymentStatus === 'paid' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                    <CheckCircle className="w-3 h-3" />
                    Paid
                  </span>
                )}
                {membership.paymentStatus === 'overdue' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-error/10 text-error">
                    <XCircle className="w-3 h-3" />
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && membership.status === 'new' && (
              <Button onClick={onActivate} size="sm" disabled={isProcessing} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Activate
              </Button>
            )}

            {canManage ? (
              <div className="relative">
                <Button
                  onClick={onToggleQuickActions}
                  variant="secondary"
                  size="sm"
                  className="h-9 w-9 p-0"
                  aria-label="Open actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showQuickActions && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl z-10 py-2 animate-in fade-in slide-in-from-top-2">
                    {membership.status === 'active' && (
                      <>
                        <button
                          onClick={() => {
                            onSuspend();
                            onToggleQuickActions();
                          }}
                          disabled={isProcessing}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                        >
                          <Ban className="w-4 h-4" />
                          Suspend
                        </button>
                        <button
                          onClick={() => {
                            onExpire();
                            onToggleQuickActions();
                          }}
                          disabled={isProcessing}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Expire
                        </button>
                        <div className="my-1 border-t border-border-light dark:border-border-dark" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        onView();
                        onToggleQuickActions();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={onToggleQuickActions}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={onToggleQuickActions}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition"
                    >
                      <Mail className="w-4 h-4" />
                      Send Reminder
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={onView} variant="secondary" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                View
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-text-light/50 dark:text-text-dark/50">
              Owner
            </p>
            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
              {membership.salon?.owner?.fullName || 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-text-light/50 dark:text-text-dark/50">
              Category
            </p>
            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
              {membership.category || 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-text-light/50 dark:text-text-dark/50">
              {daysUntilExpiry !== null && daysUntilExpiry > 0 ? 'Expires in' : 'Expired'}
            </p>
            <p
              className={`text-sm font-medium truncate ${
                daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                  ? 'text-warning'
                  : daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? 'text-error'
                    : 'text-text-light dark:text-text-dark'
              }`}
            >
              {membership.endDate
                ? daysUntilExpiry !== null && daysUntilExpiry > 0
                  ? `${daysUntilExpiry} days`
                  : daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? `${Math.abs(daysUntilExpiry)} days ago`
                    : new Date(membership.endDate).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {membership.status === 'active' && membership.startDate && membership.endDate && (
          <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between text-xs text-text-light/60 dark:text-text-dark/60 mb-2">
              <span>Term progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progress >= 80 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta chips */}
        {(membership.lastReminderSent || membership.salon?.phone) && (
          <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark flex flex-wrap gap-2">
            {membership.lastReminderSent && (
              <div className="inline-flex items-center gap-1.5 text-xs text-text-light/60 dark:text-text-dark/60">
                <Mail className="w-3 h-3" />
                <span>
                  {new Date(membership.lastReminderSent).toLocaleDateString()}
                </span>
              </div>
            )}
            {membership.salon?.phone && (
              <div className="inline-flex items-center gap-1.5 text-xs text-text-light/60 dark:text-text-dark/60">
                <Phone className="w-3 h-3" />
                <span>{membership.salon.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MembershipDetailModal({
  membership,
  onClose,
}: {
  membership: Membership;
  onClose: () => void;
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
          <div className="p-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">
                Membership Details
              </h2>
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                size="sm"
                className="h-9 w-9 p-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border-light dark:border-border-dark">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium text-sm transition-colors relative ${
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
                className={`px-4 py-2 font-medium text-sm transition-colors relative ${
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
                className={`px-4 py-2 font-medium text-sm transition-colors relative ${
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
              <div className="space-y-6">
                {/* Status with Alert */}
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                    Status
                  </h3>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${config.bg} ${config.border}`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div className="flex-1">
                      <span className={`font-semibold ${config.color}`}>{config.label}</span>
                      {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                        <p className="text-sm text-warning mt-1">
                          ⚠️ Expires in {daysUntilExpiry} days
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                      Payment Status
                    </p>
                    <div className="flex items-center gap-2">
                      {membership.paymentStatus === 'paid' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="font-semibold text-success">Paid</span>
                        </>
                      ) : membership.paymentStatus === 'overdue' ? (
                        <>
                          <XCircle className="w-4 h-4 text-danger" />
                          <span className="font-semibold text-danger">Overdue</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="font-semibold text-warning">Pending</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                      Time Remaining
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
                      <span
                        className={`font-semibold ${
                          daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                            ? 'text-warning'
                            : daysUntilExpiry !== null && daysUntilExpiry <= 0
                              ? 'text-danger'
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
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                    Salon Information
                  </h3>
                  <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                          Salon Name
                        </p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {membership.salon?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {membership.salon?.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                            Address
                          </p>
                          <p className="text-text-light dark:text-text-dark font-medium">
                            {membership.salon.address}
                          </p>
                        </div>
                      </div>
                    )}
                    {membership.salon?.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Phone</p>
                          <p className="text-text-light dark:text-text-dark font-medium">
                            {membership.salon.phone}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60">Owner</p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {membership.salon?.owner?.fullName || 'N/A'}
                        </p>
                        {membership.salon?.owner?.email && (
                          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-0.5">
                            {membership.salon.owner.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                    Membership Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                        Membership Number
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium font-mono">
                        {membership.membershipNumber}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                        Category
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {membership.category || 'N/A'}
                      </p>
                    </div>
                    {membership.startDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                          Start Date
                        </p>
                        <p className="text-text-light dark:text-text-dark font-medium">
                          {new Date(membership.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                    {membership.endDate && (
                      <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                        <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                          End Date
                        </p>
                        <p className="text-text-light dark:text-text-dark font-medium">
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
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                    Timestamps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                        Created
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {new Date(membership.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4">
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-1">
                        Last Updated
                      </p>
                      <p className="text-text-light dark:text-text-dark font-medium">
                        {new Date(membership.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-3">
                  Recent Activity
                </h3>
                <EmptyState
                  icon={<Clock className="w-full h-full" />}
                  title="No activity recorded"
                  description="Activity logs will appear here once actions are performed on this membership."
                  className="py-8"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border-light dark:border-border-dark flex gap-3 justify-end">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
            <Button variant="primary" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Membership
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
