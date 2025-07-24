import React from 'react';
import './Header.css';
import { ThemeToggle } from '../ThemeToggle';

/**
 * Header component for the File Compressor Web App
 * Displays the app logo and theme toggle
 */
interface HeaderProps {
  /**
   * The title of the application
   */
  title: string;
  /**
   * Optional logo URL for the application
   */
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ title, logoUrl }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          {logoUrl ? (
            <img src={logoUrl} alt={`${title} logo`} className="logo-image" />
          ) : (
            <div className="logo-placeholder">FC</div>
          )}
          <h1 className="header-title">{title}</h1>
        </div>

        <div className="header-menu-container">
          <ThemeToggle size="small" />
        </div>
      </div>
    </header>
  );
};

export default Header;
