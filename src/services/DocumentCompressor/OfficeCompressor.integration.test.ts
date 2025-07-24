/**
 * OfficeCompressor integration test
 * Basic functionality test without complex mocking
 */

import { OfficeCompressor } from './OfficeCompressor';

describe('OfficeCompressor Integration', () => {
  let officeCompressor: OfficeCompressor;

  beforeEach(() => {
    officeCompressor = new OfficeCompressor();
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
      const highSettings = {
        compressionLevel: 'high' as const,
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
      const mediumSettings = {
        compressionLevel: 'medium' as const,
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
      const lowSettings = {
        compressionLevel: 'low' as const,
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

  describe('format detection', () => {
    it('should identify ZIP-based formats correctly', () => {
      const compressor = officeCompressor as any;
      
      expect(compressor.isZipBasedFormat('docx')).toBe(true);
      expect(compressor.isZipBasedFormat('xlsx')).toBe(true);
      expect(compressor.isZipBasedFormat('pptx')).toBe(true);
      expect(compressor.isZipBasedFormat('odt')).toBe(true);
      expect(compressor.isZipBasedFormat('ods')).toBe(true);
      expect(compressor.isZipBasedFormat('odp')).toBe(true);
      
      expect(compressor.isZipBasedFormat('doc')).toBe(false);
      expect(compressor.isZipBasedFormat('xls')).toBe(false);
      expect(compressor.isZipBasedFormat('ppt')).toBe(false);
    });
  });

  describe('required files validation', () => {
    it('should return correct required files for DOCX', () => {
      const compressor = officeCompressor as any;
      const requiredFiles = compressor.getRequiredFiles('docx');
      
      expect(requiredFiles).toContain('word/document.xml');
      expect(requiredFiles).toContain('[Content_Types].xml');
    });

    it('should return correct required files for XLSX', () => {
      const compressor = officeCompressor as any;
      const requiredFiles = compressor.getRequiredFiles('xlsx');
      
      expect(requiredFiles).toContain('xl/workbook.xml');
      expect(requiredFiles).toContain('[Content_Types].xml');
    });

    it('should return correct required files for PPTX', () => {
      const compressor = officeCompressor as any;
      const requiredFiles = compressor.getRequiredFiles('pptx');
      
      expect(requiredFiles).toContain('ppt/presentation.xml');
      expect(requiredFiles).toContain('[Content_Types].xml');
    });

    it('should return correct required files for ODT', () => {
      const compressor = officeCompressor as any;
      const requiredFiles = compressor.getRequiredFiles('odt');
      
      expect(requiredFiles).toContain('content.xml');
      expect(requiredFiles).toContain('META-INF/manifest.xml');
    });
  });

  describe('memory management', () => {
    it('should handle large files with chunked processing', () => {
      // Create a large mock file (>10MB)
      const largeFile = { 
        name: 'large.docx',
        size: 15 * 1024 * 1024, // 15MB
      } as File;

      const compressor = officeCompressor as any;
      const shouldUseChunked = compressor.shouldUseChunkedProcessing(largeFile);

      expect(shouldUseChunked).toBe(true);
    });

    it('should handle small files without chunked processing', () => {
      const smallFile = { 
        name: 'small.docx',
        size: 1024 * 1024, // 1MB
      } as File;

      const compressor = officeCompressor as any;
      const shouldUseChunked = compressor.shouldUseChunkedProcessing(smallFile);

      expect(shouldUseChunked).toBe(false);
    });
  });
});