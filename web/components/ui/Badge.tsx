'use client';

import React, { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
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
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
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
