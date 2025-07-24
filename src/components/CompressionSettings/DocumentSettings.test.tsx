import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentSettings from './DocumentSettings';
import { DocumentSettings as DocumentSettingsType } from '../../types';

describe('DocumentSettings', () => {
  const defaultSettings: DocumentSettingsType = {
    compressionLevel: 'medium',
    preserveMetadata: true,
    optimizeImages: true,
  };

  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    mockOnSettingsChange.mockClear();
  });

  it('renders document settings correctly', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByLabelText(/compression level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preserve document metadata/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/optimize embedded images/i)).toBeInTheDocument();
  });

  it('handles compression level changes', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const compressionSelect = screen.getByLabelText(/compression level/i);
    fireEvent.change(compressionSelect, { target: { value: 'high' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      compressionLevel: 'high',
    });
  });

  it('handles metadata preservation toggle', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const metadataCheckbox = screen.getByLabelText(/preserve document metadata/i);
    fireEvent.click(metadataCheckbox);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      preserveMetadata: false,
    });
  });

  it('handles image optimization toggle', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const imageOptimizationCheckbox = screen.getByLabelText(/optimize embedded images/i);
    fireEvent.click(imageOptimizationCheckbox);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      optimizeImages: false,
    });
  });

  it('shows document metadata when provided', () => {
    const documentMetadata = {
      pageCount: 25,
      hasEmbeddedMedia: true,
      isEncrypted: false,
      fileType: 'pdf' as const,
    };

    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        documentMetadata={documentMetadata}
      />
    );

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText(/will be optimized/i)).toBeInTheDocument();
  });

  it('shows warning for encrypted documents', () => {
    const documentMetadata = {
      pageCount: 10,
      hasEmbeddedMedia: false,
      isEncrypted: true,
      fileType: 'pdf' as const,
    };

    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        documentMetadata={documentMetadata}
      />
    );

    expect(screen.getByText(/encrypted documents may have limited compression options/i)).toBeInTheDocument();
  });

  it('shows warning for high compression on PDF', () => {
    const highCompressionSettings: DocumentSettingsType = {
      ...defaultSettings,
      compressionLevel: 'high',
    };

    const documentMetadata = {
      pageCount: 10,
      hasEmbeddedMedia: false,
      isEncrypted: false,
      fileType: 'pdf' as const,
    };

    render(
      <DocumentSettings
        settings={highCompressionSettings}
        onSettingsChange={mockOnSettingsChange}
        documentMetadata={documentMetadata}
      />
    );

    expect(screen.getByText(/high compression may affect pdf text readability/i)).toBeInTheDocument();
  });

  it('disables image optimization when no embedded media', () => {
    const documentMetadata = {
      pageCount: 10,
      hasEmbeddedMedia: false,
      isEncrypted: false,
      fileType: 'pdf' as const,
    };

    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        documentMetadata={documentMetadata}
      />
    );

    const imageOptimizationCheckbox = screen.getByLabelText(/optimize embedded images/i);
    expect(imageOptimizationCheckbox).toBeDisabled();
    expect(screen.getByText(/no embedded media detected/i)).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        disabled={true}
      />
    );

    const compressionSelect = screen.getByLabelText(/compression level/i);
    const metadataCheckbox = screen.getByLabelText(/preserve document metadata/i);
    const imageOptimizationCheckbox = screen.getByLabelText(/optimize embedded images/i);

    expect(compressionSelect).toBeDisabled();
    expect(metadataCheckbox).toBeDisabled();
    expect(imageOptimizationCheckbox).toBeDisabled();
  });

  it('shows appropriate compression descriptions', () => {
    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByText(/balanced compression with good quality retention/i)).toBeInTheDocument();
  });

  it('calculates estimated compression correctly', () => {
    const documentMetadata = {
      pageCount: 10,
      hasEmbeddedMedia: true,
      isEncrypted: false,
      fileType: 'pdf' as const,
    };

    render(
      <DocumentSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        documentMetadata={documentMetadata}
      />
    );

    // Should show estimated compression percentage
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });
});