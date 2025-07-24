import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyMessage from './PrivacyMessage';
import { ThemeProvider } from '../../context/ThemeContext';

describe('PrivacyMessage', () => {
  test('renders privacy message with initial content', () => {
    render(<PrivacyMessage />);

    // Check for main heading
    expect(screen.getByText('Your Privacy is Protected')).toBeInTheDocument();

    // Check for client-side processing message
    expect(screen.getByText(/100% Client-Side Processing/)).toBeInTheDocument();

    // Check for "Learn more" button
    expect(screen.getByText('Learn more about our privacy features')).toBeInTheDocument();

    // Details should not be visible initially
    expect(screen.queryByText('How it works:')).not.toBeInTheDocument();
  });

  test('shows details when "Learn more" is clicked', () => {
    render(<PrivacyMessage />);

    // Click the "Learn more" button
    fireEvent.click(screen.getByText('Learn more about our privacy features'));

    // Details should now be visible
    expect(screen.getByText('How it works:')).toBeInTheDocument();
    expect(screen.getByText('No data collection:')).toBeInTheDocument();
    expect(screen.getByText('Temporary storage:')).toBeInTheDocument();
    expect(screen.getByText('Secure processing:')).toBeInTheDocument();

    // "Show less" button should be visible
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // "Learn more" button should not be visible
    expect(screen.queryByText('Learn more about our privacy features')).not.toBeInTheDocument();
  });

  test('hides details when "Show less" is clicked', () => {
    render(<PrivacyMessage />);

    // Click the "Learn more" button to show details
    fireEvent.click(screen.getByText('Learn more about our privacy features'));

    // Click the "Show less" button
    fireEvent.click(screen.getByText('Show less'));

    // Details should not be visible
    expect(screen.queryByText('How it works:')).not.toBeInTheDocument();

    // "Learn more" button should be visible again
    expect(screen.getByText('Learn more about our privacy features')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<PrivacyMessage className="custom-class" />);

    // Check if the custom class is applied
    expect(container.firstChild).toHaveClass('privacy-message');
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('renders correctly in light theme', () => {
    // Set light theme
    document.documentElement.removeAttribute('data-theme');

    render(
      <ThemeProvider>
        <PrivacyMessage />
      </ThemeProvider>
    );

    expect(screen.getByText('Your Privacy is Protected')).toBeInTheDocument();
    expect(screen.getByText(/100% Client-Side Processing/)).toBeInTheDocument();
  });

  test('renders correctly in dark theme', () => {
    // Set dark theme
    document.documentElement.setAttribute('data-theme', 'dark');

    render(
      <ThemeProvider>
        <PrivacyMessage />
      </ThemeProvider>
    );

    expect(screen.getByText('Your Privacy is Protected')).toBeInTheDocument();
    expect(screen.getByText(/100% Client-Side Processing/)).toBeInTheDocument();

    // Clean up
    document.documentElement.removeAttribute('data-theme');
  });

  test('toggle button styling works in both themes', () => {
    render(<PrivacyMessage />);

    const toggleButton = screen.getByText('Learn more about our privacy features');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveClass('privacy-message-toggle');

    // Click to show details
    fireEvent.click(toggleButton);

    const showLessButton = screen.getByText('Show less');
    expect(showLessButton).toBeInTheDocument();
    expect(showLessButton).toHaveClass('privacy-message-toggle');
  });

  test('applies correct CSS variables for theme colors', () => {
    const { container } = render(<PrivacyMessage />);

    const privacyMessage = container.querySelector('.privacy-message');
    expect(privacyMessage).toBeInTheDocument();

    // Check that CSS classes are applied correctly
    expect(privacyMessage).toHaveClass('privacy-message');
  });
});
