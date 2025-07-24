/**
 * Tests for FormatCompatibilityDisplay component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormatCompatibilityDisplay from '../FormatCompatibilityDisplay';
import type { FormatInfo } from '../../../types';

// Mock the enhanced browser capabilities
const mockGetEnhancedCapabilities = jest.fn(() => ({
      formatInfo: {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      },
      browserInfo: {
        name: 'Chrome',
        version: '91.0',
        majorVersion: 91,
        engine: 'Blink',
        isMobile: false,
      },
      supportInfo: {
        isSupported: true,
        supportLevel: 'native',
        primaryMethod: 'canvas',
        fallbackMethods: ['library'],
        limitations: [],
        recommendations: [],
      },
      processingRecommendation: {
        shouldProceed: true,
        strategy: {
          canProcess: true,
          method: 'native',
          limitations: [],
          alternatives: ['library'],
          performanceImpact: 'low',
          memoryImpact: 'low',
        },
        warnings: [],
        userActions: [],
      },
      fallbackChain: ['native', 'library:browser-image-compression'],
      performanceProfile: {
        expectedSpeed: 'fast',
        memoryUsage: 'low',
        cpuIntensity: 'low',
      },
      compatibilityWarnings: [],
    }));

jest.mock('../../../utils/enhancedBrowserCapabilities', () => ({
  EnhancedBrowserCapabilityDetector: {
    getEnhancedCapabilities: mockGetEnhancedCapabilities,
  },
}));

describe('FormatCompatibilityDisplay', () => {
  const mockFormatInfo: FormatInfo = {
    type: 'image',
    format: 'jpeg',
    mimeType: 'image/jpeg',
    compressor: 'CanvasImageCompressor',
    supportLevel: 'native',
  };

  it('renders format information correctly', async () => {
    render(<FormatCompatibilityDisplay formatInfo={mockFormatInfo} />);

    await waitFor(() => {
      expect(screen.getByText('JPEG Format')).toBeInTheDocument();
      expect(screen.getByText(/image • native support/i)).toBeInTheDocument();
      expect(screen.getByText('Full Support')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<FormatCompatibilityDisplay formatInfo={mockFormatInfo} />);
    
    expect(screen.getByText('Analyzing browser compatibility...')).toBeInTheDocument();
  });

  it('displays performance profile when enabled', async () => {
    render(
      <FormatCompatibilityDisplay 
        formatInfo={mockFormatInfo} 
        showPerformanceProfile={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Performance Profile')).toBeInTheDocument();
      expect(screen.getByText('Speed:')).toBeInTheDocument();
      expect(screen.getByText('Memory:')).toBeInTheDocument();
      expect(screen.getByText('CPU:')).toBeInTheDocument();
    });
  });

  it('displays fallback chain when enabled', async () => {
    render(
      <FormatCompatibilityDisplay 
        formatInfo={mockFormatInfo} 
        showFallbackChain={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Processing Methods')).toBeInTheDocument();
      expect(screen.getByText('Native Browser APIs')).toBeInTheDocument();
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });
  });

  it('shows success message when no warnings and native support', async () => {
    render(<FormatCompatibilityDisplay formatInfo={mockFormatInfo} />);

    await waitFor(() => {
      expect(screen.getByText('Full compatibility - no issues detected')).toBeInTheDocument();
    });
  });

  it('displays technical details when enabled', async () => {
    render(
      <FormatCompatibilityDisplay 
        formatInfo={mockFormatInfo} 
        showTechnicalDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });
  });

  it('applies compact styling when compact prop is true', async () => {
    render(
      <FormatCompatibilityDisplay 
        formatInfo={mockFormatInfo} 
        compact={true}
      />
    );

    await waitFor(() => {
      const container = screen.getByText('JPEG Format').closest('.format-compatibility-display');
      expect(container).toHaveClass('format-compatibility-display--compact');
    });
  });

  it('handles format with warnings', async () => {
    mockGetEnhancedCapabilities.mockReturnValueOnce({
      formatInfo: mockFormatInfo,
      browserInfo: {
        name: 'Chrome',
        version: '91.0',
        majorVersion: 91,
        engine: 'Blink',
        isMobile: false,
      },
      supportInfo: {
        isSupported: true,
        supportLevel: 'library',
        primaryMethod: 'library',
        fallbackMethods: ['tiff.js'],
        limitations: ['Requires JavaScript library'],
        recommendations: ['Consider converting to JPEG'],
      },
      processingRecommendation: {
        shouldProceed: true,
        strategy: {
          canProcess: true,
          method: 'library',
          limitations: ['Requires JavaScript library'],
          alternatives: ['tiff.js'],
          performanceImpact: 'medium',
          memoryImpact: 'medium',
        },
        warnings: [],
        userActions: [],
      },
      fallbackChain: ['library:tiff.js'],
      performanceProfile: {
        expectedSpeed: 'medium',
        memoryUsage: 'medium',
        cpuIntensity: 'high',
      },
      compatibilityWarnings: [
        {
          type: 'fallback',
          feature: 'TIFF Processing',
          details: 'TIFF files require JavaScript libraries for processing.',
          suggestions: ['Consider converting to JPEG or PNG'],
          severity: 'low',
        },
      ],
    });

    const tiffFormatInfo: FormatInfo = {
      type: 'image',
      format: 'tiff',
      mimeType: 'image/tiff',
      compressor: 'CanvasImageCompressor',
      supportLevel: 'library',
    };

    render(<FormatCompatibilityDisplay formatInfo={tiffFormatInfo} />);

    await waitFor(() => {
      expect(screen.getByText('TIFF Format')).toBeInTheDocument();
      expect(screen.getByText('Library Support')).toBeInTheDocument();
    });
  });
});