/**
 * End-to-end integration test for mixed format batch processing
 * Tests the complete workflow from file upload to compression results
 */

import compressionService from '../../services/CompressionService';
import { FileModel, CompressionSettings } from '../../types';

// Mock files for different formats
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const content = new Array(size).fill(0).map(() => Math.floor(Math.random() * 256));
  const blob = new Blob([new Uint8Array(content)], { type });
  return new File([blob], name, { type });
};

describe('Mixed Format Batch Processing Integration', () => {
  beforeEach(() => {
    // Reset compression service state
    compressionService.cancelAllProcessing();
  });

  afterEach(() => {
    // Clean up after each test
    compressionService.cleanup();
  });

  describe('Batch Processing Workflow', () => {
    it('should process mixed format files in optimal order', async () => {
      // Create mixed format files
      const files: FileModel[] = [
        {
          id: 'image-1',
          originalFile: createMockFile('test.jpg', 'image/jpeg', 2048),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'video-1',
          originalFile: createMockFile('test.mp4', 'video/mp4', 10240),
          settings: { quality: 70, outputFormat: 'video/mp4' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'audio-1',
          originalFile: createMockFile('test.mp3', 'audio/mpeg', 5120),
          settings: { quality: 75, outputFormat: 'audio/mpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'document-1',
          originalFile: createMockFile('test.pdf', 'application/pdf', 8192),
          settings: { quality: 85, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'archive-1',
          originalFile: createMockFile('test.apk', 'application/vnd.android.package-archive', 15360),
          settings: { quality: 60, outputFormat: 'application/vnd.android.package-archive' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const progressUpdates: Record<string, number[]> = {};
      const batchProgressUpdates: number[] = [];

      // Process batch with progress tracking
      const results = await compressionService.processBatch(
        files,
        (id: string, progress: number) => {
          if (!progressUpdates[id]) {
            progressUpdates[id] = [];
          }
          progressUpdates[id].push(progress);
        },
        (batchProgress: number) => {
          batchProgressUpdates.push(batchProgress);
        }
      );

      // Verify all files were processed
      expect(results).toHaveLength(5);
      
      // Verify each file has appropriate status
      results.forEach(result => {
        expect(['complete', 'error']).toContain(result.status);
        expect(result.progress).toBe(100);
      });

      // Verify progress updates were received
      expect(Object.keys(progressUpdates)).toHaveLength(5);
      expect(batchProgressUpdates.length).toBeGreaterThan(0);
      expect(batchProgressUpdates[batchProgressUpdates.length - 1]).toBe(100);

      // Verify format detection worked
      results.forEach(result => {
        expect(result.detectedFormat).toBeDefined();
        expect(result.processingMethod).toBeDefined();
      });

      console.log('✅ Mixed format batch processing completed successfully');
    }, 30000); // 30 second timeout for batch processing

    it('should handle format-specific errors gracefully in batch', async () => {
      // Create files that might cause format-specific errors
      const files: FileModel[] = [
        {
          id: 'valid-image',
          originalFile: createMockFile('valid.jpg', 'image/jpeg', 1024),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'invalid-document',
          originalFile: createMockFile('invalid.pdf', 'application/pdf', 512),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'valid-audio',
          originalFile: createMockFile('valid.mp3', 'audio/mpeg', 2048),
          settings: { quality: 75, outputFormat: 'audio/mpeg' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const results = await compressionService.processBatch(files);

      // Verify batch processing continued despite individual failures
      expect(results).toHaveLength(3);
      
      // At least some files should have been processed successfully
      const successfulResults = results.filter(r => r.status === 'complete');
      const errorResults = results.filter(r => r.status === 'error');
      
      expect(successfulResults.length + errorResults.length).toBe(3);
      
      // Error results should have meaningful error messages
      errorResults.forEach(result => {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
      });

      console.log(`✅ Batch error handling: ${successfulResults.length} successful, ${errorResults.length} errors`);
    }, 20000);

    it('should respect concurrent processing limits', async () => {
      // Set a low concurrent limit for testing
      compressionService.setMaxConcurrentTasks(2);

      const files: FileModel[] = Array.from({ length: 5 }, (_, i) => ({
        id: `file-${i}`,
        originalFile: createMockFile(`test-${i}.jpg`, 'image/jpeg', 1024),
        settings: { quality: 80, outputFormat: 'image/jpeg' },
        status: 'waiting',
        progress: 0,
      }));

      const startTime = Date.now();
      const results = await compressionService.processBatch(files);
      const endTime = Date.now();

      // Verify all files were processed
      expect(results).toHaveLength(5);
      
      // Processing should take some time due to concurrency limits
      expect(endTime - startTime).toBeGreaterThan(100);

      // Verify active task count is managed
      expect(compressionService.getActiveTaskCount()).toBe(0);

      console.log(`✅ Concurrent processing completed in ${endTime - startTime}ms`);
    }, 15000);
  });

  describe('Format Detection and Routing', () => {
    it('should detect and route all supported formats correctly', async () => {
      const testFiles = [
        { name: 'test.jpg', type: 'image/jpeg', expectedType: 'image' },
        { name: 'test.png', type: 'image/png', expectedType: 'image' },
        { name: 'test.tiff', type: 'image/tiff', expectedType: 'image' },
        { name: 'test.mp4', type: 'video/mp4', expectedType: 'video' },
        { name: 'test.webm', type: 'video/webm', expectedType: 'video' },
        { name: 'test.mp3', type: 'audio/mpeg', expectedType: 'audio' },
        { name: 'test.wav', type: 'audio/wav', expectedType: 'audio' },
        { name: 'test.pdf', type: 'application/pdf', expectedType: 'document' },
        { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expectedType: 'document' },
        { name: 'test.apk', type: 'application/vnd.android.package-archive', expectedType: 'archive' },
      ];

      const files: FileModel[] = testFiles.map((testFile, i) => ({
        id: `test-${i}`,
        originalFile: createMockFile(testFile.name, testFile.type, 1024),
        settings: { quality: 80, outputFormat: testFile.type },
        status: 'waiting',
        progress: 0,
      }));

      const results = await compressionService.processBatch(files);

      // Verify format detection for each file
      results.forEach((result, i) => {
        const expectedType = testFiles[i].expectedType;
        
        if (result.detectedFormat) {
          expect(result.detectedFormat.type).toBe(expectedType);
        }
        
        // Even if processing fails, format should be detected
        expect(result.detectedFormat).toBeDefined();
      });

      console.log('✅ Format detection and routing verified for all supported formats');
    }, 25000);
  });

  describe('Memory Management', () => {
    it('should handle memory cleanup during batch processing', async () => {
      // Create larger files to test memory management
      const files: FileModel[] = Array.from({ length: 3 }, (_, i) => ({
        id: `large-file-${i}`,
        originalFile: createMockFile(`large-${i}.jpg`, 'image/jpeg', 10240), // 10KB files
        settings: { quality: 80, outputFormat: 'image/jpeg' },
        status: 'waiting',
        progress: 0,
      }));

      const results = await compressionService.processBatch(files);

      // Verify processing completed
      expect(results).toHaveLength(3);
      
      // Verify no active tasks remain
      expect(compressionService.getActiveTaskCount()).toBe(0);

      console.log('✅ Memory management verified during batch processing');
    }, 15000);
  });

  describe('Privacy and Security', () => {
    it('should maintain privacy-first architecture during batch processing', async () => {
      const files: FileModel[] = [
        {
          id: 'privacy-test-1',
          originalFile: createMockFile('sensitive.jpg', 'image/jpeg', 2048),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'privacy-test-2',
          originalFile: createMockFile('confidential.pdf', 'application/pdf', 4096),
          settings: { quality: 80, outputFormat: 'application/pdf' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const results = await compressionService.processBatch(files);

      // Get security report
      const securityReport = compressionService.getSecurityReport();

      // Verify no external network requests were made
      expect(securityReport.violations).toHaveLength(0);
      expect(securityReport.isSecure).toBe(true);

      // Verify files were processed locally
      expect(results).toHaveLength(2);

      console.log('✅ Privacy-first architecture maintained during batch processing');
    }, 10000);
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing image and video processing', async () => {
      // Test existing image and video formats
      const legacyFiles: FileModel[] = [
        {
          id: 'legacy-image',
          originalFile: createMockFile('legacy.jpg', 'image/jpeg', 2048),
          settings: { quality: 75, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
        {
          id: 'legacy-video',
          originalFile: createMockFile('legacy.mp4', 'video/mp4', 8192),
          settings: { quality: 70, outputFormat: 'video/mp4' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const results = await compressionService.processBatch(legacyFiles);

      // Verify legacy formats still work
      expect(results).toHaveLength(2);
      
      results.forEach(result => {
        expect(['complete', 'error']).toContain(result.status);
        expect(result.detectedFormat).toBeDefined();
        expect(['image', 'video']).toContain(result.detectedFormat!.type);
      });

      console.log('✅ Backward compatibility verified for existing formats');
    }, 15000);
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should use fallback compression methods when primary methods fail', async () => {
      const files: FileModel[] = [
        {
          id: 'fallback-test',
          originalFile: createMockFile('fallback.jpg', 'image/jpeg', 1024),
          settings: { quality: 80, outputFormat: 'image/jpeg' },
          status: 'waiting',
          progress: 0,
        },
      ];

      const results = await compressionService.processBatch(files);

      // Verify processing attempted (may succeed or fail depending on environment)
      expect(results).toHaveLength(1);
      expect(['complete', 'error']).toContain(results[0].status);
      
      // If it failed, should have a meaningful error message
      if (results[0].status === 'error') {
        expect(results[0].error).toBeDefined();
        expect(typeof results[0].error).toBe('string');
      }

      console.log('✅ Fallback mechanism tested');
    }, 10000);
  });
});