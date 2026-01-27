'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  // Ensure we only check authentication after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we've mounted AND the store has finished hydrating
    if (mounted && _hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, _hasHydrated, isAuthenticated, router]);

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

  if (!isAuthenticated) {
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
