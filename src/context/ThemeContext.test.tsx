/**
 * Tests for ThemeContext
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useThemeContext } from './ThemeContext';
import { useTheme } from '../hooks/useTheme';

// Mock the useTheme hook
jest.mock('../hooks/useTheme');
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// Test component that uses the theme context
const TestComponent: React.FC = () => {
  const { theme, userPreference, systemTheme, setTheme, toggleTheme } = useThemeContext();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="user-preference">{userPreference}</div>
      <div data-testid="system-theme">{systemTheme}</div>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        Set System
      </button>
      <button onClick={toggleTheme} data-testid="toggle">
        Toggle
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  const mockSetTheme = jest.fn();
  const mockToggleTheme = jest.fn();

  const defaultThemeState = {
    theme: 'light' as const,
    userPreference: 'system' as const,
    systemTheme: 'light' as const,
    setTheme: mockSetTheme,
    toggleTheme: mockToggleTheme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(defaultThemeState);
  });

  describe('ThemeProvider', () => {
    it('should provide theme context to children', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('system');
      expect(screen.getByTestId('system-theme')).toHaveTextContent('light');
    });

    it('should update context when theme state changes', () => {
      mockUseTheme.mockReturnValue({
        ...defaultThemeState,
        theme: 'dark',
        userPreference: 'dark',
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('dark');
    });

    it('should provide setTheme function', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setDarkButton = screen.getByTestId('set-dark');
      act(() => {
        setDarkButton.click();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should provide toggleTheme function', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = screen.getByTestId('toggle');
      act(() => {
        toggleButton.click();
      });

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });

  describe('useThemeContext', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useThemeContext must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('should return theme context when used within ThemeProvider', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should not throw and should render the component
      expect(screen.getByTestId('theme')).toBeInTheDocument();
    });
  });

  describe('theme state integration', () => {
    it('should handle all theme preferences', () => {
      const { rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Test light theme
      mockUseTheme.mockReturnValue({
        ...defaultThemeState,
        theme: 'light',
        userPreference: 'light',
      });

      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('light');

      // Test dark theme
      mockUseTheme.mockReturnValue({
        ...defaultThemeState,
        theme: 'dark',
        userPreference: 'dark',
      });

      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('dark');

      // Test system theme
      mockUseTheme.mockReturnValue({
        ...defaultThemeState,
        theme: 'light',
        userPreference: 'system',
        systemTheme: 'light',
      });

      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('system');
      expect(screen.getByTestId('system-theme')).toHaveTextContent('light');
    });

    it('should handle system theme changes', () => {
      const { rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // System theme changes from light to dark
      mockUseTheme.mockReturnValue({
        ...defaultThemeState,
        theme: 'dark',
        userPreference: 'system',
        systemTheme: 'dark',
      });

      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('system-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('user-preference')).toHaveTextContent('system');
    });

    it('should call useTheme hook', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockUseTheme).toHaveBeenCalled();
    });
  });

  describe('function calls', () => {
    it('should call setTheme with correct arguments', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-light').click();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('light');

      act(() => {
        screen.getByTestId('set-dark').click();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      act(() => {
        screen.getByTestId('set-system').click();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('should call toggleTheme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('toggle').click();
      });

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });
});
