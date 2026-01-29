'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ModernHeader from '@/components/layout/ModernHeader';
import FloatingNav from '@/components/navigation/FloatingNav';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [mounted, setMounted] = useState(false);

  // Compute authentication status as a boolean
  const isAuthenticated = !!(user && token);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublicRoute = pathname ? pathname.startsWith('/salons') : false;

  // Ensure we only check authentication after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we've mounted AND the store has finished hydrating
    // AND NOT authenticated AND NOT a public route
    // AND pathname is available (to avoid premature redirects)
    if (mounted && _hasHydrated && !isAuthenticated && !isPublicRoute && pathname) {
      const currentQuery = searchParams?.toString();
      const fullUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
      router.push(`/login?redirect=${encodeURIComponent(fullUrl)}`);
    }
  }, [mounted, _hasHydrated, isAuthenticated, router, isPublicRoute, pathname, searchParams]);

  // During SSR and initial render, show a loading state to prevent hydration mismatch
  // Also wait for hydration to complete
  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-light/60 dark:text-text-dark/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <ModernHeader />
      <main className="py-2 pl-4 pr-16 sm:pl-6 sm:pr-20 md:pl-8 md:pr-18 lg:pr-24 transition-all duration-300">{children}</main>
      <FloatingNav />
    </div>
  );
}
