'use client';

import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export function Loading({ 
  size = 'md', 
  variant = 'spinner', 
  text = 'Loading...', 
  overlay = false,
  className = '' 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const SpinnerIcon = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-primary`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const DotsIcon = () => {
    const dotSize = size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2 h-2' : 'w-3 h-3';
    
    return (
      <div className="flex space-x-1" aria-hidden="true">
        <div className={`${dotSize} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
        <div className={`${dotSize} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
        <div className={`${dotSize} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
      </div>
    );
  };

  const PulseIcon = () => (
    <div
      className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse`}
      aria-hidden="true"
    />
  );

  const renderIcon = () => {
    switch (variant) {
      case 'dots':
        return <DotsIcon />;
      case 'pulse':
        return <PulseIcon />;
      default:
        return <SpinnerIcon />;
    }
  };

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      {renderIcon()}
      {text && (
        <span className={`${textSizeClasses[size]} text-text-secondary font-medium`}>
          {text}
        </span>
      )}
      {/* Screen reader only text */}
      <span className="sr-only">{text}</span>
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Loading"
      >
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-background-secondary dark:bg-surface-dark';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '3rem' : '2rem'),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} h-4`}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export default Loading;