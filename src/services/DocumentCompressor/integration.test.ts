/**
 * Integration tests for Document Compression Service
 */

import { CompressionService } from '../CompressionService';
import { FileModel, DocumentSettings } from '../../types';
import FormatDetector from '../FormatDetector';

// Mock dependencies
jest.mock('../FileHandler/FileHandler', () => ({
  __esModule: true,
  default: {
    shouldUseStreamProcessing: jest.fn(() => false),
    determineCompressor: jest.fn().mockResolvedValue('document'),
    prepareFileForCompression: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  },
}));

jest.mock('../DocumentCompressor/PDFCompressor', () => ({
  __esModule: true,
  default: {
    compressDocument: jest.fn().mockResolvedValue({
      compressedBlob: new Blob(['compressed pdf'], { type: 'application/pdf' }),
      metadata: { pageCount: 2, hasEmbeddedMedia: false, isEncrypted: false },
      compressionRatio: 0.7,
      processingTime: 1000,
    }),
  },
}));

jest.mock('../ResultsManager/ResultsManager', () => ({
  __esModule: true,
  resultsManager: {
    calculateResults: jest.fn().mockReturnValue({
      id: 'test-result',
      originalFile: { name: 'test.pdf', size: 1000, type: 'application/pdf' },
      compressedFile: { blob: new Blob(['compressed']), size: 700, type: 'application/pdf' },
      compressionRatio: 0.7,
      processingTime: 1000,
    }),
  },
}));

jest.mock('../../utils/memory/MemoryManager', () => ({
  __esModule: true,
  default: {
    checkMemory: jest.fn(() => true),
    cleanup: jest.fn(),
    getAvailableMemory: jest.fn(() => 100 * 1024 * 1024), // 100MB
  },
}));

jest.mock('../../utils/security/SecureProcessing', () => ({
  __esModule: true,
  default: {
    canProcessSecurely: jest.fn(() => true),
  },
}));

describe('Document Compression Integration', () => {
  let compressionService: CompressionService;
  let mockPDFFile: File;

  beforeEach(() => {
    compressionService = new CompressionService();
    mockPDFFile = new File(['%PDF-1.4 mock content'], 'test.pdf', { type: 'application/pdf' });
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset memory manager mock to allow processing
    const MemoryManager = require('../../utils/memory/MemoryManager').default;
    MemoryManager.checkMemory.mockReturnValue(true);
    
    // Reset secure processing mock to allow processing
    const SecureProcessing = require('../../utils/security/SecureProcessing').default;
    SecureProcessing.canProcessSecurely.mockReturnValue(true);
    
    // Reset FileHandler mock to return 'document' for PDF files
    const FileHandler = require('../FileHandler/FileHandler').default;
    FileHandler.determineCompressor.mockResolvedValue('document');
    
    // Reset PDFCompressor mock to return expected result
    const PDFCompressor = require('../DocumentCompressor/PDFCompressor').default;
    PDFCompressor.compressDocument.mockResolvedValue({
      compressedBlob: new Blob(['compressed pdf'], { type: 'application/pdf' }),
      metadata: { pageCount: 2, hasEmbeddedMedia: false, isEncrypted: false },
      compressionRatio: 0.7,
      processingTime: 1000,
    });
  });

  describe('Format Detection', () => {
    it('should detect PDF format correctly', async () => {
      const formatInfo = await FormatDetector.detectFormat(mockPDFFile);
      
      expect(formatInfo).toBeDefined();
      expect(formatInfo?.type).toBe('document');
      expect(formatInfo?.format).toBe('pdf');
      expect(formatInfo?.compressor).toBe('PDFCompressor');
    });

    it('should support document formats', () => {
      const documentFormats = FormatDetector.getSupportedFormats('document');
      
      expect(documentFormats.length).toBeGreaterThan(0);
      expect(documentFormats.some(f => f.format === 'pdf')).toBe(true);
    });
  });

  describe('Document Compression Flow', () => {
    it('should process PDF files through document compression service', async () => {
      const fileModel: FileModel = {
        id: 'test-pdf',
        originalFile: mockPDFFile,
        settings: {
          quality: 75,
          outputFormat: 'application/pdf',
          documentSettings: {
            compressionLevel: 'medium',
            preserveMetadata: true,
            optimizeImages: true,
          },
        },
        status: 'waiting',
        progress: 0,
      };

      const onProgress = jest.fn();
      const result = await compressionService.processFile(fileModel, onProgress);

      expect(result).toBeDefined();
      expect(result.status).toBe('complete');
      expect(result.result).toBeDefined();
      expect(result.formatMetadata).toBeDefined();
      expect(result.formatMetadata?.pageCount).toBe(2);
    });

    it('should handle document compression errors gracefully', async () => {
      // Mock PDFCompressor to throw an error
      const PDFCompressor = require('../DocumentCompressor/PDFCompressor').default;
      PDFCompressor.compressDocument.mockRejectedValue(new Error('PDF processing failed'));

      const fileModel: FileModel = {
        id: 'test-pdf-error',
        originalFile: mockPDFFile,
        settings: {
          quality: 75,
          outputFormat: 'application/pdf',
          documentSettings: {
            compressionLevel: 'high',
            preserveMetadata: false,
            optimizeImages: true,
          },
        },
        status: 'waiting',
        progress: 0,
      };

      const result = await compressionService.processFile(fileModel);

      expect(result.status).toBe('error');
      expect(result.error).toContain('PDF processing failed');
    });
  });

  describe('Document Settings Integration', () => {
    it('should pass document settings to PDF compressor', async () => {
      const documentSettings: DocumentSettings = {
        compressionLevel: 'high',
        preserveMetadata: false,
        optimizeImages: true,
      };

      const fileModel: FileModel = {
        id: 'test-pdf-settings',
        originalFile: mockPDFFile,
        settings: {
          quality: 75,
          outputFormat: 'application/pdf',
          documentSettings,
        },
        status: 'waiting',
        progress: 0,
      };

      await compressionService.processFile(fileModel);

      const PDFCompressor = require('../DocumentCompressor/PDFCompressor').default;
      expect(PDFCompressor.compressDocument).toHaveBeenCalledWith(
        mockPDFFile,
        documentSettings,
        expect.any(Function)
      );
    });

    it('should use default document settings when none provided', async () => {
      const fileModel: FileModel = {
        id: 'test-pdf-defaults',
        originalFile: mockPDFFile,
        settings: {
          quality: 75,
          outputFormat: 'application/pdf',
          // No documentSettings provided
        },
        status: 'waiting',
        progress: 0,
      };

      await compressionService.processFile(fileModel);

      const PDFCompressor = require('../DocumentCompressor/PDFCompressor').default;
      expect(PDFCompressor.compressDocument).toHaveBeenCalledWith(
        mockPDFFile,
        {
          compressionLevel: 'medium',
          preserveMetadata: true,
          optimizeImages: true,
        },
        expect.any(Function)
      );
    });
  });
});