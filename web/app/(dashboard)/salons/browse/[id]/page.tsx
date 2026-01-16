'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowLeft,
  Star,
  Share2,
  Heart,
  Globe,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Users,
  Tag,
  MessageCircle,
  Building2,
  User,
  CheckCircle2,
  X,
  ZoomIn,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import SalonLocationMap from '@/components/maps/SalonLocationMap';
import CustomerBookingModal from '@/components/appointments/CustomerBookingModal';

// --- Interfaces ---

interface DayHours {
  isOpen: boolean;
  open?: string;
  close?: string;
  openTime?: string;
  closeTime?: string;
  startTime?: string;
  endTime?: string;
}

interface WorkingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

interface Salon {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  website?: string;
  status?: string;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  city?: string;
  district?: string;
  country?: string;
  images?: string[];
  registrationNumber?: string;
  businessType?: string;
  targetClientele?: string;
  operatingHours?: WorkingHours;
  businessHours?: WorkingHours;
  employeeCount?: number;
  settings?: {
    operatingHours?: string | WorkingHours;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  salonId: string;
  category?: string;
  targetGender?: string;
  images?: string[];
  imageUrl?: string;
  code?: string;
}

interface Employee {
  id: string;
  salonId: string;
  roleTitle?: string;
  skills?: string[];
  isActive: boolean;
  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

type TabType = 'overview' | 'services' | 'team' | 'gallery';

// --- Constants ---

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hair_salon: 'Hair Salon',
  beauty_spa: 'Beauty Spa',
  nail_salon: 'Nail Salon',
  barbershop: 'Barbershop',
  full_service: 'Full Service',
  mobile: 'Mobile Service',
  other: 'Beauty Center',
};

const CLIENTELE_LABELS: Record<string, string> = {
  men: 'Men Only',
  women: 'Women Only',
  both: 'Unisex',
  kids: 'Kids Friendly',
};

const DAYS_ORDER: (keyof WorkingHours)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// --- Components ---

export default function SalonDetailsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.CUSTOMER, UserRole.SALON_EMPLOYEE]}>
      <SalonDetailsContent />
    </ProtectedRoute>
  );
}

function SalonDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id as string;
  const { user: authUser } = useAuthStore();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [serviceImageIndex, setServiceImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const queryClient = useQueryClient();

  // Queries
  const {
    data: salon,
    isLoading: isLoadingSalon,
    error: salonError,
  } = useQuery<Salon>({
    queryKey: ['salon', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}?browse=true`);
      const salonData = response.data?.data || response.data;
      return {
        ...salonData,
        rating: salonData.rating || 4.5 + Math.random() * 0.5,
        reviewCount: salonData.reviewCount || Math.floor(Math.random() * 200) + 20,
      };
    },
    enabled: !!salonId,
  });

  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      const response = await api.get(`/services?salonId=${salonId}`);
      const servicesData = response.data?.data || response.data;
      return Array.isArray(servicesData) ? servicesData : [];
    },
    enabled: !!salonId,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['salon-employees', salonId],
    queryFn: async () => {
      const response = await api.get(`/salons/${salonId}/employees?browse=true`);
      const employeesData = response.data?.data || response.data;
      return Array.isArray(employeesData) ? employeesData : [];
    },
    enabled: !!salonId,
  });

  const { data: customer } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${authUser?.id}`);
      return response.data;
    },
    enabled: !!authUser?.id,
  });

  // Derived State
  const activeServices = useMemo(() => services?.filter((s) => s.isActive) || [], [services]);
  const activeEmployees = useMemo(() => employees?.filter((e) => e.isActive) || [], [employees]);
  const hasImages = salon?.images && salon.images.length > 0;

  const gradients = [
    'from-slate-800 to-slate-900',
    'from-neutral-800 to-stone-900',
    'from-zinc-800 to-neutral-900',
  ];
  const gradientIndex = salonId ? salonId.charCodeAt(0) % gradients.length : 0;
  const bgGradient = gradients[gradientIndex];

  const getWorkingHours = useCallback((): WorkingHours | null => {
    // Check direct salon properties first
    if (salon?.operatingHours) return salon.operatingHours;
    if (salon?.businessHours) return salon.businessHours;
    
    // Check settings.workingHours (used by mobile app during salon creation)
    if (salon?.settings?.workingHours) {
      const hours = salon.settings.workingHours;
      if (typeof hours === 'string') {
        try {
          return JSON.parse(hours);
        } catch {
          return null;
        }
      }
      return hours as WorkingHours;
    }
    
    // Also check settings.operatingHours as fallback
    if (salon?.settings?.operatingHours) {
      const hours = salon.settings.operatingHours;
      if (typeof hours === 'string') {
        try {
          return JSON.parse(hours);
        } catch {
          return null;
        }
      }
      return hours as WorkingHours;
    }
    
    return null;
  }, [salon]);

  const workingHours = useMemo(() => (salon ? getWorkingHours() : null), [salon, getWorkingHours]);

  const openStatus = useMemo(() => {
    if (!workingHours)
      return {
        isOpen: salon?.status === 'active',
        label: salon?.status === 'active' ? 'Open' : 'Closed',
      };

    const days: (keyof WorkingHours)[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const todayHours = workingHours[dayName];

    if (!todayHours || !todayHours.isOpen) return { isOpen: false, label: 'Closed' };

    const openTime = todayHours.open || todayHours.openTime || todayHours.startTime || '09:00';
    const closeTime = todayHours.close || todayHours.closeTime || todayHours.endTime || '18:00';

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return { isOpen: true, label: `Open until ${closeTime}` };
    }
    return { isOpen: false, label: 'Closed' };
  }, [workingHours, salon?.status]);

  const location =
    [salon?.district, salon?.city].filter(Boolean).join(', ') ||
    salon?.address ||
    'Location unavailable';
  const businessType = BUSINESS_TYPE_LABELS[salon?.businessType || 'other'] || 'Beauty Center';
  const clientele = CLIENTELE_LABELS[salon?.targetClientele || 'both'] || 'Unisex';

  const nextImage = () =>
    hasImages && setCurrentImageIndex((prev) => (prev + 1) % salon!.images!.length);
  const prevImage = () =>
    hasImages &&
    setCurrentImageIndex((prev) => (prev - 1 + salon!.images!.length) % salon!.images!.length);

  // Loading & Error States
  if (isLoadingSalon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-text-secondary">Loading salon details...</p>
        </div>
      </div>
    );
  }

  if (salonError || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center p-8 max-w-sm mx-auto">
          <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
            Salon Not Found
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            The salon you are looking for does not exist or has been removed.
          </p>
          <Button onClick={() => router.push('/salons/browse')} variant="primary">
            Back to Salons
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* --- HERO SECTION --- */}
      <div className="relative h-[400px] w-full group">
        <div
          className={`absolute inset-0 overflow-hidden ${hasImages ? '' : `bg-gradient-to-br ${bgGradient}`}`}
        >
          {hasImages ? (
            <>
              <Image
                src={salon.images![currentImageIndex]}
                alt={salon.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Scissors className="w-64 h-64 text-white" />
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/salons/browse')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="p-0 w-10 h-10 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="p-0 w-10 h-10 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              title="Save"
            >
              <Heart className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Hero Image Navigation */}
        {hasImages && salon.images!.length > 1 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="p-0 w-10 h-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="p-0 w-10 h-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-semibold tracking-wide uppercase">
                {businessType}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-semibold tracking-wide uppercase">
                {clientele}
              </span>
              <span
                className={`px-3 py-1 rounded-full backdrop-blur-md border border-white/10 text-xs font-semibold tracking-wide uppercase ${openStatus.isOpen ? 'bg-success/80 text-white' : 'bg-error/80 text-white'}`}
              >
                {openStatus.label}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
              {salon.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90 font-medium">
              <div className="flex items-center gap-2">
                <div className="flex text-warning">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <span className="text-white text-lg font-bold">{salon.rating?.toFixed(1)}</span>
                <span className="text-white/60 font-normal">({salon.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/80" />
                <span>
                  {location}, {salon.country || 'Rwanda'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-30 -mt-8">
        {/* ACTION BAR CARD */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-xl shadow-black/5 border border-border-light dark:border-border-dark p-4 md:p-6 mb-8 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex-1 w-full flex items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1 md:flex-none md:min-w-[200px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold text-base"
              onClick={() => setActiveTab('services')}
            >
              Book Appointment
            </Button>
            <div className="flex gap-2">
              {salon.phone && (
                <Button
                  variant="outline"
                  size="lg"
                  className="aspect-square p-0 w-12 flex items-center justify-center rounded-xl"
                  onClick={() => window.open(`sms:${salon.phone}`)}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              )}
              {salon.phone && (
                <Button
                  variant="outline"
                  size="lg"
                  className="aspect-square p-0 w-12 flex items-center justify-center rounded-xl"
                  onClick={() => window.open(`tel:${salon.phone}`)}
                >
                  <Phone className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className="flex p-1 bg-background-secondary dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
              {(['overview', 'services', 'team', 'gallery'] as TabType[]).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'secondary' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className={`
                        relative px-6 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all whitespace-nowrap border-0 shadow-none hover:bg-transparent
                        ${activeTab === tab ? 'bg-surface-light dark:bg-background-dark text-primary shadow-sm' : 'bg-transparent text-text-secondary hover:text-text-light dark:hover:text-text-dark'}
                      `}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN (MAIN) */}
          <div className="lg:col-span-8 space-y-8">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 border border-border-light dark:border-border-dark shadow-sm">
                  <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">
                    About {salon.name}
                  </h2>
                  <p className="text-text-light dark:text-text-dark leading-relaxed text-base opacity-80">
                    {salon.description ||
                      'Welcome to our premium salon experience. We offer a wide range of beauty and wellness services tailored to your needs. Our dedicated team of professionals is here to ensure you leave feeling refreshed and confident.'}
                  </p>

                  <div className="mt-8 pt-8 border-t border-border-light dark:border-border-dark">
                    <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-4 uppercase tracking-wider">
                      Amenities
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {[
                        'Free Wi-Fi',
                        'Parking',
                        'Air Conditioning',
                        'Beverages',
                        'Credit Cards',
                      ].map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-secondary dark:bg-background-dark text-xs font-medium text-text-light dark:text-text-dark border border-border-light dark:border-border-dark"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {amenity}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 border border-border-light dark:border-border-dark shadow-sm">
                  <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">
                    Contact & Info
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        icon: Phone,
                        label: 'Phone',
                        value: salon.phone,
                        href: `tel:${salon.phone}`,
                      },
                      {
                        icon: Mail,
                        label: 'Email',
                        value: salon.email,
                        href: `mailto:${salon.email}`,
                      },
                      {
                        icon: Globe,
                        label: 'Website',
                        value: salon.website?.replace(/^https?:\/\//, ''),
                        href: salon.website,
                      },
                      { icon: MapPin, label: 'Address', value: salon.address },
                    ].map((item, i) =>
                      item.value ? (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-4 rounded-xl bg-background-secondary dark:bg-background-dark border border-transparent hover:border-primary/20 transition-colors"
                        >
                          <div className="p-2.5 rounded-lg bg-surface-light dark:bg-surface-dark shadow-sm text-primary">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">
                              {item.label}
                            </p>
                            {item.href ? (
                              <a
                                href={item.href}
                                target={item.label === 'Website' ? '_blank' : undefined}
                                rel="noreferrer"
                                className="text-sm font-semibold text-text-light dark:text-text-dark hover:text-primary truncate block transition-colors"
                              >
                                {item.value}
                              </a>
                            ) : (
                              <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                                {item.value}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-border-light dark:border-border-dark bg-background-secondary/50 dark:bg-background-dark/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                      Services Menu
                    </h2>
                    <p className="text-sm text-text-secondary">Select a service to book</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {activeServices.length} Services
                  </span>
                </div>

                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {isLoadingServices ? (
                    <div className="p-12 text-center text-text-secondary">Loading services...</div>
                  ) : activeServices.length > 0 ? (
                    activeServices.map((service) => {
                      const serviceImage = service.images?.[0] || service.imageUrl;
                      const genderLabel =
                        service.targetGender === 'men'
                          ? 'Men'
                          : service.targetGender === 'women'
                            ? 'Women'
                            : service.targetGender === 'kids'
                              ? 'Kids'
                              : null;

                      return (
                        <div
                          key={service.id}
                          className="group p-4 md:p-5 hover:bg-background-secondary dark:hover:bg-background-dark transition-all duration-300 cursor-pointer flex gap-4 md:gap-8 items-start border-b border-border-light/50 dark:border-border-dark/50 last:border-0"
                          onClick={() => {
                            setSelectedService(service);
                            setServiceImageIndex(0);
                            setShowServiceDetail(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedService(service);
                              setServiceImageIndex(0);
                              setShowServiceDetail(true);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          {/* Thumbnail & Multi-Image Gallery */}
                          <div className="shrink-0 relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-background-secondary dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm group/img">
                            {serviceImage ? (
                              <>
                                <Image
                                  src={serviceImage}
                                  alt={service.name}
                                  fill
                                  className="object-cover transition-transform duration-700 group-hover/img:scale-110"
                                />

                                {/* Dark Overlay for Button Contrast */}
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors duration-300" />

                                {/* "See All" Image Counter Badge */}
                                {service.images && service.images.length > 1 && (
                                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-tighter border border-white/10">
                                    <ZoomIn className="w-2.5 h-2.5" />
                                    {service.images.length} Photos
                                  </div>
                                )}

                                {/* Overlay Book Button - Visible on Hover or Always on Mobile if centered */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 translate-y-2 group-hover/img:translate-y-0">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="h-8 px-4 rounded-lg font-bold shadow-2xl scale-90 group-hover/img:scale-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedService(service);
                                      setServiceImageIndex(0);
                                      setShowBookingModal(true);
                                    }}
                                  >
                                    Book Now
                                  </Button>
                                </div>

                                {/* Mini Preview Dot Indicators */}
                                {service.images && service.images.length > 1 && (
                                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    {service.images.slice(0, 5).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`}
                                      />
                                    ))}
                                    {service.images.length > 5 && (
                                      <div className="w-1 h-1 rounded-full bg-white/40" />
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Tag className="w-8 h-8 text-text-tertiary opacity-30" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 py-1 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="text-base md:text-xl font-black text-text-light dark:text-text-dark group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
                                  {service.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg md:text-2xl font-black text-primary">
                                    RWF {service.basePrice.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                    Starting
                                  </span>
                                </div>
                              </div>
                            </div>

                            {service.description && (
                              <p className="text-sm text-text-secondary line-clamp-2 md:line-clamp-3 leading-relaxed opacity-80">
                                {service.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-secondary/80 dark:bg-background-dark border border-border-light/50 dark:border-border-dark text-[10px] font-bold text-text-light dark:text-text-dark uppercase tracking-wider">
                                <Clock className="w-3 h-3 text-primary" /> {service.durationMinutes}{' '}
                                min
                              </div>
                              {service.category && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-info/10 text-[10px] font-bold text-info uppercase tracking-wider">
                                  <Tag className="w-3 h-3" /> {service.category}
                                </div>
                              )}
                              {genderLabel && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 text-[10px] font-bold text-secondary uppercase tracking-wider">
                                  <Users className="w-3 h-3" /> {genderLabel}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Desktop Link Arrow */}
                          <div className="hidden md:flex self-center p-3 rounded-full bg-background-secondary dark:bg-background-dark text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-text-secondary">
                      No services available.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-8 border border-border-light dark:border-border-dark shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-6">
                  Meet the Team
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {activeEmployees.length > 0 ? (
                    activeEmployees.map((emp) => (
                      <div key={emp.id} className="group text-center">
                        <div className="relative mx-auto w-24 h-24 mb-4 rounded-2xl overflow-hidden bg-background-secondary dark:bg-background-dark border-2 border-transparent group-hover:border-primary transition-colors cursor-pointer">
                          <div className="w-full h-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-2xl font-bold text-white">
                            {emp.user?.fullName?.charAt(0) || <User className="w-8 h-8" />}
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-1 group-hover:text-primary transition-colors">
                          {emp.user?.fullName || 'Salon Staff'}
                        </h3>
                        <p className="text-xs text-primary font-medium uppercase tracking-wide mb-2">
                          {emp.roleTitle || 'Stylist'}
                        </p>
                        {emp.skills && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {emp.skills.slice(0, 2).map((skill, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-background-secondary dark:bg-background-dark text-text-secondary border border-border-light dark:border-border-dark"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center text-text-secondary">
                      Team members not listed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {hasImages ? (
                  <div className="columns-2 md:columns-3 gap-4 space-y-4">
                    {salon.images!.map((img, i) => (
                      <div
                        key={i}
                        className="break-inside-avoid relative rounded-xl overflow-hidden bg-background-secondary dark:bg-background-dark group cursor-pointer"
                        onClick={() => {
                          setLightboxIndex(i);
                          setLightboxOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setLightboxIndex(i);
                            setLightboxOpen(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View gallery image ${i + 1}`}
                      >
                        <Image
                          src={img}
                          alt={`Gallery ${i}`}
                          width={500}
                          height={500}
                          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12 text-center text-text-secondary border border-border-light dark:border-border-dark">
                    No photos in gallery.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (SIDEBAR) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Working Hours Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Working Hours
              </h3>

              {workingHours ? (
                <div className="space-y-3">
                  {DAYS_ORDER.map((day) => {
                    const hours = workingHours[day];
                    const isToday =
                      new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() ===
                      day;
                    const openTime = hours?.open || hours?.openTime || hours?.startTime;
                    const closeTime = hours?.close || hours?.closeTime || hours?.endTime;

                    return (
                      <div
                        key={day}
                        className={`flex justify-between items-center text-sm py-1.5 border-b border-border-light/50 dark:border-border-dark/50 last:border-0 ${isToday ? 'bg-primary/5 -mx-4 px-4 rounded-lg' : ''}`}
                      >
                        <span
                          className={`capitalize font-medium ${isToday ? 'text-primary' : 'text-text-light dark:text-text-dark opacity-80'}`}
                        >
                          {day}{' '}
                          {isToday && (
                            <span className="text-[10px] ml-1 bg-primary text-white px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-semibold ${!hours?.isOpen ? 'text-text-tertiary' : 'text-text-light dark:text-text-dark'}`}
                        >
                          {hours?.isOpen ? `${openTime} - ${closeTime}` : 'Closed'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Contact salon for hours.</p>
              )}
            </div>

            {/* Map Card */}
            {salon.latitude && salon.longitude && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Location
                </h3>
                <div className="rounded-xl overflow-hidden border border-border-light dark:border-border-dark shadow-inner h-48 relative">
                  <SalonLocationMap
                    latitude={salon.latitude}
                    longitude={salon.longitude}
                    salonName={salon.name}
                    address={salon.address}
                    height="100%"
                  />
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" />
                </div>
                <p className="mt-4 text-sm text-text-light dark:text-text-dark opacity-80 leading-relaxed bg-background-secondary dark:bg-background-dark p-3 rounded-lg border border-border-light dark:border-border-dark">
                  {salon.address || `${salon.city}, ${salon.district}`}
                </p>
                <a
                  href={`https://maps.google.com/?q=${salon.latitude},${salon.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block w-full py-2 text-center text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors border border-primary/20"
                >
                  Open in Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Detail Modal */}
      {showServiceDetail && selectedService && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowServiceDetail(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowServiceDetail(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close service detail"
        >
          <div
            className="bg-surface-light dark:bg-surface-dark rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-border-light dark:border-border-dark flex flex-col animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {/* 1. HERO / HEADER SECTION (IMAGE FOCUS) - Reduced height to give more space to content */}
            <div className="relative h-48 md:h-64 w-full flex-shrink-0 group/hero">
              {selectedService.images?.length || selectedService.imageUrl ? (
                <>
                  <Image
                    src={
                      selectedService.images?.[serviceImageIndex] || selectedService.imageUrl || ''
                    }
                    alt={selectedService.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover/hero:scale-105"
                  />
                  {/* Subtle Dark Overlay for Text Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Scissors className="w-16 h-16 text-primary/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}

              {/* Top Navigation Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                <div className="flex flex-wrap gap-2">
                  {selectedService.category && (
                    <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg border border-white/10">
                      {selectedService.category}
                    </span>
                  )}
                  {selectedService.targetGender && (
                    <span className="bg-secondary/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg border border-white/10">
                      {selectedService.targetGender === 'men'
                        ? 'Men'
                        : selectedService.targetGender === 'women'
                          ? 'Women'
                          : selectedService.targetGender === 'kids'
                            ? 'Kids'
                            : 'Unisex'}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 p-0 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white border-white/10 backdrop-blur-md z-10"
                  onClick={() => setShowServiceDetail(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Image Navigation Arrows */}
              {selectedService.images && selectedService.images.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover/hero:opacity-100 transition-opacity z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="p-0 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border-white/10"
                    onClick={() =>
                      setServiceImageIndex(
                        (prev) =>
                          (prev - 1 + selectedService.images!.length) %
                          selectedService.images!.length
                      )
                    }
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="p-0 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border-white/10"
                    onClick={() =>
                      setServiceImageIndex((prev) => (prev + 1) % selectedService.images!.length)
                    }
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Hero Title Area */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-lg">
                    {selectedService.name}
                  </h2>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl md:text-2xl font-black text-white">
                        RWF {selectedService.basePrice.toLocaleString()}
                      </span>
                      <span className="text-white/60 text-[10px] uppercase font-bold tracking-wider">
                        starting price
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="h-9 px-6 rounded-full font-bold shadow-xl z-[110]"
                      onClick={() => {
                        setShowServiceDetail(false);
                        setShowBookingModal(true);
                      }}
                    >
                      Book Now
                    </Button>

                    {selectedService.durationMinutes && (
                      <div className="hidden sm:flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{selectedService.durationMinutes} min</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DATA & DETAILS SECTION (SCROLLABLE) - Expanded vertical space */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background-light dark:bg-background-dark h-full min-h-[300px]">
              <div className="p-4 sm:p-6 space-y-6">
                {/* Description & Specs Card */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border-light dark:border-border-dark bg-background-secondary/30 dark:bg-background-dark/30 flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-xs font-bold text-text-light dark:text-text-dark uppercase tracking-widest">
                      Service Overview
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-text-light/80 dark:text-text-dark/80 leading-relaxed font-medium">
                      {selectedService.description ||
                        'Indulge in our premium salon service, expertly delivered by our professional stylists. We use only high-quality products to ensure you get the best results possible.'}
                    </p>

                    {/* Compact Specs Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50 dark:bg-background-dark/50 border border-border-light/50">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text-secondary uppercase">
                            Session
                          </p>
                          <p className="text-xs font-bold text-text-light dark:text-text-dark">
                            {selectedService.durationMinutes} Minutes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50 dark:bg-background-dark/50 border border-border-light/50">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-sm">
                          <Users className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text-secondary uppercase">
                            Availability
                          </p>
                          <p className="text-xs font-bold text-text-light dark:text-text-dark">
                            Instant Booking
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All Images Thumbnail Grid */}
                {selectedService.images && selectedService.images.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-secondary/10 rounded-lg">
                          <ZoomIn className="w-4 h-4 text-secondary" />
                        </div>
                        <h3 className="text-xs font-bold text-text-light dark:text-text-dark uppercase tracking-widest">
                          Service Gallery
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary">
                        {selectedService.images.length} Photos
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-2">
                      {selectedService.images.map((img, i) => (
                        <Button
                          key={i}
                          variant="secondary"
                          size="sm"
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all p-0 ${
                            i === serviceImageIndex
                              ? 'border-primary shadow-lg ring-4 ring-primary/10'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          onClick={() => setServiceImageIndex(i)}
                        >
                          <Image
                            src={img}
                            alt={`${selectedService.name} ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Data Accordion (Artful Layout) */}
                <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-text-light dark:text-text-dark uppercase tracking-widest border-b border-border-light dark:border-border-dark pb-3 mb-4">
                    Detailed Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div className="flex justify-between items-center py-1 border-b border-border-light/30 border-dashed">
                      <span className="text-xs text-text-secondary font-medium">Service Code</span>
                      <span className="text-xs font-mono font-bold text-primary">
                        {selectedService.code || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border-light/30 border-dashed">
                      <span className="text-xs text-text-secondary font-medium">Category</span>
                      <span className="text-xs font-bold text-text-light dark:text-text-dark capitalize">
                        {selectedService.category || 'General'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border-light/30 border-dashed">
                      <span className="text-xs text-text-secondary font-medium">
                        Target Clientele
                      </span>
                      <span className="text-xs font-bold text-text-light dark:text-text-dark capitalize">
                        {selectedService.targetGender || 'All'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border-light/30 border-dashed">
                      <span className="text-xs text-text-secondary font-medium">Tax Status</span>
                      <span className="text-xs font-bold text-success">VAT Included</span>
                    </div>
                  </div>
                </div>

                {/* Provided By / Salon Info Card */}
                <div className="group relative bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
                        Offered By
                      </p>
                      <h4 className="text-base font-bold text-text-light dark:text-text-dark truncate">
                        {salon.name}
                      </h4>
                      <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3" /> {salon.address || salon.city}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/20 text-success text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-warning fill-current" />
                          <span className="text-xs font-bold text-text-light dark:text-text-dark">
                            {salon.rating?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ACTION BAR (FIXED BOTTOM) */}
            <div className="p-6 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex gap-4 flex-shrink-0 relative z-[105]">
              <Button
                variant="outline"
                className="flex-1 h-12 text-sm font-bold rounded-xl hover:bg-background-secondary transition-all"
                onClick={() => setShowServiceDetail(false)}
              >
                Go Back
              </Button>
              <Button
                variant="primary"
                className="flex-[2] h-12 text-sm font-black rounded-xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 group/btn"
                onClick={() => {
                  setShowServiceDetail(false);
                  setShowBookingModal(true);
                }}
              >
                Book Appointment
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:translate-x-1 transition-transform">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <CustomerBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
            setShowBookingModal(false);
            setSelectedService(null);
            alert('🎉 Appointment submitted! Waiting for salon confirmation.');
          }}
          salon={{ id: salon.id, name: salon.name, address: salon.address }}
          service={{
            id: selectedService.id,
            name: selectedService.name,
            durationMinutes: selectedService.durationMinutes || 30,
            basePrice: Number(selectedService.basePrice) || 0,
          }}
          customerId={customer?.id}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && hasImages && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close lightbox"
        >
          {/* Close Button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 p-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10 border-white/10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Image Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium border border-white/10 backdrop-blur-sm">
            {lightboxIndex + 1} / {salon.images!.length}
          </div>

          {/* Navigation - Previous */}
          {salon.images!.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-4 p-0 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10 border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (prev) => (prev - 1 + salon.images!.length) % salon.images!.length
                );
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {/* Main Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <Image
              src={salon.images![lightboxIndex]}
              alt={`${salon.name} - Image ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Navigation - Next */}
          {salon.images!.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-4 p-0 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10 border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev + 1) % salon.images!.length);
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Thumbnail Strip */}
          {salon.images!.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-xl bg-black/50 backdrop-blur-sm max-w-[90vw] overflow-x-auto scrollbar-hide border border-white/10">
              {salon.images!.map((img, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  size="sm"
                  className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all p-0 ${
                    i === lightboxIndex
                      ? 'border-primary opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-75'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                >
                  <Image src={img} alt={`Thumb ${i}`} fill className="object-cover" />
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
