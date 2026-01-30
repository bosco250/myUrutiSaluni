'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { Loader2, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);

// Dynamic import for MarkerClusterGroup
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((mod) => mod.default),
  { ssr: false }
);

// Import the map event handler
const MapEventHandler = dynamic(
  () => import('./MapEventHandler').then((mod) => mod.default),
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
  services?: { id: string; name: string }[];
}

interface SalonBrowseMapProps {
  salons: Salon[];
  selectedSalonId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onMarkerClick: (salon: Salon) => void;
  onMapClick?: () => void;
  height?: string;
  className?: string;
}

// Default center (Kigali, Rwanda)
const DEFAULT_CENTER: [number, number] = [-1.9441, 30.0619];
const DEFAULT_ZOOM = 12;

// Create modern pill-style marker (like Airbnb/Google Maps)
const createMarkerIcon = (salonName: string, isSelected: boolean = false) => {
  if (typeof window === 'undefined') return undefined;

  // Truncate name if too long
  const displayName = salonName.length > 16 ? salonName.substring(0, 15) + '…' : salonName;

  // Modern color scheme
  const bgColor = isSelected ? '#1F2937' : '#FFFFFF';
  const textColor = isSelected ? '#FFFFFF' : '#1F2937';
  const borderColor = isSelected ? '#1F2937' : '#E5E7EB';
  const dotColor = '#C89B68';

  return L.divIcon({
    className: 'custom-salon-marker',
    html: `
      <div class="salon-marker-pill ${isSelected ? 'selected' : ''}">
        <span class="marker-dot"></span>
        <span class="marker-text">${displayName}</span>
      </div>
      <div class="marker-pointer ${isSelected ? 'selected' : ''}"></div>
    `,
    iconSize: [150, 50],
    iconAnchor: [75, 46],
    popupAnchor: [0, -46],
  });
};

export default function SalonBrowseMap({
  salons,
  selectedSalonId,
  userLocation,
  onMarkerClick,
  onMapClick,
  height = 'calc(100vh - 200px)',
  className = '',
}: SalonBrowseMapProps) {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Filter salons with valid coordinates
  const mappableSalons = useMemo(() => {
    return salons.filter(
      (s) =>
        typeof s.latitude === 'number' &&
        typeof s.longitude === 'number' &&
        !isNaN(s.latitude) &&
        !isNaN(s.longitude)
    );
  }, [salons]);

  // Calculate map bounds based on salon locations
  const bounds = useMemo(() => {
    if (mappableSalons.length === 0) return null;

    const coords = mappableSalons.map((s) => [s.latitude!, s.longitude!] as [number, number]);
    return L.latLngBounds(coords);
  }, [mappableSalons]);

  // Calculate center
  const center = useMemo(() => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng] as [number, number];
    }
    if (bounds) {
      const c = bounds.getCenter();
      return [c.lat, c.lng] as [number, number];
    }
    return DEFAULT_CENTER;
  }, [userLocation, bounds]);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Fix default marker icon issue in Next.js
        const DefaultIcon = L.default.Icon.Default;
        delete (DefaultIcon.prototype as any)._getIconUrl;

        DefaultIcon.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        setLeafletLoaded(true);
      }).catch((error) => {
        console.error('Failed to load Leaflet:', error);
        setMapError(true);
      });
    }
  }, []);

  const handleMarkerClick = useCallback(
    (salon: Salon) => {
      onMarkerClick(salon);
    },
    [onMarkerClick]
  );

  // Loading state
  if (!mounted || !leafletLoaded) {
    return (
      <div
        className={`w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">
            Loading map...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (mapError) {
    return (
      <div
        className={`w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="p-3 bg-error/10 rounded-full">
            <MapPin className="w-6 h-6 text-error" />
          </div>
          <p className="text-sm font-medium text-text-light dark:text-text-dark">
            Failed to load map
          </p>
          <button
            onClick={() => {
              setMapError(false);
              setLeafletLoaded(false);
              setMounted(false);
              setTimeout(() => setMounted(true), 100);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (mappableSalons.length === 0) {
    return (
      <div
        className={`w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <MapPin className="w-6 h-6 text-primary/60" />
          </div>
          <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
            No salons to display
          </h3>
          <p className="text-xs text-text-light/50 dark:text-text-dark/50 max-w-xs">
            {salons.length > 0
              ? `${salons.length} salon(s) found but none have location data`
              : 'Try adjusting your filters'}
          </p>
        </div>
      </div>
    );
  }

  const hiddenCount = salons.length - mappableSalons.length;

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden border border-border-light dark:border-border-dark relative shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        bounds={bounds || undefined}
        boundsOptions={{ padding: [50, 50] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.6,
              weight: 3,
            }}
          >
            <Popup>
              <div className="p-1 text-sm font-medium">Your location</div>
            </Popup>
          </CircleMarker>
        )}

        {/* Salon markers with clustering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div class="salon-cluster-marker">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(44, 44),
            });
          }}
        >
          {mappableSalons.map((salon) => (
            <Marker
              key={salon.id}
              position={[salon.latitude!, salon.longitude!]}
              icon={createMarkerIcon(salon.name, selectedSalonId === salon.id)}
              eventHandlers={{
                click: () => handleMarkerClick(salon),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-semibold text-sm mb-1">{salon.name}</h3>
                  {salon.rating && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <span className="text-warning">★</span>
                      <span>{salon.rating.toFixed(1)}</span>
                      {salon.reviewCount && (
                        <span className="text-gray-400">({salon.reviewCount})</span>
                      )}
                    </div>
                  )}
                  {(salon.district || salon.city) && (
                    <p className="text-xs text-gray-500">
                      {[salon.district, salon.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* Map click handler */}
        {onMapClick && <MapEventHandler onMapClick={onMapClick} />}
      </MapContainer>

      {/* Hidden salons indicator */}
      {hiddenCount > 0 && (
        <div className="absolute bottom-4 left-4 bg-warning/10 dark:bg-warning/20 text-warning text-xs px-3 py-2 rounded-lg border border-warning/20 shadow-sm z-[1000]">
          {hiddenCount} salon{hiddenCount > 1 ? 's' : ''} not shown (missing location)
        </div>
      )}

      {/* Map attribution overlay */}
      <div className="absolute bottom-4 right-4 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-sm border border-border-light dark:border-border-dark rounded-lg px-3 py-2 shadow-lg z-[1000]">
        <span className="text-[10px] text-text-light/60 dark:text-text-dark/60">
          {mappableSalons.length} salon{mappableSalons.length !== 1 ? 's' : ''} on map
        </span>
      </div>
    </div>
  );
}
