import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * RefreshContext
 * 
 * A system-wide context for triggering data refreshes across the app.
 * 
 * Usage:
 * 1. After modifying data (add/update/delete), call triggerRefresh()
 * 2. In screens that display data, listen to refreshKey in useEffect
 * 
 * Example:
 * ```tsx
 * // After creating a service:
 * const { triggerRefresh } = useRefresh();
 * await salonService.addService(...);
 * triggerRefresh();
 * 
 * // In a screen that shows services:
 * const { refreshKey, isRefreshing } = useRefresh();
 * useEffect(() => {
 *   loadData();
 * }, [refreshKey]);
 * ```
 */

interface RefreshContextType {
  /** Increments on every refresh trigger. Use as dependency in useEffect. */
  refreshKey: number;
  /** Timestamp of last refresh. Useful for cache busting. */
  lastRefreshedAt: Date | null;
  /** Whether a refresh is currently in progress (for loading indicators). */
  isRefreshing: boolean;
  /** Call this after mutating data to trigger all listeners to refetch. */
  triggerRefresh: () => void;
  /** Set refreshing state (for pull-to-refresh UI). */
  setIsRefreshing: (value: boolean) => void;
  /** Force refresh with a specific key (advanced usage). */
  forceRefresh: (key?: string) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setLastRefreshedAt(new Date());
  }, []);

  const forceRefresh = useCallback((key?: string) => {
    // Optional: Could emit events for specific data types
    triggerRefresh();
  }, [triggerRefresh]);

  const value: RefreshContextType = {
    refreshKey,
    lastRefreshedAt,
    isRefreshing,
    triggerRefresh,
    setIsRefreshing,
    forceRefresh,
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

/**
 * useRefresh hook
 * 
 * Access the global refresh context from any component.
 * 
 * @returns RefreshContextType
 * @throws Error if used outside RefreshProvider
 */
export function useRefresh(): RefreshContextType {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}
