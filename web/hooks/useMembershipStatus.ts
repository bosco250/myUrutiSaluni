import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from './usePermissions';

interface MembershipStatus {
  isMember: boolean;
  application: {
    id: string;
    status: string;
    applicantId: string;
    businessName?: string;
    createdAt: string;
    reviewedAt?: string;
  } | null;
}

/**
 * Shared hook for checking membership status
 * Uses React Query caching to prevent duplicate API calls
 * Cache is shared across all components using this hook
 */
export function useMembershipStatus() {
  const { user } = useAuthStore();
  const { isCustomer, isSalonOwner } = usePermissions();

  return useQuery<MembershipStatus>({
    queryKey: ['membership-status', user?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/memberships/status');
        return response.data;
      } catch (error) {
        // Return default values on error
        return { isMember: false, application: null };
      }
    },
    enabled: !!user && (isCustomer() || isSalonOwner()),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - membership status doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch if data exists in cache
  });
}

