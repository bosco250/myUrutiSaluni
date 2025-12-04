'use client';

import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600">
        {icon || <Inbox className="w-full h-full" />}
      </div>
      
      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-text-light/60 dark:text-text-dark/60 mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && <div>{action}</div>}
    </div>
  );
}
