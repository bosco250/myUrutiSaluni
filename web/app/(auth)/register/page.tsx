'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService, RegisterData } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'customer', // Default to customer
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
      const response = await authService.register(formData);
      setUser(response.user);
      setToken(response.access_token);

      // Check if user came from membership form
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      if (redirect === 'membership') {
        // Check if membership form data exists
        const hasFormData =
          typeof window !== 'undefined' && sessionStorage.getItem('membershipFormData');
        if (hasFormData) {
          // Redirect to complete membership page
          router.push('/membership/complete');
        } else {
          // No form data, go to dashboard
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if coming from membership form
  const urlParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isFromMembership = urlParams?.get('redirect') === 'membership';
  const hasFormData = typeof window !== 'undefined' && sessionStorage.getItem('membershipFormData');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4 py-12">
      <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl p-8 border border-border-light dark:border-border-dark">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
            {isFromMembership ? 'Step 2 of 3: Create Account' : 'Create Account'}
          </h1>
          <p className="text-text-light dark:text-text-dark opacity-70">
            {isFromMembership
              ? 'Complete your membership application by creating your account'
              : 'Join the Salon Association Platform'}
          </p>
        </div>

        {isFromMembership && hasFormData && (
          <div className="mb-6 p-4 bg-info-light dark:bg-info/20 border border-info dark:border-info rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-info/20 dark:bg-info/40 flex items-center justify-center">
                  <span className="text-info dark:text-info-light font-bold text-sm">2</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-info-dark dark:text-info-light mb-1">
                  Membership Application in Progress
                </p>
                <div className="space-y-1 text-xs text-info-dark dark:text-info-light">
                  <p>✓ Step 1: Form completed and saved</p>
                  <p>⏳ Step 2: Creating account (current step)</p>
                  <p>⏸️ Step 3: Auto-submit application (next)</p>
                </div>
                <p className="text-xs text-info-dark dark:text-info-light mt-2 font-medium">
                  Your form data is safely stored and will be automatically submitted after
                  registration.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-error-light dark:bg-error/20 border border-error dark:border-error text-error-dark dark:text-error-light rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Phone (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+250 788 123 456"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              I want to register as
            </label>
            <select
              id="role"
              value={formData.role || 'customer'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'customer' | 'salon_owner' | 'salon_employee',
                })
              }
              className="w-full px-4 py-2 text-text-light dark:text-text-dark bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="customer">Customer (I want to use salon services)</option>
              <option value="salon_owner">Salon Owner (I want to manage my salon business)</option>
              <option value="salon_employee">Salon Employee (I work at a salon)</option>
            </select>
            <p className="mt-1 text-xs text-text-light dark:text-text-dark opacity-60">
              {formData.role === 'salon_owner'
                ? "You'll need to apply for membership after registration to access salon management features."
                : formData.role === 'salon_employee'
                  ? 'After registration, your salon owner will link your account to the salon. You can then access employee features.'
                  : 'You can view your purchase history, appointments, and loyalty points.'}
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 pr-12 text-text-light dark:text-text-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light dark:text-text-dark opacity-60 hover:opacity-100 focus:outline-none transition-opacity"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-text-light dark:text-text-dark opacity-60">
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-light dark:text-text-dark opacity-70">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:opacity-80 font-medium transition-opacity"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
