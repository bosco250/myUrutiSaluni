'use client';

import React, { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'destructive' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}: BadgeProps) {
  const variants = {
    default: 'bg-background-secondary dark:bg-surface-dark text-text-light dark:text-text-dark',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-light dark:bg-success/20 text-success-dark dark:text-success-light',
    warning: 'bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning-light',
    danger: 'bg-error-light dark:bg-error/20 text-error-dark dark:text-error-light',
    destructive: 'bg-error-light dark:bg-error/20 text-error-dark dark:text-error-light',
    info: 'bg-info-light dark:bg-info/20 text-info-dark dark:text-info-light',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const dotColors = {
    default: 'bg-text-secondary',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-error',
    destructive: 'bg-error',
    info: 'bg-info',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && <span className={`w-2 h-2 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
