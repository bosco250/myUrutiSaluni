import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EmployeePermission } from '@/lib/employee-permissions';
import { useAuthStore } from '@/store/auth-store';

interface MyPermissionsResponse {
  salonId: string;
  employeeId?: string;
  permissions: EmployeePermission[];
  isOwner: boolean;
}

export function useEmployeePermissions(salonId?: string) {
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery<MyPermissionsResponse>({
    queryKey: ['my-permissions', salonId],
    queryFn: async () => {
      if (!salonId) return { salonId: '', permissions: [], isOwner: false };
      const res = await api.get(`/salons/${salonId}/employees/permissions/me`);
      return res.data;
    },
    enabled: !!salonId && !!user,
    staleTime: 5 * 60 * 100, // 5 minutes
    retry: 1,
  });

  const hasPermission = (permission: EmployeePermission): boolean => {
    if (!salonId) return false;
    
    // Safety check: if user is not logged in
    if (!user) return false;

    // Owners generally have full access, but rely on backend 'isOwner' flag mostly.
    // However, if the query hasn't loaded yet, simplistic check:
    if (user.role === 'salon_owner') return true; 

    if (data?.isOwner) return true;
    
    return data?.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: EmployeePermission[]): boolean => {
      return permissions.some(p => hasPermission(p));
  }

  const hasAllPermissions = (permissions: EmployeePermission[]): boolean => {
      return permissions.every(p => hasPermission(p));
  }

  return {
    permissions: data?.permissions || [],
    isOwner: data?.isOwner || user?.role === 'salon_owner',
    isLoading,
    error,
    hasPermission,
    can: hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
