'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Edit,
  X,
  Plus,
  Clock,
  MessageSquare,
  TrendingUp,
  Star,
  Gift,
  Bell,
  ArrowLeft,
  Coins,
} from 'lucide-react';
import PointsAdjustmentModal from '@/components/customers/PointsAdjustmentModal';
import PointsHistoryTable from '@/components/customers/PointsHistoryTable';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import { format, parseISO } from 'date-fns';

interface SalonCustomer {
  id: string;
  salonId: string;
  customerId: string;
  visitCount: number;
  lastVisitDate: string | null;
  firstVisitDate: string | null;
  totalSpent: number;
  tags: string[];
  notes: string | null;
  preferences: Record<string, unknown>;
  birthday: string | null;
  anniversaryDate: string | null;
  followUpDate: string | null;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    loyaltyPoints: number;
  };
}

interface TimelineItem {
  type: 'sale' | 'appointment';
  id: string;
  date: string;
  title: string;
  description: string;
  data: unknown;
}

export default function SalonCustomerDetailPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <SalonCustomerDetailContent />
    </ProtectedRoute>
  );
}

function SalonCustomerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const customerId = params.customerId as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'communications' | 'points'>(
    'overview'
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const queryClient = useQueryClient();

  // Validate customerId is a UUID (not a reserved word like "analytics")
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    customerId
  );
  const reservedWords = ['analytics', 'export', 'sync', 'recalculate'];
  const isReservedWord = reservedWords.includes(customerId?.toLowerCase() || '');

  // Fetch salon customer data - use direct endpoint
  const { data: salonCustomer, isLoading: isLoadingCustomer } = useQuery<SalonCustomer>({
    queryKey: ['salon-customer', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}`);
      return response.data;
    },
    enabled: !!salonId && !!customerId && isValidUUID && !isReservedWord,
    retry: 2,
  });

  // Fetch timeline
  const { data: timeline } = useQuery<TimelineItem[]>({
    queryKey: ['customer-timeline', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}/timeline`);
      return response.data || [];
    },
    enabled: !!salonId && !!customerId && isValidUUID && !isReservedWord,
  });

  // Fetch communications
  const { data: communications } = useQuery({
    queryKey: ['customer-communications', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}/communications`);
      return response.data || [];
    },
    enabled: !!salonId && !!customerId && isValidUUID && !isReservedWord,
  });

  // Update salon customer
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SalonCustomer>) => {
      return api.patch(`/salons/${salonId}/customers/${customerId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['salon-customers', salonId] });
      setShowEditModal(false);
    },
  });

  // Add tag
  const addTagMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      return api.post(`/salons/${salonId}/customers/${customerId}/tags`, { tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['salon-customers', salonId] });
    },
  });

  // Remove tag
  const removeTagMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      return api.delete(`/salons/${salonId}/customers/${customerId}/tags`, { data: { tags } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['salon-customers', salonId] });
    },
  });

  // Fetch points history
  const { data: pointsHistory, isLoading: isLoadingPointsHistory } = useQuery<{
    data: Array<{
      id: string;
      points: number;
      balanceAfter: number;
      sourceType: 'sale' | 'appointment' | 'redemption' | 'manual' | 'bonus' | 'correction';
      sourceId: string | null;
      description: string | null;
      createdBy: {
        id: string;
        fullName: string;
      } | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['points-history', salonCustomer?.customer?.id],
    queryFn: async () => {
      if (!salonCustomer?.customer?.id) {
        throw new Error('Customer ID not available');
      }
      const response = await api.get(
        `/customers/${salonCustomer.customer.id}/loyalty-points/transactions`
      );
      return response.data;
    },
    enabled: !!salonCustomer?.customer?.id && activeTab === 'points',
  });

  // Points adjustment mutations
  const addPointsMutation = useMutation({
    mutationFn: async (data: { points: number; reason: string }) => {
      if (!salonCustomer?.customer?.id) {
        throw new Error('Customer ID not available');
      }
      const response = await api.post(
        `/customers/${salonCustomer.customer.id}/loyalty-points/add`,
        data
      );
      // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['points-history', salonCustomer?.customer?.id] });
      queryClient.invalidateQueries({ queryKey: ['points-balance', salonCustomer?.customer?.id] });
    },
    onError: (error: Error) => {
      console.error('Failed to add points:', error);
      // Error will be handled by the modal's try-catch
      throw error; // Re-throw to let modal handle it
    },
  });

  const deductPointsMutation = useMutation({
    mutationFn: async (data: { points: number; reason: string }) => {
      if (!salonCustomer?.customer?.id) {
        throw new Error('Customer ID not available');
      }
      const response = await api.post(
        `/customers/${salonCustomer.customer.id}/loyalty-points/deduct`,
        data
      );
      // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['points-history', salonCustomer?.customer?.id] });
      queryClient.invalidateQueries({ queryKey: ['points-balance', salonCustomer?.customer?.id] });
    },
    onError: (error: Error) => {
      console.error('Failed to deduct points:', error);
      // Error will be handled by the modal's try-catch
      throw error; // Re-throw to let modal handle it
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: async (data: { balance: number; reason: string }) => {
      if (!salonCustomer?.customer?.id) {
        throw new Error('Customer ID not available');
      }
      const response = await api.patch(
        `/customers/${salonCustomer.customer.id}/loyalty-points/adjust`,
        data
      );
      // Handle response wrapped by TransformInterceptor: { data: {...}, statusCode: 200, timestamp: "..." }
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon-customer', salonId, customerId] });
      queryClient.invalidateQueries({ queryKey: ['points-history', salonCustomer?.customer?.id] });
      queryClient.invalidateQueries({ queryKey: ['points-balance', salonCustomer?.customer?.id] });
    },
    onError: (error: Error) => {
      console.error('Failed to adjust points:', error);
      // Error will be handled by the modal's try-catch
      throw error; // Re-throw to let modal handle it
    },
  });

  if (!isValidUUID || isReservedWord) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <p className="text-text-light/60 dark:text-text-dark/60 mb-4">Invalid customer ID</p>
          <Button onClick={() => router.push(`/salons/${salonId}/customers`)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingCustomer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!salonCustomer || !salonCustomer.customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto mb-4 text-text-light/40 dark:text-text-dark/40" />
          <p className="text-text-light/60 dark:text-text-dark/60">
            Customer not found or data incomplete
          </p>
          <Button
            onClick={() => router.push(`/salons/${salonId}/customers`)}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={() => router.push(`/salons/${salonId}/customers`)}
          variant="secondary"
          size="sm"
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPointsModal(true)}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Coins className="w-4 h-4" />
            Points
          </Button>
          <Button
            onClick={() => setShowEditModal(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-xl shadow-sm">
              {salonCustomer.customer?.fullName
                ? salonCustomer.customer.fullName.charAt(0).toUpperCase()
                : '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-text-light dark:text-text-dark truncate">
                {salonCustomer.customer?.fullName || 'Unknown Customer'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {salonCustomer.customer?.phone && (
                  <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                    <div className="p-1 rounded bg-background-secondary dark:bg-background-dark text-text-light/40 border border-border-light/50">
                      <Phone className="w-3 h-3" />
                    </div>
                    <span className="font-semibold">{salonCustomer.customer.phone}</span>
                  </div>
                )}
                {salonCustomer.customer?.email && (
                  <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60 min-w-0">
                    <div className="p-1 rounded bg-background-secondary dark:bg-background-dark text-text-light/40 border border-border-light/50">
                      <Mail className="w-3 h-3" />
                    </div>
                    <span className="font-semibold truncate">{salonCustomer.customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold uppercase tracking-wide">
              Visits: {salonCustomer.visitCount || 0}
            </div>
            <div className="px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-semibold uppercase tracking-wide">
              RWF {Number(salonCustomer.totalSpent || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {(salonCustomer.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
            >
              {tag}
              <button
                onClick={() => removeTagMutation.mutate([tag])}
                className="ml-2 hover:text-danger transition"
                type="button"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <Button
            onClick={() => setShowTagModal(true)}
            variant="secondary"
            size="sm"
            className="rounded-full"
          >
            <Plus className="w-3 h-3" />
            Add Tag
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Total Visits
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {salonCustomer.visitCount || 0}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Total Spent
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                RWF {Number(salonCustomer.totalSpent || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Last Visit
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {salonCustomer.lastVisitDate
                  ? format(parseISO(salonCustomer.lastVisitDate), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-xl p-4 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 font-semibold uppercase tracking-wide">
                Loyalty Points
              </p>
              <p className="text-xl font-bold text-text-light dark:text-text-dark mt-1">
                {salonCustomer.customer?.loyaltyPoints || 0}
              </p>
            </div>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <Star className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl">
        <div className="border-b border-border-light dark:border-border-dark">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'timeline', label: 'Activity Timeline', icon: Clock },
              { id: 'communications', label: 'Communications', icon: MessageSquare },
              { id: 'points', label: 'Points History', icon: Star },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'timeline' | 'communications' | 'points')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:border-border-light dark:hover:border-border-dark'
                }`}
                type="button"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {salonCustomer.notes && (
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-text-light/80 dark:text-text-dark/80 whitespace-pre-wrap">
                    {salonCustomer.notes}
                  </p>
                </div>
              )}

              {salonCustomer.birthday && (
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Birthday
                  </h3>
                  <p className="text-sm text-text-light/80 dark:text-text-dark/80">
                    {format(parseISO(salonCustomer.birthday), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {salonCustomer.followUpDate && (
                <div>
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Follow-up Date
                  </h3>
                  <p className="text-sm text-text-light/80 dark:text-text-dark/80">
                    {format(parseISO(salonCustomer.followUpDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {timeline && timeline.length > 0 ? (
                timeline.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-4 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light/30 dark:bg-background-dark/30"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === 'sale' ? 'bg-success/10' : 'bg-primary/10'
                      }`}
                    >
                      {item.type === 'sale' ? (
                        <DollarSign className="w-5 h-5 text-success" />
                      ) : (
                        <Calendar className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-text-light dark:text-text-dark">
                          {item.title}
                        </h4>
                        <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {format(parseISO(item.date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-light/60 dark:text-text-dark/60 text-center py-8">
                  No activity recorded yet
                </p>
              )}
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-4">
              {communications && (communications as { id: string; subject: string; createdAt: string; type: string; purpose: string; status: string; message?: string }[]).length > 0 ? (
                (communications as { id: string; subject: string; createdAt: string; type: string; purpose: string; status: string; message?: string }[]).map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-start gap-4 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light/30 dark:bg-background-dark/30"
                  >
                    <MessageSquare className="w-5 h-5 text-text-light/40 dark:text-text-dark/40 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-text-light dark:text-text-dark">
                          {comm.subject}
                        </h4>
                        <span className="text-sm text-text-light/60 dark:text-text-dark/60">
                          {format(parseISO(comm.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                        Type: {comm.type} | Purpose: {comm.purpose} | Status: {comm.status}
                      </p>
                      {comm.message && (
                        <p className="text-sm text-text-light/80 dark:text-text-dark/80 mt-2">
                          {comm.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-light/60 dark:text-text-dark/60 text-center py-8">
                  No communications recorded yet
                </p>
              )}
            </div>
          )}

          {activeTab === 'points' && (
            <div className="space-y-4">
              <PointsHistoryTable
                transactions={pointsHistory?.data || []}
                isLoading={isLoadingPointsHistory}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          salonCustomer={salonCustomer}
          onClose={() => setShowEditModal(false)}
          onSave={(data) => updateMutation.mutate(data)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Add Tag Modal */}
      {showTagModal && (
        <AddTagModal
          onClose={() => setShowTagModal(false)}
          onAdd={(tag) => {
            addTagMutation.mutate([tag]);
          }}
          isLoading={addTagMutation.isPending}
        />
      )}

      {/* Points Adjustment Modal */}
      {showPointsModal && salonCustomer?.customer && (
        <PointsAdjustmentModal
          customerId={salonCustomer.customer.id}
          currentBalance={salonCustomer.customer.loyaltyPoints || 0}
          onClose={() => setShowPointsModal(false)}
          onAdd={async (points, reason) => {
            await addPointsMutation.mutateAsync({ points, reason });
          }}
          onDeduct={async (points, reason) => {
            await deductPointsMutation.mutateAsync({ points, reason });
          }}
          onAdjust={async (newBalance, reason) => {
            await adjustPointsMutation.mutateAsync({ balance: newBalance, reason });
          }}
          isLoading={
            addPointsMutation.isPending ||
            deductPointsMutation.isPending ||
            adjustPointsMutation.isPending
          }
        />
      )}
    </div>
  );
}

function EditModal({
  salonCustomer,
  onClose,
  onSave,
  isLoading,
}: {
  salonCustomer: SalonCustomer;
  onClose: () => void;
  onSave: (data: Partial<SalonCustomer>) => void;
  isLoading: boolean;
}) {
  const [notes, setNotes] = useState(salonCustomer.notes || '');
  const [birthday, setBirthday] = useState(
    salonCustomer.birthday ? format(parseISO(salonCustomer.birthday), 'yyyy-MM-dd') : ''
  );
  const [followUpDate, setFollowUpDate] = useState(
    salonCustomer.followUpDate ? format(parseISO(salonCustomer.followUpDate), 'yyyy-MM-dd') : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      notes,
      birthday: birthday || undefined,
      followUpDate: followUpDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Edit Customer</h2>
          <Button onClick={onClose} variant="secondary" size="sm" className="h-8 w-8 p-0" type="button" aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="notes-textarea" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Notes
            </label>
            <textarea
              id="notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div>
            <label htmlFor="birthday-input" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Birthday
            </label>
            <input
              id="birthday-input"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div>
            <label htmlFor="followup-input" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Follow-up Date
            </label>
            <input
              id="followup-input"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} loading={isLoading} loadingText="Saving..." variant="primary" className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTagModal({
  onClose,
  onAdd,
  isLoading,
}: {
  onClose: () => void;
  onAdd: (tag: string) => void;
  isLoading: boolean;
}) {
  const [tag, setTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tag.trim()) {
      onAdd(tag.trim());
      setTag('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Add Tag</h2>
          <Button onClick={onClose} variant="secondary" size="sm" className="h-8 w-8 p-0" type="button" aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tag-input" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Tag Name
            </label>
            <input
              id="tag-input"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., VIP, Regular, New"
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-text-light/40 dark:placeholder:text-text-dark/40"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} loading={isLoading} loadingText="Adding..." variant="primary" className="flex-1">
              Add Tag
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
