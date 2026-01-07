'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  persistent?: boolean;
}

export function Alert({ 
  type, 
  title, 
  children, 
  onClose, 
  className = '',
  autoClose = false,
  autoCloseDelay = 5000,
  persistent = false
}: AlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Auto close functionality
  useEffect(() => {
    if (autoClose && onClose && !persistent) {
      timeoutRef.current = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [autoClose, onClose, autoCloseDelay, persistent]);

  // Focus management for important alerts
  useEffect(() => {
    if (type === 'error' && alertRef.current) {
      alertRef.current.focus();
    }
  }, [type]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success:
      'bg-success-light dark:bg-success/20 border-success dark:border-success text-success-dark dark:text-success-light',
    error:
      'bg-error-light dark:bg-error/20 border-error dark:border-error text-error-dark dark:text-error-light',
    warning:
      'bg-warning-light dark:bg-warning/20 border-warning dark:border-warning text-warning-dark dark:text-warning-light',
    info: 'bg-info-light dark:bg-info/20 border-info dark:border-info text-info-dark dark:text-info-light',
  };

  const Icon = icons[type];
  const isCloseable = onClose && !persistent;
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      ref={alertRef}
      className={`flex items-start gap-2.5 p-3 rounded border ${styles[type]} ${className}`}
      role="alert"
      aria-live={ariaLive}
      aria-atomic="true"
      tabIndex={type === 'error' ? 0 : -1}
    >
      <Icon 
        className="w-5 h-5 flex-shrink-0 mt-0.5" 
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1 text-sm">
            {title}
          </h4>
        )}
        <div className="text-sm">
          {children}
        </div>
      </div>
      {isCloseable && (
        <button
          onClick={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            onClose();
          }}
          className="flex-shrink-0 hover:opacity-70 transition-opacity rounded focus:outline-none focus:ring-1 focus:ring-current"
          aria-label={`Close ${type} alert`}
          type="button"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
