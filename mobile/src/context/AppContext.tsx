import React, { createContext, useContext, ReactNode } from 'react';

interface AppContextType {
  // Add your app-wide state here
  // Example: user: User | null;
  // Example: theme: 'light' | 'dark';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Add your app-wide state management here
  
  const value: AppContextType = {
    // Add your context values here
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

