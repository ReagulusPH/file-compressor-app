/**
 * Theme Toggle Component
 * Optimized for performance with memoization
 */

import React, { memo, useCallback } from 'react';
import { useThemeContext } from '../../context/ThemeContext';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * Theme toggle button component
 * Memoized for performance optimization
 */
const ThemeToggleComponent: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'medium',
  showLabel = false,
}) => {
  const { theme, userPreference, toggleTheme, setTheme } = useThemeContext();

  const isSystemTheme = userPreference === 'system';

  // Memoized handlers to prevent unnecessary re-renders
  const handleToggle = useCallback(() => {
    if (isSystemTheme) {
      // If currently in system mode, switch to the opposite of current resolved theme
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    } else {
      // If not in system mode, use the normal toggle
      toggleTheme();
    }
  }, [isSystemTheme, theme, setTheme, toggleTheme]);

  const handleSystemToggle = useCallback(() => {
    setTheme('system');
  }, [setTheme]);

  return (
    <div className={`theme-toggle-container ${className}`}>
      {showLabel && (
        <span className="theme-toggle-label">
          Theme: {isSystemTheme ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
        </span>
      )}

      <div className="theme-toggle-buttons">
        {/* System/Auto theme button */}
        <button
          className={`theme-toggle-btn theme-toggle-btn--${size} ${isSystemTheme ? 'active' : ''}`}
          onClick={handleSystemToggle}
          aria-label="Use system theme"
          title="Use system theme"
        >
          <span className="theme-toggle-icon">🖥️</span>
        </button>

        {/* Light/Dark toggle button */}
        <button
          className={`theme-toggle-btn theme-toggle-btn--${size} theme-toggle-btn--switch ${!isSystemTheme ? 'active' : ''}`}
          onClick={handleToggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <span className={`theme-toggle-icon theme-toggle-icon--${theme}`}>
            {theme === 'light' ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ThemeToggle = memo(ThemeToggleComponent);

export default ThemeToggle;
