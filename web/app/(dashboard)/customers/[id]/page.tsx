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
  Eye,
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
              <div className="space-y-6">
                {/* Profile Hero & Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Profile Card */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-sm">
                      <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
                         <div className="absolute top-4 right-4 group">
                           <Button
                             variant="secondary"
                             size="sm"
                             onClick={() => {
                               setCustomerNotes(customer.preferences?.notes as string || '');
                               setCustomerTags(customer.preferences?.tags as string[] || []);
                               setShowNotesModal(true);
                             }}
                             className="h-8 bg-white/50 backdrop-blur-md border-white/20 hover:bg-white/80"
                           >
                             <Edit className="w-3.5 h-3.5 mr-1.5" />
                             Edit Profile
                           </Button>
                         </div>
                      </div>

                      <div className="px-6 pb-6 relative">
                        <div className="flex flex-col md:flex-row gap-6 items-start -mt-10">
                          <div className="relative">
                            <div className="h-24 w-24 rounded-2xl bg-surface-light dark:bg-surface-dark p-1 shadow-2xl ring-1 ring-black/5 z-10 relative">
                              <div className="h-full w-full rounded-xl bg-primary flex items-center justify-center text-white font-black text-3xl">
                                {customer.fullName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-5 w-5 rounded-full border-[3px] border-surface-light dark:border-surface-dark z-20" />
                          </div>

                          <div className="flex-1 pt-12 md:pt-12">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h2 className="text-2xl font-black text-text-light dark:text-text-dark tracking-tight mb-1">
                                  {customer.fullName}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    customerSegment.color === 'purple' ? 'bg-purple-500/10 text-purple-600 border-purple-200/50' :
                                    customerSegment.color === 'blue' ? 'bg-blue-500/10 text-blue-600 border-blue-200/50' :
                                    customerSegment.color === 'green' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50' :
                                    'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}>
                                    {customerSegment.label} Status
                                  </span>
                                  <span className="text-text-light/40 dark:text-text-dark/40 text-[10px] font-mono">
                                    REF: {customer.id.substring(0, 8).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                              <div className="flex items-center gap-3">
                                 <div className="h-9 w-9 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center text-text-light/40">
                                   <Phone className="w-4 h-4" />
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-[10px] font-bold uppercase text-text-light/40 tracking-wider">Mobile Phone</p>
                                   <p className="text-sm font-bold text-text-light dark:text-text-dark">{customer.phone}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="h-9 w-9 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark flex items-center justify-center text-text-light/40">
                                   <Mail className="w-4 h-4" />
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-[10px] font-bold uppercase text-text-light/40 tracking-wider">Email Address</p>
                                   <p className="text-sm font-bold text-text-light dark:text-text-dark truncate">{customer.email || 'No email provided'}</p>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Grid - Compacted & Flat */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-black text-text-light/40 tracking-widest">Lifetime Spent</p>
                          <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-all text-primary">
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <p className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">
                          {Math.round(statistics?.totalSpent || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-40">RWF</span>
                        </p>
                      </div>

                      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-black text-text-light/40 tracking-widest">Total Visits</p>
                          <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all text-blue-600">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <p className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">
                          {statistics?.totalVisits || 0} <span className="text-[10px] font-bold opacity-40">Sessions</span>
                        </p>
                      </div>

                      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 group hover:border-purple-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-black text-text-light/40 tracking-widest">Avg Ticket</p>
                          <div className="p-1.5 bg-purple-500/10 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-all text-purple-600">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <p className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">
                          {Math.round(statistics?.averageOrderValue || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-40">RWF</span>
                        </p>
                      </div>

                      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-black text-text-light/40 tracking-widest">Loyalty</p>
                          <div className="p-1.5 bg-amber-500/10 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all text-amber-600">
                            <Star className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <p className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">
                          {customer.loyaltyPoints || 0} <span className="text-[10px] font-bold opacity-40">Points</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Banners & Insights */}
                  <div className="space-y-4">
                    {/* Next Appointment Section */}
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-primary/5 px-5 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                         <h3 className="text-[10px] font-black uppercase text-text-light/60 tracking-widest">Next Booking</h3>
                         <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      </div>
                      <div className="p-5">
                        {nextAppointment ? (
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-text-light dark:text-text-dark">{nextAppointment.service?.name}</p>
                                <p className="text-xs text-text-light/50 dark:text-text-dark/50 font-medium">
                                  {format(parseISO(nextAppointment.scheduledStart), 'EEEE, MMM d @ h:mm a')}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full text-xs font-bold h-9"
                              onClick={() => router.push(`/appointments/${nextAppointment.id}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                             <p className="text-xs text-text-light/40 dark:text-text-dark/40 italic">No upcoming sessions</p>
                             <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 w-full h-9 text-xs font-bold"
                                onClick={() => router.push(`/appointments?customerId=${customerId}`)}
                             >
                               Book Now
                             </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preferred Services Card */}
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-background-light dark:bg-background-dark px-5 py-3 border-b border-border-light dark:border-border-dark">
                         <h3 className="text-[10px] font-black uppercase text-text-light/60 tracking-widest">Top Services</h3>
                      </div>
                      <div className="p-5">
                         {preferredServices.length > 0 ? (
                           <div className="space-y-4">
                             {preferredServices.map((service, idx) => {
                               const maxCount = preferredServices[0].count;
                               const percentage = (service.count / maxCount) * 100;
                               return (
                                 <div key={idx} className="space-y-1.5">
                                   <div className="flex items-center justify-between">
                                      <p className="text-xs font-bold text-text-light dark:text-text-dark truncate mr-2">{service.name}</p>
                                      <span className="text-[10px] font-black text-text-light/40">{service.count}x</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary rounded-full transition-all duration-1000"
                                        style={{ width: `${percentage}%` }}
                                      />
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <p className="text-xs text-text-light/40 dark:text-text-dark/40 italic text-center py-4">No service history yet</p>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Notes & Preferences */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden shadow-sm">
                   <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
                      <div className="flex items-center gap-2">
                         <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <FileText className="w-4 h-4" />
                         </div>
                         <h3 className="text-sm font-black text-text-light dark:text-text-dark tracking-tight">Customer Notes & Preferences</h3>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowNotesModal(true)}
                        className="h-8 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Capture Note
                      </Button>
                   </div>
                   <div className="p-6">
                      {customerNotes ? (
                        <div className="bg-background-light/50 dark:bg-background-dark/50 border border-border-light/50 dark:border-border-dark/50 rounded-xl p-4">
                           <p className="text-sm text-text-light/70 dark:text-text-dark/70 leading-relaxed italic">
                             "{customerNotes}"
                           </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-background-light/30 dark:bg-background-dark/30 rounded-xl border border-dashed border-border-light dark:border-border-dark">
                           <FileText className="w-8 h-8 text-text-light/10 mb-2" />
                           <p className="text-xs text-text-light/40 dark:text-text-dark/40">No internal notes added yet for this customer.</p>
                        </div>
                      )}

                      {customerTags.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                           {customerTags.map((tag, idx) => (
                             <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary uppercase tracking-wide">
                                <Tag className="w-3 h-3 mr-1.5 opacity-50" />
                                {tag}
                             </span>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
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
                  <div className="text-center py-8 max-w-lg mx-auto border border-dashed border-border-light dark:border-border-dark rounded-xl bg-surface-light/50 dark:bg-surface-dark/50">
                    <ShoppingBag className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
                      No purchases found
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
                      New transactions will appear here after checkout
                    </p>
                  </div>
                ) : (
                  <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                          <tr>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Date
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Salon
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Items
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Payment
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Amount
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                          {sales.map((sale) => (
                            <tr 
                              key={sale.id}
                              className="hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-text-light/80 dark:text-text-dark/80 font-medium">
                                {format(parseISO(sale.createdAt), 'MMM d, yyyy')}
                                <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 mt-0.5 font-normal">
                                  {format(parseISO(sale.createdAt), 'h:mm a')}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-text-light dark:text-text-dark">
                                  <Building2 className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                                  {sale.salon?.name || 'Salon'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-[180px]">
                                  <p className="text-text-light/70 dark:text-text-dark/70 truncate">
                                    {(sale.items || []).map(i => i.service?.name || i.product?.name).join(', ') || '-'}
                                  </p>
                                  {(sale.items?.length || 0) > 1 && (
                                    <p className="text-[9px] text-primary font-bold uppercase mt-0.5">
                                      +{sale.items!.length - 1} more items
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-[10px] font-bold text-text-light/60 dark:text-text-dark/60 uppercase">
                                  {sale.paymentMethod.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-text-light dark:text-text-dark">
                                {sale.currency} {sale.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                                  sale.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {sale.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                  <div className="text-center py-8 max-w-lg mx-auto border border-dashed border-border-light dark:border-border-dark rounded-xl bg-surface-light/50 dark:bg-surface-dark/50">
                    <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
                      No appointments found
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1">
                      Schedule a new appointment to see history here
                    </p>
                  </div>
                ) : (
                  <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                          <tr>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Service Details
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Salon
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Date & Time
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50">
                              Status
                            </th>
                            <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wide text-text-light/50 dark:text-text-dark/50 text-right">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                          {appointments.map((appointment) => {
                             const aptDate = parseISO(appointment.scheduledStart);
                             const isPastApt = isPast(aptDate);
                             const isTodayApt = isToday(aptDate);
                             const isFutureApt = isFuture(aptDate);

                             return (
                              <tr 
                                key={appointment.id}
                                className="hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                      <Package className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-text-light dark:text-text-dark">
                                        {appointment.service?.name || 'Service'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-text-light dark:text-text-dark">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                                    {appointment.salon?.name || 'Salon'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-text-light/80 dark:text-text-dark/80 font-medium">
                                  {format(aptDate, 'MMM d, yyyy h:mm a')}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                     <span
                                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                                          appointment.status === 'completed'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : appointment.status === 'cancelled' || appointment.status === 'no_show'
                                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                              : appointment.status === 'confirmed'
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        }`}
                                      >
                                        {appointment.status.replace('_', ' ')}
                                      </span>
                                      {isTodayApt && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">
                                          Today
                                        </span>
                                      )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right max-w-[200px]">
                                  {appointment.notes ? (
                                    <p className="text-text-light/60 dark:text-text-dark/60 truncate" title={appointment.notes}>
                                      {appointment.notes}
                                    </p>
                                  ) : (
                                    <span className="text-text-light/20 dark:text-text-dark/20 text-[10px] italic">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                             );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Style References Tab */}
            {activeTab === 'references' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                      Style Gallery
                    </h3>
                    <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 uppercase tracking-wider font-medium">
                      Customer inspirations & history
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingReference(null);
                      setShowReferenceModal(true);
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Look
                  </Button>
                </div>

                {referencesLoading ? (
                  <div className="flex items-center justify-center py-12">
                     <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : styleReferences.length === 0 ? (
                  <div className="text-center py-10 max-w-lg mx-auto border border-dashed border-border-light dark:border-border-dark rounded-xl bg-surface-light/50 dark:bg-surface-dark/50">
                    <ImageIcon className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
                      No style references yet
                    </p>
                    <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-1 mb-4">
                      Upload photos to build a visual style history
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingReference(null);
                        setShowReferenceModal(true);
                      }}
                       className="mx-auto h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Upload First Look
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {styleReferences.map((reference) => (
                      <div
                        key={reference.id}
                        className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-all shadow-sm flex flex-col"
                      >
                        {/* Image Container */}
                        <div className="relative aspect-[4/5] bg-background-light dark:bg-background-dark overflow-hidden">
                          <Image
                            src={reference.imageUrl}
                            alt={reference.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                          
                          {/* Top Overlays */}
                          <div className="absolute top-2 left-2 flex gap-1">
                             <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide backdrop-blur-md ${
                               reference.sharedWithEmployees 
                               ? 'bg-emerald-500/80 text-white' 
                               : 'bg-black/60 text-white'
                             }`}>
                               {reference.sharedWithEmployees ? 'Shared' : 'Private'}
                             </div>
                          </div>

                          {/* Action Overlay (Visible on Hover) */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button
                               onClick={() => {
                                 setEditingReference(reference);
                                 setShowReferenceModal(true);
                               }}
                               className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors"
                               title="Edit"
                             >
                                <Edit className="w-4 h-4" />
                             </button>
                             <button
                                onClick={() => {
                                  if (confirm('Delete this look?')) deleteReferenceMutation.mutate(reference.id);
                                }}
                                className="p-2 bg-red-500/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors"
                                title="Delete"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                             <h4 className="text-xs font-bold text-text-light dark:text-text-dark truncate mb-0.5">
                               {reference.title}
                             </h4>
                             <p className="text-[10px] text-text-light/50 dark:text-text-dark/50">
                               {format(parseISO(reference.createdAt), 'MMM d, yyyy')}
                             </p>
                          </div>

                          {reference.tags && reference.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                               {reference.tags.slice(0, 2).map(tag => (
                                 <span key={tag} className="px-1.5 py-0.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded text-[9px] font-medium text-text-light/60 dark:text-text-dark/60">
                                   #{tag}
                                 </span>
                               ))}
                               {reference.tags.length > 2 && (
                                 <span className="text-[9px] text-text-light/40 dark:text-text-dark/40 font-bold ml-0.5">
                                   +{reference.tags.length - 2}
                                 </span>
                               )}
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border-light dark:border-border-dark flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Visual Preview / Upload Zone */}
        <div className="w-full md:w-1/2 bg-background-light dark:bg-background-dark border-r border-border-light dark:border-border-dark relative flex flex-col">
          <div className="absolute top-4 left-4 z-10">
             <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                Visual Preview
             </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 min-h-[300px]">
            {previewUrl ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border border-border-light dark:border-border-dark group">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                        if (uploadMethod === 'url') setFormData({...formData, imageUrl: ''});
                    }}
                    className="bg-white/20 text-white backdrop-blur-md border-white/20 hover:bg-white/40"
                   >
                     Change Image
                   </Button>
                </div>
              </div>
            ) : (
              <label 
                htmlFor="style-ref-file"
                className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                 <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-primary" />
                 </div>
                 <p className="text-sm font-bold text-text-light dark:text-text-dark">Select Look Photo</p>
                 <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">PNG, JPG up to 10MB</p>
                 <input
                    id="style-ref-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
              </label>
            )}
          </div>

          {/* Upload Method Switcher */}
          <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center gap-2">
             <button 
              type="button"
              onClick={() => setUploadMethod('file')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${uploadMethod === 'file' ? 'bg-primary text-white shadow-md' : 'text-text-light/50 hover:text-text-light hover:bg-background-light dark:hover:bg-background-dark'}`}
             >
                Local Upload
             </button>
             <button 
              type="button"
              onClick={() => setUploadMethod('url')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${uploadMethod === 'url' ? 'bg-primary text-white shadow-md' : 'text-text-light/50 hover:text-text-light hover:bg-background-light dark:hover:bg-background-dark'}`}
             >
                External URL
             </button>
          </div>
        </div>

        {/* Right Side: Metadata Form */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">
                {reference ? 'Refine Look' : 'New Style Entry'}
              </h2>
              <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 uppercase font-bold tracking-wider">
                Capturing customer inspiration
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full bg-background-light dark:bg-background-dark border-none"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {uploadMethod === 'url' && !previewUrl && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-[10px] font-black uppercase text-text-light/40 dark:text-text-dark/40 tracking-widest mb-1.5 ml-1">
                  Image URL
                </label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-text-light/40 dark:text-text-dark/40 tracking-widest mb-1.5 ml-1">
                Entry Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Summer Balayage Flow"
                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-text-light/40 dark:text-text-dark/40 tracking-widest mb-1.5 ml-1">
                  Category Tags
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-3 w-3.5 h-3.5 text-text-light/30" />
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="braids, formal, winter, bold"
                    className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-text-light/40 dark:text-text-dark/40 tracking-widest mb-1.5 ml-1">
                Technique Notes
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe formulas or specific requests..."
                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
              />
            </div>

            {/* Sharing Toggle Section */}
            <div 
              className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                formData.sharedWithEmployees 
                  ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10' 
                  : 'border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50 opacity-60'
              }`}
              onClick={() => setFormData({...formData, sharedWithEmployees: !formData.sharedWithEmployees})}
            >
              <div className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                formData.sharedWithEmployees 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : 'bg-transparent border-border-light dark:border-border-dark'
              }`}>
                {formData.sharedWithEmployees && <ShieldCheck className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-text-light dark:text-text-dark">Share with salon team</p>
                <p className="text-[10px] text-text-light/50 dark:text-text-dark/50 mt-0.5">Allow other stylists to view this look for coordination</p>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-background-light/50 dark:bg-background-dark/50 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-3">
            <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={onClose}
                className="px-6 h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                loading={loading} 
                loadingText="Saving Look..."
                onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                className="px-8 h-9 shadow-lg shadow-primary/20 text-xs font-bold"
            >
              {reference ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
