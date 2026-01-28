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
    rejectionReason?: string;
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
        // Unwrap the TransformInterceptor envelope: { data: { isMember, application }, statusCode }
        const result = response.data?.data || response.data;
        return result;
      } catch (error) {
        // Return default values on error
        return { isMember: false, application: null };
      }
    },
    enabled: !!user && (isCustomer() || isSalonOwner()),
    retry: false,
    staleTime: 30 * 1000, // 30 seconds - reduced from 5 minutes to allow faster updates
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch on window focus to get latest status
    refetchOnMount: 'always', // Always refetch when component mounts if data is stale
  });
}

