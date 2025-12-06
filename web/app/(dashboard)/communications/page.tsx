'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  MessageSquare,
  Phone,
  Mail,
  User,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Filter,
  TrendingUp,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Communication {
  id: string;
  type: string;
  direction: string;
  status: string;
  subject: string;
  content?: string;
  durationMinutes?: number;
  scheduledFor?: string;
  completedAt?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpCompleted: boolean;
  sentiment?: string;
  outcome?: string;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
  };
  user?: {
    id: string;
    fullName: string;
  };
  appointment?: {
    id: string;
    scheduledStart: string;
  };
  sale?: {
    id: string;
    totalAmount: number;
  };
}

export default function CommunicationsPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <CommunicationsContent />
    </ProtectedRoute>
  );
}

function CommunicationsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('');

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data?.data || response.data || [];
    },
  });

  // Fetch communications
  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ['communications', filterCustomer],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCustomer) {
        params.append('customerId', filterCustomer);
      }
      const response = await api.get(`/communications?${params.toString()}`);
      return response.data?.data || response.data || [];
    },
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['communication-statistics', filterCustomer],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCustomer) {
        params.append('customerId', filterCustomer);
      }
      const response = await api.get(`/communications/statistics?${params.toString()}`);
      return response.data || {};
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/communications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'in_person':
        return <User className="w-4 h-4" />;
      case 'follow_up':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      call: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      email: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      sms: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      in_person: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      follow_up: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      note: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[type] || colors.note;
  };

  const filteredCommunications =
    filterType === 'all'
      ? communications
      : communications.filter((comm) => comm.type === filterType);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Communication History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all customer interactions and communications
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Log Communication
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Communications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.total || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Follow-ups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.pendingFollowUps || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Contact</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {statistics.lastContactDate
                    ? format(new Date(statistics.lastContactDate), 'MMM d, yyyy')
                    : 'Never'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Outbound</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {statistics.byDirection?.outbound || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Customers</option>
            {customers.map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('call')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterType === 'call'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Calls
          </button>
          <button
            onClick={() => setFilterType('email')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterType === 'email'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Emails
          </button>
          <button
            onClick={() => setFilterType('follow_up')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterType === 'follow_up'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Follow-ups
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading communications...</p>
          </div>
        </div>
      ) : filteredCommunications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Communications
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start logging customer interactions to build a complete communication history.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Log First Communication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCommunications.map((comm) => (
            <div
              key={comm.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${getTypeColor(comm.type)}`}>
                      {getTypeIcon(comm.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {comm.subject}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>{comm.customer.fullName}</span>
                        {comm.user && (
                          <>
                            <span>•</span>
                            <span>By {comm.user.fullName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{format(new Date(comm.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comm.followUpRequired && !comm.followUpCompleted && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded">
                          Follow-up Required
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          comm.direction === 'inbound'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                            : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                        }`}
                      >
                        {comm.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                      </span>
                    </div>
                  </div>

                  {comm.content && (
                    <div className="ml-12 mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comm.content}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 ml-12 text-xs text-gray-500 dark:text-gray-400">
                    {comm.durationMinutes && (
                      <>
                        <span>Duration: {comm.durationMinutes} min</span>
                        <span>•</span>
                      </>
                    )}
                    {comm.sentiment && (
                      <>
                        <span>Sentiment: {comm.sentiment}</span>
                        <span>•</span>
                      </>
                    )}
                    {comm.outcome && <span>Outcome: {comm.outcome}</span>}
                    {comm.appointment && (
                      <>
                        <span>•</span>
                        <button
                          onClick={() => {
                            if (comm.appointment?.id) {
                              router.push(`/appointments/${comm.appointment.id}`);
                            }
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Appointment
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {comm.followUpRequired && !comm.followUpCompleted && (
                    <button
                      onClick={async () => {
                        await api.post(`/communications/${comm.id}/mark-follow-up-complete`);
                        queryClient.invalidateQueries({ queryKey: ['communications'] });
                      }}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                      title="Mark Follow-up Complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this communication record?')) {
                        deleteMutation.mutate(comm.id);
                      }
                    }}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CommunicationModal
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            await api.post('/communications', data);
            queryClient.invalidateQueries({ queryKey: ['communications'] });
            queryClient.invalidateQueries({ queryKey: ['communication-statistics'] });
            setShowModal(false);
          }}
          customers={customers}
        />
      )}
    </div>
  );
}

function CommunicationModal({
  onClose,
  onSubmit,
  customers,
}: {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  customers: Array<{ id: string; fullName: string }>;
}) {
  const [formData, setFormData] = useState({
    customerId: '',
    type: 'call',
    direction: 'outbound',
    subject: '',
    content: '',
    durationMinutes: '',
    followUpRequired: false,
    followUpDate: '',
    sentiment: '',
    outcome: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
        followUpDate: formData.followUpDate || undefined,
        sentiment: formData.sentiment || undefined,
        outcome: formData.outcome || undefined,
      });
    } catch (error) {
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Log Communication
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record a customer interaction
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer *
              </label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in_person">In Person</option>
                <option value="note">Note</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction
            </label>
            <select
              value={formData.direction}
              onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Brief summary of the communication"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content / Notes
            </label>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Detailed notes about the conversation..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sentiment
              </label>
              <select
                value={formData.sentiment}
                onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Sentiment</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Outcome
            </label>
            <input
              type="text"
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Appointment booked, Issue resolved, Sale made"
            />
          </div>

          <div>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <input
                type="checkbox"
                checked={formData.followUpRequired}
                onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Follow-up Required
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mark if this communication requires a follow-up
                </p>
              </div>
            </label>
          </div>

          {formData.followUpRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : 'Log Communication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
