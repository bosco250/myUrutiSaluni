'use client';

import { ThemeProvider as BaseThemeProvider } from '@/contexts/ThemeContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <BaseThemeProvider>{children}</BaseThemeProvider>;
}

