/**
 * Tests for graceful degradation utilities
 */

import { GracefulDegradationManager } from '../gracefulDegradation';
import type { FormatInfo } from '../../types';

// Mock dependencies
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
  },
}));

jest.mock('../browserSupport', () => ({
  detectBrowserFeatures: jest.fn(() => ({
    webWorkers: true,
    canvas: true,
    fileAPI: true,
    webAssembly: true,
    sharedArrayBuffer: true,
    webAudioAPI: true,
    mediaRecorder: true,
    compressionStreams: true,
  })),
  getBrowserInfo: jest.fn(() => ({
    name: 'Chrome',
    version: '91.0',
  })),
}));

describe('GracefulDegradationManager', () => {
  describe('Processing Recommendations', () => {
    it('should provide processing recommendation for image formats', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo, 1024 * 1024); // 1MB

      expect(recommendation.shouldProceed).toBe(true);
      expect(recommendation.strategy.canProcess).toBe(true);
      expect(recommendation.strategy.performanceImpact).toBeDefined();
      expect(recommendation.strategy.memoryImpact).toBeDefined();
    });

    it('should provide warnings for large files', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const largeFileSize = 100 * 1024 * 1024; // 100MB
      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo, largeFileSize);

      expect(recommendation.warnings.length).toBeGreaterThan(0);
      expect(recommendation.warnings.some(w => w.includes('Large file'))).toBe(true);
    });

    it('should handle TIFF format with library requirements', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'tiff',
        mimeType: 'image/tiff',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'library',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.strategy.performanceImpact).toBe('medium');
      expect(recommendation.strategy.memoryImpact).toBe('medium');
    });

    it('should handle video formats with MediaRecorder support', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.shouldProceed).toBe(true);
      expect(recommendation.strategy.method).toBeDefined();
    });

    it('should handle audio formats with Web Audio API', () => {
      const formatInfo: FormatInfo = {
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        compressor: 'WebAudioCompressor',
        supportLevel: 'native',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.shouldProceed).toBe(true);
      expect(recommendation.strategy.method).toBeDefined();
    });

    it('should handle document formats with library support', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.shouldProceed).toBe(true);
      expect(recommendation.strategy.performanceImpact).toBe('medium');
    });

    it('should handle archive formats with compression warnings', () => {
      const formatInfo: FormatInfo = {
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        compressor: 'APKCompressor',
        supportLevel: 'library',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.shouldProceed).toBe(true);
      expect(recommendation.strategy.limitations.some(l => l.includes('APK compression'))).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should estimate memory usage for different formats', () => {
      const imageFormat: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const fileSize = 10 * 1024 * 1024; // 10MB
      const memoryEstimate = GracefulDegradationManager.getMemoryUsageEstimate(imageFormat, fileSize);

      expect(memoryEstimate).toBeGreaterThan(fileSize);
      expect(memoryEstimate).toBeLessThan(fileSize * 5); // Should be reasonable multiplier
    });

    it('should recommend against processing very large files', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const veryLargeFile = 1024 * 1024 * 1024; // 1GB
      const shouldAllow = GracefulDegradationManager.shouldAllowProcessing(formatInfo, veryLargeFile);

      expect(shouldAllow).toBe(false);
    });

    it('should allow processing of reasonable file sizes', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const reasonableFile = 10 * 1024 * 1024; // 10MB
      const shouldAllow = GracefulDegradationManager.shouldAllowProcessing(formatInfo, reasonableFile);

      expect(shouldAllow).toBe(true);
    });
  });

  describe('Browser-Specific Handling', () => {
    it('should provide Safari-specific warnings for WebM', () => {
      // Mock Safari browser
      const { getBrowserInfo } = require('../browserSupport');
      getBrowserInfo.mockReturnValue({ name: 'Safari', version: '14.0' });

      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'webm',
        mimeType: 'video/webm',
        compressor: 'VideoCompressor',
        supportLevel: 'library',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.warnings.some(w => w.includes('Safari'))).toBe(true);
    });

    it('should handle limited SharedArrayBuffer support', () => {
      // Mock browser without SharedArrayBuffer
      const { detectBrowserFeatures } = require('../browserSupport');
      detectBrowserFeatures.mockReturnValue({
        webWorkers: true,
        canvas: true,
        fileAPI: true,
        webAssembly: true,
        sharedArrayBuffer: false, // Disabled
        webAudioAPI: true,
        mediaRecorder: true,
        compressionStreams: true,
      });

      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const recommendation = GracefulDegradationManager.getProcessingRecommendation(formatInfo);

      expect(recommendation.warnings.some(w => w.includes('SharedArrayBuffer'))).toBe(true);
    });
  });
});