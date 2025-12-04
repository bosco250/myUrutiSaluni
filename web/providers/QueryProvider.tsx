'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh for 2 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache for 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            refetchOnMount: true, // Refetch on mount if data is stale
            retry: 1, // Retry failed requests once
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

