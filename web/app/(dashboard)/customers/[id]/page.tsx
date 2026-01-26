'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Star,
  ShoppingBag,
  Clock,
  User,
  Building2,
  Package,
  Activity,
  X,
  Image as ImageIcon,
  Plus,
  ShieldOff,
  ShieldCheck,
  Trash2,
  FileText,
  Tag,
  Bell,
  Heart,
  LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isPast, isToday, isFuture } from 'date-fns';
import Image from 'next/image';
import Button from '@/components/ui/Button';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt?: string;
  preferences?: Record<string, unknown>;
  user?: {
    id: string;
    email: string;
  };
}

interface Sale {
  id: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  salon?: {
    id: string;
    name: string;
  };
  items?: SaleItem[];
}

interface SaleItem {
  id: string;
  service?: { name: string };
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string;
  service?: {
    id: string;
    name: string;
    basePrice?: number;
  };
  salon?: {
    id: string;
    name: string;
  };
}

interface CustomerStatistics {
  totalSpent: number;
  totalVisits: number;
  averageOrderValue: number;
  lastVisitDate: string | null;
  favoriteSalon: { id: string; name: string; visits: number } | null;
  preferredServices?: Array<{ name: string; count: number }>;
  preferredProducts?: Array<{ name: string; count: number }>;
  purchaseFrequency?: number; // days between purchases
  lifetimeValue?: number;
}

interface StyleReference {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  tags?: string[];
  sharedWithEmployees: boolean;
  createdAt: string;
  appointmentId?: string;
  appointment?: {
    id: string;
    service?: { name: string };
    salon?: { name: string };
    scheduledStart?: string;
  };
}

type TabType = 'overview' | 'purchases' | 'appointments' | 'references' | 'activity';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [editingReference, setEditingReference] = useState<StyleReference | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}`);
      return response.data.data || response.data;
    },
    enabled: !!customerId,
  });

  const { data: statistics } = useQuery<CustomerStatistics>({
    queryKey: ['customer-statistics', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}/statistics`);
      return response.data.data || response.data;
    },
    enabled: !!customerId,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<{ data: Sale[]; total: number }>({
    queryKey: ['customer-sales', customerId],
    queryFn: async () => {
      const response = await api.get(`/sales/customer/${customerId}?page=1&limit=50`);
      return response.data.data || response.data;
    },
    enabled: !!customerId,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      const response = await api.get(`/appointments/customer/${customerId}`);
      return response.data.data || response.data || [];
    },
    enabled: !!customerId,
  });

  const { data: styleReferencesData, isLoading: referencesLoading } = useQuery<StyleReference[]>({
    queryKey: ['customer-style-references', customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}/style-references`);
      return response.data?.data || response.data || [];
    },
    enabled: !!customerId,
  });

  const createOrUpdateReference = useMutation({
    mutationFn: async ({
      reference,
      customerId,
    }: {
      reference: Partial<StyleReference> & { file?: File };
      customerId: string;
    }) => {
      if (reference.id) {
        // Update existing - no file upload for updates
        return api.patch(`/customers/style-references/${reference.id}`, reference);
      }

      // Create new - check if file upload or URL
      if (reference.file) {
        // Use file upload endpoint
        const formData = new FormData();
        formData.append('image', reference.file);
        formData.append('title', reference.title || '');
        if (reference.description) formData.append('description', reference.description);
        if (reference.tags && reference.tags.length > 0) {
          formData.append('tags', reference.tags.join(','));
        }
        formData.append('sharedWithEmployees', String(reference.sharedWithEmployees ?? true));
        if (reference.appointmentId || reference.appointment?.id) {
          formData.append(
            'appointmentId',
            reference.appointmentId || reference.appointment?.id || ''
          );
        }

        // Remove Content-Type header to let axios set it automatically with boundary for FormData
        return api.post(`/customers/${customerId}/style-references/upload`, formData, {
          headers: {
            'Content-Type': undefined, // Let axios set multipart/form-data with boundary
          },
        });
      } else {
        // Use URL endpoint
        return api.post(`/customers/${customerId}/style-references`, reference);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-style-references', customerId] });
      setShowReferenceModal(false);
      setEditingReference(null);
    },
    onError: (error: unknown) => {
      // Upload error occurred
      const maybeAxios = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const errorMessage =
        maybeAxios?.response?.data?.message ||
        maybeAxios?.response?.data?.error ||
        maybeAxios?.message ||
        'Failed to upload style reference';
      alert(`Error: ${errorMessage}`);
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) =>
      api.patch(`/customers/style-references/${id}`, { sharedWithEmployees: shared }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-style-references', customerId] });
    },
  });

  const deleteReferenceMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/customers/style-references/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-style-references', customerId] });
    },
  });

  const updateCustomerNotesMutation = useMutation({
    mutationFn: async ({ notes, tags }: { notes: string; tags: string[] }) => {
      const preferences = {
        ...(customer?.preferences || {}),
        notes,
        tags,
      };
      return api.patch(`/customers/${customerId}`, { preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setShowNotesModal(false);
    },
  });

  const styleReferences = styleReferencesData || [];
  const sales = useMemo(() => salesData?.data || [], [salesData]);

  // Load customer notes and tags from preferences
  useEffect(() => {
    if (customer?.preferences) {
      setCustomerNotes((customer.preferences.notes as string) || '');
      setCustomerTags((customer.preferences.tags as string[]) || []);
    }
  }, [customer]);

  // Calculate preferred services/products
  const preferredServices = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        if (item.service?.name) {
          serviceCounts[item.service.name] =
            (serviceCounts[item.service.name] || 0) + item.quantity;
        }
      });
    });
    appointments?.forEach((apt) => {
      if (apt.service?.name) {
        serviceCounts[apt.service.name] = (serviceCounts[apt.service.name] || 0) + 1;
      }
    });
    return Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [sales, appointments]);

  if (customerLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center py-12">
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
            Customer not found
          </p>
          <Button variant="secondary" onClick={() => router.push('/customers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  // Calculate customer segment
  const getCustomerSegment = () => {
    if (!statistics) return { label: 'New', color: 'gray' };
    const totalSpent = statistics.totalSpent;
    const visits = statistics.totalVisits;

    if (totalSpent >= 500000 && visits >= 10) return { label: 'VIP', color: 'purple' };
    if (totalSpent >= 200000 && visits >= 5) return { label: 'Premium', color: 'blue' };
    if (totalSpent >= 100000 && visits >= 3) return { label: 'Regular', color: 'green' };
    if (visits >= 1) return { label: 'Active', color: 'yellow' };
    return { label: 'New', color: 'gray' };
  };

  const customerSegment = getCustomerSegment();

  // Get next appointment
  const nextAppointment = appointments
    ?.filter((apt) => {
      const aptDate = parseISO(apt.scheduledStart);
      return isFuture(aptDate) && apt.status !== 'cancelled' && apt.status !== 'no_show';
    })
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0];

  const tabs: { id: TabType; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag, count: sales.length },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: appointments?.length || 0 },
    { id: 'references', label: 'Looks', icon: ImageIcon, count: styleReferences.length },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  // Combine sales and appointments for activity timeline
  const activities = [
    ...(sales || []).map((sale) => ({
      type: 'sale' as const,
      date: sale.createdAt,
      title: `Purchase at ${sale.salon?.name || 'Salon'}`,
      description: `${sale.currency} ${sale.totalAmount.toLocaleString()}`,
      status: sale.status,
    })),
    ...(appointments || []).map((apt) => ({
      type: 'appointment' as const,
      date: apt.scheduledStart,
      title: `${apt.service?.name || 'Service'} at ${apt.salon?.name || 'Salon'}`,
      description: format(parseISO(apt.scheduledStart), 'MMM d, yyyy h:mm a'),
      status: apt.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Sticky Header Component */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-2 py-1.5">
            {/* Top Row: Navigation & Actions */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Back Button */}
              <button
                onClick={() => router.push('/customers')}
                className="group flex items-center gap-2 text-sm font-semibold text-text-light/80 dark:text-text-dark/80 hover:text-primary transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center group-hover:border-primary/50 group-hover:text-primary transition-all shadow-sm">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <span>Back</span>
              </button>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (customer.email) window.open(`mailto:${customer.email}`);
                    else alert('No email address available for this customer');
                  }}
                  className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark h-8 px-3"
                >
                  <Mail className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Email</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/appointments?customerId=${customerId}`)}
                  className="shadow-sm h-8 px-3"
                >
                  <Calendar className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Book</span>
                </Button>
              </div>
            </div>

            {/* Bottom Row: Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-[1px]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'text-primary'
                        : 'text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-border-light dark:bg-border-dark text-text-light/60 dark:text-text-dark/60'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                    {/* Active Tab Indicator Line */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-transparent">

        <div className="p-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Customer Profile Hero */}
                {/* Customer Profile Card (Redesigned) */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-sm">
                  {/* Decorative Cover */}
                  <div className="h-20 bg-primary/5 relative">

                  </div>

                  <div className="px-5 pb-5 relative">
                    {/* Avatar & Main Info */}
                    <div className="flex flex-col md:flex-row gap-5 items-start -mt-9">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-2xl bg-surface-light dark:bg-surface-dark p-1 shadow-xl ring-1 ring-black/5 dark:ring-white/5 z-10 relative">
                          <div className="h-full w-full rounded-xl bg-primary flex items-center justify-center text-white font-black text-2xl">
                            {customer.fullName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        {/* Status Indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 h-4 w-4 rounded-full border-[2px] border-surface-light dark:border-surface-dark z-20" title="Active Customer" />
                      </div>

                      <div className="flex-1 pt-1 md:pt-11 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h2 className="text-xl font-black text-text-light dark:text-text-dark tracking-tight">
                                {customer.fullName}
                              </h2>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                customerSegment.color === 'purple' ? 'bg-purple-500/10 text-purple-600 border-purple-200/50' :
                                customerSegment.color === 'blue' ? 'bg-blue-500/10 text-blue-600 border-blue-200/50' :
                                customerSegment.color === 'green' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {customerSegment.label}
                              </span>
                            </div>
                            <p className="text-text-light/50 dark:text-text-dark/50 text-[10px] font-mono ml-0.5">
                              ID: {customer.id.substring(0, 8)}
                            </p>
                          </div>
                        </div>

                        {/* Contact & Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark group hover:border-primary/30 transition-colors">
                            <div className="p-1.5 bg-primary/10 text-primary rounded-md group-hover:bg-primary group-hover:text-white transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase text-text-light/40 dark:text-text-dark/40 tracking-wider mb-0.5">Phone</p>
                              <p className="font-bold text-xs text-text-light dark:text-text-dark truncate">
                                {customer.phone}
                              </p>
                            </div>
                          </div>

                          {customer.email && (
                            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark group hover:border-blue-500/30 transition-colors">
                              <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-md group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase text-text-light/40 dark:text-text-dark/40 tracking-wider mb-0.5">Email</p>
                                <p className="font-bold text-xs text-text-light dark:text-text-dark truncate">
                                  {customer.email}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark group hover:border-purple-500/30 transition-colors">
                            <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-md group-hover:bg-purple-500 group-hover:text-white transition-colors">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase text-text-light/40 dark:text-text-dark/40 tracking-wider mb-0.5">Member Since</p>
                              <p className="font-bold text-xs text-text-light dark:text-text-dark truncate">
                                {format(parseISO(customer.createdAt), 'MMM yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {customerTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                             {customerTags.map((tag, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-transparent border border-border-light dark:border-border-dark text-[10px] font-bold text-text-light/60 dark:text-text-dark/60">
                                  <Tag className="w-2.5 h-2.5 mr-1 opacity-50" />
                                  {tag}
                                </span>
                             ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statistics Bar */}
                    {statistics && (
                      <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-2">
                         {/* Total Spent */}
                         <div className="relative pl-3 border-l-[3px] border-primary/20">
                            <p className="text-[9px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Lifetime Spent</p>
                            <div className="flex items-baseline gap-1">
                               <span className="text-xl lg:text-2xl font-black text-text-light dark:text-text-dark tracking-tight">
                                 {Math.round(statistics.totalSpent).toLocaleString()}
                               </span>
                               <span className="text-[10px] font-bold text-text-light/40">RWF</span>
                            </div>
                         </div>

                         {/* Visits */}
                         <div className="relative pl-3 border-l-[3px] border-blue-500/20">
                            <p className="text-[9px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Total Visits</p>
                            <div className="flex items-baseline gap-1">
                               <span className="text-xl lg:text-2xl font-black text-text-light dark:text-text-dark tracking-tight">
                                 {statistics.totalVisits}
                               </span>
                               <span className="text-[10px] font-bold text-text-light/40">Visits</span>
                            </div>
                         </div>

                         {/* Avg Order */}
                         <div className="relative pl-3 border-l-[3px] border-purple-500/20">
                            <p className="text-[9px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Avg. Order</p>
                            <div className="flex items-baseline gap-1">
                               <span className="text-xl lg:text-2xl font-black text-text-light dark:text-text-dark tracking-tight">
                                 {Math.round(statistics.averageOrderValue).toLocaleString()}
                               </span>
                               <span className="text-[10px] font-bold text-text-light/40">RWF</span>
                            </div>
                         </div>

                         {/* Loyalty */}
                         <div className="relative pl-3 border-l-[3px] border-amber-500/20">
                            <p className="text-[9px] font-black text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mb-0.5">Loyalty Points</p>
                            <div className="flex items-baseline gap-1">
                               <span className="text-xl lg:text-2xl font-black text-text-light dark:text-text-dark tracking-tight">
                                 {customer.loyaltyPoints || 0}
                               </span>
                               <span className="text-[10px] font-bold text-text-light/40">Pts</span>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Appointment Banner */}
                {nextAppointment && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-light dark:text-text-dark">
                          Next Appointment
                        </p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                          {format(parseISO(nextAppointment.scheduledStart), 'EEEE, MMM d @ h:mm a')} • {nextAppointment.service?.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => router.push(`/appointments/${nextAppointment.id}`)}
                    >
                      View
                    </Button>
                  </div>
                )}

                {/* Preferred Services */}
                {preferredServices.length > 0 && (
                  <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" />
                      Preferred Services
                    </h3>
                    <div className="space-y-2">
                      {preferredServices.map((service, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-text-light dark:text-text-dark">
                            {service.name}
                          </span>
                          <span className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60">
                            {service.count} times
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-3">
                {salesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      No purchases found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                <Building2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              </div>
                              <span className="text-sm font-bold text-text-light dark:text-text-dark">
                                {sale.salon?.name || 'Salon'}
                              </span>
                            </div>
                            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                              {format(parseISO(sale.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-text-light dark:text-text-dark">
                              {sale.currency} {sale.totalAmount.toLocaleString()}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                sale.status === 'completed'
                                  ? 'bg-success/10 text-success'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {sale.status}
                            </span>
                          </div>
                        </div>
                        {sale.items && sale.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                            <p className="text-xs font-bold text-text-light/60 dark:text-text-dark/60 mb-2">
                              Items
                            </p>
                            <div className="space-y-2">
                              {sale.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-text-light/60 dark:text-text-dark/60">
                                    {item.service?.name || item.product?.name} × {item.quantity}
                                  </span>
                                  <span className="font-bold text-text-light dark:text-text-dark">
                                    {sale.currency} {item.lineTotal.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-3">
                {appointmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !appointments || appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      No appointments found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment) => {
                      const aptDate = parseISO(appointment.scheduledStart);
                      const isPastApt = isPast(aptDate);
                      const isTodayApt = isToday(aptDate);
                      const isFutureApt = isFuture(aptDate);

                      return (
                        <div
                          key={appointment.id}
                          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                  <Package className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-bold text-text-light dark:text-text-dark">
                                  {appointment.service?.name || 'Service'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-light/60 dark:text-text-dark/60">
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {appointment.salon?.name || 'Salon'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(aptDate, 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                              {appointment.notes && (
                                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                  appointment.status === 'completed'
                                    ? 'bg-success/10 text-success'
                                    : appointment.status === 'cancelled' ||
                                        appointment.status === 'no_show'
                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                      : appointment.status === 'confirmed'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-warning/10 text-warning'
                                }`}
                              >
                                {appointment.status}
                              </span>
                              {isTodayApt && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">
                                  Today
                                </span>
                              )}
                              {isFutureApt && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-success/10 text-success rounded-full">
                                  Upcoming
                                </span>
                              )}
                              {isPastApt && appointment.status !== 'completed' && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-text-light/10 text-text-light/60 dark:text-text-dark/60 rounded-full">
                                  Past
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Style References Tab */}
            {activeTab === 'references' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Styling References
                    </h3>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                      Visual history of looks the customer loves
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingReference(null);
                      setShowReferenceModal(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Reference
                  </Button>
                </div>

                {referencesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : styleReferences.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
                      No styling references yet
                    </p>
                    <Button
                      variant="primary"
                      className="gap-2 mx-auto"
                      onClick={() => {
                        setEditingReference(null);
                        setShowReferenceModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Reference
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {styleReferences.map((reference) => (
                      <div
                        key={reference.id}
                        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden hover:shadow-lg transition-all"
                      >
                        <div className="relative h-48 bg-surface-light dark:bg-surface-dark">
                          <Image
                            src={reference.imageUrl}
                            alt={reference.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-white">
                            {reference.sharedWithEmployees ? 'Shared' : 'Private'}
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-text-light dark:text-text-dark">
                                {reference.title}
                              </h4>
                              <p className="text-[10px] text-text-light/60 dark:text-text-dark/60">
                                {format(parseISO(reference.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  toggleShareMutation.mutate({
                                    id: reference.id,
                                    shared: !reference.sharedWithEmployees,
                                  })
                                }
                                className={`p-1.5 rounded-lg border transition-all ${
                                  reference.sharedWithEmployees
                                    ? 'border-success/20 bg-success/10 text-success'
                                    : 'border-border-light dark:border-border-dark text-text-light/40 dark:text-text-dark/40 hover:text-text-light dark:hover:text-text-dark'
                                }`}
                                title={
                                  reference.sharedWithEmployees
                                    ? 'Hide from salon team'
                                    : 'Share with salon team'
                                }
                              >
                                {reference.sharedWithEmployees ? (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <ShieldOff className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingReference(reference);
                                  setShowReferenceModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-border-light dark:border-border-dark text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark transition-all"
                                title="Edit reference"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm('Delete this reference? This action cannot be undone.')
                                  ) {
                                    deleteReferenceMutation.mutate(reference.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-border-light dark:border-border-dark text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Delete reference"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {reference.description && (
                            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                              {reference.description}
                            </p>
                          )}
                          {reference.tags && reference.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {reference.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-semibold"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {reference.appointment && (
                            <div className="text-[10px] text-text-light/60 dark:text-text-dark/60 border-t border-border-light dark:border-border-dark pt-2">
                              From {reference.appointment.service?.name || 'appointment'} at{' '}
                              {reference.appointment.salon?.name || 'salon'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      No activity found
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border-light dark:bg-border-dark"></div>
                    <div className="space-y-4">
                      {activities.map((activity, idx) => (
                        <div key={idx} className="relative flex gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center z-10">
                            {activity.type === 'sale' ? (
                              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-text-light dark:text-text-dark">
                                    {activity.title}
                                  </p>
                                  <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                                    {activity.description}
                                  </p>
                                  <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 mt-1.5">
                                    {format(parseISO(activity.date), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
                                    activity.status === 'completed'
                                      ? 'bg-success/10 text-success'
                                      : activity.status === 'cancelled' ||
                                          activity.status === 'no_show'
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        : 'bg-warning/10 text-warning'
                                  }`}
                                >
                                  {activity.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {showReferenceModal && (
        <StyleReferenceModal
          onClose={() => {
            setShowReferenceModal(false);
            setEditingReference(null);
          }}
          onSubmit={(payload) => createOrUpdateReference.mutate({ reference: payload, customerId })}
          loading={createOrUpdateReference.isPending}
          reference={editingReference}
        />
      )}

      {showNotesModal && (
        <NotesModal
          onClose={() => setShowNotesModal(false)}
          onSubmit={(notes, tags) => updateCustomerNotesMutation.mutate({ notes, tags })}
          loading={updateCustomerNotesMutation.isPending}
          initialNotes={customerNotes}
          initialTags={customerTags}
        />
      )}
    </div>
  );
}

function NotesModal({
  onClose,
  onSubmit,
  loading,
  initialNotes,
  initialTags,
}: {
  onClose: () => void;
  onSubmit: (notes: string, tags: string[]) => void;
  loading: boolean;
  initialNotes: string;
  initialTags: string[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    onSubmit(notes, tags);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div>
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
              Customer Notes & Tags
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
              Internal notes visible only to salon staff
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="customer-notes"
              className="block text-sm font-bold text-text-light dark:text-text-dark mb-2"
            >
              Notes
            </label>
            <textarea
              id="customer-notes"
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
              placeholder="Add internal notes about this customer..."
            />
          </div>
          <div>
            <label
              htmlFor="customer-tags"
              className="block text-sm font-bold text-text-light dark:text-text-dark mb-2"
            >
              Tags (separate with commas)
            </label>
            <input
              id="customer-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="VIP, Regular, Preferred, etc."
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} loadingText="Saving...">
              Save Notes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StyleReferenceModal({
  reference,
  onClose,
  onSubmit,
  loading,
}: {
  reference: StyleReference | null;
  onClose: () => void;
  onSubmit: (payload: Partial<StyleReference> & { file?: File }) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: reference?.title || '',
    description: reference?.description || '',
    imageUrl: reference?.imageUrl || '',
    tags: reference?.tags?.join(', ') || '',
    sharedWithEmployees: reference?.sharedWithEmployees ?? true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(reference?.imageUrl || null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadMethod('file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<StyleReference> & { file?: File } = {
      id: reference?.id,
      title: formData.title,
      description: formData.description,
      imageUrl: uploadMethod === 'url' ? formData.imageUrl : undefined,
      sharedWithEmployees: formData.sharedWithEmployees,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      file: uploadMethod === 'file' && selectedFile ? selectedFile : undefined,
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div>
            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
              {reference ? 'Edit Styling Reference' : 'Add Styling Reference'}
            </h2>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">
              Upload inspiration photos or finished looks
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="style-ref-title"
                className="block text-sm font-bold text-text-light dark:text-text-dark mb-2"
              >
                Title *
              </label>
              <input
                id="style-ref-title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
              />
            </div>
            <div>
              <p className="block text-sm font-bold text-text-light dark:text-text-dark mb-2">
                Image *
              </p>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={uploadMethod === 'file' ? 'primary' : 'secondary'}
                  onClick={() => setUploadMethod('file')}
                >
                  Upload File
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={uploadMethod === 'url' ? 'primary' : 'secondary'}
                  onClick={() => setUploadMethod('url')}
                >
                  Use URL
                </Button>
              </div>
              {uploadMethod === 'file' ? (
                <div>
                  <input
                    id="style-ref-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {previewUrl && (
                    <div className="mt-3">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        width={900}
                        height={360}
                        className="max-w-full h-48 object-cover rounded-lg border border-border-light dark:border-border-dark"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  id="style-ref-url"
                  type="url"
                  required={uploadMethod === 'url'}
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
                />
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="style-ref-description"
              className="block text-sm font-bold text-text-light dark:text-text-dark mb-2"
            >
              Description
            </label>
            <textarea
              id="style-ref-description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="style-ref-tags"
              className="block text-sm font-bold text-text-light dark:text-text-dark mb-2"
            >
              Tags (separate with commas)
            </label>
            <input
              id="style-ref-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="braids, balayage, formal"
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark text-sm"
            />
          </div>
          <div className="flex items-start gap-3 p-3 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark">
            <input
              id="style-ref-shared"
              type="checkbox"
              checked={formData.sharedWithEmployees}
              onChange={(e) => setFormData({ ...formData, sharedWithEmployees: e.target.checked })}
              className="mt-0.5 h-4 w-4 text-primary rounded border-border-light dark:border-border-dark focus:ring-primary/50"
            />
            <div className="min-w-0">
              <label
                htmlFor="style-ref-shared"
                className="text-sm font-bold text-text-light dark:text-text-dark"
              >
                Share with salon team
              </label>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                Allow stylists to view this reference
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading} loadingText="Saving...">
              {reference ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
