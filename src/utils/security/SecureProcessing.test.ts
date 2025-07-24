/**
 * SecureProcessing tests
 * Tests for enhanced security features for multi-format compression
 */

import SecureProcessing from './SecureProcessing';
import NetworkMonitor from './NetworkMonitor';

// Mock NetworkMonitor
jest.mock('./NetworkMonitor', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isMonitoring: jest.fn(() => false),
  getSecurityReport: jest.fn(() => ({
    isSecure: true,
    violations: [],
    recommendations: [],
    libraryActivity: [],
  })),
}));

describe('SecureProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    SecureProcessing.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      SecureProcessing.initialize();
      
      expect(NetworkMonitor.start).toHaveBeenCalledWith({
        allowedDomains: [],
        logBlocked: false,
      });
      expect(SecureProcessing.isSecureProcessingActive()).toBe(true);
    });

    it('should initialize with custom options', () => {
      SecureProcessing.initialize({
        monitorNetwork: true,
        allowedDomains: ['example.com'],
        logBlocked: false,
        validateLibraries: true,
      });
      
      expect(NetworkMonitor.start).toHaveBeenCalledWith({
        allowedDomains: ['example.com'],
        logBlocked: false,
      });
    });

    it('should not reinitialize if already initialized', () => {
      SecureProcessing.initialize();
      SecureProcessing.initialize();
      
      expect(NetworkMonitor.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('library validation', () => {
    beforeEach(() => {
      SecureProcessing.initialize();
    });

    it('should validate compression libraries', () => {
      const results = SecureProcessing.validateCompressionLibraries();
      
      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThan(0);
      
      // Check that all expected libraries are validated
      expect(results.has('pdf-lib')).toBe(true);
      expect(results.has('pizzip')).toBe(true);
      expect(results.has('jszip')).toBe(true);
      expect(results.has('lamejs')).toBe(true);
      expect(results.has('wav-encoder')).toBe(true);
      expect(results.has('utif')).toBe(true);
    });

    it('should return validation result for specific library', () => {
      SecureProcessing.validateCompressionLibraries();
      
      const result = SecureProcessing.getLibraryValidationResult('pdf-lib');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isSecure');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('blockedFeatures');
    });

    it('should check if library is secure', () => {
      SecureProcessing.validateCompressionLibraries();
      
      // Most libraries should be considered secure in test environment
      const isSecure = SecureProcessing.isLibrarySecure('pdf-lib');
      expect(typeof isSecure).toBe('boolean');
    });
  });

  describe('privacy compliance validation', () => {
    beforeEach(() => {
      SecureProcessing.initialize();
    });

    it('should validate privacy compliance for PDF processing', () => {
      const result = SecureProcessing.validatePrivacyCompliance('pdf', ['pdf-lib']);
      
      expect(result).toHaveProperty('isCompliant');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should validate privacy compliance for audio processing', () => {
      const result = SecureProcessing.validatePrivacyCompliance('mp3', ['lamejs', 'wav-encoder']);
      
      expect(result).toHaveProperty('isCompliant');
      expect(result.recommendations).toContain('Clear audio buffer data after processing');
    });

    it('should validate privacy compliance for document processing', () => {
      const result = SecureProcessing.validatePrivacyCompliance('docx', ['pizzip', 'docx']);
      
      expect(result).toHaveProperty('isCompliant');
      expect(result.recommendations).toContain('Validate ZIP structure to prevent path traversal');
    });

    it('should validate privacy compliance for APK processing', () => {
      const result = SecureProcessing.validatePrivacyCompliance('apk', ['jszip']);
      
      expect(result).toHaveProperty('isCompliant');
      expect(result.recommendations).toContain('Validate APK signature integrity');
    });
  });

  describe('secure memory disposal', () => {
    beforeEach(() => {
      SecureProcessing.initialize();
    });

    it('should handle ArrayBuffer disposal', () => {
      const buffer = new ArrayBuffer(1024);
      const view = new Uint8Array(buffer);
      view.fill(255); // Fill with non-zero data
      
      SecureProcessing.secureMemoryDisposal(buffer, 'document');
      
      // Check that buffer has been cleared
      expect(view[0]).toBe(0);
      expect(view[100]).toBe(0);
      expect(view[1023]).toBe(0);
    });

    it('should handle AudioBuffer disposal', () => {
      // Mock AudioBuffer
      const channelData1 = new Float32Array(1024);
      const channelData2 = new Float32Array(1024);
      channelData1.fill(0.5);
      channelData2.fill(0.5);
      
      const mockAudioBuffer = {
        numberOfChannels: 2,
        getChannelData: jest.fn()
          .mockReturnValueOnce(channelData1)
          .mockReturnValueOnce(channelData2),
      } as any;

      SecureProcessing.secureMemoryDisposal(mockAudioBuffer, 'audio');
      
      expect(mockAudioBuffer.getChannelData).toHaveBeenCalledWith(0);
      expect(mockAudioBuffer.getChannelData).toHaveBeenCalledWith(1);
      
      // Check that data was cleared
      expect(channelData1[0]).toBe(0);
      expect(channelData2[0]).toBe(0);
    });

    it('should handle ImageData disposal', () => {
      // Mock ImageData with a proper fill method
      const data = new Uint8ClampedArray(1024);
      data.fill(128);
      
      const mockImageData = {
        data: data,
      } as ImageData;
      
      SecureProcessing.secureMemoryDisposal(mockImageData, 'image');
      
      // Check that data has been cleared
      expect(mockImageData.data[0]).toBe(0);
      expect(mockImageData.data[100]).toBe(0);
    });

    it('should handle null data gracefully', () => {
      expect(() => {
        SecureProcessing.secureMemoryDisposal(null, 'general');
      }).not.toThrow();
    });

    it('should handle different data types', () => {
      const blob = new Blob(['test data']);
      
      // Should not throw, but may log warnings for unsupported types in test environment
      SecureProcessing.secureMemoryDisposal(blob, 'document');
      
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe('browser support checking', () => {
    it('should check browser support for secure processing', () => {
      const support = SecureProcessing.checkBrowserSupport();
      
      expect(support).toHaveProperty('webWorkers');
      expect(support).toHaveProperty('fileReader');
      expect(support).toHaveProperty('canvas');
      expect(support).toHaveProperty('webAssembly');
      expect(support).toHaveProperty('indexedDB');
      expect(support).toHaveProperty('overall');
      
      expect(typeof support.overall).toBe('boolean');
    });
  });

  describe('file security validation', () => {
    beforeEach(() => {
      SecureProcessing.initialize();
    });

    it('should validate file can be processed securely', () => {
      const smallFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const canProcess = SecureProcessing.canProcessSecurely(smallFile);
      
      expect(typeof canProcess).toBe('boolean');
    });

    it('should reject very large files', () => {
      // Mock a very large file
      const largeFile = {
        size: 600 * 1024 * 1024, // 600MB
        name: 'large.pdf',
        type: 'application/pdf',
      } as File;
      
      const canProcess = SecureProcessing.canProcessSecurely(largeFile);
      expect(canProcess).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up properly', () => {
      SecureProcessing.initialize();
      expect(SecureProcessing.isSecureProcessingActive()).toBe(true);
      
      SecureProcessing.cleanup();
      
      expect(NetworkMonitor.stop).toHaveBeenCalled();
      expect(SecureProcessing.isSecureProcessingActive()).toBe(false);
    });
  });

  describe('legacy clearData method', () => {
    it('should work with legacy clearData method', () => {
      const buffer = new ArrayBuffer(1024);
      const view = new Uint8Array(buffer);
      view.fill(255);
      
      SecureProcessing.clearData(buffer);
      
      expect(view[0]).toBe(0);
    });
  });
});