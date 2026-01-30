'use client';

import { useMapEvents } from 'react-leaflet';

interface MapEventHandlerProps {
  onMapClick?: () => void;
}

export default function MapEventHandler({ onMapClick }: MapEventHandlerProps) {
  useMapEvents({
    click: () => {
      onMapClick?.();
    },
  });

  return null;
}
