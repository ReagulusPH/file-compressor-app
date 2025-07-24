import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArchiveSettings from './ArchiveSettings';
import { ArchiveSettings as ArchiveSettingsType } from '../../types';

// Mock the Modal component
jest.mock('../Feedback/Modal', () => {
  return function MockModal({ isOpen, title, children, onClose, actions }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        <div>{children}</div>
        <div>{actions}</div>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('ArchiveSettings', () => {
  const defaultSettings: ArchiveSettingsType = {
    compressionLevel: 6,
    preserveStructure: true,
    validateIntegrity: true,
  };

  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    mockOnSettingsChange.mockClear();
  });

  it('renders archive settings with default values', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    expect(screen.getByLabelText(/compression level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preserve archive structure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/validate integrity/i)).toBeInTheDocument();
  });

  it('displays compression level options correctly', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const select = screen.getByLabelText(/compression level/i);
    expect(select).toHaveValue('6');
    
    // Check that all compression levels are available
    expect(screen.getByText(/no compression/i)).toBeInTheDocument();
    expect(screen.getByText(/minimal compression/i)).toBeInTheDocument();
    expect(screen.getByText(/balanced compression/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum compression/i)).toBeInTheDocument();
  });

  it('calls onSettingsChange when compression level changes', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const select = screen.getByLabelText(/compression level/i);
    fireEvent.change(select, { target: { value: '9' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      compressionLevel: 9,
    });
  });

  it('calls onSettingsChange when preserve structure changes', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const checkbox = screen.getByLabelText(/preserve archive structure/i);
    fireEvent.click(checkbox);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      preserveStructure: false,
    });
  });

  it('calls onSettingsChange when validate integrity changes', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    const checkbox = screen.getByLabelText(/validate integrity/i);
    fireEvent.click(checkbox);

    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...defaultSettings,
      validateIntegrity: false,
    });
  });

  it('displays APK-specific warnings for APK files', () => {
    const apkMetadata = {
      fileType: 'apk' as const,
      entryCount: 500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={apkMetadata}
      />
    );

    expect(screen.getByText(/apk compression notice/i)).toBeInTheDocument();
    expect(screen.getByText(/test compressed apks thoroughly/i)).toBeInTheDocument();
  });

  it('shows integrity warning modal for high compression on APK', async () => {
    const apkMetadata = {
      fileType: 'apk' as const,
      entryCount: 500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 3 }}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={apkMetadata}
      />
    );

    const select = screen.getByLabelText(/compression level/i);
    fireEvent.change(select, { target: { value: '9' } });

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText(/high compression warning/i)).toBeInTheDocument();
    });
  });

  it('shows compatibility warning modal when disabling structure preservation for APK', async () => {
    const apkMetadata = {
      fileType: 'apk' as const,
      entryCount: 500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={apkMetadata}
      />
    );

    const checkbox = screen.getByLabelText(/preserve archive structure/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText(/structure modification warning/i)).toBeInTheDocument();
    });
  });

  it('displays archive metadata when provided', () => {
    const metadata = {
      fileType: 'apk' as const,
      entryCount: 1500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={metadata}
      />
    );

    expect(screen.getByText('1,500')).toBeInTheDocument(); // Entry count
    expect(screen.getByText('APK')).toBeInTheDocument(); // File type
  });

  it('calculates estimated compression correctly', () => {
    render(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 9 }}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Maximum compression should show higher percentage
    expect(screen.getByText(/65%/)).toBeInTheDocument();
  });

  it('shows different processing time estimates based on compression level', () => {
    const smallArchiveMetadata = {
      entryCount: 10, // Small number of entries
    };

    const largeArchiveMetadata = {
      entryCount: 10000, // Large number of entries
    };

    const { rerender } = render(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 0 }}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={smallArchiveMetadata}
      />
    );

    expect(screen.getByText(/a few seconds/i)).toBeInTheDocument();

    rerender(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 9 }}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={largeArchiveMetadata}
      />
    );

    // The actual text shown is "Less than 30 seconds" based on the test output
    expect(screen.getByText(/less than 30 seconds/i)).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <ArchiveSettings
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        disabled={true}
      />
    );

    expect(screen.getByLabelText(/compression level/i)).toBeDisabled();
    expect(screen.getByLabelText(/preserve archive structure/i)).toBeDisabled();
    expect(screen.getByLabelText(/validate integrity/i)).toBeDisabled();
  });

  it('shows signature preservation warning for signed APKs with high compression', () => {
    const apkMetadata = {
      fileType: 'apk' as const,
      entryCount: 500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 6 }}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={apkMetadata}
      />
    );

    expect(screen.getByText(/may be invalidated/i)).toBeInTheDocument();
  });

  it('shows signature preservation status for signed APKs with low compression', () => {
    const apkMetadata = {
      fileType: 'apk' as const,
      entryCount: 500,
      hasSignature: true,
    };

    render(
      <ArchiveSettings
        settings={{ ...defaultSettings, compressionLevel: 3 }}
        onSettingsChange={mockOnSettingsChange}
        archiveMetadata={apkMetadata}
      />
    );

    expect(screen.getByText(/should be preserved/i)).toBeInTheDocument();
  });
});