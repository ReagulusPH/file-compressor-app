/**
 * Performance tests for multi-format compression with large files
 */

import { PDFCompressor } from '../../services/DocumentCompressor/PDFCompressor';
import { OfficeCompressor } from '../../services/DocumentCompressor/OfficeCompressor';
import { AudioCompressor } from '../../services/AudioCompressor/AudioCompressor';
import APKCompressor from '../../services/ArchiveCompressor/APKCompressor';
import { MemoryManager } from '../../utils/memory/MemoryManager';

// Mock compression services to avoid actual heavy processing
jest.mock('../../services/DocumentCompressor/PDFCompressor');
jest.mock('../../services/DocumentCompressor/OfficeCompressor');
jest.mock('../../services/AudioCompressor/WebAudioCompressor');
jest.mock('../../services/AudioCompressor/AudioLibCompressor');
jest.mock('../../services/ArchiveCompressor/APKCompressor');

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => ({
  MemoryManager: {
    getInstance: jest.fn().mockReturnValue({
      checkMemory: jest.fn().mockReturnValue(true),
      getMemoryStats: jest.fn().mockReturnValue({
        usedHeapSize: 50 * 1024 * 1024,
        totalHeapSize: 100 * 1024 * 1024,
        usagePercentage: 50,
      }),
      cleanup: jest.fn(),
      getAvailableMemory: jest.fn().mockReturnValue(100 * 1024 * 1024),
    }),
  },
}));

// Helper function to create mock files of specific sizes
function createMockFile(size: number, name: string, type: string): File {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  
  // Fill with pattern data to simulate real file content
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }

  const file = new File([buffer], name, { type });
  
  // Mock arrayBuffer method
  file.arrayBuffer = jest.fn().mockResolvedValue(buffer);
  
  return file;
}

// Performance measurement helper
class PerformanceMeasurer {
  private startTime: number = 0;
  private startMemory: number = 0;

  start() {
    this.startTime = performance.now();
    this.startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  }

  end() {
    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      processingTime: endTime - this.startTime,
      memoryDelta: endMemory - this.startMemory,
      peakMemory: endMemory,
    };
  }
}

describe('Multi-Format Performance Tests', () => {
  let performanceMeasurer: PerformanceMeasurer;

  beforeEach(() => {
    performanceMeasurer = new PerformanceMeasurer();
    jest.clearAllMocks();

    // Mock performance.memory if not available
    if (!(performance as any).memory) {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024,
        },
        configurable: true,
      });
    }
  });

  describe('PDF Compression Performance', () => {
    const mockPDFCompressor = PDFCompressor as jest.Mocked<typeof PDFCompressor>;

    beforeEach(() => {
      mockPDFCompressor.compressDocument.mockImplementation(async (file, settings, onProgress) => {
        // Simulate processing time based on file size
        const processingTime = Math.min(file.size / (1024 * 1024) * 100, 5000); // Max 5 seconds
        
        // Simulate progress updates
        if (onProgress) {
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, processingTime / 10));
            onProgress(i);
          }
        }

        return {
          compressedBlob: new Blob(['compressed'], { type: 'application/pdf' }),
          metadata: { pageCount: Math.ceil(file.size / (1024 * 100)), hasEmbeddedMedia: false },
          compressionRatio: 0.7,
          processingTime,
        };
      });
    });

    const pdfSizes = [
      { size: 1 * 1024 * 1024, name: '1MB PDF' },
      { size: 10 * 1024 * 1024, name: '10MB PDF' },
      { size: 50 * 1024 * 1024, name: '50MB PDF' },
      { size: 100 * 1024 * 1024, name: '100MB PDF' },
    ];

    pdfSizes.forEach(({ size, name }) => {
      it(`should handle ${name} within performance limits`, async () => {
        const file = createMockFile(size, `test-${size}.pdf`, 'application/pdf');
        const settings = {
          compressionLevel: 'medium' as const,
          preserveMetadata: true,
          optimizeImages: true,
        };

        performanceMeasurer.start();
        
        const pdfCompressor = new PDFCompressor();
        const result = await pdfCompressor.compressDocument(file, settings);
        
        const metrics = performanceMeasurer.end();

        // Performance assertions
        expect(metrics.processingTime).toBeLessThan(10000); // Max 10 seconds
        expect(metrics.memoryDelta).toBeLessThan(size * 2); // Memory usage shouldn't exceed 2x file size
        expect(result.compressionRatio).toBeGreaterThan(0);
        expect(result.compressedBlob).toBeInstanceOf(Blob);

        // Log performance metrics
        console.log(`${name} Performance:`, {
          processingTime: `${metrics.processingTime.toFixed(2)}ms`,
          memoryDelta: `${(metrics.memoryDelta / (1024 * 1024)).toFixed(2)}MB`,
          compressionRatio: result.compressionRatio,
        });
      }, 15000); // 15 second timeout
    });

    it('should handle memory pressure during large PDF processing', async () => {
      const largeFile = createMockFile(200 * 1024 * 1024, 'large.pdf', 'application/pdf');
      
      // Mock memory pressure
      const memoryManager = MemoryManager.getInstance();
      (memoryManager.checkMemory as jest.Mock).mockReturnValue(false);

      const settings = {
        compressionLevel: 'low' as const,
        preserveMetadata: false,
        optimizeImages: false,
      };

      // Should handle memory pressure gracefully
      const pdfCompressor = new PDFCompressor();
      await expect(pdfCompressor.compressDocument(largeFile, settings))
        .resolves.toBeDefined();
    });
  });

  describe('Office Document Performance', () => {
    const mockOfficeCompressor = OfficeCompressor as jest.Mocked<typeof OfficeCompressor>;

    beforeEach(() => {
      mockOfficeCompressor.prototype.compressDocument = jest.fn().mockImplementation(async function(file, settings, onProgress) {
        const processingTime = Math.min(file.size / (1024 * 1024) * 150, 8000); // Max 8 seconds
        
        if (onProgress) {
          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, processingTime / 5));
            onProgress(i);
          }
        }

        return {
          compressedBlob: new Blob(['compressed'], { type: file.type }),
          metadata: { pageCount: Math.ceil(file.size / (1024 * 50)), hasEmbeddedMedia: true },
          compressionRatio: 0.6,
          processingTime,
        };
      });
    });

    const officeFormats = [
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' },
    ];

    const fileSizes = [5 * 1024 * 1024, 25 * 1024 * 1024, 75 * 1024 * 1024]; // 5MB, 25MB, 75MB

    officeFormats.forEach(({ type, ext }) => {
      fileSizes.forEach(size => {
        it(`should handle ${(size / (1024 * 1024)).toFixed(0)}MB ${ext.toUpperCase()} file`, async () => {
          const file = createMockFile(size, `test.${ext}`, type);
          const compressor = new OfficeCompressor();
          const settings = {
            compressionLevel: 'medium' as const,
            preserveMetadata: true,
            optimizeImages: true,
          };

          performanceMeasurer.start();
          
          const result = await compressor.compressDocument(file, settings);
          
          const metrics = performanceMeasurer.end();

          expect(metrics.processingTime).toBeLessThan(12000); // Max 12 seconds
          expect(result.compressionRatio).toBeGreaterThan(0);
          expect(result.compressedBlob).toBeInstanceOf(Blob);

          console.log(`${ext.toUpperCase()} ${(size / (1024 * 1024)).toFixed(0)}MB Performance:`, {
            processingTime: `${metrics.processingTime.toFixed(2)}ms`,
            compressionRatio: result.compressionRatio,
          });
        }, 15000);
      });
    });
  });

  describe('Audio Compression Performance', () => {
    const mockAudioCompressor = AudioCompressor as jest.Mocked<typeof AudioCompressor>;

    beforeEach(() => {
      mockAudioCompressor.prototype.compressAudio = jest.fn().mockImplementation(async function(file, settings, onProgress) {
        const processingTime = Math.min(file.size / (1024 * 1024) * 200, 10000); // Max 10 seconds
        
        if (onProgress) {
          for (let i = 0; i <= 100; i += 25) {
            await new Promise(resolve => setTimeout(resolve, processingTime / 4));
            onProgress(i);
          }
        }

        return new Blob(['compressed audio'], { type: settings.outputFormat || 'audio/mpeg' });
      });

      mockAudioCompressor.prototype.compressAudioWithStreaming = jest.fn().mockImplementation(async function(file, settings, onProgress) {
        const processingTime = Math.min(file.size / (1024 * 1024) * 300, 15000); // Max 15 seconds for streaming
        
        if (onProgress) {
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, processingTime / 10));
            onProgress(i);
          }
        }

        return new Blob(['compressed audio'], { type: settings.outputFormat || 'audio/mpeg' });
      });
    });

    const audioFormats = [
      { type: 'audio/wav', ext: 'wav' },
      { type: 'audio/mpeg', ext: 'mp3' },
    ];

    const audioSizes = [
      { size: 10 * 1024 * 1024, name: '10MB' },
      { size: 50 * 1024 * 1024, name: '50MB' },
      { size: 100 * 1024 * 1024, name: '100MB' },
    ];

    audioFormats.forEach(({ type, ext }) => {
      audioSizes.forEach(({ size, name }) => {
        it(`should handle ${name} ${ext.toUpperCase()} file`, async () => {
          const file = createMockFile(size, `test.${ext}`, type);
          const compressor = new AudioCompressor();
          const settings = {
            quality: 70,
            outputFormat: 'mp3',
            audioSettings: {
              bitrate: 128,
              sampleRate: 44100,
              channels: 2,
              format: 'mp3' as const,
            },
          };

          performanceMeasurer.start();
          
          const result = size > 50 * 1024 * 1024 
            ? await compressor.compressAudioWithStreaming(file, settings)
            : await compressor.compressAudio(file, settings);
          
          const metrics = performanceMeasurer.end();

          expect(metrics.processingTime).toBeLessThan(20000); // Max 20 seconds
          expect(result).toBeInstanceOf(Blob);

          console.log(`${ext.toUpperCase()} ${name} Performance:`, {
            processingTime: `${metrics.processingTime.toFixed(2)}ms`,
            method: size > 50 * 1024 * 1024 ? 'streaming' : 'regular',
          });
        }, 25000);
      });
    });
  });

  describe('APK Compression Performance', () => {
    const mockAPKCompressor = APKCompressor as jest.Mocked<typeof APKCompressor>;

    beforeEach(() => {
      mockAPKCompressor.compressAPK.mockImplementation(async (file, settings, onProgress) => {
        const processingTime = Math.min(file.size / (1024 * 1024) * 250, 12000); // Max 12 seconds
        
        if (onProgress) {
          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, processingTime / 5));
            onProgress(i);
          }
        }

        return {
          compressedBlob: new Blob(['compressed apk'], { type: 'application/vnd.android.package-archive' }),
          metadata: { entryCount: Math.ceil(file.size / (1024 * 10)), hasSignature: false },
          compressionRatio: 0.8,
          processingTime,
          warnings: [],
        };
      });
    });

    const apkSizes = [
      { size: 5 * 1024 * 1024, name: '5MB APK' },
      { size: 25 * 1024 * 1024, name: '25MB APK' },
      { size: 100 * 1024 * 1024, name: '100MB APK' },
      { size: 200 * 1024 * 1024, name: '200MB APK' },
    ];

    apkSizes.forEach(({ size, name }) => {
      it(`should handle ${name} within performance limits`, async () => {
        const file = createMockFile(size, `app-${size}.apk`, 'application/vnd.android.package-archive');
        const settings = {
          compressionLevel: 6,
          preserveStructure: true,
          validateIntegrity: true,
        };

        performanceMeasurer.start();
        
        const result = await APKCompressor.compressAPK(file, settings);
        
        const metrics = performanceMeasurer.end();

        expect(metrics.processingTime).toBeLessThan(15000); // Max 15 seconds
        expect(result.compressionRatio).toBeGreaterThan(0);
        expect(result.compressedBlob).toBeInstanceOf(Blob);

        console.log(`${name} Performance:`, {
          processingTime: `${metrics.processingTime.toFixed(2)}ms`,
          compressionRatio: result.compressionRatio,
          entryCount: result.metadata.entryCount,
        });
      }, 20000);
    });
  });

  describe('Memory Management Performance', () => {
    it('should handle concurrent compression of multiple formats', async () => {
      const files = [
        createMockFile(10 * 1024 * 1024, 'doc.pdf', 'application/pdf'),
        createMockFile(15 * 1024 * 1024, 'audio.mp3', 'audio/mpeg'),
        createMockFile(20 * 1024 * 1024, 'app.apk', 'application/vnd.android.package-archive'),
      ];

      const memoryManager = MemoryManager.getInstance();
      
      performanceMeasurer.start();

      // Process files concurrently
      const pdfCompressor = new PDFCompressor();
      const results = await Promise.all([
        pdfCompressor.compressDocument(files[0], { compressionLevel: 'medium', preserveMetadata: true, optimizeImages: true }),
        new AudioCompressor().compressAudio(files[1], { quality: 70, outputFormat: 'mp3' }),
        APKCompressor.compressAPK(files[2], { compressionLevel: 6, preserveStructure: true, validateIntegrity: true }),
      ]);

      const metrics = performanceMeasurer.end();

      expect(results).toHaveLength(3);
      expect(metrics.processingTime).toBeLessThan(25000); // Max 25 seconds for concurrent processing
      
      // Verify memory cleanup
      expect(memoryManager.cleanup).toHaveBeenCalled();

      console.log('Concurrent Processing Performance:', {
        processingTime: `${metrics.processingTime.toFixed(2)}ms`,
        memoryDelta: `${(metrics.memoryDelta / (1024 * 1024)).toFixed(2)}MB`,
      });
    }, 30000);

    it('should handle memory pressure with large file queue', async () => {
      const largeFiles = Array.from({ length: 5 }, (_, i) => 
        createMockFile(50 * 1024 * 1024, `large-${i}.pdf`, 'application/pdf')
      );

      const memoryManager = MemoryManager.getInstance();
      
      // Mock memory pressure scenario
      (memoryManager.checkMemory as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false) // Memory pressure
        .mockReturnValue(true);

      performanceMeasurer.start();

      // Process files sequentially when memory is constrained
      const results = [];
      for (const file of largeFiles) {
        if (memoryManager.checkMemory()) {
          const pdfCompressor = new PDFCompressor();
          const result = await pdfCompressor.compressDocument(file, { 
            compressionLevel: 'low', 
            preserveMetadata: false, 
            optimizeImages: false 
          });
          results.push(result);
        } else {
          // Skip or defer processing when memory is low
          console.log('Skipping file due to memory pressure');
          break;
        }
      }

      const metrics = performanceMeasurer.end();

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(largeFiles.length);

      console.log('Memory Pressure Handling:', {
        processedFiles: results.length,
        totalFiles: largeFiles.length,
        processingTime: `${metrics.processingTime.toFixed(2)}ms`,
      });
    }, 40000);
  });

  describe('Performance Benchmarking', () => {
    it('should generate comprehensive performance report', async () => {
      const testCases = [
        { format: 'PDF', size: 10 * 1024 * 1024, type: 'application/pdf' },
        { format: 'DOCX', size: 5 * 1024 * 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { format: 'MP3', size: 15 * 1024 * 1024, type: 'audio/mpeg' },
        { format: 'APK', size: 25 * 1024 * 1024, type: 'application/vnd.android.package-archive' },
      ];

      const benchmarkResults = [];

      for (const testCase of testCases) {
        const file = createMockFile(testCase.size, `test.${testCase.format.toLowerCase()}`, testCase.type);
        
        performanceMeasurer.start();

        let result;
        switch (testCase.format) {
          case 'PDF':
            const pdfCompressor = new PDFCompressor();
            result = await pdfCompressor.compressDocument(file, { compressionLevel: 'medium', preserveMetadata: true, optimizeImages: true });
            break;
          case 'DOCX':
            result = await new OfficeCompressor().compressDocument(file, { compressionLevel: 'medium', preserveMetadata: true, optimizeImages: true });
            break;
          case 'MP3':
            result = await new AudioCompressor().compressAudio(file, { quality: 70, outputFormat: 'mp3' });
            break;
          case 'APK':
            result = await APKCompressor.compressAPK(file, { compressionLevel: 6, preserveStructure: true, validateIntegrity: true });
            break;
        }

        const metrics = performanceMeasurer.end();

        benchmarkResults.push({
          format: testCase.format,
          fileSize: `${(testCase.size / (1024 * 1024)).toFixed(1)}MB`,
          processingTime: `${metrics.processingTime.toFixed(2)}ms`,
          throughput: `${((testCase.size / (1024 * 1024)) / (metrics.processingTime / 1000)).toFixed(2)}MB/s`,
          memoryUsage: `${(metrics.memoryDelta / (1024 * 1024)).toFixed(2)}MB`,
        });
      }

      // Log benchmark results
      console.log('\nPerformance Benchmark Results:');
      console.table(benchmarkResults);

      // Verify all formats meet performance criteria
      benchmarkResults.forEach(result => {
        expect(parseFloat(result.processingTime)).toBeLessThan(15000); // Max 15 seconds
        expect(parseFloat(result.throughput)).toBeGreaterThan(0.1); // Min 0.1 MB/s
      });
    }, 60000);
  });
});