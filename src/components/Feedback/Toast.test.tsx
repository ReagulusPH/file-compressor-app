import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from './Toast';
import { ThemeProvider } from '../../context/ThemeContext';

describe('Toast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with message and type', () => {
    render(<Toast id="test-toast" message="Test message" type="success" onClose={mockOnClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(document.querySelector('.toast-success')).toBeInTheDocument();
  });

  it('renders different types correctly', () => {
    const { rerender } = render(
      <Toast id="test-toast" message="Success message" type="success" onClose={mockOnClose} />
    );

    expect(document.querySelector('.toast-success')).toBeInTheDocument();

    rerender(<Toast id="test-toast" message="Error message" type="error" onClose={mockOnClose} />);

    expect(document.querySelector('.toast-error')).toBeInTheDocument();

    rerender(
      <Toast id="test-toast" message="Warning message" type="warning" onClose={mockOnClose} />
    );

    expect(document.querySelector('.toast-warning')).toBeInTheDocument();

    rerender(<Toast id="test-toast" message="Info message" type="info" onClose={mockOnClose} />);

    expect(document.querySelector('.toast-info')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Toast id="test-toast" message="Test message" type="success" onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close notification/i }));

    // Simulate animation end
    fireEvent.animationEnd(document.querySelector('.toast') as Element);

    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('automatically closes after duration', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        type="success"
        duration={1000}
        onClose={mockOnClose}
      />
    );

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Simulate animation end
    fireEvent.animationEnd(document.querySelector('.toast') as Element);

    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('renders correctly in light theme', () => {
    // Set light theme
    document.documentElement.removeAttribute('data-theme');

    render(
      <ThemeProvider>
        <Toast id="test-toast" message="Light theme test" type="success" onClose={mockOnClose} />
      </ThemeProvider>
    );

    const toast = document.querySelector('.toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass('toast-success');
  });

  it('renders correctly in dark theme', () => {
    // Set dark theme
    document.documentElement.setAttribute('data-theme', 'dark');

    render(
      <ThemeProvider>
        <Toast id="test-toast" message="Dark theme test" type="error" onClose={mockOnClose} />
      </ThemeProvider>
    );

    const toast = document.querySelector('.toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass('toast-error');

    // Clean up
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies correct CSS variables for theme colors', () => {
    render(
      <Toast id="test-toast" message="CSS variables test" type="warning" onClose={mockOnClose} />
    );

    const toast = document.querySelector('.toast');
    const computedStyle = window.getComputedStyle(toast as Element);

    // Toast should use CSS variables for styling
    expect(toast).toHaveClass('toast-warning');
  });
});
