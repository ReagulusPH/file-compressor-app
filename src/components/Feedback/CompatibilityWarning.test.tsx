import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompatibilityWarning from './CompatibilityWarning';

describe('CompatibilityWarning', () => {
  it('renders unsupported feature warning', () => {
    render(
      <CompatibilityWarning
        feature="WebAssembly"
        type="unsupported"
      />
    );

    expect(screen.getByText('WebAssembly Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/your browser does not support webassembly/i)).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('renders limited support warning', () => {
    render(
      <CompatibilityWarning
        feature="File System Access API"
        type="limited"
      />
    );

    expect(screen.getByText('Limited File System Access API Support')).toBeInTheDocument();
    expect(screen.getByText(/limited support for file system access api/i)).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders fallback warning', () => {
    render(
      <CompatibilityWarning
        feature="Native Compression"
        type="fallback"
      />
    );

    expect(screen.getByText('Using Native Compression Fallback')).toBeInTheDocument();
    expect(screen.getByText(/using a fallback implementation/i)).toBeInTheDocument();
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('renders custom details when provided', () => {
    const customDetails = 'This is a custom warning message about compatibility.';
    
    render(
      <CompatibilityWarning
        feature="Custom Feature"
        type="limited"
        details={customDetails}
      />
    );

    expect(screen.getByText(customDetails)).toBeInTheDocument();
  });

  it('renders format-specific icon when formatType is provided', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
        formatType="image"
      />
    );

    expect(screen.getByText('🖼️')).toBeInTheDocument();
  });

  it('renders fallback methods when provided', () => {
    const fallbackMethods = ['Method 1', 'Method 2', 'Method 3'];
    
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="fallback"
        fallbackMethods={fallbackMethods}
      />
    );

    expect(screen.getByText('Available methods:')).toBeInTheDocument();
    fallbackMethods.forEach(method => {
      expect(screen.getByText(method)).toBeInTheDocument();
    });
  });

  it('shows technical details when showTechnicalDetails is true', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
        formatType="audio"
        fallbackMethods={['Web Audio API', 'Library fallback']}
        showTechnicalDetails={true}
      />
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Format Type:')).toBeInTheDocument();
    expect(screen.getByText('audio')).toBeInTheDocument();
    expect(screen.getByText('Support Level:')).toBeInTheDocument();
    expect(screen.getByText('limited')).toBeInTheDocument();
  });

  it('does not show fallback methods for non-fallback types', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="unsupported"
        fallbackMethods={['Method 1', 'Method 2']}
      />
    );

    expect(screen.queryByText('Available methods:')).not.toBeInTheDocument();
  });

  it('renders suggestions when provided', () => {
    const suggestions = [
      'Update your browser to the latest version',
      'Try using Chrome or Firefox',
      'Enable experimental features in browser settings'
    ];

    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="unsupported"
        suggestions={suggestions}
      />
    );

    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    suggestions.forEach(suggestion => {
      expect(screen.getByText(suggestion)).toBeInTheDocument();
    });
  });

  it('shows dismiss button when dismissible', () => {
    const mockOnDismiss = jest.fn();

    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
        dismissible={true}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss warning');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when not dismissible', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
        dismissible={false}
      />
    );

    expect(screen.queryByLabelText('Dismiss warning')).not.toBeInTheDocument();
  });

  it('applies correct CSS classes for different warning types', () => {
    const { rerender } = render(
      <CompatibilityWarning
        feature="Test Feature"
        type="unsupported"
      />
    );

    let warningElement = screen.getByRole('alert');
    expect(warningElement).toHaveClass('compatibility-warning--error');

    rerender(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
      />
    );

    warningElement = screen.getByRole('alert');
    expect(warningElement).toHaveClass('compatibility-warning--warning');

    rerender(
      <CompatibilityWarning
        feature="Test Feature"
        type="fallback"
      />
    );

    warningElement = screen.getByRole('alert');
    expect(warningElement).toHaveClass('compatibility-warning--info');
  });

  it('has proper accessibility attributes', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="unsupported"
      />
    );

    const warningElement = screen.getByRole('alert');
    expect(warningElement).toBeInTheDocument();
  });

  it('handles empty suggestions array gracefully', () => {
    render(
      <CompatibilityWarning
        feature="Test Feature"
        type="limited"
        suggestions={[]}
      />
    );

    expect(screen.queryByText('Suggestions:')).not.toBeInTheDocument();
  });
});