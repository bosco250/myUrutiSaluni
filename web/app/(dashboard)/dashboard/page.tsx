'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePermissions } from '@/hooks/usePermissions';
import { useMembershipStatus } from '@/hooks/useMembershipStatus';
import { useAuthStore } from '@/store/auth-store';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

// Dynamic imports - only load the dashboard component that's actually needed
// This reduces initial bundle by ~150KB
const CustomerDashboard = dynamic(() => import('@/components/dashboards/CustomerDashboard'), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const SalonOwnerDashboard = dynamic(() => import('@/components/dashboards/SalonOwnerDashboard'), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

const AdminDashboard = dynamic(() => import('@/components/dashboards/AdminDashboard'), {
  loading: () => <DashboardSkeleton />,
  ssr: false,
});

// Skeleton component for loading state
function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const { isCustomer, isSalonOwner, isAdmin } = usePermissions();
  const { data: membershipStatus } = useMembershipStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  // Check if user role might be outdated (e.g., after membership approval)
  useEffect(() => {
    // If user has an approved membership but role is still customer, show refresh prompt
    if (membershipStatus?.isMember && user?.role === 'customer') {
      setShowRefreshPrompt(true);
    } else {
      setShowRefreshPrompt(false);
    }
  }, [membershipStatus, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      setShowRefreshPrompt(false);
      // Force a page reload to update the dashboard
      window.location.reload();
    } catch (error) {
      // Error refreshing user
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show refresh prompt if needed
  if (showRefreshPrompt) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-primary/10 border border-primary rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
            Your Role Has Been Updated!
          </h2>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Your membership application has been approved and your role has been updated to{' '}
            <strong>SALON_OWNER</strong>.
            <br />
            Please refresh your profile to access the new features.
          </p>
          <Button
            onClick={handleRefresh}
            variant="primary"
            disabled={isRefreshing}
            className="flex items-center gap-2 mx-auto"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Profile
              </>
            )}
          </Button>
          <p className="text-sm text-text-light/40 dark:text-text-dark/40 mt-4">
            Or log out and log back in to get a new token with your updated role.
          </p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  // Customers now see their own CustomerDashboard
  if (isCustomer()) {
    return <CustomerDashboard />;
  }

  if (isSalonOwner()) {
    return <SalonOwnerDashboard />;
  }

  if (isAdmin()) {
    return <AdminDashboard />;
  }

  // Salon employees see the salon owner dashboard (they work with salons)
  if (user?.role === 'salon_employee') {
    return <SalonOwnerDashboard />;
  }

  // Fallback for other roles (e.g., DISTRICT_LEADER)
  return <SalonOwnerDashboard />;
}
