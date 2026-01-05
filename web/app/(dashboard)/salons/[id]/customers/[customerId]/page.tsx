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
  preferences: Record<string, any>;
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
  data: any;
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

  if (!isValidUUID || isReservedWord) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
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

  // Fetch salon customer data - use direct endpoint
  const { data: salonCustomer, isLoading: isLoadingCustomer } = useQuery<SalonCustomer>({
    queryKey: ['salon-customer', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}`);
      return response.data;
    },
    enabled: !!salonId && !!customerId && isValidUUID,
    retry: 2,
  });

  // Fetch timeline
  const { data: timeline } = useQuery<TimelineItem[]>({
    queryKey: ['customer-timeline', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}/timeline`);
      return response.data || [];
    },
    enabled: !!salonId && !!customerId && isValidUUID,
  });

  // Fetch communications
  const { data: communications } = useQuery({
    queryKey: ['customer-communications', salonId, customerId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/customers/${customerId}/communications`);
      return response.data || [];
    },
    enabled: !!salonId && !!customerId && isValidUUID,
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      console.error('Failed to adjust points:', error);
      // Error will be handled by the modal's try-catch
      throw error; // Re-throw to let modal handle it
    },
  });

  if (isLoadingCustomer) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!salonCustomer || !salonCustomer.customer) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back Button */}
      <Button
        onClick={() => router.push(`/salons/${salonId}/customers`)}
        variant="outline"
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Button>

      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold text-2xl">
              {salonCustomer.customer?.fullName
                ? salonCustomer.customer.fullName.charAt(0).toUpperCase()
                : '?'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
                {salonCustomer.customer?.fullName || 'Unknown Customer'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {salonCustomer.customer?.phone && (
                  <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                    <Phone className="w-4 h-4" />
                    {salonCustomer.customer.phone}
                  </div>
                )}
                {salonCustomer.customer?.email && (
                  <div className="flex items-center gap-2 text-text-light/60 dark:text-text-dark/60">
                    <Mail className="w-4 h-4" />
                    {salonCustomer.customer.email}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowPointsModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              Adjust Points
            </Button>
            <Button onClick={() => setShowEditModal(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {(salonCustomer.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {tag}
              <button
                onClick={() => removeTagMutation.mutate([tag])}
                className="ml-2 hover:text-danger transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setShowTagModal(true)}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:bg-primary/10 text-primary transition"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Tag
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
                Total Visits
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {salonCustomer.visitCount || 0}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
                Total Spent
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                RWF {Number(salonCustomer.totalSpent || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
                Last Visit
              </p>
              <p className="text-lg font-bold text-text-light dark:text-text-dark mt-2">
                {salonCustomer.lastVisitDate
                  ? format(parseISO(salonCustomer.lastVisitDate), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60">
                Loyalty Points
              </p>
              <p className="text-2xl font-bold text-text-light dark:text-text-dark mt-2">
                {salonCustomer.customer?.loyaltyPoints || 0}
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <Star className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl mb-6">
        <div className="border-b border-border-light dark:border-border-dark">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'timeline', label: 'Activity Timeline', icon: Clock },
              { id: 'communications', label: 'Communications', icon: MessageSquare },
              { id: 'points', label: 'Points History', icon: Star },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark hover:border-border-light dark:hover:border-border-dark'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {salonCustomer.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    Notes
                  </h3>
                  <p className="text-text-light/80 dark:text-text-dark/80 whitespace-pre-wrap">
                    {salonCustomer.notes}
                  </p>
                </div>
              )}

              {salonCustomer.birthday && (
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Birthday
                  </h3>
                  <p className="text-text-light/80 dark:text-text-dark/80">
                    {format(parseISO(salonCustomer.birthday), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {salonCustomer.followUpDate && (
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Follow-up Date
                  </h3>
                  <p className="text-text-light/80 dark:text-text-dark/80">
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
                    className="flex items-start gap-4 p-4 border border-border-light dark:border-border-dark rounded-xl"
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
              {communications && communications.length > 0 ? (
                communications.map((comm: any) => (
                  <div
                    key={comm.id}
                    className="flex items-start gap-4 p-4 border border-border-light dark:border-border-dark rounded-xl"
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
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Edit Customer</h2>
          <button
            onClick={onClose}
            className="text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Birthday
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Follow-up Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition text-text-light dark:text-text-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
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
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Add Tag</h2>
          <button
            onClick={onClose}
            className="text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Tag Name
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., VIP, Regular, New"
              className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary transition placeholder:text-text-light/40 dark:placeholder:text-text-dark/40"
              required
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition text-text-light dark:text-text-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
