import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from './Header';
import { ThemeProvider } from '../../context/ThemeContext';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Header Component', () => {
  test('renders the header with title', () => {
    render(
      <TestWrapper>
        <Header title="File Compressor" />
      </TestWrapper>
    );

    // Check if the title is rendered
    expect(screen.getByText('File Compressor')).toBeInTheDocument();

    // Check if the logo placeholder is rendered when no logo URL is provided
    expect(screen.getByText('FC')).toBeInTheDocument();
  });

  test('renders the header with logo when logoUrl is provided', () => {
    render(
      <TestWrapper>
        <Header title="File Compressor" logoUrl="/logo.png" />
      </TestWrapper>
    );

    // Check if the logo image is rendered
    const logoImage = screen.getByAltText('File Compressor logo');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', '/logo.png');
  });

  test('toggles compression menu when button is clicked', () => {
    render(
      <TestWrapper>
        <Header title="File Compressor" />
      </TestWrapper>
    );

    // Menu should be initially closed
    expect(screen.queryByText('Image Compression')).not.toBeInTheDocument();

    // Click the menu button
    fireEvent.click(screen.getByText('Compression Types'));

    // Menu should be open now
    expect(screen.getByText('Image Compression')).toBeInTheDocument();
    expect(screen.getByText('Video Compression')).toBeInTheDocument();

    // Click the menu button again to close
    fireEvent.click(screen.getByText('Compression Types'));

    // Menu should be closed again
    expect(screen.queryByText('Image Compression')).not.toBeInTheDocument();
  });

  test('menu button has correct aria attributes', () => {
    render(
      <TestWrapper>
        <Header title="File Compressor" />
      </TestWrapper>
    );

    const menuButton = screen.getByText('Compression Types');

    // Initial state
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'compression-menu');

    // After clicking
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });
});
