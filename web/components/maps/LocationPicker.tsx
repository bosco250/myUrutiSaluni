'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Fix for default marker icon in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onReverseGeocode?: (lat: number, lng: number) => Promise<void>;
  height?: string;
}

function MapClickHandler({
  onLocationSelect,
  onReverseGeocode,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  onReverseGeocode?: (lat: number, lng: number) => Promise<void>;
}) {
  const [isGeocoding, setIsGeocoding] = useState(false);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);

      if (onReverseGeocode) {
        setIsGeocoding(true);
        try {
          await onReverseGeocode(lat, lng);
        } catch (error: any) {
          console.error('Reverse geocoding error:', error);
          // Error is handled in the parent component, just log it here
        } finally {
          setIsGeocoding(false);
        }
      }
    },
  });

  return isGeocoding ? (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-text-light dark:text-text-dark">Getting address...</span>
    </div>
  ) : null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  onReverseGeocode,
  height = '400px',
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.9441, 30.0619]); // Default: Kigali, Rwanda

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    setMounted(true);

    // If coordinates are provided, use them
    if (latitude && longitude) {
      setMapCenter([latitude, longitude]);
    } else {
      // Try to get user's current location (only on client)
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapCenter([position.coords.latitude, position.coords.longitude]);
          },
          () => {
            // If geolocation fails, keep default (Kigali)
          }
        );
      }
    }
  }, [latitude, longitude]);

  if (!mounted) {
    return (
      <div
        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-text-light/60 dark:text-text-dark/60">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border-light dark:border-border-dark relative" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={latitude && longitude ? 16 : 13}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude && longitude && (
          <Marker 
            position={[latitude, longitude]}
            key={`${latitude}-${longitude}`}
          />
        )}
        <MapClickHandler onLocationSelect={onLocationSelect} onReverseGeocode={onReverseGeocode} />
      </MapContainer>
      <div className="absolute bottom-4 left-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-2 shadow-lg z-[1000]">
        <p className="text-xs text-text-light/60 dark:text-text-dark/60">
          Click on the map to set location
        </p>
      </div>
    </div>
  );
}

