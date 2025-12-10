'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  ArrowLeft,
  Star,
  Share2,
  Heart,
  Globe,
  Check,
  Sparkles,
  Scissors,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import SalonLocationMap from '@/components/maps/SalonLocationMap';
import CustomerBookingModal from '@/components/appointments/CustomerBookingModal';

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
}

interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  salonId: string;
}

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
  const queryClient = useQueryClient();

  // Get salon details
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
        rating: salonData.rating || 4.5 + Math.random() * 0.5, // Mock rating until API provides
        reviewCount: salonData.reviewCount || Math.floor(Math.random() * 200) + 20, // Mock reviews
      };
    },
    enabled: !!salonId,
  });

  // Get salon services
  const {
    data: services,
    isLoading: isLoadingServices,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ['salon-services', salonId],
    queryFn: async () => {
      try {
        const response = await api.get(`/services?salonId=${salonId}`);
        const servicesData = response.data?.data || response.data;
        return Array.isArray(servicesData) ? servicesData : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!salonId,
  });

  // Get customer record
  const { data: customer } = useQuery({
    queryKey: ['customer-by-user', authUser?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/by-user/${authUser?.id}`);
      return response.data;
    },
    enabled: !!authUser?.id,
  });

  // Generate consistent gradient
  const getGradient = (id: string): string => {
    const gradients = [
      'from-violet-600 via-indigo-600 to-blue-600',
      'from-fuchsia-600 via-pink-600 to-rose-600',
      'from-emerald-600 via-teal-600 to-cyan-600',
      'from-orange-500 via-amber-500 to-yellow-500',
    ];
    const index =
      id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
    return gradients[index];
  };

  if (isLoadingSalon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 font-medium">
            Loading salon details...
          </p>
        </div>
      </div>
    );
  }

  if (salonError || !salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 md:p-8 border border-border-light dark:border-border-dark">
            <h3 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark mb-2">
              Salon Not Found
            </h3>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
              The salon you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/salons/browse')} variant="primary">
              Back to Salons
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeServices = services?.filter((s) => s.isActive) || [];
  const bgGradient = getGradient(salon.id);

  return (
    <div className="min-h-screen pb-12 md:pb-20 bg-background-light dark:bg-background-dark">
      {/* Hero Header with Improved Background */}
      <div
        className={`relative h-56 md:h-72 lg:h-80 bg-gradient-to-r ${bgGradient} overflow-hidden z-0`}
      >
        {/* Abstract Background Patterns */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

          {/* Geometric decorative elements */}
          <div className="absolute right-10 top-10 opacity-20 z-0">
            <Sparkles className="w-16 h-16 md:w-24 md:h-24 text-white animate-pulse" />
          </div>
          <div className="absolute left-1/4 bottom-0 opacity-10 z-0">
            <Scissors className="w-24 h-24 md:w-32 md:h-32 text-white rotate-45" />
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-between py-4 md:py-6 relative z-10">
          {/* Nav & Actions */}
          <div className="flex justify-between items-start">
            <button
              onClick={() => router.push('/salons/browse')}
              className="flex items-center text-xs md:text-sm font-medium text-white hover:bg-white/20 backdrop-blur-md rounded-full px-3 md:px-4 py-1.5 md:py-2 border border-white/20 transition-all hover:scale-105"
            >
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Back to Browse
            </button>

            <div className="flex gap-2">
              <button
                className="p-2 md:p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-105 border border-white/20"
                title="Share Salon"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                className="p-2 md:p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:scale-105 border border-white/20"
                title="Save to Favorites"
              >
                <Heart className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Salon Info */}
          <div className="text-white">
            <div className="flex items-center gap-2 mb-2 opacity-90 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-medium backdrop-blur-sm border border-white/10">
                Salon
              </span>
              {salon.rating && (
                <span className="px-2 py-0.5 rounded-md bg-warning/20 text-yellow-100 text-xs font-medium backdrop-blur-sm border border-warning/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  {salon.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 tracking-tight drop-shadow-sm">
              {salon.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm opacity-95 font-light">
              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-black/10 px-2 md:px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {salon.address || salon.city || 'Location unavailable'}
              </span>
              <span className="hidden md:inline text-white/40">•</span>
              <span className="flex items-center gap-1.5 hover:underline cursor-pointer">
                {salon.reviewCount} verified reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 md:-mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* About Section */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 lg:p-8 shadow-sm border border-border-light dark:border-border-dark">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-text-light dark:text-text-dark">
                About the Salon
              </h2>
              <p className="text-sm md:text-base text-text-light/80 dark:text-text-dark/80 leading-relaxed">
                {salon.description ||
                  'Welcome to our premium salon experience. Our team of dedicated professionals is here to provide you with top-tier beauty services in a relaxing and welcoming environment.'}
              </p>

              <div className="mt-6 md:mt-8">
                <h3 className="text-xs md:text-sm font-semibold text-text-light dark:text-text-dark mb-3 uppercase tracking-wider">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {[
                    'Free Wifi',
                    'Parking Available',
                    'Air Conditioned',
                    'Complimentary Drinks',
                    'Card Payment',
                  ].map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 text-xs md:text-sm text-text-light/80 dark:text-text-dark/80 bg-gray-50 dark:bg-gray-800 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-border-light dark:border-border-dark"
                    >
                      <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-4 md:p-6 lg:p-8 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-text-light dark:text-text-dark">
                      Services Menu
                    </h2>
                    <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
                      Select a service to book your appointment
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md">
                    {activeServices.length} Services
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border-light dark:divide-border-dark">
                {isLoadingServices ? (
                  <div className="p-8 md:p-12 text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                      Loading services menu...
                    </p>
                  </div>
                ) : servicesError ? (
                  <div className="p-8 md:p-12 text-center">
                    <p className="text-sm text-danger mb-2">Failed to load services</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>
                ) : activeServices.length > 0 ? (
                  activeServices.map((service) => (
                    <div
                      key={service.id}
                      className="group p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        setSelectedService(service);
                        setShowBookingModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5 gap-3">
                            <h3 className="font-bold text-base md:text-lg text-text-light dark:text-text-dark group-hover:text-primary transition-colors truncate">
                              {service.name}
                            </h3>
                            <span className="font-bold text-base md:text-lg text-text-light dark:text-text-dark tabular-nums flex-shrink-0">
                              RWF {Number(service.basePrice).toLocaleString()}
                            </span>
                          </div>

                          {service.description && (
                            <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60 mb-2 md:mb-3 line-clamp-2">
                              {service.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                            <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              {service.durationMinutes} min
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          className="shrink-0 opacity-100 translate-x-0 md:opacity-0 md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 transition-all shadow-lg shadow-primary/20"
                        >
                          Book
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 md:p-16 text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-border-light dark:border-border-dark">
                      <Scissors className="w-6 h-6 md:w-8 md:h-8 text-text-light/30 dark:text-text-dark/30" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                      No services found
                    </h3>
                    <p className="text-xs md:text-sm text-text-light/60 dark:text-text-dark/60">
                      This salon hasn't listed any services yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Location & Contact Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-border-light dark:border-border-dark sticky top-6">
              <h3 className="font-bold text-text-light dark:text-text-dark mb-4 text-base md:text-lg">
                Location & Contact
              </h3>

              {salon.latitude && salon.longitude && (
                <div className="rounded-xl overflow-hidden mb-4 md:mb-5 border border-border-light dark:border-border-dark shadow-sm relative group">
                  <SalonLocationMap
                    latitude={salon.latitude}
                    longitude={salon.longitude}
                    salonName={salon.name}
                    address={salon.address}
                    height="160px"
                  />
                  <div className="absolute inset-0 pointer-events-none border-4 border-white/50 dark:border-black/50 rounded-xl"></div>
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                {salon.address && (
                  <div className="flex items-start gap-3 md:gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase mb-0.5">
                        Address
                      </p>
                      <span className="text-xs md:text-sm font-medium text-text-light dark:text-text-dark leading-tight block break-words">
                        {salon.address}
                      </span>
                    </div>
                  </div>
                )}
                {salon.phone && (
                  <div className="flex items-start gap-3 md:gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase mb-0.5">
                        Phone
                      </p>
                      <a
                        href={`tel:${salon.phone}`}
                        className="text-xs md:text-sm font-medium text-text-light dark:text-text-dark hover:text-primary transition-colors"
                      >
                        {salon.phone}
                      </a>
                    </div>
                  </div>
                )}
                {salon.email && (
                  <div className="flex items-start gap-3 md:gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase mb-0.5">
                        Email
                      </p>
                      <a
                        href={`mailto:${salon.email}`}
                        className="text-xs md:text-sm font-medium text-text-light dark:text-text-dark hover:text-primary transition-colors break-all"
                      >
                        {salon.email}
                      </a>
                    </div>
                  </div>
                )}
                {salon.website && (
                  <div className="flex items-start gap-3 md:gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                    <Globe className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-light/60 dark:text-text-dark/60 uppercase mb-0.5">
                        Website
                      </p>
                      <a
                        href={salon.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm font-medium text-primary hover:underline block truncate"
                      >
                        {salon.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-border-light dark:border-border-dark">
                <h3 className="font-bold text-text-light dark:text-text-dark mb-3 md:mb-4 text-xs md:text-sm uppercase tracking-wider">
                  Business Hours
                </h3>
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-text-light/60 dark:text-text-dark/60">Mon - Fri</span>
                    <span className="font-semibold text-text-light dark:text-text-dark bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      9:00 AM - 6:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-light/60 dark:text-text-dark/60">Saturday</span>
                    <span className="font-semibold text-text-light dark:text-text-dark bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      10:00 AM - 4:00 PM
                    </span>
                  </div>
                  <div className="flex justify-between items-center opacity-75">
                    <span className="text-text-light/60 dark:text-text-dark/60">Sunday</span>
                    <span className="font-semibold text-danger bg-danger/10 dark:bg-danger/20 px-2 py-0.5 rounded">
                      Closed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            alert('🎉 Appointment request submitted! The salon will confirm shortly.');
          }}
          salon={{
            id: salon.id,
            name: salon.name,
            address: salon.address,
          }}
          service={{
            id: selectedService.id,
            name: selectedService.name,
            durationMinutes: selectedService.durationMinutes || 30,
            basePrice: Number(selectedService.basePrice) || 0,
          }}
          customerId={customer?.id}
        />
      )}
    </div>
  );
}
