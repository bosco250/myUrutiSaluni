'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { handleAPIError, getErrorMessage, isNetworkError, isAuthError } from '@/lib/error-handler';

export function useErrorHandler() {
  const toast = useToast();

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      const appError = handleAPIError(error, context);
      
      if (isNetworkError(error)) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (isAuthError(error)) {
        toast.error('Authentication required. Redirecting to login...');
      } else {
        toast.error(appError.message);
      }
      
      return appError;
    },
    [toast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      toast.success(message);
    },
    [toast]
  );

  const showError = useCallback(
    (message: string) => {
      toast.error(message);
    },
    [toast]
  );

  const showWarning = useCallback(
    (message: string) => {
      toast.warning(message);
    },
    [toast]
  );

  const showInfo = useCallback(
    (message: string) => {
      toast.info(message);
    },
    [toast]
  );

  return {
    handleError,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    getErrorMessage,
  };
}
