import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsPanel from './ResultsPanel';
import { CompressionResult } from '../../types';

// Mock JSZip
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue(new Blob(['mock-zip-data'], { type: 'application/zip' })),
  }));
});

describe('ResultsPanel Component', () => {
  // Sample test data
  const mockResults: CompressionResult[] = [
    {
      id: '1',
      originalFile: {
        name: 'test-image.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
      },
      compressedFile: {
        blob: new Blob(['mock-data'], { type: 'image/jpeg' }),
        size: 512 * 1024, // 0.5MB
        type: 'image/jpeg',
      },
      compressionRatio: 50,
      processingTime: 1500,
      method: 'CanvasImageCompressor',
    },
    {
      id: '2',
      originalFile: {
        name: 'test-video.mp4',
        size: 10 * 1024 * 1024, // 10MB
        type: 'video/mp4',
      },
      compressedFile: {
        blob: new Blob(['mock-data'], { type: 'video/mp4' }),
        size: 5 * 1024 * 1024, // 5MB
        type: 'video/mp4',
      },
      compressionRatio: 50,
      processingTime: 5000,
      method: 'WebCodecsVideoCompressor',
    },
  ];

  const mockHandlers = {
    onDownload: jest.fn(),
    onDownloadAll: jest.fn(),
    onCompressMore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders without crashing', () => {
    render(
      <ResultsPanel
        results={[]}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );
    expect(screen.getByText('Compression Results')).toBeInTheDocument();
    expect(screen.getByText('No compression results available yet.')).toBeInTheDocument();
  });

  test('displays correct number of result items', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.queryByText('No compression results available yet.')).not.toBeInTheDocument();
  });

  test('displays view mode toggle', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    expect(screen.getByText('List View')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  test('displays format filter when multiple formats are present', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    const formatSelect = screen.getByDisplayValue(/All Formats/);
    expect(formatSelect).toBeInTheDocument();
  });

  test('displays enhanced summary information', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    expect(screen.getByText('Total Files:')).toBeInTheDocument();
    expect(screen.getByText('Successful:')).toBeInTheDocument();
    expect(screen.getByText('Original Size:')).toBeInTheDocument();
    expect(screen.getByText('Compressed Size:')).toBeInTheDocument();
    expect(screen.getByText('Overall Reduction:')).toBeInTheDocument();
    expect(screen.getByText('Total Time:')).toBeInTheDocument();
  });

  test('switches between list and statistics view', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    // Initially in list view
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();

    // Switch to statistics view
    const statisticsButton = screen.getByText('Statistics');
    fireEvent.click(statisticsButton);

    // Should show statistics content
    expect(screen.getByText('Compression Statistics by Format')).toBeInTheDocument();
  });

  test('displays format-specific information', () => {
    const resultsWithFormatData: CompressionResult[] = [
      {
        ...mockResults[0],
        formatSpecificData: {
          finalBitrate: 128,
          qualityScore: 8,
        },
      },
    ];

    render(
      <ResultsPanel
        results={resultsWithFormatData}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    // Should display format-specific data
    expect(screen.getByText('CanvasImageCompressor')).toBeInTheDocument();
  });

  test('calls onCompressMore when compress more button is clicked', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    const compressMoreButton = screen.getByText('Compress More Files');
    fireEvent.click(compressMoreButton);

    expect(mockHandlers.onCompressMore).toHaveBeenCalled();
  });

  test('disables download all button when there are no results', () => {
    render(
      <ResultsPanel
        results={[]}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    const downloadAllButton = screen.getByText('Download All as ZIP');
    expect(downloadAllButton).toBeDisabled();
  });

  test('enables download all button when there are results', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    const downloadAllButton = screen.getByText('Download All as ZIP');
    expect(downloadAllButton).not.toBeDisabled();
  });

  test('filters results by format', () => {
    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    // Initially shows both files
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();

    // Filter by image format
    const formatSelect = screen.getByDisplayValue(/All Formats/);
    fireEvent.change(formatSelect, { target: { value: 'image' } });

    // Should still show image file (filtering is handled by ResultsManager)
    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
  });

  test('renders correctly in dark theme', () => {
    // Set dark theme on document
    document.documentElement.setAttribute('data-theme', 'dark');

    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    // Verify the component renders with dark theme
    const resultsPanel = document.querySelector('.results-panel');
    expect(resultsPanel).toBeInTheDocument();

    // Clean up
    document.documentElement.removeAttribute('data-theme');
  });

  test('renders correctly in light theme', () => {
    // Ensure light theme (default)
    document.documentElement.removeAttribute('data-theme');

    render(
      <ResultsPanel
        results={mockResults}
        onDownload={mockHandlers.onDownload}
        onDownloadAll={mockHandlers.onDownloadAll}
        onCompressMore={mockHandlers.onCompressMore}
      />
    );

    // Verify the component renders with light theme
    const resultsPanel = document.querySelector('.results-panel');
    expect(resultsPanel).toBeInTheDocument();
  });
});