/**
 * DocumentProcessor unit tests
 */

import { DocumentProcessor, DocumentProcessingResult } from './DocumentProcessor';
import { DocumentSettings, FormatMetadata } from '../../types';
import MemoryManager from '../../utils/memory/MemoryManager';

// Mock MemoryManager
const mockMemoryManager = {
  checkMemory: jest.fn().mockReturnValue(true),
  cleanup: jest.fn(),
  getAvailableMemory: jest.fn().mockReturnValue(1024 * 1024 * 1024), // 1GB
  canProcessFile: jest.fn().mockReturnValue({
    canProcess: true,
    shouldUseStreaming: false,
    recommendedChunkSize: 1024 * 1024,
  }),
  getFormatMemoryRequirements: jest.fn().mockReturnValue({
    streamingThreshold: 10 * 1024 * 1024,
    chunkSizeMultiplier: 1.0,
  }),
  getRecommendedChunkSize: jest.fn().mockReturnValue(1024 * 1024),
};

jest.mock('../../utils/memory/MemoryManager', () => ({
  __esModule: true,
  default: mockMemoryManager,
}));

// Create a concrete implementation for testing
class TestDocumentProcessor extends DocumentProcessor {
  async compressDocument(
    file: File,
    settings: DocumentSettings,
    onProgress?: (progress: number) => void
  ): Promise<DocumentProcessingResult> {
    if (onProgress) onProgress(100);
    return {
      compressedBlob: new Blob(['compressed'], { type: file.type }),
      metadata: { pageCount: 1, hasEmbeddedMedia: false, isEncrypted: false },
      compressionRatio: 0.7,
      processingTime: 1000,
    };
  }

  async extractMetadata(file: File): Promise<FormatMetadata> {
    return {
      pageCount: 1,
      hasEmbeddedMedia: false,
      isEncrypted: false,
    };
  }

  // Expose protected methods for testing
  public testShouldUseChunkedProcessing(file: File): boolean {
    return this.shouldUseChunkedProcessing(file);
  }

  public testCalculateChunkSize(fileSize: number): number {
    return this.calculateChunkSize(fileSize);
  }

  public async testValidateDocument(file: File): Promise<boolean> {
    return this.validateDocument(file);
  }

  public testCalculateCompressionStats(
    originalSize: number,
    compressedSize: number,
    startTime: number
  ) {
    return this.calculateCompressionStats(originalSize, compressedSize, startTime);
  }
}

describe('DocumentProcessor', () => {
  let documentProcessor: TestDocumentProcessor;
  let mockFile: File;
  let mockSettings: DocumentSettings;

  beforeEach(() => {
    documentProcessor = new TestDocumentProcessor();
    
    mockFile = {
      name: 'test.pdf',
      type: 'application/pdf',
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
      lastModified: Date.now(),
      webkitRelativePath: '',
    } as unknown as File;
    
    mockSettings = {
      compressionLevel: 'medium',
      preserveMetadata: true,
      optimizeImages: true,
    };

    jest.clearAllMocks();
  });

  describe('document validation', () => {
    it('should validate valid document files', async () => {
      mockMemoryManager.checkMemory.mockReturnValue(true);
      const validFile = { ...mockFile, size: 1024 * 1024 }; // 1MB
      const result = await documentProcessor.testValidateDocument(validFile);
      
      expect(result).toBe(true);
    });

    it('should reject empty files', async () => {
      const emptyFile = { ...mockFile, size: 0 };
      const result = await documentProcessor.testValidateDocument(emptyFile);
      
      expect(result).toBe(false);
    });

    it('should reject files that are too large', async () => {
      const largeFile = { ...mockFile, size: 200 * 1024 * 1024 }; // 200MB
      
      const result = await documentProcessor.testValidateDocument(largeFile);
      expect(result).toBe(false); // Should return false, not throw
    });

    it('should handle memory constraints', async () => {
      mockMemoryManager.checkMemory.mockReturnValue(false);
      
      const result = await documentProcessor.testValidateDocument(mockFile);
      expect(result).toBe(false); // Should return false, not throw
    });
  });

  describe('chunked processing', () => {
    beforeEach(() => {
      // Reset mocks before each test
      mockMemoryManager.canProcessFile.mockReturnValue({
        canProcess: true,
        shouldUseStreaming: false,
        recommendedChunkSize: 1024 * 1024,
      });
      mockMemoryManager.getFormatMemoryRequirements.mockReturnValue({
        streamingThreshold: 10 * 1024 * 1024,
        chunkSizeMultiplier: 1.0,
      });
      mockMemoryManager.getRecommendedChunkSize.mockReturnValue(1024 * 1024);
    });

    it('should determine when to use chunked processing', () => {
      const smallFile = { ...mockFile, size: 1024 * 1024 }; // 1MB
      const largeFile = { ...mockFile, size: 50 * 1024 * 1024 }; // 50MB
      
      expect(documentProcessor.testShouldUseChunkedProcessing(smallFile)).toBe(false);
      
      // Mock streaming recommendation for large file
      mockMemoryManager.canProcessFile.mockReturnValue({
        canProcess: true,
        shouldUseStreaming: true,
        recommendedChunkSize: 5 * 1024 * 1024,
      });
      
      expect(documentProcessor.testShouldUseChunkedProcessing(largeFile)).toBe(true);
    });

    it('should calculate appropriate chunk sizes', () => {
      const fileSize = 20 * 1024 * 1024; // 20MB
      const chunkSize = documentProcessor.testCalculateChunkSize(fileSize);
      
      expect(chunkSize).toBeGreaterThan(0);
      expect(chunkSize).toBeLessThanOrEqual(5 * 1024 * 1024); // Max 5MB
      expect(chunkSize).toBeGreaterThanOrEqual(512 * 1024); // Min 512KB
    });

    it('should respect minimum chunk size', () => {
      const smallFileSize = 100 * 1024; // 100KB
      const chunkSize = documentProcessor.testCalculateChunkSize(smallFileSize);
      
      expect(chunkSize).toBeGreaterThanOrEqual(512 * 1024); // Min 512KB
    });
  });

  describe('compression statistics', () => {
    it('should calculate compression ratio correctly', () => {
      const originalSize = 1000;
      const compressedSize = 500;
      const startTime = Date.now() - 1000; // 1 second ago
      
      const stats = documentProcessor.testCalculateCompressionStats(originalSize, compressedSize, startTime);
      
      expect(stats.compressionRatio).toBe(0.5);
      expect(stats.processingTime).toBeGreaterThan(0);
    });

    it('should handle zero original size', () => {
      const stats = documentProcessor.testCalculateCompressionStats(0, 500, Date.now());
      expect(stats.compressionRatio).toBe(1);
    });
  });

  describe('processing state management', () => {
    it('should track processing state', () => {
      expect(documentProcessor.isProcessingActive()).toBe(false);
    });

    it('should handle cancellation', () => {
      expect(() => documentProcessor.cancelProcessing()).not.toThrow();
    });
  });

  describe('abstract method implementation', () => {
    it('should compress document', async () => {
      const result = await documentProcessor.compressDocument(mockFile, mockSettings);
      
      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should extract metadata', async () => {
      const metadata = await documentProcessor.extractMetadata(mockFile);
      
      expect(metadata).toBeDefined();
      expect(typeof metadata.pageCount).toBe('number');
      expect(typeof metadata.hasEmbeddedMedia).toBe('boolean');
      expect(typeof metadata.isEncrypted).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle null file validation', async () => {
      const result = await documentProcessor.testValidateDocument(null as any);
      expect(result).toBe(false);
    });

    it('should handle processing cancellation', async () => {
      documentProcessor.cancelProcessing();
      
      // The cancellation flag should be set internally
      expect(documentProcessor.isProcessingActive()).toBe(false);
    });
  });
});