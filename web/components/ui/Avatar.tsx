'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export function Avatar({ src, alt = '', size = 'md', fallback, className = '' }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold overflow-hidden ${sizes[size]} ${className}`}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <span>{getInitials(fallback || alt)}</span>
      )}
    </div>
  );
}
