'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Dynamically import the map components to avoid SSR issues
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

interface SalonLocationMapProps {
  latitude: number;
  longitude: number;
  salonName?: string;
  address?: string;
  height?: string;
}

export default function SalonLocationMap({
  latitude,
  longitude,
  salonName,
  address,
  height = '400px',
}: SalonLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Dynamically load leaflet and fix icon issue
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Fix for default marker icon in Next.js
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
      });
    }
  }, []);

  if (!mounted || !leafletLoaded) {
    return (
      <div
        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl flex items-center justify-center"
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

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-border-light dark:border-border-dark relative"
      style={{ height }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          {salonName && (
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{salonName}</h3>
                {address && <p className="text-xs text-gray-600">{address}</p>}
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
      
      <div className="absolute bottom-4 right-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-2 shadow-lg z-[1000]">
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Open in OpenStreetMap →
        </a>
      </div>
    </div>
  );
}