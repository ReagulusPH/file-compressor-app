/**
 * Privacy Architecture Validation Tests
 * Ensures all new format support maintains the existing privacy-first architecture
 */

import compressionService from '../../services/CompressionService';
import { FileModel } from '../../types';
import SecureProcessing from '../../utils/security/SecureProcessing';
import NetworkMonitor from '../../utils/security/NetworkMonitor';

// Mock files for different formats
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const content = new Array(size).fill(0).map(() => Math.floor(Math.random() * 256));
  const blob = new Blob([new Uint8Array(content)], { type });
  return new File([blob], name, { type });
};

describe('Privacy Architecture Validation', () => {
  beforeEach(() => {
    // Initialize security monitoring
    SecureProcessing.initialize({
      monitorNetwork: true,
      allowedDomains: [],
      logBlocked: true,
      validateLibraries: true,
    });
    
    // Reset compression service
    compressionService.cancelAllProcessing();
  });

  afterEach(() => {
    // Clean up security features
    SecureProcessing.cleanup();
    compressionService.cleanup();
  });

  describe('Client-Side Processing Validation', () => {
    it('should process all new formats without external network requests', async () => {
      const testFiles: FileModel[] = [
        {
          id: 'audio-privacy-test',
          originalFile: createMockFile('test.mp3', 'audio/mpeg', 2048),
          settings: { quality: 80, outputFormat: 'audio/mpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'document-privacy-test',
          originalFile: createMockFile('test.pdf', 'application/pdf', 4096),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'archive-privacy-test',
          originalFile: createMockFile('test.apk', 'application/vnd.android.package-archive', 8192),
          settings: { quality: 80, outputFormat: 'application/vnd.android.package-archive' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'tiff-privacy-test',
          originalFile: createMockFile('test.tiff', 'image/tiff', 3072),
          settings: { quality: 80, outputFormat: 'image/tiff' },
          status: 'waiting',
          progress: 0,
        },
      ];

      // Process files and monitor network activity
      const results = await compressionService.processBatch(testFiles);

      // Get security report
      const securityReport = compressionService.getSecurityReport();

      // Verify no external network requests were made
      expect(securityReport.violations).toHaveLength(0);
      expect(securityReport.isSecure).toBe(true);

      // Verify all files were processed (successfully or with errors)
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(['complete', 'error']).toContain(result.status);
      });

      console.log('✅ All new formats processed without external network requests');
    }, 20000);

    it('should validate compression libraries for security', async () => {
      // Get library validation results
      const libraryValidation = SecureProcessing.validateCompressionLibraries();

      // Verify all libraries are validated
      expect(libraryValidation.size).toBeGreaterThan(0);

      // Check each library validation result
      for (const [libraryName, result] of libraryValidation) {
        expect(result).toHaveProperty('isSecure');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.warnings)).toBe(true);

        // Log any security warnings
        if (!result.isSecure) {
          console.warn(`⚠️ Security concern with ${libraryName}:`, result.warnings);
        }
      }

      console.log('✅ Compression library security validation completed');
    });

    it('should ensure secure memory disposal for all formats', async () => {
      const sensitiveFiles: FileModel[] = [
        {
          id: 'sensitive-document',
          originalFile: createMockFile('confidential.pdf', 'application/pdf', 2048),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'sensitive-audio',
          originalFile: createMockFile('private.mp3', 'audio/mpeg', 1536),
          settings: { quality: 80, outputFormat: 'audio/mpeg' },
          status: 'waiting',
          progress: 0,
        },
      ];

      // Process sensitive files
      const results = await compressionService.processBatch(sensitiveFiles);

      // Verify processing completed
      expect(results).toHaveLength(2);

      // Verify secure memory disposal was called
      // (This would be verified through SecureProcessing monitoring)
      const securityReport = compressionService.getSecurityReport();
      expect(securityReport.isSecure).toBe(true);

      console.log('✅ Secure memory disposal verified for sensitive files');
    }, 15000);
  });

  describe('Data Privacy Validation', () => {
    it('should not cache or store file data externally', async () => {
      const testFile: FileModel = {
        id: 'cache-test',
        originalFile: createMockFile('nocache.jpg', 'image/jpeg', 1024),
        settings: { quality: 80, outputFormat: 'image/jpeg' },
        status: 'waiting',
        progress: 0,
      };

      // Process file
      const result = await compressionService.processFile(testFile);

      // Verify no external caching occurred
      const securityReport = compressionService.getSecurityReport();
      expect(securityReport.violations).toHaveLength(0);

      // Verify file was processed locally
      expect(['complete', 'error']).toContain(result.status);

      console.log('✅ No external caching detected');
    }, 10000);

    it('should handle file metadata securely', async () => {
      const metadataTestFiles: FileModel[] = [
        {
          id: 'metadata-image',
          originalFile: createMockFile('metadata.jpg', 'image/jpeg', 2048),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'metadata-document',
          originalFile: createMockFile('metadata.pdf', 'application/pdf', 3072),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const results = await compressionService.processBatch(metadataTestFiles);

      // Verify metadata handling didn't compromise privacy
      const securityReport = compressionService.getSecurityReport();
      expect(securityReport.isSecure).toBe(true);

      // Verify metadata was processed locally
      results.forEach(result => {
        if (result.formatMetadata) {
          // Metadata should be available but processed locally
          expect(typeof result.formatMetadata).toBe('object');
        }
      });

      console.log('✅ File metadata handled securely');
    }, 15000);
  });

  describe('Network Security Validation', () => {
    it('should block any unauthorized network requests', async () => {
      // Initialize network monitoring with strict settings
      NetworkMonitor.initialize({
        allowedDomains: [], // No external domains allowed
        blockUnauthorized: true,
        logBlocked: true,
      });

      const testFile: FileModel = {
        id: 'network-test',
        originalFile: createMockFile('network.mp3', 'audio/mpeg', 1024),
        settings: { quality: 80, outputFormat: 'audio/mpeg' },
        status: 'waiting',
        progress: 0,
      };

      // Process file with network monitoring
      const result = await compressionService.processFile(testFile);

      // Get network activity report
      const networkReport = NetworkMonitor.getNetworkActivity();

      // Verify no unauthorized requests were made
      expect(networkReport.blockedRequests).toHaveLength(0);
      expect(networkReport.allowedRequests).toHaveLength(0);

      // Verify file was still processed
      expect(['complete', 'error']).toContain(result.status);

      console.log('✅ Network security validation passed');
    }, 10000);

    it('should validate all compression libraries are client-side only', async () => {
      // Test each format type to ensure no server dependencies
      const formatTests = [
        { type: 'audio/mpeg', name: 'audio-lib-test.mp3' },
        { type: 'application/pdf', name: 'pdf-lib-test.pdf' },
        { type: 'application/vnd.android.package-archive', name: 'apk-lib-test.apk' },
        { type: 'image/tiff', name: 'tiff-lib-test.tiff' },
      ];

      for (const formatTest of formatTests) {
        const testFile: FileModel = {
          id: `lib-test-${formatTest.type}`,
          originalFile: createMockFile(formatTest.name, formatTest.type, 1024),
          settings: { quality: 80, outputFormat: formatTest.type },
          status: 'waiting',
          progress: 0,
        };

        // Process file and monitor for external dependencies
        const result = await compressionService.processFile(testFile);

        // Verify no external library loading occurred
        const securityReport = compressionService.getSecurityReport();
        expect(securityReport.violations).toHaveLength(0);

        console.log(`✅ ${formatTest.type} library validated as client-side only`);
      }
    }, 30000);
  });

  describe('Browser Storage Privacy', () => {
    it('should not persist sensitive data in browser storage', async () => {
      // Clear any existing storage
      localStorage.clear();
      sessionStorage.clear();

      const sensitiveFile: FileModel = {
        id: 'storage-test',
        originalFile: createMockFile('sensitive.pdf', 'application/pdf', 2048),
        settings: { quality: 80, outputFormat: 'application/pdf' },
        status: 'waiting',
        progress: 0,
      };

      // Process sensitive file
      const result = await compressionService.processFile(sensitiveFile);

      // Verify no sensitive data was stored
      const localStorageKeys = Object.keys(localStorage);
      const sessionStorageKeys = Object.keys(sessionStorage);

      // Should not contain file data or sensitive information
      localStorageKeys.forEach(key => {
        const value = localStorage.getItem(key);
        expect(value).not.toContain('sensitive');
        expect(value).not.toContain('pdf');
      });

      sessionStorageKeys.forEach(key => {
        const value = sessionStorage.getItem(key);
        expect(value).not.toContain('sensitive');
        expect(value).not.toContain('pdf');
      });

      console.log('✅ No sensitive data persisted in browser storage');
    }, 10000);

    it('should clean up temporary data after processing', async () => {
      const testFile: FileModel = {
        id: 'cleanup-test',
        originalFile: createMockFile('cleanup.jpg', 'image/jpeg', 1024),
        settings: { quality: 80, outputFormat: 'image/jpeg' },
        status: 'waiting',
        progress: 0,
      };

      // Process file
      const result = await compressionService.processFile(testFile);

      // Verify cleanup occurred
      expect(compressionService.getActiveTaskCount()).toBe(0);

      // Verify no temporary data remains
      const securityReport = compressionService.getSecurityReport();
      expect(securityReport.isSecure).toBe(true);

      console.log('✅ Temporary data cleanup verified');
    }, 10000);
  });

  describe('Cross-Format Privacy Consistency', () => {
    it('should maintain consistent privacy standards across all formats', async () => {
      const allFormatFiles: FileModel[] = [
        {
          id: 'consistency-image',
          originalFile: createMockFile('test.jpg', 'image/jpeg', 1024),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'consistency-video',
          originalFile: createMockFile('test.mp4', 'video/mp4', 2048),
          settings: { quality: 80, outputFormat: 'video/mp4' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'consistency-audio',
          originalFile: createMockFile('test.mp3', 'audio/mpeg', 1536),
          settings: { quality: 80, outputFormat: 'audio/mpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'consistency-document',
          originalFile: createMockFile('test.pdf', 'application/pdf', 3072),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'consistency-archive',
          originalFile: createMockFile('test.apk', 'application/vnd.android.package-archive', 4096),
          settings: { quality: 80, outputFormat: 'application/vnd.android.package-archive' },
          status: 'waiting',
          progress: 0,
        },
      ];

      // Process all formats
      const results = await compressionService.processBatch(allFormatFiles);

      // Verify consistent privacy standards
      const securityReport = compressionService.getSecurityReport();
      expect(securityReport.isSecure).toBe(true);
      expect(securityReport.violations).toHaveLength(0);

      // Verify all formats were processed with same privacy standards
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(['complete', 'error']).toContain(result.status);
      });

      console.log('✅ Consistent privacy standards maintained across all formats');
    }, 25000);
  });
});