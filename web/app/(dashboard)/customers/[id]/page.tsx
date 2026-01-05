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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  ShieldOff,
  ShieldCheck,
  Trash2,
  MessageSquare,
  FileText,
  Tag,
  Award,
  TrendingDown,
  Bell,
  Download,
  Printer,
  MapPin,
  Heart,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isPast, isToday, isFuture } from 'date-fns';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt?: string;
  preferences?: Record<string, any>;
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

  const { data: statistics, isLoading: statsLoading } = useQuery<CustomerStatistics>({
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
    onError: (error: any) => {
      // Upload error occurred
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
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
  const sales = salesData?.data || [];

  // Load customer notes and tags from preferences
  useEffect(() => {
    if (customer?.preferences) {
      setCustomerNotes(customer.preferences.notes || '');
      setCustomerTags(customer.preferences.tags || []);
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Customer not found</p>
          <button
            onClick={() => router.push('/customers')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to Customers
          </button>
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

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/customers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {customer.fullName}
              </h1>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  customerSegment.color === 'purple'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : customerSegment.color === 'blue'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : customerSegment.color === 'green'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : customerSegment.color === 'yellow'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {customerSegment.label}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Customer Profile</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`tel:${customer.phone}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              title="Call customer"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </button>
            {customer.email && (
              <button
                onClick={() => window.open(`mailto:${customer.email}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                title="Email customer"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
            )}
            <button
              onClick={() => router.push(`/sales?customerId=${customerId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              title="Create new sale"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">New Sale</span>
            </button>
            <button
              onClick={() => router.push(`/appointments?customerId=${customerId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              title="Create new appointment"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Book</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Phone</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">{customer.phone}</p>
              </div>
              {customer.email && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{customer.email}</p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">Loyalty Points</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">
                  {customer.loyaltyPoints || 0} pts
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Member Since</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">
                  {format(parseISO(customer.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              {statistics?.lastVisitDate && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Visit</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {format(parseISO(statistics.lastVisitDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {nextAppointment && (
                <div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">Next Appointment</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {format(parseISO(nextAppointment.scheduledStart), 'MMM d, h:mm a')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {customerTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-400" />
                {customerTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Appointment Reminder */}
        {nextAppointment && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Upcoming Appointment
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {nextAppointment.service?.name || 'Service'} at{' '}
                  {nextAppointment.salon?.name || 'Salon'} on{' '}
                  {format(parseISO(nextAppointment.scheduledStart), 'EEEE, MMM d, yyyy at h:mm a')}
                </p>
              </div>
              <button
                onClick={() => router.push(`/appointments/${nextAppointment.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    RWF {statistics.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Visits
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.totalVisits}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Order Value
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    RWF {Math.round(statistics.averageOrderValue).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Favorite Salon
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                    {statistics.favoriteSalon?.name || 'N/A'}
                  </p>
                  {statistics.favoriteSalon && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {statistics.favoriteSalon.visits} visits
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Building2 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Customer Notes */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Internal Notes
                    </h3>
                    <button
                      onClick={() => setShowNotesModal(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {customerNotes ? 'Edit Notes' : 'Add Notes'}
                    </button>
                  </div>
                  {customerNotes ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {customerNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No notes added yet</p>
                    </div>
                  )}
                </div>

                {/* Preferred Services */}
                {preferredServices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Preferred Services
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {preferredServices.map((service, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {service.name}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {service.count}x
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((activity, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-shrink-0">
                          {activity.type === 'sale' ? (
                            <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {format(parseISO(activity.date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              activity.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : activity.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}
                          >
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                {salesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading purchases...</p>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">No purchases found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {sale.salon?.name || 'Salon'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {format(parseISO(sale.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {sale.currency} {sale.totalAmount.toLocaleString()}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                                sale.status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}
                            >
                              {sale.status}
                            </span>
                          </div>
                        </div>
                        {sale.items && sale.items.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Items:
                            </p>
                            <div className="space-y-2">
                              {sale.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {item.service?.name || item.product?.name} × {item.quantity}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
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
              <div className="space-y-4">
                {appointmentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading appointments...</p>
                  </div>
                ) : !appointments || appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">No appointments found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => {
                      const aptDate = parseISO(appointment.scheduledStart);
                      const isPastApt = isPast(aptDate);
                      const isTodayApt = isToday(aptDate);
                      const isFutureApt = isFuture(aptDate);

                      return (
                        <div
                          key={appointment.id}
                          className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {appointment.service?.name || 'Service'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  {appointment.salon?.name || 'Salon'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(aptDate, 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                              {appointment.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded ${
                                  appointment.status === 'completed'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : appointment.status === 'cancelled' ||
                                        appointment.status === 'no_show'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : appointment.status === 'confirmed'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}
                              >
                                {appointment.status}
                              </span>
                              {isTodayApt && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                  Today
                                </span>
                              )}
                              {isFutureApt && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                  Upcoming
                                </span>
                              )}
                              {isPastApt && appointment.status !== 'completed' && (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded">
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
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Styling References
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Visual history of looks the customer loves. Share with stylists for consistent
                      results.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingReference(null);
                      setShowReferenceModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Reference
                  </button>
                </div>

                {referencesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Loading styling references...
                    </p>
                  </div>
                ) : styleReferences.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      No styling references yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Save inspiration photos or past looks to guide future services.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {styleReferences.map((reference) => (
                      <div
                        key={reference.id}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition"
                      >
                        <div className="relative h-56 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={reference.imageUrl}
                            alt={reference.title}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-black/70 text-white">
                            {reference.sharedWithEmployees ? 'Shared with team' : 'Private'}
                          </div>
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {reference.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Saved {format(parseISO(reference.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  toggleShareMutation.mutate({
                                    id: reference.id,
                                    shared: !reference.sharedWithEmployees,
                                  })
                                }
                                className={`p-2 rounded-full border ${
                                  reference.sharedWithEmployees
                                    ? 'border-green-200 text-green-600 dark:border-green-800 dark:text-green-300'
                                    : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                                } hover:shadow`}
                                title={
                                  reference.sharedWithEmployees
                                    ? 'Hide from salon team'
                                    : 'Share with salon team'
                                }
                              >
                                {reference.sharedWithEmployees ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  <ShieldOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingReference(reference);
                                  setShowReferenceModal(true);
                                }}
                                className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:shadow"
                                title="Edit reference"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm('Delete this reference? This action cannot be undone.')
                                  ) {
                                    deleteReferenceMutation.mutate(reference.id);
                                  }
                                }}
                                className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete reference"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {reference.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {reference.description}
                            </p>
                          )}
                          {reference.tags && reference.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {reference.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full text-xs font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {reference.appointment && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
                              Captured during{' '}
                              {reference.appointment.service?.name || 'an appointment'} at{' '}
                              {reference.appointment.salon?.name || 'the salon'}
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
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">No activity found</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="space-y-6">
                      {activities.map((activity, idx) => (
                        <div key={idx} className="relative flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center z-10">
                            {activity.type === 'sale' ? (
                              <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {activity.title}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {activity.description}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    {format(parseISO(activity.date), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    activity.status === 'completed'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : activity.status === 'cancelled' ||
                                          activity.status === 'no_show'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Customer Notes & Tags
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Internal notes visible only to salon staff
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Add internal notes about this customer..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (separate with commas)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="VIP, Regular, Preferred, etc."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Notes'}
            </button>
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {reference ? 'Edit Styling Reference' : 'Add Styling Reference'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload inspiration photos or finished looks for future visits.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image *
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setUploadMethod('file')}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    uploadMethod === 'file'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('url')}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    uploadMethod === 'url'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  Use URL
                </button>
              </div>
              {uploadMethod === 'file' ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {previewUrl && (
                    <div className="mt-3">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="url"
                  required={uploadMethod === 'url'}
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (separate with commas)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="braids, balayage, formal"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <input
              type="checkbox"
              checked={formData.sharedWithEmployees}
              onChange={(e) => setFormData({ ...formData, sharedWithEmployees: e.target.checked })}
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Share with salon team
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow stylists to view this reference before and during services.
              </p>
            </div>
          </label>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : reference ? 'Update Reference' : 'Save Reference'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
