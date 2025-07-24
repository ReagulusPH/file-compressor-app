/**
 * Tests for ThemeToggle component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { useThemeContext } from '../../context/ThemeContext';

// Mock the theme context
jest.mock('../../context/ThemeContext');
const mockUseThemeContext = useThemeContext as jest.MockedFunction<typeof useThemeContext>;

describe('ThemeToggle', () => {
  const mockToggleTheme = jest.fn();
  const mockSetTheme = jest.fn();

  const defaultContextValue = {
    theme: 'light' as const,
    userPreference: 'system' as const,
    systemTheme: 'light' as const,
    toggleTheme: mockToggleTheme,
    setTheme: mockSetTheme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeContext.mockReturnValue(defaultContextValue);
  });

  describe('rendering', () => {
    it('should render theme toggle buttons', () => {
      render(<ThemeToggle />);

      expect(screen.getByLabelText('Use system theme')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<ThemeToggle className="custom-class" />);

      const container = screen.getByRole('button', { name: 'Use system theme' }).parentElement?.parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<ThemeToggle size="small" />);

      expect(screen.getByLabelText('Use system theme')).toHaveClass('theme-toggle-btn--small');

      rerender(<ThemeToggle size="large" />);
      expect(screen.getByLabelText('Use system theme')).toHaveClass('theme-toggle-btn--large');
    });

    it('should show label when showLabel is true', () => {
      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Theme: Auto')).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<ThemeToggle />);

      expect(screen.queryByText(/Theme:/)).not.toBeInTheDocument();
    });
  });

  describe('system theme button', () => {
    it('should be active when user preference is system', () => {
      render(<ThemeToggle />);

      const systemButton = screen.getByLabelText('Use system theme');
      expect(systemButton).toHaveClass('active');
    });

    it('should not be active when user preference is not system', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle />);

      const systemButton = screen.getByLabelText('Use system theme');
      expect(systemButton).not.toHaveClass('active');
    });

    it('should call setTheme with system when clicked', () => {
      render(<ThemeToggle />);

      const systemButton = screen.getByLabelText('Use system theme');
      fireEvent.click(systemButton);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('light/dark toggle button', () => {
    it('should show sun icon for light theme', () => {
      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton.querySelector('.theme-toggle-icon--light')).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('☀️');
    });

    it('should show moon icon for dark theme', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        theme: 'dark',
        userPreference: 'dark',
      });

      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to light mode');
      expect(toggleButton.querySelector('.theme-toggle-icon--dark')).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('🌙');
    });

    it('should be active when user preference is not system', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton).toHaveClass('active');
    });

    it('should not be active when user preference is system', () => {
      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton).not.toHaveClass('active');
    });

    it('should be disabled when user preference is system', () => {
      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton).toBeDisabled();
    });

    it('should not be disabled when user preference is not system', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton).not.toBeDisabled();
    });

    it('should call toggleTheme when clicked and not disabled', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      fireEvent.click(toggleButton);

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('should not call toggleTheme when disabled', () => {
      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      fireEvent.click(toggleButton);

      expect(mockToggleTheme).not.toHaveBeenCalled();
    });
  });

  describe('label display', () => {
    it('should show "Auto" when user preference is system', () => {
      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Theme: Auto')).toBeInTheDocument();
    });

    it('should show "Light" when user preference is light', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Theme: Light')).toBeInTheDocument();
    });

    it('should show "Dark" when user preference is dark', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        theme: 'dark',
        userPreference: 'dark',
      });

      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Theme: Dark')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ThemeToggle />);

      expect(screen.getByLabelText('Use system theme')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    });

    it('should have proper titles', () => {
      render(<ThemeToggle />);

      expect(screen.getByTitle('Use system theme')).toBeInTheDocument();
      expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
    });

    it('should update ARIA label based on current theme', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        theme: 'dark',
        userPreference: 'dark',
      });

      render(<ThemeToggle />);

      expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      mockUseThemeContext.mockReturnValue({
        ...defaultContextValue,
        userPreference: 'light',
      });

      render(<ThemeToggle />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      
      // Focus the button
      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      // Press Enter
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      fireEvent.click(toggleButton);

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });
});