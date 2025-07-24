/**
 * OfficeCompressor test suite
 */

import { OfficeCompressor } from './OfficeCompressor';
import { DocumentSettings } from '../../types';

// Mock PizZip for testing
jest.mock('pizzip', () => {
  return jest.fn().mockImplementation((buffer) => ({
    files: {
      'word/document.xml': {
        asText: () => '<document>Test content with multiple pages of content that would indicate multiple pages</document>',
        asArrayBuffer: () => new ArrayBuffer(100),
        dir: false,
      },
      '[Content_Types].xml': {
        asText: () => '<Types></Types>',
        asArrayBuffer: () => new ArrayBuffer(50),
        dir: false,
      },
      'word/media/image1.png': {
        asArrayBuffer: () => new ArrayBuffer(1000),
        dir: false,
      },
    },
    generate: jest.fn().mockReturnValue(new ArrayBuffer(500)),
    file: jest.fn(),
  }));
});

// Mock docx library
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: {
    toBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(500)),
  },
}));

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => ({
  default: {
    checkMemory: jest.fn().mockReturnValue(true),
    cleanup: jest.fn(),
    getAvailableMemory: jest.fn().mockReturnValue(1024 * 1024 * 1024), // 1GB
  },
  MemoryManager: {
    checkMemory: jest.fn().mockReturnValue(true),
    cleanup: jest.fn(),
    getAvailableMemory: jest.fn().mockReturnValue(1024 * 1024 * 1024), // 1GB
  },
}));

describe('OfficeCompressor', () => {
  let officeCompressor: OfficeCompressor;
  let mockFile: File;
  let mockSettings: DocumentSettings;

  beforeEach(() => {
    officeCompressor = new OfficeCompressor();
    
    // Create mock file with arrayBuffer method
    const mockBuffer = new ArrayBuffer(1000);
    mockFile = {
      name: 'test.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1000,
      arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
      lastModified: Date.now(),
      webkitRelativePath: '',
    } as unknown as File;
    
    // Create mock settings
    mockSettings = {
      compressionLevel: 'medium',
      preserveMetadata: false,
      optimizeImages: true,
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('compressDocument', () => {
    it('should compress a DOCX document successfully', async () => {
      const result = await officeCompressor.compressDocument(mockFile, mockSettings);

      expect(result).toBeDefined();
      expect(result.compressedBlob).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle progress callbacks', async () => {
      const progressCallback = jest.fn();
      
      await officeCompressor.compressDocument(mockFile, mockSettings, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(expect.any(Number));
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should throw error for invalid document', async () => {
      const invalidFile = {
        name: 'empty.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 0,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      } as unknown as File;

      await expect(officeCompressor.compressDocument(invalidFile, mockSettings))
        .rejects.toThrow('Invalid Office document');
    });

    it('should handle cancellation', async () => {
      const compressionPromise = officeCompressor.compressDocument(mockFile, mockSettings);
      
      // Cancel immediately
      officeCompressor.cancelProcessing();

      await expect(compressionPromise).rejects.toThrow('Office document compression was cancelled');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from DOCX document', async () => {
      const metadata = await officeCompressor.extractMetadata(mockFile);

      expect(metadata).toBeDefined();
      expect(metadata.pageCount).toBeGreaterThan(0);
      expect(typeof metadata.hasEmbeddedMedia).toBe('boolean');
      expect(typeof metadata.isEncrypted).toBe('boolean');
    });

    it('should handle metadata extraction errors gracefully', async () => {
      const corruptFile = {
        name: 'corrupt.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 10,
        arrayBuffer: jest.fn().mockRejectedValue(new Error('Corrupt file')),
      } as unknown as File;

      const metadata = await officeCompressor.extractMetadata(corruptFile);

      expect(metadata).toBeDefined();
      expect(metadata.pageCount).toBe(0);
      expect(metadata.hasEmbeddedMedia).toBe(false);
      expect(metadata.isEncrypted).toBe(false);
    });
  });

  describe('document type detection', () => {
    it('should detect DOCX format', () => {
      const docxFile = { name: 'test.docx' } as File;
      
      // Access private method through type assertion for testing
      const compressor = officeCompressor as any;
      const documentType = compressor.detectDocumentType(docxFile);
      
      expect(documentType).toBe('docx');
    });

    it('should detect XLSX format', () => {
      const xlsxFile = { name: 'test.xlsx' } as File;
      
      const compressor = officeCompressor as any;
      const documentType = compressor.detectDocumentType(xlsxFile);
      
      expect(documentType).toBe('xlsx');
    });

    it('should detect PPTX format', () => {
      const pptxFile = { name: 'test.pptx' } as File;
      
      const compressor = officeCompressor as any;
      const documentType = compressor.detectDocumentType(pptxFile);
      
      expect(documentType).toBe('pptx');
    });

    it('should detect ODT format', () => {
      const odtFile = { name: 'test.odt' } as File;
      
      const compressor = officeCompressor as any;
      const documentType = compressor.detectDocumentType(odtFile);
      
      expect(documentType).toBe('odt');
    });

    it('should return null for unsupported format', () => {
      const unsupportedFile = { name: 'test.txt' } as File;
      
      const compressor = officeCompressor as any;
      const documentType = compressor.detectDocumentType(unsupportedFile);
      
      expect(documentType).toBeNull();
    });
  });

  describe('embedded media detection', () => {
    it('should detect embedded images', () => {
      const compressor = officeCompressor as any;
      
      expect(compressor.isMediaFile('word/media/image1.png')).toBe(true);
      expect(compressor.isMediaFile('word/media/image2.jpg')).toBe(true);
      expect(compressor.isMediaFile('xl/media/chart1.gif')).toBe(true);
      expect(compressor.isMediaFile('word/document.xml')).toBe(false);
    });

    it('should get correct media types', () => {
      const compressor = officeCompressor as any;
      
      expect(compressor.getMediaType('image.jpg')).toBe('image/jpeg');
      expect(compressor.getMediaType('image.png')).toBe('image/png');
      expect(compressor.getMediaType('image.gif')).toBe('image/gif');
      expect(compressor.getMediaType('unknown.xyz')).toBe('application/octet-stream');
    });
  });

  describe('compression options mapping', () => {
    it('should map high compression level correctly', () => {
      const highSettings: DocumentSettings = {
        compressionLevel: 'high',
        preserveMetadata: false,
        optimizeImages: true,
      };

      const compressor = officeCompressor as any;
      const options = compressor.mapSettingsToOptions(highSettings);

      expect(options.compressionLevel).toBe(9);
      expect(options.optimizeImages).toBe(true);
      expect(options.removeMetadata).toBe(true);
      expect(options.preserveStructure).toBe(true);
    });

    it('should map medium compression level correctly', () => {
      const mediumSettings: DocumentSettings = {
        compressionLevel: 'medium',
        preserveMetadata: true,
        optimizeImages: false,
      };

      const compressor = officeCompressor as any;
      const options = compressor.mapSettingsToOptions(mediumSettings);

      expect(options.compressionLevel).toBe(6);
      expect(options.optimizeImages).toBe(false);
      expect(options.removeMetadata).toBe(false);
    });

    it('should map low compression level correctly', () => {
      const lowSettings: DocumentSettings = {
        compressionLevel: 'low',
        preserveMetadata: true,
        optimizeImages: true,
      };

      const compressor = officeCompressor as any;
      const options = compressor.mapSettingsToOptions(lowSettings);

      expect(options.compressionLevel).toBe(3);
      expect(options.optimizeImages).toBe(true);
      expect(options.removeMetadata).toBe(false);
    });
  });

  describe('document integrity validation', () => {
    it('should validate document structure', async () => {
      const compressor = officeCompressor as any;
      const mockBuffer = new ArrayBuffer(1000);
      
      const result = await compressor.validateDocumentIntegrity(mockBuffer, 'docx');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should detect missing required files', async () => {
      // Mock PizZip to return empty files
      const PizZip = require('pizzip');
      PizZip.mockImplementation(() => ({
        files: {}, // Empty files object
      }));

      const compressor = officeCompressor as any;
      const mockBuffer = new ArrayBuffer(1000);
      
      const result = await compressor.validateDocumentIntegrity(mockBuffer, 'docx');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('static methods', () => {
    it('should report support correctly', () => {
      expect(OfficeCompressor.isSupported()).toBe(true);
    });

    it('should return supported formats', () => {
      const formats = OfficeCompressor.getSupportedFormats();
      
      expect(Array.isArray(formats)).toBe(true);
      expect(formats).toContain('docx');
      expect(formats).toContain('xlsx');
      expect(formats).toContain('pptx');
      expect(formats).toContain('odt');
      expect(formats).toContain('ods');
      expect(formats).toContain('odp');
      expect(formats).toContain('doc');
      expect(formats).toContain('xls');
      expect(formats).toContain('ppt');
    });
  });

  describe('memory management', () => {
    it('should handle large files with chunked processing', async () => {
      // Create a large mock file (>10MB)
      const largeFile = { 
        name: 'large.docx',
        size: 15 * 1024 * 1024, // 15MB
      } as File;

      const compressor = officeCompressor as any;
      const shouldUseChunked = compressor.shouldUseChunkedProcessing(largeFile);

      expect(shouldUseChunked).toBe(true);
    });

    it('should calculate appropriate chunk size', () => {
      const compressor = officeCompressor as any;
      const fileSize = 20 * 1024 * 1024; // 20MB
      
      const chunkSize = compressor.calculateChunkSize(fileSize);

      expect(chunkSize).toBeGreaterThan(0);
      expect(chunkSize).toBeLessThanOrEqual(5 * 1024 * 1024); // Max 5MB
    });
  });
});