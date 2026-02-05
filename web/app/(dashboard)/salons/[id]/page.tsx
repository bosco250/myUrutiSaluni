'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  ArrowLeft,
  Calendar,
  FileText,
  UserPlus,
  AlertCircle,
  UserCheck,
  Eye,
  Calculator,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Clock,
  Scissors,
  Sparkles,
  Heart,
  Star,
  Car,
  User,
  ChevronLeft,
  ChevronRight,
  Edit,
  ExternalLink,
  Instagram,
  Facebook,
  Twitter,
  Package,
  ShoppingBag,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import SalonLocationMap from '@/components/maps/SalonLocationMap';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DocumentStatusCard from '@/components/salon/DocumentStatusCard';

interface Salon {
  id: string;
  name: string;
  registrationNumber?: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  ownerId: string;
  image?: string;
  images?: string[];
  owner?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  settings?: {
    numberOfEmployees?: number;
    employeeCount?: number;
    businessType?: string;
    businessTypes?: string[];
    targetClientele?: string;
    operatingHours?: string;
    openingDate?: string;
    licenseNumber?: string;
    taxId?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
}

// Business type icons mapping
const BUSINESS_ICONS: Record<string, React.ElementType> = {
  hair_salon: Scissors,
  beauty_spa: Sparkles,
  nail_salon: Heart,
  barbershop: Scissors,
  full_service: Star,
  mobile: Car,
};

const CLIENTELE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  men: { label: 'Men', icon: User },
  women: { label: 'Women', icon: User },
  both: { label: 'Everyone', icon: Users },
};

function isSalonOpen(operatingHours?: string): boolean {
  if (!operatingHours) return false;
  try {
    const hours = JSON.parse(operatingHours);
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = hours[day];

    if (!todayHours || !todayHours.isOpen) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    return currentTime >= openTime && currentTime <= closeTime;
  } catch {
    return false;
  }
}

export default function SalonDetailPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.DISTRICT_LEADER,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
      ]}
    >
      <SalonDetailContent />
    </ProtectedRoute>
  );
}

function SalonDetailContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const { user } = useAuthStore();
  const { canManageSalons, hasAnyRole, isSalonOwner, isSalonEmployee } = usePermissions();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch salon details
  const {
    data: salon,
    isLoading,
    error,
  } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}`);
      return response.data?.data || response.data;
    },
    enabled: !!salonId,
  });

  // Check if current user is an employee of this salon
  const { data: isEmployeeOfSalon } = useQuery({
    queryKey: ['is-salon-employee', salonId, user?.id],
    queryFn: async () => {
      if (!user || (!isSalonEmployee() && !isSalonOwner())) return false;
      try {
        const response = await api.get(`/salons/${salonId}/employees`);
        const employees = response.data?.data || response.data || [];
        return Array.isArray(employees) && employees.some((emp: any) => emp.userId === user.id);
      } catch {
        return false;
      }
    },
    enabled: !!salonId && !!user && (isSalonEmployee() || isSalonOwner()),
  });

  // Check if user can access this salon
  const canAccess =
    salon &&
    user &&
    (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]) ||
      salon.ownerId === user.id ||
      (isSalonOwner() && salon.ownerId === user.id) || 
      isEmployeeOfSalon);

  const canEdit =
    canManageSalons() &&
    salon &&
    (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) || user?.id === salon?.ownerId);

  // Fetch customer analytics for quick stats
  const { data: customerAnalytics } = useQuery({
    queryKey: ['salon-customer-analytics', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/customers/analytics`);
        return response.data?.data || response.data;
      } catch {
        return null;
      }
    },
    enabled: !!salonId && !!canEdit,
  });

  // Fetch employees to get actual count
  const { data: employees = [] } = useQuery({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/employees`);
        const employeesData = response.data?.data || response.data;
        return Array.isArray(employeesData) ? employeesData : [];
      } catch {
        return [];
      }
    },
    enabled: !!salonId,
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/services`, { params: { salonId } });
        const servicesData = response.data?.data || response.data;
        return Array.isArray(servicesData) ? servicesData : [];
      } catch {
        return [];
      }
    },
    enabled: !!salonId,
  });

  // Fetch documents for status card
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['salon-documents', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/salons/${salonId}/documents`);
        const docsData = response.data?.data || response.data;
        return Array.isArray(docsData) ? docsData : [];
      } catch {
        return [];
      }
    },
    enabled: !!salonId && !!canEdit,
  });

  // Calculate document status
  const totalRequiredDocs = 4; // business_license, owner_id, tax_id, proof_of_address
  const uploadedDocsCount = documents.length;
  const documentStatus = (() => {
    if (uploadedDocsCount === 0) return 'incomplete';
    if (documents.some((d: any) => d.status === 'expired')) return 'expired';
    if (documents.every((d: any) => d.status === 'approved') && uploadedDocsCount >= totalRequiredDocs) return 'verified';
    if (documents.some((d: any) => d.status === 'pending')) return 'pending';
    if (uploadedDocsCount < totalRequiredDocs) return 'incomplete';
    return 'pending';
  })();
  const lastDocUpdate = documents.length > 0 
    ? new Date(Math.max(...documents.map((d: any) => new Date(d.updatedAt || d.createdAt).getTime()))).toLocaleDateString()
    : undefined;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-text-light/60 dark:text-text-dark/60">Loading salon details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-danger/10 border border-danger rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-danger" />
            <p className="text-danger font-semibold text-sm">Salon not found</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 text-xs mt-2">
            The salon you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Button onClick={() => router.push('/salons')} variant="secondary" size="sm" className="mt-3">
            <ArrowLeft className="w-4 h-4" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-warning/10 border border-warning rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-warning font-semibold text-sm">Access Denied</p>
          </div>
          <p className="text-text-light/60 dark:text-text-dark/60 text-xs mt-2">
            You can only view your own salon.
          </p>
          <Button onClick={() => router.push('/salons')} variant="secondary" size="sm" className="mt-3">
            <ArrowLeft className="w-4 h-4" />
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-success/20 text-success border-success/30',
    inactive: 'bg-text-light/10 dark:bg-text-dark/10 text-text-light/60 dark:text-text-dark/60 border-border-light dark:border-border-dark',
    pending: 'bg-warning/20 text-warning border-warning/30',
  };

  const allImages = salon.images?.length ? salon.images : salon.image ? [salon.image] : [];
  const isOpen = isSalonOpen(salon.settings?.operatingHours);

  const nextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  // Stat Card Component
  function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
    return (
      <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-3 flex items-center gap-2">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
          <p className="text-[10px] text-gray-900/60 dark:text-white/60 uppercase tracking-wider font-semibold">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push('/salons')} variant="secondary" size="sm" className="h-9 w-9 p-0 flex items-center justify-center rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{salon.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive}`}>
                {salon.status}
              </span>
              {isOpen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-500/20">
                  <Clock className="w-3 h-3" />
                  Open Now
                </span>
              )}
              {salon.registrationNumber && (
                <span className="text-[11px] font-medium text-gray-900/40 dark:text-white/40">
                  ID: {salon.registrationNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/salons/${salon.id}/customers`}>
              <Button variant="primary" size="sm" className="h-9">
                <UserCheck className="w-4 h-4 mr-2" />
                Customers
              </Button>
            </Link>
            <Link href={`/salons/${salon.id}/employees`}>
              <Button variant="outline" size="sm" className="h-9">
                <UserPlus className="w-4 h-4 mr-2" />
                Staff
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Image & Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Hero Card */}
          <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Business Chips Over Image */}
            <div className="relative group">
              {allImages.length > 0 ? (
                <div className="h-64 sm:h-80 relative">
                  <img
                    src={allImages[currentImageIndex]}
                    alt={`${salon.name}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  
                  {allImages.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-gray-200 dark:text-gray-800" />
                </div>
              )}

              {/* Badges Overlaid on Brand Area */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {salon.settings?.businessTypes?.map((type) => {
                  const Icon = BUSINESS_ICONS[type] || Star;
                  return (
                    <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-wider shadow-sm border border-gray-200 dark:border-gray-800">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      {type.replace('_', ' ')}
                    </span>
                  );
                })}
                {salon.settings?.targetClientele && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-wider shadow-sm border border-gray-200 dark:border-gray-800">
                    {(() => {
                      const clientele = CLIENTELE_LABELS[salon.settings.targetClientele];
                      const Icon = clientele?.icon || Users;
                      return <Icon className="w-3.5 h-3.5 text-secondary" />;
                    })()}
                    {CLIENTELE_LABELS[salon.settings.targetClientele]?.label || salon.settings.targetClientele}
                  </span>
                )}
              </div>
            </div>

            {/* Description Section */}
            {salon.description && (
              <div className="p-5 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest mb-3">About the Salon</h3>
                <p className="text-sm text-gray-700 dark:text-white/80 leading-relaxed font-medium">
                  {salon.description}
                </p>
              </div>
            )}
          </div>

          {/* Contact & Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-5">
              <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest mb-4">Contact Details</h3>
              <div className="space-y-4">
                {salon.address && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800">
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Location</p>
                      <p className="text-sm text-gray-900 dark:text-white font-semibold truncate">{salon.address}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{[salon.city, salon.district].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                )}
                {salon.phone && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                      <a href={`tel:${salon.phone}`} className="text-sm text-gray-900 dark:text-white font-bold hover:text-primary transition">{salon.phone}</a>
                    </div>
                  </div>
                )}
                {salon.email && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Email Address</p>
                      <a href={`mailto:${salon.email}`} className="text-sm text-gray-900 dark:text-white font-bold hover:text-primary transition truncate block">{salon.email}</a>
                    </div>
                  </div>
                )}
                {salon.website && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800">
                      <Globe className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Website</p>
                      <a href={salon.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-bold hover:underline flex items-center gap-1.5 truncate">
                        {salon.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-3 flex flex-col">
              <div className="flex-1 rounded-lg overflow-hidden relative">
                <SalonLocationMap
                  latitude={salon.latitude || -1.9441}
                  longitude={salon.longitude || 30.0619}
                  salonName={salon.name}
                  address={salon.address}
                  height="100%"
                />
              </div>
              <div className="mt-3 px-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2 rounded bg-gray-100 dark:bg-gray-900 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">MAP VIEW</div>
                </div>
                {salon.latitude && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{salon.latitude.toFixed(4)}, {salon.longitude?.toFixed(4)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Services Section */}
          {services.length > 0 && (
            <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest">Services Offered</h3>
                <Link href={`/services?salonId=${salon.id}`} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Manage Services →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.slice(0, 6).map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{service.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{service.duration} mins • {service.category || 'General'}</p>
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-white">{(service.price || 0).toLocaleString()} RWF</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Stats & Actions */}
        <div className="space-y-4">
          {/* Document Status - Only for Salon Owners */}
          {isSalonOwner() && user?.id === salon?.ownerId && (
            <DocumentStatusCard 
              status={documentStatus as 'pending' | 'verified' | 'incomplete' | 'expired'}
              documentsCount={uploadedDocsCount}
              totalRequired={totalRequiredDocs}
              lastUpdated={lastDocUpdate}
              salonId={salonId}
            />
          )}

          {/* Stats Grid - Using Shared Pattern */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Staff" value={employees.length} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
            <StatCard label="Customers" value={customerAnalytics?.totalCustomers || 0} icon={UserCheck} color="text-green-600" bg="bg-green-500/10" />
            <StatCard label="Services" value={services.length} icon={Scissors} color="text-purple-600" bg="bg-purple-500/10" />
            <StatCard label="New (30d)" value={customerAnalytics?.newCustomers || 0} icon={TrendingUp} color="text-yellow-600" bg="bg-yellow-500/10" />
          </div>

          {/* Quick Management Actions Grid - No Gradients */}
          <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest mb-4">Management Hub</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bookings', icon: Calendar, href: `/appointments?salonId=${salon.id}`, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10' },
                { label: 'Staff', icon: UserPlus, href: `/salons/${salon.id}/employees`, color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10' },
                { label: 'Customers', icon: UserCheck, href: `/salons/${salon.id}/customers`, color: 'bg-green-50 text-green-600 dark:bg-green-500/10' },
                { label: 'Payroll', icon: Calculator, href: `/payroll?salonId=${salon.id}`, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' },
                { label: 'Inventory', icon: Package, href: `/inventory?salonId=${salon.id}`, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' },
                { label: 'Services', icon: Scissors, href: `/services?salonId=${salon.id}`, color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' },
                { label: 'Sales', icon: ShoppingBag, href: `/sales?salonId=${salon.id}`, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' },
                { label: 'Finance', icon: DollarSign, href: `/commissions`, color: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' },
                { label: 'Settings', icon: Settings, href: `/salons/${salon.id}/edit`, color: 'bg-gray-50 text-gray-600 dark:bg-gray-500/10' },
              ].map((action) => (
                <Link key={action.label} href={action.href} className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800">
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 text-center leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Business Metadata */}
          <div className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-2xl p-5 space-y-5">
            {/* Owner Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest mb-3">Owner</h3>
              {salon.owner ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{salon.owner.fullName}</p>
                    <p className="text-[11px] text-gray-400 font-medium truncate">{salon.owner.email || 'No email registered'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Owner info not found</p>
              )}
            </div>

            {/* Business IDs */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-900/40 dark:text-white/40 uppercase tracking-widest mb-3">Business Records</h3>
              <div className="space-y-3">
                {[
                  { label: 'License No.', value: salon.settings?.licenseNumber },
                  { label: 'Tax Identification', value: salon.settings?.taxId },
                  { label: 'Opening Date', value: salon.settings?.openingDate ? new Date(salon.settings.openingDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null },
                  { label: 'Registered On', value: new Date(salon.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) },
                ].map((item) => item.value ? (
                  <div key={item.label} className="flex justify-between items-center gap-4">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{item.value}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Social Links */}
            {(salon.settings?.facebookUrl || salon.settings?.instagramUrl || salon.settings?.twitterUrl) && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-2">
                  {salon.settings.facebookUrl && (
                    <a href={salon.settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 rounded-xl transition border border-transparent hover:border-blue-100 dark:hover:border-blue-900/50">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {salon.settings.instagramUrl && (
                    <a href={salon.settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-gray-400 hover:text-pink-500 rounded-xl transition border border-transparent hover:border-pink-100 dark:hover:border-pink-900/50">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {salon.settings.twitterUrl && (
                    <a href={salon.settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-gray-400 hover:text-sky-500 rounded-xl transition border border-transparent hover:border-sky-100 dark:hover:border-sky-900/50">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
