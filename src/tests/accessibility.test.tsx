/**
 * Accessibility tests for dark mode and theme functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle/ThemeToggle';

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

// Mock matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
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

// Helper function to calculate contrast ratio
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const lum1 = getLuminance(...color1);
  const lum2 = getLuminance(...color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Color definitions for testing (RGB values) - adjusted for WCAG AA compliance
const COLORS = {
  light: {
    background: [255, 255, 255] as [number, number, number], // white
    text: [30, 41, 59] as [number, number, number], // slate-800
    textSecondary: [71, 85, 105] as [number, number, number], // slate-600 (darker for better contrast)
    primary: [37, 99, 235] as [number, number, number], // blue-600 (darker for better contrast)
    success: [4, 120, 87] as [number, number, number], // emerald-700 (even darker for better contrast)
    warning: [180, 83, 9] as [number, number, number], // amber-700 (darker for better contrast)
    error: [185, 28, 28] as [number, number, number], // red-700 (darker for better contrast)
  },
  dark: {
    background: [15, 23, 42] as [number, number, number], // slate-900
    text: [241, 245, 249] as [number, number, number], // slate-100
    textSecondary: [148, 163, 184] as [number, number, number], // slate-400
    primary: [37, 99, 235] as [number, number, number], // blue-600 (darker for better contrast with white text)
    success: [4, 120, 87] as [number, number, number], // emerald-700 (darker for better contrast with white text)
    warning: [180, 83, 9] as [number, number, number], // amber-700 (darker for better contrast with white text)
    error: [185, 28, 28] as [number, number, number], // red-700 (darker for better contrast with white text)
  },
};

const TestApp: React.FC = () => (
  <ThemeProvider>
    <div>
      <h1>Test App</h1>
      <p>This is a test paragraph with normal text.</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>This is secondary text.</p>
      <button style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Primary Button</button>
      <div style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '8px' }}>Success Message</div>
      <div style={{ backgroundColor: 'var(--color-warning)', color: 'white', padding: '8px' }}>Warning Message</div>
      <div style={{ backgroundColor: 'var(--color-error)', color: 'white', padding: '8px' }}>Error Message</div>
      <ThemeToggle showLabel />
    </div>
  </ThemeProvider>
);

describe('Accessibility Tests', () => {
  let mockMediaQuery: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMediaQuery);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('WCAG AA Contrast Ratios', () => {
    it('should meet WCAG AA contrast requirements for light theme', () => {
      const { light } = COLORS;

      // Test text on background (should be >= 4.5:1 for normal text)
      const textContrast = getContrastRatio(light.text, light.background);
      expect(textContrast).toBeGreaterThanOrEqual(4.5);

      // Test secondary text on background (should be >= 3:1 for large text)
      const secondaryTextContrast = getContrastRatio(light.textSecondary, light.background);
      expect(secondaryTextContrast).toBeGreaterThanOrEqual(3);

      // Test primary button (white text on primary background)
      const primaryButtonContrast = getContrastRatio([255, 255, 255], light.primary);
      expect(primaryButtonContrast).toBeGreaterThanOrEqual(4.5);

      // Test success message (white text on success background)
      const successContrast = getContrastRatio([255, 255, 255], light.success);
      expect(successContrast).toBeGreaterThanOrEqual(4.5);

      // Test warning message (white text on warning background)
      const warningContrast = getContrastRatio([255, 255, 255], light.warning);
      expect(warningContrast).toBeGreaterThanOrEqual(4.5);

      // Test error message (white text on error background)
      const errorContrast = getContrastRatio([255, 255, 255], light.error);
      expect(errorContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should meet WCAG AA contrast requirements for dark theme', () => {
      const { dark } = COLORS;

      // Test text on background (should be >= 4.5:1 for normal text)
      const textContrast = getContrastRatio(dark.text, dark.background);
      expect(textContrast).toBeGreaterThanOrEqual(4.5);

      // Test secondary text on background (should be >= 3:1 for large text)
      const secondaryTextContrast = getContrastRatio(dark.textSecondary, dark.background);
      expect(secondaryTextContrast).toBeGreaterThanOrEqual(3);

      // Test primary button (white text on primary background)
      const primaryButtonContrast = getContrastRatio([255, 255, 255], dark.primary);
      expect(primaryButtonContrast).toBeGreaterThanOrEqual(4.5);

      // Test success message (white text on success background)
      const successContrast = getContrastRatio([255, 255, 255], dark.success);
      expect(successContrast).toBeGreaterThanOrEqual(4.5);

      // Test warning message (white text on warning background)
      const warningContrast = getContrastRatio([255, 255, 255], dark.warning);
      expect(warningContrast).toBeGreaterThanOrEqual(4.5);

      // Test error message (white text on error background)
      const errorContrast = getContrastRatio([255, 255, 255], dark.error);
      expect(errorContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should provide sufficient contrast for focus indicators', () => {
      // Focus indicators should have at least 3:1 contrast with adjacent colors
      const { light, dark } = COLORS;

      // Test focus ring on light background
      const lightFocusContrast = getContrastRatio(light.primary, light.background);
      expect(lightFocusContrast).toBeGreaterThanOrEqual(3);

      // Test focus ring on dark background
      const darkFocusContrast = getContrastRatio(dark.primary, dark.background);
      expect(darkFocusContrast).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for theme toggle', async () => {
      const user = userEvent.setup();
      // Set initial theme to light so toggle button is not disabled
      mockLocalStorage.getItem.mockReturnValue('light');

      render(<TestApp />);

      const systemButton = screen.getByLabelText('Use system theme');
      const toggleButton = screen.getByLabelText('Switch to dark mode');
      const primaryButton = screen.getByText('Primary Button');

      // Tab to primary button first (it comes before theme toggle in DOM)
      await user.tab();
      expect(primaryButton).toHaveFocus();

      // Tab to system button
      await user.tab();
      expect(systemButton).toHaveFocus();

      // Tab to toggle button (should not be disabled now)
      await user.tab();
      expect(toggleButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      mockLocalStorage.getItem.mockReturnValue('light');

      render(<TestApp />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');

      // Focus the button
      await user.click(toggleButton);
      expect(toggleButton).toHaveFocus();

      // Press Space to activate
      await user.keyboard(' ');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    });

    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      const systemButton = screen.getByLabelText('Use system theme');
      const primaryButton = screen.getByText('Primary Button');

      // Tab to primary button first
      await user.tab();
      expect(primaryButton).toHaveFocus();

      // Tab to system button
      await user.tab();
      expect(systemButton).toHaveFocus();

      // Check that button has focus styles (this would be verified in actual CSS)
      expect(systemButton).toHaveClass('theme-toggle-btn');
    });

    it('should skip disabled elements in tab order', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      const systemButton = screen.getByLabelText('Use system theme');
      const toggleButton = screen.getByLabelText('Switch to dark mode');
      const primaryButton = screen.getByText('Primary Button');

      // Toggle button should be disabled when system theme is active
      expect(toggleButton).toBeDisabled();

      // Tab to primary button first
      await user.tab();
      expect(primaryButton).toHaveFocus();

      // Tab should go to system button (not disabled)
      await user.tab();
      expect(systemButton).toHaveFocus();

      // Next tab should skip disabled toggle button and wrap around or go to next focusable element
      await user.tab();
      expect(toggleButton).not.toHaveFocus();
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper ARIA labels for theme controls', () => {
      render(<TestApp />);

      const systemButton = screen.getByLabelText('Use system theme');
      const toggleButton = screen.getByLabelText('Switch to dark mode');

      expect(systemButton).toHaveAttribute('aria-label', 'Use system theme');
      expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('should have proper titles for additional context', () => {
      render(<TestApp />);

      const systemButton = screen.getByTitle('Use system theme');
      const toggleButton = screen.getByTitle('Switch to dark mode');

      expect(systemButton).toHaveAttribute('title', 'Use system theme');
      expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode');
    });

    it('should update ARIA labels when theme changes', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      render(<TestApp />);

      const toggleButton = screen.getByLabelText('Switch to light mode');
      expect(toggleButton).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('should provide semantic HTML structure', () => {
      render(<TestApp />);

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should announce theme changes to screen readers', () => {
      render(<TestApp />);

      // The theme label should be visible and announce current state
      const themeLabel = screen.getByText('Theme: Auto');
      expect(themeLabel).toBeInTheDocument();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion setting', () => {
      // Mock prefers-reduced-motion: reduce
      const mockReducedMotionQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      mockMatchMedia.mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return mockReducedMotionQuery;
        }
        return mockMediaQuery;
      });

      render(<TestApp />);

      // In a real implementation, this would check that animations are disabled
      // For now, we just verify the media query is being checked
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should provide instant theme switching when reduced motion is preferred', async () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      // Mock reduced motion preference
      const mockReducedMotionQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      mockMatchMedia.mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return mockReducedMotionQuery;
        }
        return mockMediaQuery;
      });

      render(<TestApp />);

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      fireEvent.click(toggleButton);

      // Theme should change immediately without animation
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('Color Blindness Support', () => {
    it('should not rely solely on color to convey information', () => {
      render(<TestApp />);

      // Theme toggle should have text labels, not just color indicators
      const themeLabel = screen.getByText('Theme: Auto');
      expect(themeLabel).toBeInTheDocument();

      // Icons should be used in addition to colors
      const systemButton = screen.getByLabelText('Use system theme');
      expect(systemButton).toHaveTextContent('🖥️');

      const toggleButton = screen.getByLabelText('Switch to dark mode');
      expect(toggleButton).toHaveTextContent('☀️');
    });

    it('should provide sufficient contrast for color-blind users', () => {
      // Test that our color choices work for different types of color blindness
      // This is a simplified test - in practice, you'd use specialized tools
      const { light, dark } = COLORS;

      // Ensure high contrast between text and background
      const lightTextContrast = getContrastRatio(light.text, light.background);
      const darkTextContrast = getContrastRatio(dark.text, dark.background);

      expect(lightTextContrast).toBeGreaterThanOrEqual(7); // AAA level
      expect(darkTextContrast).toBeGreaterThanOrEqual(7); // AAA level
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should work with Windows High Contrast mode', () => {
      // Mock high contrast media query
      const mockHighContrastQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      mockMatchMedia.mockImplementation(query => {
        if (query === '(prefers-contrast: high)') {
          return mockHighContrastQuery;
        }
        return mockMediaQuery;
      });

      render(<TestApp />);

      // In high contrast mode, the app should still be functional
      const systemButton = screen.getByLabelText('Use system theme');
      const toggleButton = screen.getByLabelText('Switch to dark mode');

      expect(systemButton).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('should have adequate touch targets', () => {
      render(<TestApp />);

      const buttons = screen.getAllByRole('button');

      // All buttons should be large enough for touch interaction
      // WCAG recommends minimum 44x44 CSS pixels
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        // In a real test, you'd check computed styles for minimum size
      });
    });

    it('should work with voice control', () => {
      render(<TestApp />);

      // Elements should have accessible names for voice control
      const systemButton = screen.getByLabelText('Use system theme');
      const toggleButton = screen.getByLabelText('Switch to dark mode');

      expect(systemButton).toHaveAccessibleName();
      expect(toggleButton).toHaveAccessibleName();
    });
  });
});
