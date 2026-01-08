'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CompactModeContextType = {
  isCompact: boolean;
  toggleCompact: () => void;
  setCompact: (value: boolean) => void;
};

const CompactModeContext = createContext<CompactModeContextType | undefined>(undefined);

const STORAGE_KEY = 'uruti-compact-mode';

export function CompactModeProvider({ children }: { children: ReactNode }) {
  const [isCompact, setIsCompact] = useState(true); // Default to compact
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCompact(stored === 'true');
    }
    setMounted(true);
  }, []);

  // Save preference to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isCompact));
    }
  }, [isCompact, mounted]);

  const toggleCompact = () => setIsCompact((prev) => !prev);
  const setCompact = (value: boolean) => setIsCompact(value);

  return (
    <CompactModeContext.Provider value={{ isCompact, toggleCompact, setCompact }}>
      <div className={isCompact ? 'compact-mode' : 'normal-mode'}>
        {children}
      </div>
    </CompactModeContext.Provider>
  );
}

export function useCompactMode() {
  const context = useContext(CompactModeContext);
  if (!context) {
    throw new Error('useCompactMode must be used within CompactModeProvider');
  }
  return context;
}

// Re-export for convenience
export { CompactModeContext };
