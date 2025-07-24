/**
 * Utility for lazy loading components and libraries
 */

import { lazy, ComponentType } from 'react';

/**
 * Lazy loads a component with retry functionality
 * @param importFn - Function that imports the component
 * @param retries - Number of retries on failure
 * @returns Lazy loaded component
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(() => {
    let retriesLeft = retries;

    const retry = async (): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        if (retriesLeft <= 0) {
          throw error;
        }

        retriesLeft--;
        // Error loading component, retrying

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));

        return retry();
      }
    };

    return retry();
  });
}

/**
 * Lazy loads a library
 * @param importFn - Function that imports the library
 * @param retries - Number of retries on failure
 * @returns Promise resolving to the library
 */
export async function lazyLoadLibrary<T>(importFn: () => Promise<{ default: T }>, retries = 3): Promise<T> {
  let retriesLeft = retries;

  const retry = async (): Promise<T> => {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      if (retriesLeft <= 0) {
        throw error;
      }

      retriesLeft--;
      // Error loading library, retrying

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));

      return retry();
    }
  };

  return retry();
}

/**
 * Preloads a component or library
 * @param importFn - Function that imports the component or library
 */
export function preload(importFn: () => Promise<any>): void {
  // Start loading in the background
  importFn().catch(() => {
    // Error preloading module, will load on demand
  });
}
