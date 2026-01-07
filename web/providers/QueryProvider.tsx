'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data freshness: Consider data fresh for 5 minutes
            // This prevents unnecessary refetches on component mount
            staleTime: 5 * 60 * 1000,
            
            // Cache retention: Keep unused data for 30 minutes
            // This improves navigation performance
            gcTime: 30 * 60 * 1000,
            
            // Don't refetch when window regains focus (reduces API calls)
            refetchOnWindowFocus: false,
            
            // Refetch on mount only if data is stale
            refetchOnMount: 'always',
            
            // Don't refetch on reconnect (user can manually refresh)
            refetchOnReconnect: false,
            
            // Retry failed requests once with exponential backoff
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            
            // Enable structural sharing for better memoization
            structuralSharing: true,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

