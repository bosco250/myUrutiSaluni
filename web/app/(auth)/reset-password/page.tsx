'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        maybeAxios?.response?.data?.message ||
        'Failed to reset password. The link may have expired.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-[420px] w-full mx-auto px-4 my-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-6">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="c-title text-text-light dark:text-text-dark mb-3">Password Reset!</h2>
          <p className="c-body text-text-light/60 dark:text-text-dark/60 mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <p className="text-sm text-text-light/50 dark:text-text-dark/50 mb-6">
            Redirecting to login page...
          </p>
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Login Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[420px] w-full mx-auto px-4 my-8">
      <div className="text-center mb-8 lg:text-left">
        <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-4 lg:hidden">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="c-title text-text-light dark:text-text-dark mb-2">Create New Password</h2>
        <p className="c-body text-text-light/60 dark:text-text-dark/60">
          Your new password must be at least 6 characters long.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--gap-normal)]">
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error">Error</h3>
              <p className="text-xs text-error/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[var(--gap-tight)]">
          {/* New Password Input */}
          <div className="group">
            <label 
              htmlFor="newPassword" 
              className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${
                focusedField === 'newPassword' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'
              }`}
            >
              New Password
            </label>
            <div className={`relative transition-all duration-300 ${
              focusedField === 'newPassword' ? 'transform scale-[1.01]' : ''
            }`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`w-4 h-4 transition-colors ${
                  focusedField === 'newPassword' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'
                }`} />
              </div>
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setFocusedField('newPassword')}
                onBlur={() => setFocusedField(null)}
                className={`block w-full pl-9 pr-12 py-2.5 c-body bg-surface-light dark:bg-surface-dark border rounded-lg text-text-light dark:text-text-dark placeholder:text-text-light/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                  error ? 'border-error' : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={!token}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="!absolute right-2 top-1/2 -translate-y-1/2 z-10 !h-8 !w-8 !p-0 rounded-md !bg-transparent !border-0 hover:bg-background-light/60 dark:hover:bg-background-dark/40 text-text-light/60 dark:text-text-dark/60"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="group">
            <label 
              htmlFor="confirmPassword" 
              className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${
                focusedField === 'confirmPassword' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'
              }`}
            >
              Confirm Password
            </label>
            <div className={`relative transition-all duration-300 ${
              focusedField === 'confirmPassword' ? 'transform scale-[1.01]' : ''
            }`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`w-4 h-4 transition-colors ${
                  focusedField === 'confirmPassword' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'
                }`} />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                className={`block w-full pl-9 pr-12 py-2.5 c-body bg-surface-light dark:bg-surface-dark border rounded-lg text-text-light dark:text-text-dark placeholder:text-text-light/30 dark:placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                  error ? 'border-error' : 'border-border-light dark:border-border-dark'
                }`}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={!token}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="!absolute right-2 top-1/2 -translate-y-1/2 z-10 !h-8 !w-8 !p-0 rounded-md !bg-transparent !border-0 hover:bg-background-light/60 dark:hover:bg-background-dark/40 text-text-light/60 dark:text-text-dark/60"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          loadingText="Resetting..."
          className="w-full h-10"
          disabled={!token}
        >
          <span>Reset Password</span>
        </Button>
        
        <p className="text-center c-secondary text-text-light/60 dark:text-text-dark/60 mt-1">
          Remember your password?{' '}
          <Link 
            href="/login" 
            className="font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            Back to Login
          </Link>
        </p>
      </form>

      <div className="mt-8 pt-4 border-t border-border-light dark:border-border-dark text-center hidden sm:block">
        <p className="c-meta text-text-light/40 dark:text-text-dark/40">
          © {new Date().getFullYear()} Uruti Saluni. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[420px] w-full mx-auto px-4 my-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-light dark:bg-surface-dark rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-surface-light dark:bg-surface-dark rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
