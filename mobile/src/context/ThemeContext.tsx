import React, {createContext, useContext, useState, ReactNode} from 'react';
import {lightTheme, darkTheme, Theme} from '../theme/theme';
import {useColorScheme} from 'react-native';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{theme, isDark, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

