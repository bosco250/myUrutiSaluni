'use client';

import { useBackendHealth } from '@/hooks/useBackendHealth';
import { WifiOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BackendStatusBanner() {
  const { isOnline, isLoading } = useBackendHealth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show banner if we are definitely offline (not just loading initially)
    const shouldShow = !isLoading && !isOnline;
    console.log('[BackendStatusBanner] Status:', { isLoading, isOnline, showBanner: shouldShow });
    
    if (shouldShow) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [isOnline, isLoading]);

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-2xl animate-in slide-in-from-top-full duration-300 pointer-events-auto">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between sm:justify-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-full animate-pulse">
            <WifiOff className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-medium tracking-wide">
            <strong>We lost our connection to the server.</strong>
            <span className="opacity-90 font-normal hidden sm:inline ml-1">
              Don't worry, we're trying to get you back online...
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full border border-white/10">
            <Loader2 className="w-3 h-3 animate-spin text-white/80" />
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Retrying</span>
          </div>
        </div>
      </div>
    </div>
  );
}
