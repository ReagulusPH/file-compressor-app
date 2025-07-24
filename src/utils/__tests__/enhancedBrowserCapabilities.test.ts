/**
 * Tests for Enhanced Browser Capability Detection
 */

import { EnhancedBrowserCapabilityDetector } from '../enhancedBrowserCapabilities';
import type { FormatInfo } from '../../types';

// Mock browser support utilities
jest.mock('../browserSupport', () => ({
  detectBrowserFeatures: jest.fn(() => ({
    webWorkers: true,
    webGL: true,
    canvas: true,
    fileAPI: true,
    webAssembly: true,
    sharedArrayBuffer: true,
    indexedDB: true,
    webRTC: true,
    mediaRecorder: true,
    serviceWorker: true,
    webAudioAPI: true,
    offscreenCanvas: true,
    webCodecs: true,
    compressionStreams: true,
    fileSystemAccess: false,
  })),
  detectFormatCapabilities: jest.fn(() => ({
    image: {
      canvas: true,
      webp: true,
      avif: false,
      tiff: false,
      offscreenCanvas: true,
    },
    video: {
      mediaRecorder: true,
      webCodecs: true,
      webAssembly: true,
      sharedArrayBuffer: true,
    },
    audio: {
      webAudioAPI: true,
      audioContext: true,
      mediaRecorder: true,
      compressionStreams: true,
    },
    document: {
      fileReader: true,
      arrayBuffer: true,
      textDecoder: true,
      compressionStreams: true,
    },
    archive: {
      compressionStreams: true,
      arrayBuffer: true,
      uint8Array: true,
      fileReader: true,
    },
  })),
  getBrowserInfo: jest.fn(() => ({
    name: 'Chrome',
    version: '91.0',
    majorVersion: 91,
    engine: 'Blink',
    isMobile: false,
  })),
}));

// Mock format capability detector
jest.mock('../formatCapabilities', () => ({
  FormatCapabilityDetector: {
    getFormatSupport: jest.fn(() => ({
      isSupported: true,
      supportLevel: 'native',
      primaryMethod: 'canvas',
      fallbackMethods: ['library'],
      limitations: [],
      recommendations: [],
    })),
    getCompatibilityWarnings: jest.fn(() => []),
  },
}));

// Mock graceful degradation manager
jest.mock('../gracefulDegradation', () => ({
  GracefulDegradationManager: {
    getProcessingRecommendation: jest.fn(() => ({
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
    })),
  },
}));

describe('EnhancedBrowserCapabilityDetector', () => {
  beforeEach(() => {
    // Reset the detector before each test
    (EnhancedBrowserCapabilityDetector as any).browserFeatures = null;
    (EnhancedBrowserCapabilityDetector as any).formatCapabilities = null;
    (EnhancedBrowserCapabilityDetector as any).browserInfo = null;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getEnhancedCapabilities', () => {
    it('should return comprehensive capability analysis for image formats', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result).toHaveProperty('formatInfo');
      expect(result).toHaveProperty('browserInfo');
      expect(result).toHaveProperty('supportInfo');
      expect(result).toHaveProperty('processingRecommendation');
      expect(result).toHaveProperty('fallbackChain');
      expect(result).toHaveProperty('performanceProfile');
      expect(result).toHaveProperty('compatibilityWarnings');

      expect(result.formatInfo).toEqual(formatInfo);
      expect(result.browserInfo.name).toBe('Chrome');
      expect(result.fallbackChain).toContain('native');
      expect(result.performanceProfile.expectedSpeed).toBeDefined();
    });

    it('should return appropriate fallback chain for TIFF format', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'tiff',
        mimeType: 'image/tiff',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'library',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result.fallbackChain).not.toContain('native');
      expect(result.fallbackChain.some(method => method.includes('library'))).toBe(true);
      expect(result.performanceProfile.cpuIntensity).toBe('high');
    });

    it('should return appropriate capabilities for video formats', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result.fallbackChain).toContain('native');
      expect(result.performanceProfile.memoryUsage).toBe('high');
      expect(result.performanceProfile.cpuIntensity).toBe('high');
    });

    it('should return appropriate capabilities for audio formats', () => {
      const formatInfo: FormatInfo = {
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        compressor: 'WebAudioCompressor',
        supportLevel: 'native',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result.fallbackChain).toContain('native');
      expect(result.performanceProfile.memoryUsage).toBe('low');
    });

    it('should return appropriate capabilities for document formats', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result.fallbackChain).not.toContain('native');
      expect(result.fallbackChain.some(method => method.includes('library'))).toBe(true);
    });

    it('should return appropriate capabilities for archive formats', () => {
      const formatInfo: FormatInfo = {
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        compressor: 'APKCompressor',
        supportLevel: 'library',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);

      expect(result.fallbackChain).not.toContain('native');
      expect(result.performanceProfile.expectedSpeed).toBe('slow');
      expect(result.performanceProfile.memoryUsage).toBe('high');
      expect(result.compatibilityWarnings.some(w => w.feature.includes('APK'))).toBe(true);
    });

    it('should adjust performance profile based on file size', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const smallFileResult = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo, 1024 * 1024); // 1MB
      const largeFileResult = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo, 200 * 1024 * 1024); // 200MB

      expect(largeFileResult.performanceProfile.expectedSpeed).not.toBe('fast');
      expect(largeFileResult.performanceProfile.memoryUsage).toBe('high');
    });
  });

  describe('getBestProcessingMethod', () => {
    it('should return the best available processing method', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const method = EnhancedBrowserCapabilityDetector.getBestProcessingMethod(formatInfo);
      expect(method).toBe('native');
    });

    it('should return library method for formats requiring libraries', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const method = EnhancedBrowserCapabilityDetector.getBestProcessingMethod(formatInfo);
      expect(method).toContain('library');
    });
  });

  describe('getBatchProcessingRecommendation', () => {
    it('should recommend batch processing for compatible formats', () => {
      const formats: FormatInfo[] = [
        {
          type: 'image',
          format: 'jpeg',
          mimeType: 'image/jpeg',
          compressor: 'CanvasImageCompressor',
          supportLevel: 'native',
        },
        {
          type: 'image',
          format: 'png',
          mimeType: 'image/png',
          compressor: 'CanvasImageCompressor',
          supportLevel: 'native',
        },
      ];

      const recommendation = EnhancedBrowserCapabilityDetector.getBatchProcessingRecommendation(formats);
      expect(recommendation.recommended).toBe(true);
    });

    it('should not recommend batch processing for memory-intensive formats', () => {
      const formats: FormatInfo[] = [
        {
          type: 'video',
          format: 'mp4',
          mimeType: 'video/mp4',
          compressor: 'WebCodecsVideoCompressor',
          supportLevel: 'native',
        },
        {
          type: 'archive',
          format: 'apk',
          mimeType: 'application/vnd.android.package-archive',
          compressor: 'APKCompressor',
          supportLevel: 'library',
        },
      ];

      const recommendation = EnhancedBrowserCapabilityDetector.getBatchProcessingRecommendation(formats);
      expect(recommendation.recommended).toBe(false);
      expect(recommendation.warnings).toContain('Multiple memory-intensive formats detected');
    });
  });

  describe('browser-specific behavior', () => {
    it('should handle Safari-specific limitations', () => {
      // Mock Safari browser info
      const { getBrowserInfo } = require('../browserSupport');
      (getBrowserInfo as jest.Mock).mockReturnValue({
        name: 'Safari',
        version: '14.0',
        majorVersion: 14,
        engine: 'WebKit',
        isMobile: false,
      });

      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'webm',
        mimeType: 'video/webm',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);
      expect(result.compatibilityWarnings.some(w => w.feature.includes('WebM'))).toBe(true);
    });

    it('should handle mobile device limitations', () => {
      // Mock mobile browser info
      const { getBrowserInfo } = require('../browserSupport');
      (getBrowserInfo as jest.Mock).mockReturnValue({
        name: 'Chrome',
        version: '91.0',
        majorVersion: 91,
        engine: 'Blink',
        isMobile: true,
      });

      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const result = EnhancedBrowserCapabilityDetector.getEnhancedCapabilities(formatInfo);
      expect(result.compatibilityWarnings.some(w => w.feature.includes('Mobile'))).toBe(true);
    });
  });
});