/**
 * Theme performance optimization utilities
 */

export interface ThemeMetrics {
  switchTime: number;
  renderTime: number;
  assetsLoaded: boolean;
}

/**
 * Optimize theme performance by preloading assets and managing transitions
 */
export async function optimizeThemePerformance(theme: 'light' | 'dark'): Promise<ThemeMetrics> {
  const startTime = performance.now();

  // Preload theme-specific assets
  await preloadThemeAssets(theme);

  // Apply theme with optimized transitions
  document.documentElement.setAttribute('data-theme', theme);

  // Wait for CSS transitions to complete
  await new Promise(resolve => {
    const transitionDuration = 200; // Match CSS transition duration
    setTimeout(resolve, transitionDuration);
  });

  const endTime = performance.now();

  return {
    switchTime: endTime - startTime,
    renderTime: endTime - startTime,
    assetsLoaded: true,
  };
}

/**
 * Preload theme-specific assets to improve switching performance
 */
export async function preloadThemeAssets(theme: 'light' | 'dark'): Promise<void> {
  // In a real implementation, you might preload theme-specific images or fonts
  // For now, we'll just simulate the async operation
  return new Promise(resolve => {
    // Simulate asset loading time
    setTimeout(resolve, 10);
  });
}

/**
 * Get system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Get theme performance monitor for debugging
 */
export function getThemePerformanceMonitor() {
  return {
    startMeasure: (name: string) => {
      if (typeof performance !== 'undefined') {
        performance.mark(`${name}-start`);
      }
    },
    endMeasure: (name: string) => {
      if (typeof performance !== 'undefined') {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
    },
    getMetrics: () => {
      if (typeof performance !== 'undefined') {
        return performance.getEntriesByType('measure');
      }
      return [];
    },
    measureThemeSwitch: async (callback: () => void) => {
      const startTime = performance.now();
      callback();
      const endTime = performance.now();
      return {
        switchTime: endTime - startTime,
        renderTime: endTime - startTime,
        assetsLoaded: true,
      };
    },
  };
}
