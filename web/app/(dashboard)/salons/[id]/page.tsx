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
  const { canManageSalons, hasAnyRole, isSalonOwner } = usePermissions();
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
      return response.data;
    },
    enabled: !!salonId,
  });

  // Check if user can access this salon
  const canAccess =
    salon &&
    user &&
    (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER]) ||
      salon.ownerId === user.id ||
      (isSalonOwner() && salon.ownerId === user.id));

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
        return response.data;
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
        return response.data || [];
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
        const response = await api.get(`/salons/${salonId}/services`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!salonId,
  });

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push('/salons')} variant="secondary" size="sm" className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">{salon.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Status */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[salon.status as keyof typeof statusColors] || statusColors.inactive}`}>
                {salon.status}
              </span>
              {/* Open Now */}
              {isOpen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                  <Clock className="w-3 h-3" />
                  Open Now
                </span>
              )}
              {/* Registration Number */}
              {salon.registrationNumber && (
                <span className="text-xs text-text-light/60 dark:text-text-dark/60">
                  #{salon.registrationNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/salons/${salon.id}/customers`}>
              <Button variant="primary" size="sm">
                <UserCheck className="w-4 h-4" />
                Customers
              </Button>
            </Link>
            <Link href={`/salons/${salon.id}/employees`}>
              <Button variant="secondary" size="sm">
                <UserPlus className="w-4 h-4" />
                Staff
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Business Types & Clientele */}
      <div className="flex flex-wrap gap-2">
        {salon.settings?.businessTypes?.map((type) => {
          const Icon = BUSINESS_ICONS[type] || Star;
          return (
            <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </span>
          );
        })}
        {!salon.settings?.businessTypes && salon.settings?.businessType && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium capitalize">
            <Star className="w-3.5 h-3.5" />
            {salon.settings.businessType.replace('_', ' ')}
          </span>
        )}
        {salon.settings?.targetClientele && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-medium">
            {(() => {
              const clientele = CLIENTELE_LABELS[salon.settings.targetClientele];
              const Icon = clientele?.icon || Users;
              return (
                <>
                  <Icon className="w-3.5 h-3.5" />
                  {clientele?.label || salon.settings.targetClientele}
                </>
              );
            })()}
          </span>
        )}
      </div>

      {/* Image Gallery */}
      {allImages.length > 0 && (
        <div className="relative rounded-xl overflow-hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
          <div className="h-48 sm:h-56 relative">
            <img
              src={allImages[currentImageIndex]}
              alt={`${salon.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {salon.description && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                About
              </h2>
              <p className="text-sm text-text-light/80 dark:text-text-dark/80 leading-relaxed">
                {salon.description}
              </p>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {salon.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">Address</p>
                    <p className="text-sm text-text-light dark:text-text-dark">{salon.address}</p>
                    {(salon.city || salon.district) && (
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-0.5">
                        {[salon.city, salon.district, salon.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {salon.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">Phone</p>
                    <a href={`tel:${salon.phone}`} className="text-sm text-text-light dark:text-text-dark hover:text-primary transition">
                      {salon.phone}
                    </a>
                  </div>
                </div>
              )}
              {salon.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">Email</p>
                    <a href={`mailto:${salon.email}`} className="text-sm text-text-light dark:text-text-dark hover:text-primary transition">
                      {salon.email}
                    </a>
                  </div>
                </div>
              )}
              {salon.website && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">Website</p>
                    <a href={salon.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      {salon.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media */}
            {(salon.settings?.facebookUrl || salon.settings?.instagramUrl || salon.settings?.twitterUrl) && (
              <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light/60 dark:text-text-dark/60 mb-2">Social Media</p>
                <div className="flex gap-2">
                  {salon.settings.facebookUrl && (
                    <a href={salon.settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {salon.settings.instagramUrl && (
                    <a href={salon.settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 rounded-lg transition">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {salon.settings.twitterUrl && (
                    <a href={salon.settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 rounded-lg transition">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Services Preview */}
          {services.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-text-light dark:text-text-dark">Services</h2>
                <span className="text-xs text-text-light/60 dark:text-text-dark/60">{services.length} available</span>
              </div>
              <div className="space-y-2">
                {services.slice(0, 5).map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-background-light dark:bg-background-dark rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">{service.name}</p>
                      <p className="text-xs text-text-light/60 dark:text-text-dark/60">{service.duration} min</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{service.price.toLocaleString()} RWF</span>
                  </div>
                ))}
              </div>
              {services.length > 5 && (
                <Link href={`/salons/${salon.id}/services`} className="block mt-3 text-center text-xs text-primary hover:underline">
                  View all {services.length} services →
                </Link>
              )}
            </div>
          )}

          {/* Location */}
          {salon.latitude && salon.longitude && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Location</h2>
              <div className="rounded-lg overflow-hidden">
                <SalonLocationMap
                  latitude={salon.latitude}
                  longitude={salon.longitude}
                  salonName={salon.name}
                  address={salon.address}
                  height="250px"
                />
              </div>
              <p className="text-xs text-text-light/60 dark:text-text-dark/60 mt-2">
                {salon.latitude.toFixed(6)}, {salon.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-text-light dark:text-text-dark">{employees.length}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase">Staff</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 text-center">
                <UserCheck className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-xl font-bold text-text-light dark:text-text-dark">{customerAnalytics?.totalCustomers || 0}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase">Customers</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 text-center">
                <Scissors className="w-5 h-5 mx-auto mb-1 text-secondary" />
                <p className="text-xl font-bold text-text-light dark:text-text-dark">{services.length}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase">Services</p>
              </div>
              <div className="bg-background-light dark:bg-background-dark rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-xl font-bold text-text-light dark:text-text-dark">{customerAnalytics?.newCustomers || 0}</p>
                <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 uppercase">New (30d)</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {canEdit && (
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
              <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/salons/${salon.id}/customers`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserCheck className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Customers</span>
                </Link>
                <Link href={`/salons/${salon.id}/employees`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Staff</span>
                </Link>
                <Link href={`/payroll?salonId=${salon.id}`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Payroll</span>
                </Link>
                <Link href={`/commissions`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Commission</span>
                </Link>
                <Link href={`/services?salonId=${salon.id}`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scissors className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Services</span>
                </Link>
                <Link href={`/inventory?salonId=${salon.id}`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Products</span>
                </Link>
                <Link href={`/sales?salonId=${salon.id}`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Sales</span>
                </Link>
                <Link href={`/appointments?salonId=${salon.id}`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Bookings</span>
                </Link>
                <Link href={`/salons/${salon.id}/edit`} className="flex flex-col items-center gap-1.5 p-3 bg-background-light dark:bg-background-dark rounded-lg hover:bg-primary/10 transition group">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-gray-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-text-light dark:text-text-dark">Settings</span>
                </Link>
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Owner</h2>
            {salon.owner ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{salon.owner.fullName}</p>
                  {salon.owner.email && (
                    <p className="text-xs text-text-light/60 dark:text-text-dark/60">{salon.owner.email}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-light/60 dark:text-text-dark/60">Owner information not available</p>
            )}
          </div>

          {/* Business Info */}
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4">
            <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-3">Business Info</h2>
            <div className="space-y-2 text-xs">
              {salon.settings?.licenseNumber && (
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">License #</span>
                  <span className="text-text-light dark:text-text-dark font-medium">{salon.settings.licenseNumber}</span>
                </div>
              )}
              {salon.settings?.taxId && (
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Tax ID</span>
                  <span className="text-text-light dark:text-text-dark font-medium">{salon.settings.taxId}</span>
                </div>
              )}
              {salon.settings?.openingDate && (
                <div className="flex justify-between">
                  <span className="text-text-light/60 dark:text-text-dark/60">Opened</span>
                  <span className="text-text-light dark:text-text-dark font-medium">{new Date(salon.settings.openingDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-light/60 dark:text-text-dark/60">Created</span>
                <span className="text-text-light dark:text-text-dark">{new Date(salon.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light/60 dark:text-text-dark/60">Updated</span>
                <span className="text-text-light dark:text-text-dark">{new Date(salon.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
