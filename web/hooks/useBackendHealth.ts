import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useBackendHealth() {
  const { data, isError, error, isLoading } = useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      try {
        // Use a short timeout for health checks so we detect failure quickly
        const response = await api.get('/health', { timeout: 3000 });
        console.log('[Health Check] Success', response.data);
        return response.data;
      } catch (err) {
        console.error('[Health Check] Failed', err);
        throw err;
      }
    },
    // Check every 5 seconds (rapid detection)
    refetchInterval: 5000,
    // Retry fewer times to fail faster
    retry: 1,
    // If it fails, keep retry delay short
    retryDelay: 2000,
    refetchOnWindowFocus: true,
  });

  return {
    isOnline: !isError,
    isLoading,
    error,
  };
}
