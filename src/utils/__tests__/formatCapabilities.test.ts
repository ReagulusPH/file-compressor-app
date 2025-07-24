/**
 * Tests for format capabilities detection
 */

import { FormatCapabilityDetector } from '../formatCapabilities';
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
  })),
}));

describe('FormatCapabilityDetector', () => {
  beforeEach(() => {
    // Reset the detector before each test
    FormatCapabilityDetector.initialize();
  });

  describe('Image Format Support', () => {
    it('should detect native support for JPEG', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('native');
      expect(support.primaryMethod).toBe('canvas');
    });

    it('should detect library support for TIFF', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'tiff',
        mimeType: 'image/tiff',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'library',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('library');
      expect(support.limitations).toContain('Requires JavaScript library for TIFF processing');
      expect(support.fallbackMethods).toContain('tiff.js library');
    });
  });

  describe('Video Format Support', () => {
    it('should detect native support for MP4 with MediaRecorder', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'mp4',
        mimeType: 'video/mp4',
        compressor: 'WebCodecsVideoCompressor',
        supportLevel: 'native',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('native');
      expect(support.primaryMethod).toBe('mediaRecorder');
      expect(support.fallbackMethods).toContain('FFmpeg.js library');
    });
  });

  describe('Audio Format Support', () => {
    it('should detect native support for MP3 with Web Audio API', () => {
      const formatInfo: FormatInfo = {
        type: 'audio',
        format: 'mp3',
        mimeType: 'audio/mpeg',
        compressor: 'WebAudioCompressor',
        supportLevel: 'native',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('native');
      expect(support.primaryMethod).toBe('webAudio');
      expect(support.fallbackMethods).toContain('lamejs library');
    });
  });

  describe('Document Format Support', () => {
    it('should detect library support for PDF', () => {
      const formatInfo: FormatInfo = {
        type: 'document',
        format: 'pdf',
        mimeType: 'application/pdf',
        compressor: 'PDFCompressor',
        supportLevel: 'library',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('library');
      expect(support.fallbackMethods).toContain('pdf-lib');
    });
  });

  describe('Archive Format Support', () => {
    it('should detect library support for APK', () => {
      const formatInfo: FormatInfo = {
        type: 'archive',
        format: 'apk',
        mimeType: 'application/vnd.android.package-archive',
        compressor: 'APKCompressor',
        supportLevel: 'library',
      };

      const support = FormatCapabilityDetector.getFormatSupport(formatInfo);

      expect(support.isSupported).toBe(true);
      expect(support.supportLevel).toBe('library');
      expect(support.limitations).toContain('APK compression may affect app functionality');
      expect(support.recommendations).toContain('Test compressed APK thoroughly before distribution');
    });
  });

  describe('Compatibility Warnings', () => {
    it('should generate warnings for unsupported formats', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'unsupported',
        mimeType: 'image/unsupported',
        compressor: 'None',
        supportLevel: 'library',
      };

      // Mock unsupported format
      jest.spyOn(FormatCapabilityDetector, 'getFormatSupport').mockReturnValue({
        isSupported: false,
        supportLevel: 'unsupported',
        primaryMethod: 'none',
        fallbackMethods: [],
        limitations: ['Format not supported'],
        recommendations: ['Use a supported format'],
      });

      const warnings = FormatCapabilityDetector.getCompatibilityWarnings(formatInfo);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('unsupported');
      expect(warnings[0].feature).toContain('UNSUPPORTED');
    });

    it('should generate warnings for limited support', () => {
      const formatInfo: FormatInfo = {
        type: 'video',
        format: 'webm',
        mimeType: 'video/webm',
        compressor: 'VideoCompressor',
        supportLevel: 'library',
      };

      // Mock limited support
      jest.spyOn(FormatCapabilityDetector, 'getFormatSupport').mockReturnValue({
        isSupported: true,
        supportLevel: 'library',
        primaryMethod: 'library',
        fallbackMethods: ['FFmpeg.js'],
        limitations: ['WebM has limited browser support'],
        recommendations: ['Consider using MP4 format'],
      });

      const warnings = FormatCapabilityDetector.getCompatibilityWarnings(formatInfo);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('limited');
      expect(warnings[0].details).toContain('WebM has limited browser support');
    });
  });

  describe('Method Recommendations', () => {
    it('should recommend the primary method for a format', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const method = FormatCapabilityDetector.getRecommendedMethod(formatInfo);
      expect(method).toBe('canvas');
    });

    it('should check if format is supported', () => {
      const formatInfo: FormatInfo = {
        type: 'image',
        format: 'jpeg',
        mimeType: 'image/jpeg',
        compressor: 'CanvasImageCompressor',
        supportLevel: 'native',
      };

      const isSupported = FormatCapabilityDetector.isFormatSupported(formatInfo);
      expect(isSupported).toBe(true);
    });
  });
});