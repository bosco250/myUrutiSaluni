'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: unknown) {
      const maybeAxios = err as { response?: { data?: { message?: string } }; message?: string };
      // Show success even on error for security (don't reveal if email exists)
      // Backend returns success message regardless
      if (maybeAxios?.response?.data?.message) {
        setSuccess(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
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
          <h2 className="c-title text-text-light dark:text-text-dark mb-3">Check Your Email</h2>
          <p className="c-body text-text-light/60 dark:text-text-dark/60 mb-6">
            If an account exists for <span className="font-semibold text-text-light dark:text-text-dark">{email}</span>, 
            we've sent a password reset link. Please check your inbox and spam folder.
          </p>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
            <p className="text-sm text-text-light/70 dark:text-text-dark/70">
              The link will expire in <span className="font-semibold">1 hour</span>
            </p>
          </div>
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
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
        <h2 className="c-title text-text-light dark:text-text-dark mb-2">Forgot Password?</h2>
        <p className="c-body text-text-light/60 dark:text-text-dark/60">
          No worries! Enter your email and we'll send you a reset link.
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
          {/* Email Input */}
          <div className="group">
            <label 
              htmlFor="email" 
              className={`block c-secondary font-semibold uppercase tracking-wider mb-1 transition-colors ${
                focusedField === 'email' ? 'text-primary' : 'text-text-light/60 dark:text-text-dark/60'
              }`}
            >
              Email Address
            </label>
            <div className={`relative transition-all duration-300 ${
              focusedField === 'email' ? 'transform scale-[1.01]' : ''
            }`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className={`w-4 h-4 transition-colors ${
                  focusedField === 'email' ? 'text-primary' : 'text-text-light/40 dark:text-text-dark/40'
                }`} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
        </div>

        <Button
          type="submit"
          loading={loading}
          loadingText="Sending..."
          className="w-full h-10"
        >
          <span>Send Reset Link</span>
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
