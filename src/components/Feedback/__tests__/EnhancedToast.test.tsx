import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedToast from '../EnhancedToast';
import {
  DocumentCorruptedError,
  AudioDecodeError,
  APKSignatureError,
  MemoryError,
  BrowserCompatibilityError,
} from '../../../utils/errors/ErrorTypes';

describe('EnhancedToast', () => {
  const mockOnClose = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic toast without error', () => {
    render(
      <EnhancedToast
        id="test-1"
        message="Test message"
        type="info"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays format-specific error message for document errors', () => {
    const error = new DocumentCorruptedError('PDF');
    
    render(
      <EnhancedToast
        id="test-2"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/document appears to be corrupted/i)).toBeInTheDocument();
  });

  it('displays format-specific error message for audio errors', () => {
    const error = new AudioDecodeError('MP3');
    
    render(
      <EnhancedToast
        id="test-3"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/audio file cannot be decoded/i)).toBeInTheDocument();
  });

  it('displays format-specific error message for APK errors', () => {
    const error = new APKSignatureError();
    
    render(
      <EnhancedToast
        id="test-4"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/APK signature validation failed/i)).toBeInTheDocument();
  });

  it('shows recovery actions when expanded', async () => {
    const error = new MemoryError();
    
    render(
      <EnhancedToast
        id="test-5"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
        showRecoveryActions={true}
      />
    );

    // Find and click the expand button
    const expandButton = screen.getByLabelText(/show recovery options/i);
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Quick Fixes:')).toBeInTheDocument();
      expect(screen.getByText(/close other applications/i)).toBeInTheDocument();
    });
  });

  it('calls onRetry when retry button is clicked', () => {
    render(
      <EnhancedToast
        id="test-6"
        message="Test message"
        type="error"
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByLabelText(/retry operation/i);
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <EnhancedToast
        id="test-7"
        message="Test message"
        type="info"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText(/close notification/i);
    
    act(() => {
      fireEvent.click(closeButton);
    });

    // Wait for animation to complete
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-7');
    }, { timeout: 1000 });
  });

  it('shows appropriate severity styling for critical errors', () => {
    const error = new BrowserCompatibilityError('Web Workers');
    
    render(
      <EnhancedToast
        id="test-8"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('enhanced-toast-critical');
  });

  it('does not auto-close error messages', () => {
    jest.useFakeTimers();
    
    render(
      <EnhancedToast
        id="test-9"
        message="Error message"
        type="error"
        duration={1000}
        onClose={mockOnClose}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(2000);

    // Error toast should still be visible
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('auto-closes success messages after duration', async () => {
    jest.useFakeTimers();
    
    render(
      <EnhancedToast
        id="test-10"
        message="Success message"
        type="success"
        duration={1000}
        onClose={mockOnClose}
      />
    );

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-10');
    }, { timeout: 2000 });

    jest.useRealTimers();
  });

  it('pauses auto-close on mouse enter and resumes on mouse leave', async () => {
    jest.useFakeTimers();
    
    render(
      <EnhancedToast
        id="test-11"
        message="Info message"
        type="info"
        duration={1000}
        onClose={mockOnClose}
      />
    );

    const toast = screen.getByRole('alert');
    
    // Hover over toast
    act(() => {
      fireEvent.mouseEnter(toast);
    });
    
    // Fast-forward past original duration
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    
    // Should not have closed yet
    expect(mockOnClose).not.toHaveBeenCalled();
    
    // Mouse leave should resume timer
    act(() => {
      fireEvent.mouseLeave(toast);
    });
    
    // Fast-forward the resume duration
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('test-11');
    }, { timeout: 2000 });

    jest.useRealTimers();
  });

  it('displays troubleshooting guide button for supported errors', async () => {
    const error = new DocumentCorruptedError('PDF');
    
    render(
      <EnhancedToast
        id="test-12"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
        showRecoveryActions={true}
      />
    );

    // Expand to show recovery actions
    const expandButton = screen.getByLabelText(/show recovery options/i);
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/view troubleshooting guide/i)).toBeInTheDocument();
    });
  });

  it('shows different recovery action categories', async () => {
    const error = new MemoryError();
    
    render(
      <EnhancedToast
        id="test-13"
        message="Error occurred"
        type="error"
        error={error}
        onClose={mockOnClose}
        showRecoveryActions={true}
      />
    );

    // Expand to show recovery actions
    const expandButton = screen.getByLabelText(/show recovery options/i);
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Quick Fixes:')).toBeInTheDocument();
      expect(screen.getByText('Alternative Solutions:')).toBeInTheDocument();
      expect(screen.getByText('Prevention Tips:')).toBeInTheDocument();
    });
  });
});