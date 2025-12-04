'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import MembershipApplicationForm from '@/components/forms/MembershipApplicationForm';
import ProgressIndicator from '@/components/ui/ProgressIndicator';
import { Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CompleteMembershipPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);
  const [hasFormData, setHasFormData] = useState(false);

  // Compute authentication status as a boolean
  const isAuthenticated = !!(user && token);

  useEffect(() => {
    setMounted(true);
    
    // Check if form data exists
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('membershipFormData');
      setHasFormData(!!savedData);
    }
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      // If not authenticated, redirect to login
      router.push('/login?redirect=membership');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-text-light/60 dark:text-text-dark/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (!hasFormData) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-warning/10 border border-warning rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">
              No Application Data Found
            </h2>
            <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
              It looks like you don't have any saved membership application data. 
              Please start a new application.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1">
                <button className="w-full bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition font-medium">
                  Go to Home
                </button>
              </Link>
              <Link href="/dashboard" className="flex-1">
                <button className="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark px-6 py-3 rounded-xl hover:bg-background-light dark:hover:bg-background-dark transition font-medium">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const membershipSteps = [
    { id: 'fill-form', label: 'Fill Form', description: 'Enter your details' },
    { id: 'create-account', label: 'Create Account', description: 'Sign up' },
    { id: 'submit', label: 'Submit', description: 'Auto-submit' },
    { id: 'complete', label: 'Complete', description: 'Done!' },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-2">
            Step 3 of 3: Submit Your Application
          </h1>
          <p className="text-text-light/60 dark:text-text-dark/60 mb-6">
            Great! Your account has been created. Your form data has been restored and will be automatically submitted.
          </p>
          
          <div className="mb-8">
            <ProgressIndicator
              steps={membershipSteps}
              currentStep="submit"
              completedSteps={['fill-form', 'create-account']}
            />
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-text-light dark:text-text-dark">
              <strong>✓ Step 1 Complete:</strong> Form filled out
              <br />
              <strong>✓ Step 2 Complete:</strong> Account created
              <br />
              <strong>⏳ Step 3 In Progress:</strong> Submitting application...
            </p>
          </div>
        </div>

        <MembershipApplicationForm 
          onSuccess={() => {
            // After successful submission, redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }}
          showTitle={false}
          showProgress={true}
        />
      </div>
    </div>
  );
}

