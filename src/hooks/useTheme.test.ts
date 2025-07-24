/**
 * Tests for useTheme hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';
import { useSystemTheme } from './useSystemTheme';

// Mock useSystemTheme
jest.mock('./useSystemTheme');
const mockUseSystemTheme = useSystemTheme as jest.MockedFunction<typeof useSystemTheme>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document
const mockDocumentElement = {
  setAttribute: jest.fn(),
  classList: {
    remove: jest.fn(),
    add: jest.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
});

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSystemTheme.mockReturnValue('light');
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should default to system theme when no stored preference', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.userPreference).toBe('system');
      expect(result.current.theme).toBe('light');
      expect(result.current.systemTheme).toBe('light');
    });

    it('should use stored preference when available', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.userPreference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('should fallback to system when stored preference is invalid', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid');

      const { result } = renderHook(() => useTheme());

      expect(result.current.userPreference).toBe('system');
      expect(result.current.theme).toBe('light');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.userPreference).toBe('system');
      expect(result.current.theme).toBe('light');
    });
  });

  describe('theme resolution', () => {
    it('should resolve system theme when preference is system', () => {
      mockUseSystemTheme.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
      expect(result.current.userPreference).toBe('system');
    });

    it('should resolve user preference when not system', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      mockUseSystemTheme.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
      expect(result.current.userPreference).toBe('light');
    });
  });

  describe('DOM updates', () => {
    it('should apply theme to document element', () => {
      renderHook(() => useTheme());

      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('theme-light', 'theme-dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light');
    });

    it('should update DOM when theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark');
    });
  });

  describe('setTheme', () => {
    it('should update user preference and persist to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.userPreference).toBe('dark');
      expect(result.current.theme).toBe('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    });

    it('should handle localStorage errors when persisting', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.userPreference).toBe('dark');
      // Should not throw error
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.userPreference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.userPreference).toBe('light');
      expect(result.current.theme).toBe('light');
    });

    it('should toggle from system to opposite of current resolved theme', () => {
      mockUseSystemTheme.mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.userPreference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('system theme changes', () => {
    it('should update resolved theme when system theme changes and preference is system', () => {
      mockUseSystemTheme.mockReturnValue('light');

      const { result, rerender } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');

      // Simulate system theme change
      mockUseSystemTheme.mockReturnValue('dark');
      rerender();

      expect(result.current.theme).toBe('dark');
      expect(result.current.userPreference).toBe('system');
    });

    it('should not affect resolved theme when user has explicit preference', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      mockUseSystemTheme.mockReturnValue('light');

      const { result, rerender } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');

      // Simulate system theme change
      mockUseSystemTheme.mockReturnValue('dark');
      rerender();

      // Should still be light because user preference is explicit
      expect(result.current.theme).toBe('light');
      expect(result.current.userPreference).toBe('light');
    });
  });
});
