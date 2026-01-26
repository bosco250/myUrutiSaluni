'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function ChangeEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (!token) {
      toastError('Invalid or missing verification token');
    }
  }, [token, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        toastError('Missing verification token');
        return;
    }
    
    setIsLoading(true);

    try {
      await api.post('/auth/change-email', {
        token,
        newEmail,
      });
      
      setIsSuccess(true);
      success('Email successfully updated');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error: any) {
      console.error('Failed to change email:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update email. Token may be invalid or expired.';
      toastError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-error" />
            <h2 className="mt-6 text-2xl font-bold text-text-light dark:text-text-dark">Invalid Link</h2>
            <p className="mt-2 text-sm text-text-light/60 dark:text-text-dark/60">
                The link you followed is invalid or missing a token.
            </p>
            <div className="mt-6">
                <Button variant="primary" onClick={() => router.push('/login')}>Go to Login</Button>
            </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface-light dark:bg-surface-dark py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">Email Updated!</h2>
            <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-6">
              Your email address has been successfully changed securely.
              You will be redirected to the login page shortly.
            </p>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to Login Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">URUTI SALUNI</h1>
            <p className="mt-2 text-sm text-text-light/60 dark:text-text-dark/60">Secure Email Change</p>
        </div>
        
        <div className="bg-surface-light dark:bg-surface-dark py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border-light dark:border-border-dark">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-text-light dark:text-text-dark">Enter New Email</h2>
            <p className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60">
                Please enter the new email address you wish to use for your account.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-light dark:text-text-dark">
                New Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-md focus:ring-primary focus:border-primary p-2.5"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full flex justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Updating...
                  </>
                ) : (
                  <>
                    Update Email
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
