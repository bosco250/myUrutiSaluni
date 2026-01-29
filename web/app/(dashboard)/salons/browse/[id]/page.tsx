'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  Users,
  Tag,
  MessageCircle,
  Building2,
  User,
  CheckCircle2,
  X,
  ZoomIn,
  Search,
  Filter,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import SalonLocationMap from '@/components/maps/SalonLocationMap';
import CustomerBookingModal from '@/components/appointments/CustomerBookingModal';
import { useToast } from '@/components/ui/Toast';

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
  return <SalonDetailsContent />;
}

function SalonDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const salonId = params.id as string;
  const { user: authUser } = useAuthStore();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [serviceImageIndex, setServiceImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

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
      const response = await api.get(`/services?salonId=${salonId}&browse=true`);
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

  // Auto-open booking modal if query param exists (e.g. returning from login)
  useEffect(() => {
    const bookServiceId = searchParams.get('bookService');
    if (bookServiceId && services && !showBookingModal) {
      const serviceToBook = services.find((s) => s.id === bookServiceId);
      if (serviceToBook) {
        setSelectedService(serviceToBook);
        setServiceImageIndex(0);
        setShowBookingModal(true);
      }
    }
  }, [services, searchParams, showBookingModal]);

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
    if (salon?.operatingHours) return salon.operatingHours;
    if (salon?.businessHours) return salon.businessHours;

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

  // Collect all images (salon + services) for gallery
  const allGalleryImages = useMemo(() => {
    const images: { src: string; label: string }[] = [];
    
    const isValidImage = (src: string | undefined | null) => {
      if (!src || typeof src !== 'string') return false;
      const s = src.trim();
      return s.length > 0 && (s.startsWith('http') || s.startsWith('/'));
    };

    if (salon?.images) {
      salon.images.forEach((img, i) => {
        if (isValidImage(img)) images.push({ src: img, label: `${salon.name} – ${i + 1}` });
      });
    }
    if (activeServices) {
      activeServices.forEach((svc) => {
        if (svc.images && svc.images.length > 0) {
          svc.images.forEach((img, i) => {
            if (isValidImage(img)) images.push({ src: img, label: `${svc.name} – ${i + 1}` });
          });
        } else if (isValidImage(svc.imageUrl)) {
          images.push({ src: svc.imageUrl!, label: svc.name });
        }
      });
    }
    return images;
  }, [salon, activeServices]);

  const validGalleryImages = useMemo(() => {
    return allGalleryImages.filter((img) => !failedImages.has(img.src));
  }, [allGalleryImages, failedImages]);

  // Available categories for filtering
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    activeServices.forEach(s => cats.add(s.category || 'General'));
    return ['All', ...Array.from(cats).sort()];
  }, [activeServices]);

  // Categorized services with filtering
  const categorizedServices = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    // Group and filter
    const groups = activeServices.reduce(
      (acc, service) => {
        const cat = service.category || 'General';
        
        // Search matches name, description or category
        const matchesSearch = !term || 
          service.name.toLowerCase().includes(term) || 
          service.description?.toLowerCase().includes(term) ||
          cat.toLowerCase().includes(term);

        if (matchesSearch) {
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(service);
        }
        return acc;
      },
      {} as Record<string, Service[]>,
    );

    // Sort categories
    let result = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    // Category pill filter (only when not searching)
    if (activeCategory !== 'All' && !searchTerm) {
      result = result.filter(([cat]) => cat === activeCategory);
    }

    return result;
  }, [activeServices, searchTerm, activeCategory]);

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
    <div className="min-h-screen bg-background-light dark:bg-background-dark">

      {/* ─── COMPACT TOP BAR ─── */}
      <header className="sticky top-0 z-40 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push('/salons/browse')}
            className="shrink-0 p-1.5 -ml-1.5 rounded-md text-text-light/70 dark:text-text-dark/70 hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Back to browse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-text-light dark:text-text-dark truncate leading-tight">
              {salon.name}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-text-light/60 dark:text-text-dark/60">
              <span className="truncate">{location}</span>
              <span className="text-text-light/30 dark:text-text-dark/30">·</span>
              <span className="shrink-0">{businessType}</span>
              <span className="text-text-light/30 dark:text-text-dark/30">·</span>
              <span className="shrink-0">{clientele}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs font-semibold text-text-light dark:text-text-dark">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span>{salon.rating?.toFixed(1)}</span>
              <span className="text-text-light/40 dark:text-text-dark/40 font-normal">({salon.reviewCount})</span>
            </div>

            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                openStatus.isOpen
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {openStatus.label}
            </span>

            <div className="hidden sm:flex items-center gap-1 ml-1">
              <button
                className="p-1.5 rounded-md text-text-light/50 dark:text-text-dark/50 hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-md text-text-light/50 dark:text-text-dark/50 hover:text-text-light dark:hover:text-text-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Save"
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── LEFT: SERVICES (PRIMARY) ─── */}
          <div className="lg:col-span-8 space-y-6">



            {/* ─── SERVICES TOOLBAR (STICKY) ─── */}
            <section id="services-section" className="relative">
              <div className="sticky top-14 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md -mx-4 px-4 py-3 mb-6 border-b border-border-light/40 dark:border-border-dark/40 transition-all duration-300">
                <div className="flex items-center justify-between gap-4">
                  
                  {/* Default State: Categories + Search Button */}
                  {!isSearchExpanded ? (
                    <>
                      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {allCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                              activeCategory === cat
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-black/[0.03] dark:bg-white/[0.03] text-text-light/50 dark:text-text-dark/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => setIsSearchExpanded(true)}
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] text-text-light/50 dark:text-text-dark/50 hover:bg-primary hover:text-white transition-all duration-300"
                        title="Search services"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    /* Search State: Compact & Centered */
                    <div className="flex-1 flex justify-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-2 w-full max-w-sm">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-light/30 dark:text-text-dark/30" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-black/[0.04] dark:bg-white/[0.04] border-none rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-text-light/20 dark:placeholder:text-text-dark/20 font-medium"
                          />
                          {searchTerm && (
                            <button 
                              onClick={() => setSearchTerm('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <X className="w-3 h-3 text-text-light/40" />
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setIsSearchExpanded(false);
                            setSearchTerm('');
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                          title="Close search"
                        >
                          <X className="w-4 h-4 text-text-light/40 group-hover:text-primary" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Desktop Count Indicator (only when not searching) */}
                  {!isSearchExpanded && (
                    <div className="hidden lg:block shrink-0 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {activeServices.length} Total
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isLoadingServices ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : categorizedServices.length > 0 ? (
                <div className="space-y-6">
                  {categorizedServices.map(([category, catServices], index) => (
                    <ServiceCategoryGroup 
                      key={category} 
                      category={category} 
                      services={catServices} 
                      isInitiallyExpanded={index === 0 || !!searchTerm}
                      forceOpen={!!searchTerm}
                      hideAccordion={categorizedServices.length === 1 && !searchTerm}
                      onBook={(service) => {
                        if (!authUser) {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('purchase_intent', JSON.stringify({
                              salonId: salon.id,
                              serviceId: service.id
                            }));
                          }
                          router.push('/login?redirect=purchase_intent');
                          return;
                        }
                        setSelectedService(service);
                        setServiceImageIndex(0);
                        setShowBookingModal(true);
                      }}
                      onDetail={(service) => {
                        setSelectedService(service);
                        setServiceImageIndex(0);
                        setShowServiceDetail(true);
                      }}
                    />
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="py-20 text-center bg-surface-light dark:bg-surface-dark border border-dashed border-border-light dark:border-border-dark rounded-3xl">
                  <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-text-light/20 dark:text-text-dark/20" />
                  </div>
                  <h3 className="text-sm font-bold text-text-light dark:text-text-dark">No services found</h3>
                  <p className="text-[11px] text-text-light/40 dark:text-text-dark/40 mt-1">
                    Try adjusting your search for "{searchTerm}"
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-text-light/40 dark:text-text-dark/40">No services available at the moment.</p>
                </div>
              )}
            </section>

            {/* ─── TEAM ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wider">
                  Meet the Team
                </h2>
                {activeEmployees.length > 0 && (
                  <span className="text-[11px] text-text-light/50 dark:text-text-dark/50 font-medium">
                    {activeEmployees.length} specialists
                  </span>
                )}
              </div>

              {activeEmployees.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 no-scrollbar">
                  {activeEmployees.map((emp) => (
                    <div 
                      key={emp.id} 
                      className="shrink-0 w-44 relative bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                    >
                      {/* Card Header Pattern */}
                      <div className="h-16 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      </div>

                      {/* Avatar - overlapping header */}
                      <div className="relative -mt-10 mx-auto w-20 h-20">
                         <div className="w-full h-full rounded-2xl bg-white dark:bg-surface-dark p-1 shadow-sm">
                            <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                              {emp.user?.fullName?.charAt(0) || <User className="w-8 h-8" />}
                            </div>
                         </div>
                         <div className="absolute -bottom-1 -right-1 bg-white dark:bg-surface-dark rounded-full p-0.5 shadow-sm" title="Verified Stylist">
                            <CheckCircle2 className="w-5 h-5 text-primary fill-white dark:fill-surface-dark" />
                         </div>
                      </div>

                      {/* Content */}
                      <div className="px-3 pt-2 pb-3 text-center flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1 w-full">
                          <h3 className="text-sm font-bold text-text-light dark:text-text-dark truncate group-hover:text-primary transition-colors">
                            {emp.user?.fullName || 'Star Stylist'}
                          </h3>
                        </div>
                        
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">
                          {emp.roleTitle || 'Master Stylist'}
                        </p>

                        <div className="w-full space-y-2">
                          {/* Rating Dummy - assuming data might come later */}
                           <div className="flex items-center justify-center gap-1 text-[10px] text-text-light/60 dark:text-text-dark/60 bg-black/5 dark:bg-white/5 py-1 px-2 rounded-full mx-auto w-fit">
                              <Star className="w-3 h-3 text-warning fill-warning" />
                              <span className="font-semibold text-text-light dark:text-text-dark">5.0</span>
                              <span>(24 reviews)</span>
                           </div>

                          {/* Skills Pills */}
                          <div className="flex flex-wrap justify-center gap-1 min-h-[1.5rem]">
                             {emp.skills && emp.skills.slice(0, 2).map((skill, i) => (
                                <span key={i} className="text-[9px] px-2 py-0.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light/70 dark:text-text-dark/70">
                                  {skill}
                                </span>
                             ))}
                          </div>
                        </div>
                        

                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border-light dark:border-border-dark">
                  <Users className="w-8 h-8 text-text-light/20 dark:text-text-dark/20 mx-auto mb-2" />
                  <p className="text-xs text-text-light/50 dark:text-text-dark/50">
                    Meet the team coming soon.
                  </p>
                </div>
              )}
            </section>

            {/* ─── GALLERY ─── */}
            {allGalleryImages.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-text-light dark:text-text-dark uppercase tracking-wider">
                    Gallery
                  </h2>
                  <span className="text-[11px] text-text-light/50 dark:text-text-dark/50 font-medium">
                    {validGalleryImages.length} photos
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {validGalleryImages.slice(0, 8).map((img, i) => (
                    <div
                      key={img.src} // Use src as key for stability
                      className={`relative rounded-xl overflow-hidden bg-background-light dark:bg-background-dark cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 ${
                        i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                      }`}
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
                      aria-label={`View ${img.label}`}
                    >
                      <Image
                        src={img.src}
                        alt={img.label}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={() => setFailedImages((prev) => new Set(prev).add(img.src))}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {validGalleryImages.length > 8 && (
                     <div 
                       className="relative aspect-square rounded-xl overflow-hidden bg-surface-light dark:bg-surface-dark border-2 border-dashed border-border-light dark:border-border-dark flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                       onClick={() => {
                         setLightboxIndex(8);
                         setLightboxOpen(true); 
                       }}
                       role="button"
                       tabIndex={0}
                     >
                        <span className="text-xl font-bold text-text-light/40 dark:text-text-dark/40 group-hover:text-primary transition-colors">+{validGalleryImages.length - 8}</span>
                        <span className="text-[10px] uppercase font-bold text-text-light/30 dark:text-text-dark/30 mt-1">More</span>
                     </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <aside className="lg:col-span-4 space-y-4">

            {/* Salon photo strip */}
            {hasImages && (
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                <Image
                  src={salon.images![currentImageIndex]}
                  alt={salon.name}
                  fill
                  className="object-cover"
                  priority
                />
                {salon.images!.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {salon.images!.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                          aria-label={`Image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── ABOUT ─── */}
            <div className="border border-border-light dark:border-border-dark rounded-lg p-4 bg-surface-light dark:bg-surface-dark/50">
              <h3 className="text-[11px] font-bold text-text-light dark:text-text-dark uppercase tracking-wider mb-2">About</h3>
              <div className="relative">
                <p className={`text-xs text-text-light/70 dark:text-text-dark/70 leading-relaxed transition-all duration-300 ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                  {salon.description || 'Welcome to our salon. We offer a range of beauty and wellness services tailored to your needs.'}
                </p>
                {(salon.description?.length || 0) > 150 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-[10px] font-semibold text-primary hover:underline mt-1 focus:outline-none"
                  >
                    {isDescriptionExpanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2">
                   <div className="flex -space-x-1.5">
                      {[...Array(Math.min(3, activeEmployees.length))].map((_, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-surface-light dark:border-surface-dark bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary z-0">
                          {activeEmployees[i]?.user?.fullName?.charAt(0)}
                        </div>
                      ))}
                      {activeEmployees.length > 3 && (
                        <div className="w-5 h-5 rounded-full border border-surface-light dark:border-surface-dark bg-surface-secondary dark:bg-white/10 flex items-center justify-center text-[7px] text-text-light/60 dark:text-text-dark/60 font-bold z-10">
                          +{activeEmployees.length - 3}
                        </div>
                      )}
                   </div>
                   <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
                     {activeEmployees.length} stylists
                   </span>
                </div>
                
                <span className="text-[10px] text-text-light/30 dark:text-text-dark/30">•</span>
                
                <span className="text-[10px] font-medium text-text-light/50 dark:text-text-dark/50">
                  {activeServices.length} services
                </span>

                <div className="flex-1" />
                {salon.phone && (
                  <button
                    onClick={() => window.open(`https://wa.me/${salon.phone?.replace(/[^0-9]/g, '')}`, '_blank')}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-green-600 dark:text-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                    title="WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </button>
                )}

                {salon.email && (
                  <a
                    href={`mailto:${salon.email}`}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-text-light/50 dark:text-text-dark/50 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="border border-border-light dark:border-border-dark rounded-lg divide-y divide-border-light dark:divide-border-dark">
              {[
                { icon: Phone, label: 'Phone', value: salon.phone, href: `tel:${salon.phone}` },
                { icon: Mail, label: 'Email', value: salon.email, href: `mailto:${salon.email}` },
                { icon: Globe, label: 'Website', value: salon.website?.replace(/^https?:\/\//, ''), href: salon.website },
                { icon: MapPin, label: 'Address', value: salon.address || `${salon.district || ''}, ${salon.city || ''}`.replace(/^, |, $/g, '') },
              ]
                .filter((item) => item.value)
                .map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <item.icon className="w-4 h-4 text-text-light/40 dark:text-text-dark/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium uppercase tracking-wide">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.label === 'Website' ? '_blank' : undefined}
                          rel="noreferrer"
                          className="text-xs font-medium text-text-light dark:text-text-dark hover:text-primary truncate block transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-xs font-medium text-text-light dark:text-text-dark truncate">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Working Hours */}
            <div className="border border-border-light dark:border-border-dark rounded-lg px-3 py-3">
              <h3 className="text-[11px] font-bold text-text-light dark:text-text-dark uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-light/40 dark:text-text-dark/40" />
                Hours
              </h3>

              {workingHours ? (
                <div className="space-y-0.5">
                  {DAYS_ORDER.map((day) => {
                    const hours = workingHours[day];
                    const isToday =
                      new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                    const openTime = hours?.open || hours?.openTime || hours?.startTime;
                    const closeTime = hours?.close || hours?.closeTime || hours?.endTime;

                    return (
                      <div
                        key={day}
                        className={`flex justify-between items-center text-[11px] py-1 px-1.5 rounded ${isToday ? 'bg-primary/5' : ''}`}
                      >
                        <span className={`capitalize ${isToday ? 'font-bold text-primary' : 'font-medium text-text-light/70 dark:text-text-dark/70'}`}>
                          {day.slice(0, 3)}
                          {isToday && (
                            <span className="ml-1 text-[9px] bg-primary text-white px-1 py-px rounded">
                              today
                            </span>
                          )}
                        </span>
                        <span className={`font-medium ${!hours?.isOpen ? 'text-text-light/30 dark:text-text-dark/30' : 'text-text-light/70 dark:text-text-dark/70'}`}>
                          {hours?.isOpen ? `${openTime} – ${closeTime}` : 'Closed'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-text-light/40 dark:text-text-dark/40">Contact salon for hours.</p>
              )}
            </div>

            {/* Map */}
            {salon.latitude && salon.longitude && (
              <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
                <div className="h-36 relative">
                  <SalonLocationMap
                    latitude={salon.latitude}
                    longitude={salon.longitude}
                    salonName={salon.name}
                    address={salon.address}
                    height="100%"
                  />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <p className="text-[11px] text-text-light/60 dark:text-text-dark/60 truncate flex-1">
                    {salon.address || `${salon.city}, ${salon.district}`}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${salon.latitude},${salon.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-primary hover:underline shrink-0 ml-2"
                  >
                    Directions
                  </a>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ─── SERVICE DETAIL MODAL ─── */}
      {showServiceDetail && selectedService && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowServiceDetail(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowServiceDetail(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close service detail"
        >
          <div
            className="bg-surface-light dark:bg-surface-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border-light dark:border-border-dark flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {/* Modal Header Image */}
            <div className="relative h-44 md:h-56 w-full flex-shrink-0 group/hero bg-background-light dark:bg-background-dark">
              {selectedService.images?.length || selectedService.imageUrl ? (
                <Image
                  src={selectedService.images?.[serviceImageIndex] || selectedService.imageUrl || ''}
                  alt={selectedService.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Scissors className="w-12 h-12 text-text-light/10 dark:text-text-dark/10" />
                </div>
              )}

              {/* Close */}
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                onClick={() => setShowServiceDetail(false)}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Category + Gender badges */}
              <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                {selectedService.category && (
                  <span className="bg-black/50 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">
                    {selectedService.category}
                  </span>
                )}
                {selectedService.targetGender && (
                  <span className="bg-black/50 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">
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

              {/* Image navigation */}
              {selectedService.images && selectedService.images.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 opacity-0 group-hover/hero:opacity-100 transition-opacity z-10">
                  <button
                    className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    onClick={() =>
                      setServiceImageIndex(
                        (prev) =>
                          (prev - 1 + selectedService.images!.length) %
                          selectedService.images!.length
                      )
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    onClick={() =>
                      setServiceImageIndex((prev) => (prev + 1) % selectedService.images!.length)
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-5 space-y-4">
                {/* Title + Price */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                      {selectedService.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-light/50 dark:text-text-dark/50">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedService.durationMinutes} min
                      </span>
                      {selectedService.code && (
                        <span className="font-mono text-text-light/30 dark:text-text-dark/30">
                          #{selectedService.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-text-light dark:text-text-dark">
                      RWF {selectedService.basePrice.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-text-light/40 dark:text-text-dark/40">
                      starting price
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-text-light/70 dark:text-text-dark/70 leading-relaxed">
                  {selectedService.description ||
                    'Professional salon service delivered by our expert stylists using high-quality products.'}
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium uppercase">Duration</p>
                      <p className="text-xs font-semibold text-text-light dark:text-text-dark">{selectedService.durationMinutes} Minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium uppercase">Booking</p>
                      <p className="text-xs font-semibold text-text-light dark:text-text-dark">Instant</p>
                    </div>
                  </div>
                </div>

                {/* Image thumbnails */}
                {selectedService.images && selectedService.images.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {selectedService.images.map((img, i) => (
                      <button
                        key={i}
                        className={`relative shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                          i === serviceImageIndex
                            ? 'border-primary'
                            : 'border-transparent opacity-50 hover:opacity-80'
                        }`}
                        onClick={() => setServiceImageIndex(i)}
                      >
                        <Image src={img} alt={`${selectedService.name} ${i + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Offered by */}
                <div className="flex items-center gap-3 p-3 rounded-md border border-border-light dark:border-border-dark">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-medium uppercase">Offered by</p>
                    <p className="text-xs font-semibold text-text-light dark:text-text-dark truncate">{salon.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="font-semibold text-text-light dark:text-text-dark">{salon.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-light dark:border-border-dark flex gap-3 shrink-0">
              <Button
                variant="outline"
                className="flex-1 h-10 text-sm font-semibold rounded-lg"
                onClick={() => setShowServiceDetail(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-[2] h-10 text-sm font-bold rounded-lg"
                onClick={() => {
                  if (!authUser) {
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('purchase_intent', JSON.stringify({
                        salonId: salon.id,
                        serviceId: selectedService.id
                      }));
                    }
                    setShowServiceDetail(false);
                    router.push('/login?redirect=purchase_intent');
                    return;
                  }
                  setShowServiceDetail(false);
                  setShowBookingModal(true);
                }}
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BOOKING MODAL ─── */}
      {showBookingModal && selectedService && (
        <div className="relative z-[200]">
          <CustomerBookingModal
            isOpen={showBookingModal}
            onClose={() => {
              setShowBookingModal(false);
              setSelectedService(null);
              // Clear URL params to prevent auto-reopening
              if (typeof window !== 'undefined' && searchParams.get('bookService')) {
                const params = new URLSearchParams(window.location.search);
                params.delete('bookService');
                router.replace(`${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
              }
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
              setShowBookingModal(false);
              setSelectedService(null);
              
              // Clear URL params to prevent auto-reopening
              if (typeof window !== 'undefined' && searchParams.get('bookService')) {
                const params = new URLSearchParams(window.location.search);
                params.delete('bookService');
                router.replace(`${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
              }

              toast.success('🎉 Appointment booked successfully!', {
                title: 'Booking Confirmed',
                duration: 5000,
              });
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
        </div>
      )}

      {/* ─── LIGHTBOX MODAL ─── */}
      {lightboxOpen && validGalleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close lightbox"
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
            {lightboxIndex + 1} / {validGalleryImages.length}
          </div>

          {validGalleryImages.length > 1 && (
            <button
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (prev) => (prev - 1 + validGalleryImages.length) % validGalleryImages.length
                );
              }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <Image
              src={validGalleryImages[lightboxIndex]?.src}
              alt={validGalleryImages[lightboxIndex]?.label || 'Gallery image'}
              fill
              className="object-contain"
              priority
            />
          </div>

          {validGalleryImages.length > 1 && (
            <button
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev + 1) % validGalleryImages.length);
              }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {validGalleryImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto no-scrollbar p-2">
              {validGalleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className={`relative w-10 h-10 rounded-md overflow-hidden transition-all shrink-0 ${
                    i === lightboxIndex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-50 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <Image src={img.src} alt={img.label} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Helper Components ---

function ServiceCategoryGroup({ 
  category, 
  services, 
  onBook,
  onDetail,
  isInitiallyExpanded = false,
  hideAccordion = false,
  forceOpen = false
}: { 
  category: string; 
  services: Service[]; 
  onBook: (service: Service) => void;
  onDetail: (service: Service) => void;
  isInitiallyExpanded?: boolean;
  hideAccordion?: boolean;
  forceOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isInitiallyExpanded);
  const [isShowingMore, setIsShowingMore] = useState(false);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const truncationLimit = 6;
  const shouldTruncate = services.length > truncationLimit;
  const visibleServices = (isShowingMore || !shouldTruncate) ? services : services.slice(0, truncationLimit);

  if (hideAccordion) {
    return (
      <div className="mb-10 last:mb-0">
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="text-lg font-black text-text-light dark:text-text-dark tracking-tight">{category}</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-border-light to-transparent dark:from-border-dark opacity-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service, idx) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              onBook={() => onBook(service)} 
              onDetail={() => onDetail(service)}
              isPopular={idx === 0 && services.length > 5}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 last:mb-0 border border-border-light dark:border-border-dark rounded-2xl overflow-hidden bg-white dark:bg-surface-dark transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-light dark:text-text-dark tracking-tight">{category}</h3>
            <p className="text-[10px] text-text-light/40 dark:text-text-dark/40 font-bold uppercase tracking-wider">
              {services.length} {services.length === 1 ? 'Service' : 'Services'}
            </p>
          </div>
        </div>
        <div className={`p-1.5 rounded-lg transition-all duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-text-light/30'}`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-2 sm:p-3 border-t border-border-light/40 dark:border-border-dark/40 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleServices.map((service, idx) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                onBook={() => onBook(service)} 
                onDetail={() => onDetail(service)}
                isPopular={idx === 0 && services.length > 3}
              />
            ))}
          </div>
          
          {shouldTruncate && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsShowingMore(!isShowingMore);
              }}
              className="mt-6 w-full py-3 rounded-xl border border-dashed border-border-light dark:border-border-dark text-[10px] font-black uppercase tracking-[0.2em] text-text-light/40 hover:text-primary hover:border-primary/50 transition-all bg-black/[0.01] dark:bg-white/[0.01]"
            >
              {isShowingMore ? 'Show Less' : `View ${services.length - truncationLimit} More Services`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ 
  service, 
  onBook, 
  onDetail,
  isPopular 
}: { 
  service: Service; 
  onBook: () => void; 
  onDetail: () => void;
  isPopular?: boolean;
}) {
  const serviceImage = service.images?.[0] || service.imageUrl;

  return (
    <div 
      onClick={onDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDetail();
        }
      }}
      className="group relative flex items-center gap-3 pl-2 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 hover:bg-primary/[0.01] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5"
    >
      {/* Visual Indicator/Image */}
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark group-hover:border-primary/20 transition-all duration-500">
        {serviceImage ? (
          <Image src={serviceImage} alt={service.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02]">
            <Scissors className="w-8 h-8 text-text-light/10 dark:text-text-dark/10 group-hover:text-primary/20 transition-colors" />
          </div>
        )}
        {isPopular && (
           <div className="absolute inset-x-0 top-0 bg-primary/80 backdrop-blur-md text-white text-[8px] font-black uppercase py-1 text-center tracking-widest">
             Top Pick
           </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 py-1">
        <h4 className="text-[16px] font-black text-text-light dark:text-text-dark leading-tight group-hover:text-primary transition-colors truncate">
          {service.name}
        </h4>
        <p className="text-[12px] text-text-light/50 dark:text-text-dark/50 line-clamp-2 mt-1 font-medium leading-relaxed">
          {service.description || 'Exclusive boutique service.'}
        </p>
        
        <div className="flex items-center gap-6 mt-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-light/20 dark:text-text-dark/20 uppercase tracking-widest">Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-text-light dark:text-text-dark">{service.basePrice.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30">RWF</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-light/20 dark:text-text-dark/20 uppercase tracking-widest">Duration</span>
            <div className="flex items-center gap-1 text-[13px] font-black text-text-light dark:text-text-dark">
              <span>{service.durationMinutes}</span>
              <span className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30">MIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex flex-col items-end gap-2 pr-4 py-4 self-stretch justify-between">
         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500">
           <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
             <ChevronRight className="w-4 h-4 text-primary" />
           </div>
         </div>

         <button
            onClick={(e) => {
              e.stopPropagation();
              onBook();
            }}
            className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
         >
            Book
         </button>
      </div>
    </div>
  );
}
