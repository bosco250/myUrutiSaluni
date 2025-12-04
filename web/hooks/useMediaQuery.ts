'use client';

import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useMediaQuery(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]}px)`;
    const media = window.matchMedia(query);
    
    const updateMatch = () => setMatches(media.matches);
    updateMatch();
    
    media.addEventListener('change', updateMatch);
    return () => media.removeEventListener('change', updateMatch);
  }, [breakpoint]);

  return matches;
}

export function useIsMobile(): boolean {
  return !useMediaQuery('md');
}

export function useIsTablet(): boolean {
  const isMd = useMediaQuery('md');
  const isLg = useMediaQuery('lg');
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useMediaQuery('lg');
}
