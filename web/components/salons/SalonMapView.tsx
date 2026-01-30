'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import SalonPreviewPanel from './SalonPreviewPanel';

// Dynamic import for map to avoid SSR issues
const SalonBrowseMap = dynamic(
  () => import('@/components/maps/SalonBrowseMap'),
  { ssr: false }
);

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

interface SalonMapViewProps {
  salons: Salon[];
  userLocation?: { lat: number; lng: number } | null;
  favorites: string[];
  onToggleFavorite: (salonId: string) => void;
}

export default function SalonMapView({
  salons,
  userLocation,
  favorites,
  onToggleFavorite,
}: SalonMapViewProps) {
  const router = useRouter();
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);

  const handleMarkerClick = useCallback((salon: Salon) => {
    setSelectedSalon(salon);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedSalon(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedSalon(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (selectedSalon) {
      router.push(`/salons/browse/${selectedSalon.id}`);
    }
  }, [selectedSalon, router]);

  const handleToggleFavorite = useCallback(
    (salonId: string) => {
      onToggleFavorite(salonId);
    },
    [onToggleFavorite]
  );

  return (
    <div className="relative w-full h-[75vh] sm:h-[80vh] lg:h-[calc(100vh-200px)] min-h-[500px] max-h-[900px]">
      {/* Map */}
      <SalonBrowseMap
        salons={salons}
        selectedSalonId={selectedSalon?.id}
        userLocation={userLocation}
        onMarkerClick={handleMarkerClick}
        onMapClick={handleMapClick}
        height="100%"
        className="rounded-2xl shadow-lg"
      />

      {/* Preview Panel */}
      <SalonPreviewPanel
        salon={selectedSalon}
        isOpen={!!selectedSalon}
        onClose={handleClosePreview}
        onViewDetails={handleViewDetails}
        onToggleFavorite={handleToggleFavorite}
        isFavorited={selectedSalon ? favorites.includes(selectedSalon.id) : false}
        userLocation={userLocation}
      />
    </div>
  );
}
