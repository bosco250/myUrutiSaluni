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

  // Fetch customers
  const { data: customersResponse } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const response = await api.get('/customers?limit=100');
      return response.data;
    },
  });
  const customers = customersResponse?.data || [];

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
      pending: 'bg-primary/10 text-primary',
      contacted: 'bg-warning/10 text-warning',
      booked: 'bg-success/10 text-success',
      cancelled: 'bg-danger/10 text-danger',
      expired: 'bg-text-light/10 text-text-light/60 dark:bg-text-dark/10 dark:text-text-dark/60',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Waitlist Management</h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
            Manage customers waiting for appointment availability
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEntry(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add to Waitlist
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'pending', 'contacted', 'booked'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-medium capitalize border ${
              filterStatus === status
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark border-border-light dark:border-border-dark hover:border-primary/30'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading waitlist...</p>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark border-dashed">
          <Clock className="w-12 h-12 mx-auto mb-3 text-text-light/20 dark:text-text-dark/20" />
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">No Waitlist Entries</h3>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            {filterStatus === 'all'
              ? 'No customers are currently on the waitlist.'
              : `No ${filterStatus} entries found.`}
          </p>
          {filterStatus !== 'all' && (
            <button
              onClick={() => setFilterStatus('all')}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition text-xs font-medium"
            >
              View All Entries
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:border-primary/30 transition shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-text-light dark:text-text-dark text-sm truncate">
                          {entry.customer.fullName}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-text-light/60 dark:text-text-dark/60">
                        {entry.customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{entry.customer.phone}</span>
                          </div>
                        )}
                        {entry.customer.email && (
                          <div className="flex items-center gap-1 hidden sm:flex">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{entry.customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-11">
                    {entry.service && (
                      <div className="flex items-center gap-1.5 text-xs text-text-light/70 dark:text-text-dark/70">
                        <Scissors className="w-3.5 h-3.5 opacity-60" />
                        <span>{entry.service.name}</span>
                      </div>
                    )}
                    {entry.preferredDate && (
                      <div className="flex items-center gap-1.5 text-xs text-text-light/70 dark:text-text-dark/70">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span>
                          {format(new Date(entry.preferredDate), 'MMM d, yyyy')}
                          {entry.preferredTimeStart && ` • ${entry.preferredTimeStart}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-text-light/70 dark:text-text-dark/70">
                      <Building2 className="w-3.5 h-3.5 opacity-60" />
                      <span>{entry.salon.name}</span>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-2 ml-11 p-2 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                      <p className="text-xs text-text-light/80 dark:text-text-dark/80 italic line-clamp-2">{entry.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 ml-11 text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium uppercase tracking-wide">
                    <span>Priority: {entry.priority}</span>
                    <span>•</span>
                    <span>Added: {format(new Date(entry.createdAt), 'MMM d')}</span>
                    {entry.contactedAt && (
                      <>
                        <span>•</span>
                        <span className="text-warning">Contacted: {format(new Date(entry.contactedAt), 'MMM d')}</span>
                      </>
                    )}
                    {entry.flexible && (
                      <>
                        <span>•</span>
                        <span className="text-success">Flexible</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {entry.status === 'pending' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Add notes (optional):');
                        if (notes !== null) {
                          contactMutation.mutate({ id: entry.id, notes: notes || undefined });
                        }
                      }}
                      className="p-1.5 text-warning hover:bg-warning/10 rounded-md transition"
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
                      className="p-1.5 text-success hover:bg-success/10 rounded-md transition"
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
                    className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition"
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
              await api.post(`/waitlist/${selectedEntry.id}/convert-to-appointment`, {
                scheduledStart: data.scheduledStart,
                scheduledEnd: data.scheduledEnd,
                salonEmployeeId: data.salonEmployeeId,
                notes: data.notes,
              });
              alert('Appointment created successfully!');
            } else {
              await api.post('/waitlist', data);
            }
            queryClient.invalidateQueries({ queryKey: ['waitlist'] });
            setShowModal(false);
            setSelectedEntry(null);
          }}
          entry={selectedEntry}
          salons={salons}
          services={services}
          customers={customers}
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
  customers,
}: {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  entry: WaitlistEntry | null;
  salons: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; fullName: string; phone?: string }>;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark sticky top-0 bg-surface-light dark:bg-surface-dark z-10">
          <div>
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
              {isConverting ? 'Convert to Appointment' : 'Add to Waitlist'}
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
              {isConverting
                ? 'Create an appointment for this entry'
                : 'Add a customer to the waitlist'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-light/40 hover:text-text-light dark:hover:text-text-dark transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isConverting ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-light/30"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Customer *
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName} {customer.phone ? `(${customer.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Salon *
                  </label>
                  <select
                    required
                    value={formData.salonId}
                    onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
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
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Service
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                    Priority (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 p-3 border border-border-light dark:border-border-dark rounded-xl bg-background-light/50 dark:bg-background-dark/50 cursor-pointer hover:border-primary/30 transition">
                  <input
                    type="checkbox"
                    checked={formData.flexible}
                    onChange={(e) => setFormData({ ...formData, flexible: e.target.checked })}
                    className="h-4 w-4 text-primary rounded border-border-light dark:border-border-dark ring-offset-0 focus:ring-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">Flexible Schedule</p>
                    <p className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                      Customer is flexible with date and time
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-light/70 dark:text-text-dark/70 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-light/30"
                  placeholder="Additional notes..."
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition text-xs font-medium"
            >
              {isSubmitting ? 'Saving...' : isConverting ? 'Create Appointment' : 'Add to Waitlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

