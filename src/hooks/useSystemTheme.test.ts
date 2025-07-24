/**
 * Tests for useSystemTheme hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSystemTheme } from './useSystemTheme';

// Mock matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('useSystemTheme', () => {
  let mockMediaQuery: {
    matches: boolean;
    addEventListener?: jest.Mock;
    removeEventListener?: jest.Mock;
    addListener?: jest.Mock;
    removeListener?: jest.Mock;
  };

  beforeEach(() => {
    mockMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQuery);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return light theme when system prefers light', () => {
      mockMediaQuery.matches = false;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should return dark theme when system prefers dark', () => {
      mockMediaQuery.matches = true;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('dark');
    });

    it('should default to light when matchMedia is not available', () => {
      // Mock window without matchMedia
      const originalMatchMedia = window.matchMedia;
      delete (window as any).matchMedia;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');

      // Restore matchMedia
      window.matchMedia = originalMatchMedia;
    });

    it('should default to light in server environment', () => {
      // Mock server environment by making window undefined
      const originalWindow = (global as any).window;
      (global as any).window = undefined;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');

      // Restore window
      (global as any).window = originalWindow;
    });
  });

  describe('event listeners', () => {
    it('should set up modern event listeners when available', () => {
      renderHook(() => useSystemTheme());

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should set up legacy event listeners when modern ones are not available', () => {
      // Remove modern event listener methods
      delete mockMediaQuery.addEventListener;
      delete mockMediaQuery.removeEventListener;

      renderHook(() => useSystemTheme());

      expect(mockMediaQuery.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clean up modern event listeners on unmount', () => {
      const { unmount } = renderHook(() => useSystemTheme());

      unmount();

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up legacy event listeners on unmount', () => {
      // Remove modern event listener methods
      delete mockMediaQuery.addEventListener;
      delete mockMediaQuery.removeEventListener;

      const { unmount } = renderHook(() => useSystemTheme());

      unmount();

      expect(mockMediaQuery.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle system theme changes', async () => {
      mockMediaQuery.matches = false;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');

      // Simulate system theme change to dark
      const changeHandler = (mockMediaQuery.addEventListener as jest.Mock).mock.calls[0][1];
      act(() => {
        changeHandler({ matches: true });
      });

      // Wait for debounced handler
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current).toBe('dark');
    });

    it('should handle system theme changes with legacy listeners', async () => {
      // Remove modern event listener methods
      delete mockMediaQuery.addEventListener;
      delete mockMediaQuery.removeEventListener;
      mockMediaQuery.matches = false;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');

      // Simulate system theme change to dark
      const changeHandler = (mockMediaQuery.addListener as jest.Mock).mock.calls[0][0];
      act(() => {
        changeHandler({ matches: true });
      });

      // Wait for debounced handler
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current).toBe('dark');
    });

    it('should not set up listeners when matchMedia is not available', () => {
      // Mock window without matchMedia
      const originalMatchMedia = window.matchMedia;
      (window as any).matchMedia = undefined;

      renderHook(() => useSystemTheme());

      // Should not throw error and should not call any listener methods
      expect(mockMediaQuery.addEventListener).not.toHaveBeenCalled();

      // Restore matchMedia
      window.matchMedia = originalMatchMedia;
    });
  });

  describe('multiple theme changes', () => {
    it('should handle multiple rapid theme changes', async () => {
      mockMediaQuery.matches = false;

      const { result } = renderHook(() => useSystemTheme());

      expect(result.current).toBe('light');

      const changeHandler = (mockMediaQuery.addEventListener as jest.Mock).mock.calls[0][1];

      // Change to dark
      act(() => {
        changeHandler({ matches: true });
      });

      // Wait for debounced handler
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current).toBe('dark');

      // Change back to light
      act(() => {
        changeHandler({ matches: false });
      });

      // Wait for debounced handler
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current).toBe('light');

      // Change to dark again
      act(() => {
        changeHandler({ matches: true });
      });

      // Wait for debounced handler
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current).toBe('dark');
    });
  });
});
