/**
 * Hook for detecting system theme preference
 * Optimized for performance with debouncing and cleanup
 */

import { useState, useEffect } from 'react';

export type SystemTheme = 'light' | 'dark';

/**
 * Hook to detect and track system theme preference
 * @returns Current system theme preference
 */
export const useSystemTheme = (): SystemTheme => {
  const [systemTheme, setSystemTheme] = useState<SystemTheme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let timeoutId: NodeJS.Timeout;

    // Debounced handler to prevent rapid theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      }, 50); // Small debounce to prevent rapid changes
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);

  return systemTheme;
};

export default useSystemTheme;
