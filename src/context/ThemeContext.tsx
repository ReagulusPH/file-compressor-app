/**
 * Theme Context Provider
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme, ThemePreference, ResolvedTheme } from '../hooks/useTheme';
import { SystemTheme } from '../hooks/useSystemTheme';

interface ThemeContextValue {
  theme: ResolvedTheme;
  userPreference: ThemePreference;
  systemTheme: SystemTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider component that manages theme state for the entire app
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeState = useTheme();

  return <ThemeContext.Provider value={themeState}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access theme context
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeProvider;
