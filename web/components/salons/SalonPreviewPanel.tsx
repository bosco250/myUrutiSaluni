'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  MapPin,
  Navigation,
  Heart,
  ArrowRight,
  Scissors,
  Phone,
  Clock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

interface Salon {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  district?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  description?: string;
  phone?: string;
  services?: { id: string; name: string; category?: string }[];
  createdAt?: string;
}

interface SalonPreviewPanelProps {
  salon: Salon | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onToggleFavorite?: (salonId: string) => void;
  isFavorited?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

export default function SalonPreviewPanel({
  salon,
  isOpen,
  onClose,
  onViewDetails,
  onToggleFavorite,
  isFavorited = false,
  userLocation,
}: SalonPreviewPanelProps) {
  // Helper to resolve image URLs
  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) {
      // If the URL contains localhost but we are accessing via IP, translate it
      if (
        url.includes('localhost') &&
        typeof window !== 'undefined' &&
        !window.location.hostname.includes('localhost')
      ) {
        const port = url.split(':').pop()?.split('/')[0];
        return `http://${window.location.hostname}:${port || '4000'}${url.split(port || '4000')[1]}`;
      }
      return url;
    }

    // Handle relative paths
    const apiBase = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://161.97.148.53:4000';
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Calculate distance
  const distance = useMemo(() => {
    if (!userLocation || !salon?.latitude || !salon?.longitude) return null;

    const R = 6371; // Radius of the earth in km
    const dLat = (salon.latitude - userLocation.lat) * (Math.PI / 180);
    const dLon = (salon.longitude - userLocation.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * (Math.PI / 180)) *
        Math.cos(salon.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [userLocation, salon?.latitude, salon?.longitude]);

  const location = salon
    ? [salon.district, salon.city].filter(Boolean).join(', ') ||
      salon.address ||
      'Location not available'
    : '';

  const hasImage = salon?.images && salon.images.length > 0 && salon.images[0];
  const imageUrl = hasImage ? salon!.images![0] : null;

  // Check if new (within 30 days)
  const isNew = salon?.createdAt
    ? Date.now() - new Date(salon.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  // Check if top rated
  const isTopRated = (salon?.rating || 0) >= 4.5;

  return (
    <>
      {/* Desktop: Side Panel */}
      <AnimatePresence>
        {isOpen && salon && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="hidden lg:flex absolute top-0 right-0 h-full w-[380px] z-[1001] flex-col bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark shadow-2xl"
          >
            {/* Header with Image */}
            <div className="relative h-48 flex-shrink-0">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(imageUrl)}
                  alt={salon.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-background-light dark:bg-background-dark flex items-center justify-center">
                  <Scissors className="w-12 h-12 text-primary/30" />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Favorite button */}
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(salon.id)}
                  className="absolute top-3 left-3 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </button>
              )}

              {/* Badges */}
              <div className="absolute bottom-3 left-3 flex gap-2">
                {isTopRated && (
                  <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-white/90 text-black shadow-sm tracking-wide">
                    Top Rated
                  </span>
                )}
                {isNew && (
                  <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-primary text-white shadow-sm tracking-wide">
                    New
                  </span>
                )}
              </div>

              {/* Rating badge */}
              {salon.rating && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="font-bold text-sm text-black">{salon.rating.toFixed(1)}</span>
                  {salon.reviewCount && (
                    <span className="text-xs text-gray-500">({salon.reviewCount})</span>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">
                  {salon.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-text-light/60 dark:text-text-dark/60">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{location}</span>
                </div>
                {distance !== null && (
                  <div className="flex items-center gap-2 text-xs text-primary mt-1">
                    <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium">
                      {distance < 1 ? '<1' : distance.toFixed(1)} km away
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {salon.description && (
                <div>
                  <p className="text-sm text-text-light/70 dark:text-text-dark/70 line-clamp-3">
                    {salon.description}
                  </p>
                </div>
              )}

              {/* Quick info */}
              <div className="flex flex-wrap gap-2">
                {salon.phone && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background-light dark:bg-background-dark rounded-lg text-xs">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span className="text-text-light/70 dark:text-text-dark/70">{salon.phone}</span>
                  </div>
                )}
                {salon.services && salon.services.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-lg text-xs">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary font-medium">
                      {salon.services.length} service{salon.services.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Services preview */}
              {salon.services && salon.services.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-light/50 dark:text-text-dark/50 uppercase tracking-wide mb-2">
                    Services
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {salon.services.slice(0, 5).map((service) => (
                      <span
                        key={service.id}
                        className="px-2 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs text-text-light/80 dark:text-text-dark/80"
                      >
                        {service.name}
                      </span>
                    ))}
                    {salon.services.length > 5 && (
                      <span className="px-2 py-1 bg-primary/10 rounded-md text-xs text-primary font-medium">
                        +{salon.services.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with CTA */}
            <div className="flex-shrink-0 p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <Button
                onClick={onViewDetails}
                className="w-full justify-center gap-2"
              >
                View Details & Book
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Bottom Sheet */}
      <AnimatePresence>
        {isOpen && salon && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/30 z-[1000]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-surface-light dark:bg-surface-dark rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border-light dark:bg-border-dark rounded-full" />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {/* Image and basic info row */}
                <div className="flex gap-3 mb-4">
                  {/* Thumbnail */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-background-light dark:bg-background-dark">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(imageUrl)}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scissors className="w-8 h-8 text-primary/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-bold text-text-light dark:text-text-dark line-clamp-1">
                        {salon.name}
                      </h2>
                      {onToggleFavorite && (
                        <button
                          onClick={() => onToggleFavorite(salon.id)}
                          className="p-1.5 -mt-0.5 -mr-1"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              isFavorited
                                ? 'fill-red-500 text-red-500'
                                : 'text-text-light/40 dark:text-text-dark/40'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {salon.rating && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                        <span className="font-semibold text-sm text-text-light dark:text-text-dark">
                          {salon.rating.toFixed(1)}
                        </span>
                        {salon.reviewCount && (
                          <span className="text-xs text-text-light/50 dark:text-text-dark/50">
                            ({salon.reviewCount} reviews)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-light/60 dark:text-text-dark/60">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{location}</span>
                    </div>

                    {distance !== null && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-primary">
                        <Navigation className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">
                          {distance < 1 ? '<1' : distance.toFixed(1)} km away
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {salon.description && (
                  <p className="text-sm text-text-light/70 dark:text-text-dark/70 line-clamp-2 mb-4">
                    {salon.description}
                  </p>
                )}

                {/* Services */}
                {salon.services && salon.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {salon.services.slice(0, 4).map((service) => (
                      <span
                        key={service.id}
                        className="px-2 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-xs text-text-light/80 dark:text-text-dark/80"
                      >
                        {service.name}
                      </span>
                    ))}
                    {salon.services.length > 4 && (
                      <span className="px-2 py-1 bg-primary/10 rounded-md text-xs text-primary font-medium">
                        +{salon.services.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <Button
                  onClick={onViewDetails}
                  className="w-full justify-center gap-2"
                >
                  View Details & Book
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
