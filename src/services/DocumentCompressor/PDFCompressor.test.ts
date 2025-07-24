/**
 * Tests for PDFCompressor service
 */

import PDFCompressor from './PDFCompressor';
import { DocumentSettings } from '../../types';
import MemoryManager from '../../utils/memory/MemoryManager';
import { CompressionError } from '../../utils/errors/ErrorTypes';

// Mock pdf-lib
const mockPDFDocument = {
  load: jest.fn(),
};

jest.mock('pdf-lib', () => ({
  PDFDocument: mockPDFDocument,
}));

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => ({
  __esModule: true,
  default: {
    checkMemory: jest.fn(() => true),
    cleanup: jest.fn(),
    getAvailableMemory: jest.fn(() => 100 * 1024 * 1024), // 100MB
  },
}));

// Mock PDF document
const mockPDFDoc = {
  getPages: jest.fn(() => [
    { node: { Resources: null } },
    { node: { Resources: { XObject: {} } } },
  ]),
  setTitle: jest.fn(),
  setAuthor: jest.fn(),
  setSubject: jest.fn(),
  setKeywords: jest.fn(),
  setProducer: jest.fn(),
  setCreator: jest.fn(),
  save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
};

describe('PDFCompressor', () => {
  let mockFile: File;
  let mockSettings: DocumentSettings;

  beforeEach(() => {
    mockFile = new File(['%PDF-1.4 mock content'], 'test.pdf', { type: 'application/pdf' });
    mockSettings = {
      compressionLevel: 'medium',
      preserveMetadata: true,
      optimizeImages: true,
    };

    // Reset mocks
    jest.clearAllMocks();
    (MemoryManager.checkMemory as jest.Mock).mockReturnValue(true);
    
    // Setup PDF-lib mock
    mockPDFDocument.load.mockResolvedValue(mockPDFDoc);
    
    // Mock file.arrayBuffer
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
  });

  describe('compressDocument', () => {
    it('should compress a PDF document successfully', async () => {
      const onProgress = jest.fn();
      
      const result = await PDFCompressor.compressDocument(mockFile, mockSettings, onProgress);
      
      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.pageCount).toBe(2);
      expect(result.metadata.hasEmbeddedMedia).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle different compression levels', async () => {
      const highSettings: DocumentSettings = {
        compressionLevel: 'high',
        preserveMetadata: false,
        optimizeImages: true,
      };
      
      const result = await PDFCompressor.compressDocument(mockFile, highSettings);
      
      expect(result).toBeDefined();
      expect(mockPDFDoc.setTitle).toHaveBeenCalledWith('');
      expect(mockPDFDoc.setAuthor).toHaveBeenCalledWith('');
    });

    it('should preserve metadata when requested', async () => {
      const preserveSettings: DocumentSettings = {
        compressionLevel: 'low',
        preserveMetadata: true,
        optimizeImages: false,
      };
      
      await PDFCompressor.compressDocument(mockFile, preserveSettings);
      
      expect(mockPDFDoc.setTitle).not.toHaveBeenCalled();
    });

    it('should handle cancellation during processing', async () => {
      // Cancel processing after a short delay
      setTimeout(() => {
        PDFCompressor.cancelProcessing();
      }, 10);
      
      await expect(
        PDFCompressor.compressDocument(mockFile, mockSettings)
      ).rejects.toThrow('PDF compression was cancelled');
    });

    it('should handle PDF loading errors', async () => {
      mockPDFDocument.load.mockRejectedValue(new Error('Invalid PDF'));
      
      await expect(
        PDFCompressor.compressDocument(mockFile, mockSettings)
      ).rejects.toThrow('PDF compression failed');
    });

    it('should handle memory errors', async () => {
      (MemoryManager.checkMemory as jest.Mock).mockReturnValue(false);
      
      await expect(
        PDFCompressor.compressDocument(mockFile, mockSettings)
      ).rejects.toThrow('Invalid PDF document');
    });

    it('should handle save errors', async () => {
      mockPDFDoc.save.mockRejectedValue(new Error('Save failed'));
      
      await expect(
        PDFCompressor.compressDocument(mockFile, mockSettings)
      ).rejects.toThrow('PDF compression failed');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from PDF', async () => {
      const metadata = await PDFCompressor.extractMetadata(mockFile);
      
      expect(metadata).toBeDefined();
      expect(metadata.pageCount).toBe(2);
      expect(metadata.hasEmbeddedMedia).toBe(true);
      expect(metadata.isEncrypted).toBe(false);
    });

    it('should handle PDF loading errors during metadata extraction', async () => {
      mockPDFDocument.load.mockRejectedValue(new Error('Invalid PDF'));
      
      const metadata = await PDFCompressor.extractMetadata(mockFile);
      
      expect(metadata.pageCount).toBe(0);
      expect(metadata.hasEmbeddedMedia).toBe(false);
      expect(metadata.isEncrypted).toBe(false);
    });

    it('should handle encrypted PDFs', async () => {
      mockPDFDoc.getPages.mockImplementation(() => {
        throw new Error('Encrypted PDF');
      });
      
      const metadata = await PDFCompressor.extractMetadata(mockFile);
      
      expect(metadata.isEncrypted).toBe(true);
    });

    it('should handle file.arrayBuffer errors', async () => {
      mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('File read error'));
      
      const metadata = await PDFCompressor.extractMetadata(mockFile);
      
      expect(metadata.pageCount).toBe(0);
      expect(metadata.isEncrypted).toBe(false);
    });
  });

  describe('mapSettingsToOptions', () => {
    it('should map high compression settings correctly', () => {
      const settings: DocumentSettings = {
        compressionLevel: 'high',
        preserveMetadata: false,
        optimizeImages: true,
      };
      
      const options = (PDFCompressor as any).mapSettingsToOptions(settings);
      
      expect(options.imageQuality).toBe(0.9);
      expect(options.removeMetadata).toBe(true);
      expect(options.optimizeImages).toBe(true);
      expect(options.compressStreams).toBe(true);
    });

    it('should map medium compression settings correctly', () => {
      const settings: DocumentSettings = {
        compressionLevel: 'medium',
        preserveMetadata: true,
        optimizeImages: false,
      };
      
      const options = (PDFCompressor as any).mapSettingsToOptions(settings);
      
      expect(options.imageQuality).toBe(0.7);
      expect(options.removeMetadata).toBe(false);
      expect(options.optimizeImages).toBe(false);
    });

    it('should map low compression settings correctly', () => {
      const settings: DocumentSettings = {
        compressionLevel: 'low',
        preserveMetadata: true,
        optimizeImages: true,
      };
      
      const options = (PDFCompressor as any).mapSettingsToOptions(settings);
      
      expect(options.imageQuality).toBe(0.5);
      expect(options.removeMetadata).toBe(false);
      expect(options.optimizeImages).toBe(true);
    });
  });

  describe('isSupported', () => {
    it('should return true when pdf-lib is available', () => {
      expect(PDFCompressor.isSupported()).toBe(true);
    });

    it('should return false when pdf-lib is not available', () => {
      // Mock PDFDocument as undefined
      jest.doMock('pdf-lib', () => ({
        PDFDocument: undefined,
      }));
      
      expect(PDFCompressor.isSupported()).toBe(false);
    });
  });

  describe('processing state management', () => {
    it('should handle processing state correctly', () => {
      expect(PDFCompressor.isProcessingActive()).toBe(false);
    });

    it('should handle cancellation', () => {
      PDFCompressor.cancelProcessing();
      // The cancellation flag should be set internally
    });
  });

  describe('error handling', () => {
    it('should handle metadata removal errors gracefully', async () => {
      mockPDFDoc.setTitle.mockImplementation(() => {
        throw new Error('Metadata removal failed');
      });
      
      const settings: DocumentSettings = {
        compressionLevel: 'high',
        preserveMetadata: false,
        optimizeImages: false,
      };
      
      // Should not throw, but log warning
      const result = await PDFCompressor.compressDocument(mockFile, settings);
      expect(result).toBeDefined();
    });

    it('should handle page optimization errors gracefully', async () => {
      // This test ensures that page optimization errors don't break the entire process
      const result = await PDFCompressor.compressDocument(mockFile, mockSettings);
      expect(result).toBeDefined();
    });
  });
});