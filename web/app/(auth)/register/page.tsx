'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService, RegisterData } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { Eye, EyeOff, User, Mail, Phone, Lock, Briefcase, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken, isAuthenticated } = useAuthStore();
  
  // Initialize role based on valid types
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'customer',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Check if coming from membership form
  const [isFromMembership, setIsFromMembership] = useState(false);
  const [hasFormData, setHasFormData] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
    
    // Client-side check for query params
    const urlParams = new URLSearchParams(window.location.search);
    setIsFromMembership(urlParams.get('redirect') === 'membership');
    setHasFormData(!!sessionStorage.getItem('membershipFormData'));
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.register(formData);
      setUser(response.user);
      setToken(response.access_token);

      // Handle redirects
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      if (redirect) {
        if (redirect === 'membership') {
          if (sessionStorage.getItem('membershipFormData')) {
            router.push('/membership/complete');
          } else {
            router.push('/dashboard');
          }
        } else if (redirect === 'purchase_intent') {
          const purchaseIntentStr = sessionStorage.getItem('purchase_intent');
          if (purchaseIntentStr) {
            try {
              const { salonId, serviceId } = JSON.parse(purchaseIntentStr);
              router.push(`/salons/browse/${salonId}?bookService=${serviceId}`);
            } catch (e) {
              router.push('/salons/browse');
            }
            sessionStorage.removeItem('purchase_intent');
          } else {
            router.push('/salons/browse');
          }
        } else if (redirect.startsWith('/')) {
          router.push(redirect);
        } else {
          router.push(response.user.role === 'customer' ? '/salons/browse' : '/dashboard');
        }
      } else {
        router.push(response.user.role === 'customer' ? '/salons/browse' : '/dashboard');
      }
    } catch (err: unknown) {
      const maybeAxios = err as { response?: { data?: { message?: string } } };
      setError(maybeAxios?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[420px] w-full mx-auto px-4 my-8">
      <div className="text-center mb-8 lg:text-left">
        <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-4 lg:hidden">
            <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="c-title text-text-light dark:text-text-dark mb-2">
          {isFromMembership ? 'Finish Application' : 'Create Account'}
        </h2>
        <p className="c-body text-text-light/60 dark:text-text-dark/60">
          {isFromMembership 
            ? 'Create an account to submit your membership.' 
            : 'Join Uruti Saluni for the best experience.'}
        </p>
      </div>

      {isFromMembership && hasFormData && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-start gap-3 relative z-10">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">2/3</span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary mb-1">Membership in Progress</p>
              <p className="text-xs text-text-light/70 dark:text-text-dark/70">
                Your application data is saved. Create an account to proceed to the final step.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--gap-normal)]">
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error">Registration Error</h3>
              <p className="text-xs text-error/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[var(--gap-tight)]">
          {/* Full Name */}
          <div className="group">
            <label htmlFor="fullName" className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${focusedField === 'fullName' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}>
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className={`w-4 h-4 transition-colors ${focusedField === 'fullName' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
              </div>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-9 pr-3 py-2.5 c-body bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="group">
            <label htmlFor="email" className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}>
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className={`w-4 h-4 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
              </div>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-9 pr-3 py-2.5 c-body bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          {/* Phone (Optional) */}
          <div className="group">
            <label htmlFor="phone" className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${focusedField === 'phone' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}>
              Phone (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className={`w-4 h-4 transition-colors ${focusedField === 'phone' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
              </div>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-9 pr-3 py-2.5 c-body bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                placeholder="+250 788 000 000"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="group">
            <label htmlFor="role" className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${focusedField === 'role' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}>
              I am a...
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className={`w-4 h-4 transition-colors ${focusedField === 'role' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
              </div>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'customer' | 'salon_owner' | 'salon_employee' })}
                onFocus={() => setFocusedField('role')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-9 pr-3 py-2.5 c-body bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none appearance-none"
              >
                <option value="customer">Customer (Booking Services)</option>
                <option value="salon_owner">Salon Owner (Managing Business)</option>
                <option value="salon_employee">Salon Employee (Staff)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                 <svg className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-text-light/50 dark:text-text-dark/50 italic">
              {formData.role === 'customer' && "For booking appointments and finding salons."}
              {formData.role === 'salon_owner' && "For registering and managing your salon."}
              {formData.role === 'salon_employee' && "For joined staff members."}
            </p>
          </div>

          {/* Password */}
          <div className="group">
             <label htmlFor="password" className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'}`}>
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`w-4 h-4 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'}`} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="block w-full pl-9 pr-9 py-2.5 c-body bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-light/40 dark:text-text-dark/40 hover:text-text-light/80 dark:hover:text-text-dark/80 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center c-secondary text-text-light/60 dark:text-text-dark/60 mt-2">
          Already have an account?{' '}
          <Link 
            href={`/login${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect') ? `?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect')!)}` : ''}`} 
            className="font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
          >
            Sign in
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </form>

      <div className="mt-8 pt-4 border-t border-border-light dark:border-border-dark text-center">
        <p className="c-meta text-text-light/40 dark:text-text-dark/40">
          By registering, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
