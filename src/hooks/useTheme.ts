/**
 * Hook for managing theme state with persistence
 * Optimized for performance with minimal re-renders
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSystemTheme, SystemTheme } from './useSystemTheme';
import { getThemePerformanceMonitor, optimizeThemePerformance, preloadThemeAssets } from '../utils/themePerformance';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  theme: ResolvedTheme;
  userPreference: ThemePreference;
  systemTheme: SystemTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'theme-preference';

/**
 * Hook for managing theme with system preference detection and persistence
 * @returns Theme management utilities
 */
export const useTheme = (): UseThemeReturn => {
  const systemTheme = useSystemTheme();

  const [userPreference, setUserPreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemePreference;
      }
    } catch (error) {
      // Failed to read theme preference from localStorage, using default
    }

    return 'system';
  });

  // Resolve the actual theme based on user preference and system theme
  const resolvedTheme: ResolvedTheme = userPreference === 'system' ? systemTheme : userPreference;

  // Initialize performance optimizations on first load
  useEffect(() => {
    // Skip performance optimizations in test environment
    if (process.env.NODE_ENV !== 'test') {
      optimizeThemePerformance(resolvedTheme);
      preloadThemeAssets(resolvedTheme);
    }
  }, [resolvedTheme]);

  // Apply theme to document with performance optimizations
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // In test environment, apply changes synchronously
      if (process.env.NODE_ENV === 'test') {
        root.setAttribute('data-theme', resolvedTheme);
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(`theme-${resolvedTheme}`);
      } else {
        // Use requestAnimationFrame to batch DOM updates in production
        requestAnimationFrame(() => {
          // Batch DOM updates to minimize layout thrashing
          root.style.setProperty('--theme-switching', '1');
          root.setAttribute('data-theme', resolvedTheme);

          // Also set a class for compatibility
          root.classList.remove('theme-light', 'theme-dark');
          root.classList.add(`theme-${resolvedTheme}`);

          // Remove the switching flag after transition
          setTimeout(() => {
            root.style.removeProperty('--theme-switching');
          }, 200); // Match transition duration
        });
      }
    }
  }, [resolvedTheme]);

  // Memoized and optimized setTheme function
  const setTheme = useCallback((theme: ThemePreference) => {
    setUserPreference(theme);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        // Failed to save theme preference to localStorage
      }
    }
  }, []);

  // Memoized toggle function with performance monitoring
  const toggleTheme = useCallback(() => {
    const monitor = getThemePerformanceMonitor();
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';

    // Measure performance of theme switch
    monitor
      .measureThemeSwitch(() => {
        setTheme(newTheme);
      })
      .then((metrics: any) => {
        // Performance metrics available for debugging if needed
        // Metrics: metrics
      });
  }, [resolvedTheme, setTheme]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      theme: resolvedTheme,
      userPreference,
      systemTheme,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, userPreference, systemTheme, setTheme, toggleTheme]
  );
};

export default useTheme;
