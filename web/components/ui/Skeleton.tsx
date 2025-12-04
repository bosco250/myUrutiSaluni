import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6 space-y-4">
      <Skeleton variant="rectangular" height={24} width="60%" />
      <Skeleton variant="text" height={16} width="100%" />
      <Skeleton variant="text" height={16} width="90%" />
      <Skeleton variant="text" height={16} width="80%" />
      <div className="flex gap-2 pt-4">
        <Skeleton variant="rectangular" height={36} width={100} />
        <Skeleton variant="rectangular" height={36} width={100} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" height={20} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={`stat-${i}`} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
          <Skeleton variant="text" width="40%" height={24} className="mb-4" />
          <Skeleton variant="rectangular" height={300} />
        </div>
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
          <Skeleton variant="text" width="40%" height={24} className="mb-4" />
          <Skeleton variant="rectangular" height={300} />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg"
        >
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
}
