'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  Clock,
  Plus,
  Phone,
  Mail,
  Calendar,
  User,
  Building2,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Edit,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface WaitlistEntry {
  id: string;
  status: string;
  preferredDate?: string;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  flexible: boolean;
  priority: number;
  notes?: string;
  createdAt: string;
  contactedAt?: string;
  expiresAt?: string;
  customer: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  };
  salon: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
  appointment?: {
    id: string;
    scheduledStart: string;
  };
}

export default function WaitlistPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE]}>
      <WaitlistContent />
    </ProtectedRoute>
  );
}

function WaitlistContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch salons
  const { data: salons = [] } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data || [];
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data || [];
    },
  });

  // Fetch waitlist entries
  const { data: waitlistEntries = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['waitlist', filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      const response = await api.get(`/waitlist?${params.toString()}`);
      return response.data?.data || response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/waitlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });

  const contactMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await api.post(`/waitlist/${id}/contact`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      alert('Customer has been contacted!');
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      booked: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      contacted: 'Contacted',
      booked: 'Booked',
      cancelled: 'Cancelled',
      expired: 'Expired',
    };
    return labels[status] || status;
  };

  const filteredEntries = filterStatus === 'all' 
    ? waitlistEntries 
    : waitlistEntries.filter((entry) => entry.status === filterStatus);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Waitlist Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customers waiting for appointment availability
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEntry(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add to Waitlist
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            filterStatus === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterStatus('contacted')}
          className={`px-4 py-2 rounded-lg transition ${
            filterStatus === 'contacted'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Contacted
        </button>
        <button
          onClick={() => setFilterStatus('booked')}
          className={`px-4 py-2 rounded-lg transition ${
            filterStatus === 'booked'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Booked
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading waitlist...</p>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Waitlist Entries</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filterStatus === 'all'
              ? 'No customers are currently on the waitlist.'
              : `No ${filterStatus} entries found.`}
          </p>
          {filterStatus !== 'all' && (
            <button
              onClick={() => setFilterStatus('all')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View All Entries
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {entry.customer.fullName}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {entry.customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{entry.customer.phone}</span>
                          </div>
                        )}
                        {entry.customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{entry.customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {getStatusLabel(entry.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-12">
                    {entry.service && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Scissors className="w-4 h-4" />
                        <span>{entry.service.name}</span>
                      </div>
                    )}
                    {entry.preferredDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(entry.preferredDate), 'MMM d, yyyy')}
                          {entry.preferredTimeStart && ` at ${entry.preferredTimeStart}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Building2 className="w-4 h-4" />
                      <span>{entry.salon.name}</span>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-3 ml-12 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 ml-12 text-xs text-gray-500 dark:text-gray-400">
                    <span>Priority: {entry.priority}</span>
                    <span>•</span>
                    <span>Added: {format(new Date(entry.createdAt), 'MMM d, yyyy')}</span>
                    {entry.contactedAt && (
                      <>
                        <span>•</span>
                        <span>Contacted: {format(new Date(entry.contactedAt), 'MMM d, yyyy')}</span>
                      </>
                    )}
                    {entry.flexible && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">Flexible</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {entry.status === 'pending' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Add notes (optional):');
                        if (notes !== null) {
                          contactMutation.mutate({ id: entry.id, notes: notes || undefined });
                        }
                      }}
                      className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition"
                      title="Contact Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  {entry.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowModal(true);
                      }}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                      title="Convert to Appointment"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Remove this entry from waitlist?')) {
                        deleteMutation.mutate(entry.id);
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
        <WaitlistModal
          onClose={() => {
            setShowModal(false);
            setSelectedEntry(null);
          }}
          onSubmit={async (data) => {
            if (selectedEntry) {
              // Convert to appointment
              await api.post(`/waitlist/${selectedEntry.id}/convert-to-appointment`, {
                scheduledStart: data.scheduledStart,
                scheduledEnd: data.scheduledEnd,
                salonEmployeeId: data.salonEmployeeId,
                notes: data.notes,
              });
              alert('Appointment created successfully!');
            } else {
              // Create new waitlist entry
              await api.post('/waitlist', data);
            }
            queryClient.invalidateQueries({ queryKey: ['waitlist'] });
            setShowModal(false);
            setSelectedEntry(null);
          }}
          entry={selectedEntry}
          salons={salons}
          services={services}
        />
      )}
    </div>
  );
}

function WaitlistModal({
  onClose,
  onSubmit,
  entry,
  salons,
  services,
}: {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  entry: WaitlistEntry | null;
  salons: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
}) {
  const [formData, setFormData] = useState({
    customerId: entry?.customer.id || '',
    salonId: entry?.salon.id || salons[0]?.id || '',
    serviceId: entry?.service?.id || '',
    preferredDate: entry?.preferredDate ? format(new Date(entry.preferredDate), 'yyyy-MM-dd') : '',
    preferredTimeStart: entry?.preferredTimeStart || '',
    preferredTimeEnd: entry?.preferredTimeEnd || '',
    flexible: entry?.flexible ?? true,
    priority: entry?.priority || 0,
    notes: entry?.notes || '',
    // For converting to appointment
    scheduledStart: '',
    scheduledEnd: '',
    salonEmployeeId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isConverting = !!entry;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isConverting) {
        await onSubmit({
          scheduledStart: new Date(formData.scheduledStart).toISOString(),
          scheduledEnd: new Date(formData.scheduledEnd).toISOString(),
          salonEmployeeId: formData.salonEmployeeId || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await onSubmit({
          customerId: formData.customerId,
          salonId: formData.salonId,
          serviceId: formData.serviceId || undefined,
          preferredDate: formData.preferredDate || undefined,
          preferredTimeStart: formData.preferredTimeStart || undefined,
          preferredTimeEnd: formData.preferredTimeEnd || undefined,
          flexible: formData.flexible,
          priority: formData.priority,
          notes: formData.notes || undefined,
        });
      }
    } catch (error) {
      console.error('Error saving:', error);
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
              {isConverting ? 'Convert to Appointment' : 'Add to Waitlist'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConverting
                ? 'Create an appointment for this waitlist entry'
                : 'Add a customer to the waitlist'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isConverting ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Start *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled End *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Salon *
                  </label>
                  <select
                    required
                    value={formData.salonId}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Salon</option>
                    {salons.map((salon) => (
                      <option key={salon.id} value={salon.id}>
                        {salon.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Any Service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <input
                    type="checkbox"
                    checked={formData.flexible}
                    onChange={(e) => setFormData({ ...formData, flexible: e.target.checked })}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Flexible Schedule</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Customer is flexible with date and time
                    </p>
                  </div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Additional notes about this waitlist entry..."
                />
              </div>
            </>
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
              {isSubmitting ? 'Saving...' : isConverting ? 'Create Appointment' : 'Add to Waitlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

