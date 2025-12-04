'use client';

import React, { ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ type, title, children, onClose, className = '' }: AlertProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success:
      'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error:
      'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning:
      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  };

  const Icon = icons[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${styles[type]} ${className}`}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
