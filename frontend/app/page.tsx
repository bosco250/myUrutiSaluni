'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [user, token, isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Salon Association Platform
        </h1>
        <p className="text-center text-lg mb-8 text-gray-600">
          Integrated digital system for salon operations, membership, accounting, and micro-lending
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Membership Management</h2>
            <p className="text-gray-600">Register and manage salon owners and employees</p>
          </div>
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Salon Operations</h2>
            <p className="text-gray-600">Appointments, services, inventory, and POS</p>
          </div>
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Accounting & Finance</h2>
            <p className="text-gray-600">Financial management, loans, and wallets</p>
          </div>
        </div>
        <div className="text-center space-x-4">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-600 hover:bg-blue-50 transition font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}

