'use client';

// Keep dynamic to prevent static generation issues with auth
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService, LoginCredentials } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!credentials.email || !credentials.password) {
      setError('Please fill in all fields.');
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.access_token);

      // Check if user came from membership form
      // Check if user came from membership form or other protected route
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      if (redirect) {
        if (redirect === 'membership') {
          const hasFormData =
            typeof window !== 'undefined' && sessionStorage.getItem('membershipFormData');
          if (hasFormData) {
            router.push('/membership/complete');
          } else {
            router.push('/dashboard');
          }
        } else if (redirect === 'purchase_intent') {
          const purchaseIntentStr =
            typeof window !== 'undefined' && sessionStorage.getItem('purchase_intent');
          if (purchaseIntentStr) {
            try {
              const { salonId, serviceId } = JSON.parse(purchaseIntentStr);
              // Redirect to salon page with bookService param to auto-open modal
              router.push(`/salons/browse/${salonId}?bookService=${serviceId}`);
            } catch (e) {
              router.push('/salons/browse');
            }
            // Clear intent after use
            sessionStorage.removeItem('purchase_intent');
          } else {
            router.push('/salons/browse');
          }
        } else if (redirect.startsWith('/')) {
          // General redirect to protected path
          router.push(redirect);
        } else {
           // Fallback if redirect is invalid (not relative)
           if (response.user.role === 'customer') {
             router.push('/salons/browse');
           } else {
             router.push('/dashboard');
           }
        }
      } else {
        // Default routing if no redirect param
        if (response.user.role === 'customer') {
          router.push('/salons/browse');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        maybeAxios?.response?.data?.message ||
        maybeAxios?.message ||
        'Login failed. Please check your credentials.';
      setError(errorMessage);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="max-w-[420px] w-full mx-auto px-4 my-8">
      <div className="text-center mb-5 sm:mb-8 lg:text-left">
        <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-3 sm:mb-4 lg:hidden">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="c-title text-text-light dark:text-text-dark mb-2">Welcome back</h2>
        <p className="c-body text-text-light/60 dark:text-text-dark/60">
          Please enter your details to sign in.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex flex-col gap-[var(--gap-normal)] ${shake ? 'animate-shake' : ''}`}
      >
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error">Authentication Error</h3>
              <p className="text-xs text-error/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[var(--gap-tight)]">
          {/* Email Input */}
          <div className="group">
            <label
              htmlFor="email"
              className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${
                focusedField === 'email'
                  ? 'text-primary'
                  : 'text-text-light/60 dark:text-text-dark/60'
              }`}
            >
              Email Address
            </label>
            <div
              className={`relative transition-all duration-300 ${
                focusedField === 'email' ? 'transform scale-[1.01]' : ''
              }`}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail
                  className={`w-4 h-4 transition-colors ${
                    focusedField === 'email'
                      ? 'text-primary'
                      : 'text-text-light/40 dark:text-text-dark/40'
                  }`}
                />
              </div>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`block w-full pl-9 pr-3 py-2.5 c-body bg-surface-light dark:bg-surface-dark border rounded-lg text-text-light dark:text-text-dark placeholder:text-text-light/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                  error ? 'border-error' : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="group">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className={`block c-secondary font-semibold uppercase tracking-wider transition-colors ${
                  focusedField === 'password'
                    ? 'text-primary'
                    : 'text-text-light/60 dark:text-text-dark/60'
                }`}
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="c-secondary font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div
              className={`relative transition-all duration-300 ${
                focusedField === 'password' ? 'transform scale-[1.01]' : ''
              }`}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock
                  className={`w-4 h-4 transition-colors ${
                    focusedField === 'password'
                      ? 'text-primary'
                      : 'text-text-light/40 dark:text-text-dark/40'
                  }`}
                />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`block w-full pl-9 pr-12 py-2.5 c-body bg-surface-light dark:bg-surface-dark border rounded-lg text-text-light dark:text-text-dark placeholder:text-text-light/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                  error ? 'border-error' : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="!absolute right-2 top-1/2 -translate-y-1/2 z-10 !h-8 !w-8 !p-0 rounded-md !bg-transparent !border-0 hover:bg-background-light/60 dark:hover:bg-background-dark/40 text-text-light/60 dark:text-text-dark/60"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <Button type="submit" loading={loading} loadingText="Signing in..." className="w-full h-10">
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        <p className="text-center c-secondary text-text-light/60 dark:text-text-dark/60 mt-1">
          Don&apos;t have an account?{' '}
          <Link
            href={`/register${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect') ? `?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect')!)}` : ''}`}
            className="font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
          >
            Create an account
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </form>

      <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-border-light dark:border-border-dark text-center hidden sm:block">
        <p className="c-meta text-text-light/40 dark:text-text-dark/40">
          © {new Date().getFullYear()} Uruti Saluni. All rights reserved.
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  );
}
