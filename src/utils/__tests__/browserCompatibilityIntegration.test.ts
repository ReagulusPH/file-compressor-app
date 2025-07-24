/**
 * Integration tests for browser compatibility and capability detection
 */

import { BrowserCompatibilityService } from '../../services/BrowserCompatibilityService';
import type { FormatInfo } from '../../types';

// Mock the browser support utilities for consistent testing
jest.mock('../browserSupport', () => ({
  detectBrowserFeatures: () => ({
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
  }),
  detectFormatCapabilities: () => ({
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
  }),
  getBrowserInfo: () => ({
    name: 'Chrome',
    version: '91.0',
    majorVersion: 91,
    engine: 'Blink',
    isMobile: false,
  }),
  checkBrowserCompatibility: () => ({
    isCompatible: true,
    missingFeatures: [],
    partialSupport: false,
  }),
}));

describe('Browser Compatibility Integration', () => {
  let compatibilityService: BrowserCompatibilityService;

  beforeEach(() => {
    compatibilityService = BrowserCompatibilityService.getInstance();
    compatibilityService.reset();
  });

  describe('Format Compatibility Reports', () => {
    it('should generate compatibility report for TIFF format', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'tiff',
        mimeType: 'image/tiff',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'library',
      };

      const report = compatibilityService.getCompatibilityReport(formatInfo);

      expect(report).toHaveProperty('browserInfo');
      expect(report).toHaveProperty('formatSupport');
      expect(report).toHaveProperty('processingRecommendation');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('memoryEstimate');

      expect(report.browserInfo.name).toBe('Chrome');
      expect(['library', 'fallback']).toContain(report.formatSupport.supportLevel);
    });

    it('should generate compatibility report for MP3 format', () => {
      const formatInfo: FormatInfo = {
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        compressor: 'WebAudioCompressor',
        supportLevel: 'native',
      };

      const report = compatibilityService.getCompatibilityReport(formatInfo);

      expect(report.browserInfo.name).toBe('Chrome');
      expect(report.formatSupport.supportLevel).toBe('native');
      expect(report.warnings).toBeDefined();
    });

    it('should generate compatibility report for PDF format', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const report = compatibilityService.getCompatibilityReport(formatInfo);

      expect(report.browserInfo.name).toBe('Chrome');
      expect(report.formatSupport.supportLevel).toBe('library');
    });

    it('should generate compatibility report for APK format', () => {
      const formatInfo: FormatInfo = {
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        compressor: 'APKCompressor',
        supportLevel: 'library',
      };

      const report = compatibilityService.getCompatibilityReport(formatInfo);

      expect(report.browserInfo.name).toBe('Chrome');
      expect(report.formatSupport.supportLevel).toBe('library');
      expect(report.warnings.length).toBeGreaterThan(0); // APK should have warnings
    });
  });

  describe('Batch Compatibility', () => {
    it('should check batch compatibility for multiple formats', () => {
      const formats: FormatInfo[] = [
        {
          type: 'image',
          format: 'jpeg',
          mimeType: 'image/jpeg',
          compressor: 'CanvasImageCompressor',
          supportLevel: 'native',
        },
        {
          type: 'audio',
          format: 'mp3',
          mimeType: 'audio/mpeg',
          compressor: 'WebAudioCompressor',
          supportLevel: 'native',
        },
      ];

      const result = compatibilityService.checkBatchCompatibility(formats);

      expect(result).toHaveProperty('overallCompatibility');
      expect(result).toHaveProperty('formatResults');
      expect(result).toHaveProperty('globalWarnings');
      expect(result).toHaveProperty('recommendations');

      expect(result.formatResults.size).toBe(2);
      expect(['full', 'partial', 'limited', 'unsupported']).toContain(result.overallCompatibility);
    });

    it('should provide recommendations for memory-intensive formats', () => {
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

      const result = compatibilityService.checkBatchCompatibility(formats);

      expect(result.globalWarnings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Processing Method Recommendations', () => {
    it('should recommend native processing for supported formats', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const method = compatibilityService.getRecommendedProcessingMethod(formatInfo);
      expect(typeof method).toBe('string');
      expect(method.length).toBeGreaterThan(0);
    });

    it('should recommend library processing for formats requiring libraries', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const method = compatibilityService.getRecommendedProcessingMethod(formatInfo);
      expect(typeof method).toBe('string');
      expect(method.length).toBeGreaterThan(0);
    });
  });

  describe('Format Support Detection', () => {
    it('should detect if a format is supported', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const isSupported = compatibilityService.isFormatSupported(formatInfo);
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('Browser Feature Summary', () => {
    it('should provide comprehensive browser feature summary', () => {
      const summary = compatibilityService.getBrowserFeatureSummary();

      expect(summary).toHaveProperty('features');
      expect(summary).toHaveProperty('formatCapabilities');
      expect(summary).toHaveProperty('browserInfo');
      expect(summary).toHaveProperty('compatibility');

      expect(summary.browserInfo.name).toBe('Chrome');
      expect(summary.features.canvas).toBe(true);
      expect(summary.formatCapabilities.image.canvas).toBe(true);
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide performance recommendations for large files', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const recommendations = compatibilityService.getPerformanceRecommendations(
        formatInfo,
        100 * 1024 * 1024 // 100MB
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should provide different recommendations for small files', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const recommendations = compatibilityService.getPerformanceRecommendations(
        formatInfo,
        1024 * 1024 // 1MB
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});