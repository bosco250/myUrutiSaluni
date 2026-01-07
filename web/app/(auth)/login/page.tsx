'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService, LoginCredentials } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken, isAuthenticated } = useAuthStore();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.access_token);
      
      // Check if user came from membership form
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      
      if (redirect === 'membership') {
        // Check if membership form data exists
        const hasFormData = typeof window !== 'undefined' && sessionStorage.getItem('membershipFormData');
        if (hasFormData) {
          // Redirect to complete membership page
          router.push('/membership/complete');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
      <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl p-8 border border-border-light dark:border-border-dark">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">Salon Association</h1>
          <p className="text-text-light dark:text-text-dark opacity-70">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-light dark:bg-error/20 border border-error dark:border-error text-error-dark dark:text-error-light rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full px-4 py-2 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-2 pr-12 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light dark:text-text-dark opacity-60 hover:opacity-100 focus:outline-none transition-opacity"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-light dark:text-text-dark opacity-70">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:opacity-80 font-medium transition-opacity">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

