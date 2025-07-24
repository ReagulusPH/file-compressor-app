/**
 * Tests for CanvasImageCompressor with TIFF support
 */

import { CanvasImageCompressor } from './CanvasImageCompressor';
import { CompressionSettings } from '../../types';
import TIFFUtils from '../../utils/tiffUtils';

// Mock TIFFUtils
jest.mock('../../utils/tiffUtils');
const mockTIFFUtils = TIFFUtils as jest.Mocked<typeof TIFFUtils>;

// Mock MemoryManager
jest.mock('../../utils/memory/MemoryManager', () => ({
  checkMemory: jest.fn(() => true),
  cleanup: jest.fn(),
}));

// Mock Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
  })),
  toBlob: jest.fn(),
};

const mockCreateElement = jest.fn(() => mockCanvas);
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

// Mock Image constructor
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
  width: 800,
  height: 600,
};

global.Image = jest.fn(() => mockImage) as any;
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
} as any;

describe('CanvasImageCompressor TIFF Support', () => {
  let compressor: CanvasImageCompressor;
  let mockFile: File;
  let settings: CompressionSettings;

  beforeEach(() => {
    compressor = new CanvasImageCompressor();
    mockFile = new File(['mock-content'], 'test.tiff', { type: 'image/tiff' });
    settings = {
      quality: 80,
      outputFormat: 'jpeg',
      tiffSettings: {
        pageIndex: 0,
        preserveMetadata: true,
        convertToFormat: 'jpeg'
      }
    };

    // Reset mocks
    jest.clearAllMocks();
    mockTIFFUtils.isAvailable.mockReturnValue(true);
    mockTIFFUtils.validateTIFFSignature.mockResolvedValue(true);
    mockTIFFUtils.parseTIFFMetadata.mockResolvedValue({
      width: 800,
      height: 600,
      bitsPerSample: 8,
      samplesPerPixel: 3,
      photometricInterpretation: 2,
      compression: 1,
      colorSpace: 'RGB',
      hasMultiplePages: false,
      pageCount: 1
    });
    mockTIFFUtils.tiffToCanvas.mockResolvedValue(mockCanvas as any);
    
    mockCanvas.toBlob.mockImplementation((callback) => {
      const mockBlob = new Blob(['compressed-data'], { type: 'image/jpeg' });
      callback(mockBlob);
    });
  });

  describe('TIFF Detection', () => {
    it('should detect TIFF files by extension', () => {
      const tiffFile = new File(['content'], 'test.tiff', { type: 'image/tiff' });
      const isTiff = (compressor as any).isTIFFFile(tiffFile);
      expect(isTiff).toBe(true);
    });

    it('should detect TIF files by extension', () => {
      const tifFile = new File(['content'], 'test.tif', { type: 'image/tiff' });
      const isTiff = (compressor as any).isTIFFFile(tifFile);
      expect(isTiff).toBe(true);
    });

    it('should detect TIFF files by MIME type', () => {
      const tiffFile = new File(['content'], 'test.jpg', { type: 'image/tiff' });
      const isTiff = (compressor as any).isTIFFFile(tiffFile);
      expect(isTiff).toBe(true);
    });

    it('should not detect non-TIFF files', () => {
      const jpegFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const isTiff = (compressor as any).isTIFFFile(jpegFile);
      expect(isTiff).toBe(false);
    });
  });

  describe('TIFF Compression', () => {
    it('should compress TIFF files successfully', async () => {
      const result = await compressor.compressImage(mockFile, settings);

      expect(mockTIFFUtils.isAvailable).toHaveBeenCalled();
      expect(mockTIFFUtils.validateTIFFSignature).toHaveBeenCalledWith(mockFile);
      expect(mockTIFFUtils.parseTIFFMetadata).toHaveBeenCalledWith(mockFile);
      expect(mockTIFFUtils.tiffToCanvas).toHaveBeenCalledWith(mockFile);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
    });

    it('should handle TIFF compression with progress callback', async () => {
      const progressCallback = jest.fn();
      
      await compressor.compressImage(mockFile, settings, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(10);
      expect(progressCallback).toHaveBeenCalledWith(20);
      expect(progressCallback).toHaveBeenCalledWith(30);
      expect(progressCallback).toHaveBeenCalledWith(40);
      expect(progressCallback).toHaveBeenCalledWith(60);
      expect(progressCallback).toHaveBeenCalledWith(80);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should throw error when UTIF is not available', async () => {
      mockTIFFUtils.isAvailable.mockReturnValue(false);

      await expect(compressor.compressImage(mockFile, settings))
        .rejects.toThrow('UTIF library is not available');
    });

    it('should throw error for invalid TIFF signature', async () => {
      mockTIFFUtils.validateTIFFSignature.mockResolvedValue(false);

      await expect(compressor.compressImage(mockFile, settings))
        .rejects.toThrow('Invalid TIFF file signature');
    });

    it('should handle TIFF parsing errors', async () => {
      mockTIFFUtils.parseTIFFMetadata.mockRejectedValue(new Error('Parse error'));

      await expect(compressor.compressImage(mockFile, settings))
        .rejects.toThrow('TIFF compression failed: Parse error');
    });
  });

  describe('TIFF Format Conversion', () => {
    it('should convert TIFF to JPEG', async () => {
      const mockBlob = new Blob(['converted-data'], { type: 'image/jpeg' });
      mockTIFFUtils.convertTIFFToFormat.mockResolvedValue(mockBlob);

      const result = await compressor.convertTIFFFormat(mockFile, 'jpeg', 80);

      expect(mockTIFFUtils.convertTIFFToFormat).toHaveBeenCalledWith(
        mockFile,
        'image/jpeg',
        0.8
      );
      expect(result).toBe(mockBlob);
    });

    it('should convert TIFF to PNG', async () => {
      const mockBlob = new Blob(['converted-data'], { type: 'image/png' });
      mockTIFFUtils.convertTIFFToFormat.mockResolvedValue(mockBlob);

      const result = await compressor.convertTIFFFormat(mockFile, 'png', 90);

      expect(mockTIFFUtils.convertTIFFToFormat).toHaveBeenCalledWith(
        mockFile,
        'image/png',
        0.9
      );
      expect(result).toBe(mockBlob);
    });

    it('should convert TIFF to WebP', async () => {
      const mockBlob = new Blob(['converted-data'], { type: 'image/webp' });
      mockTIFFUtils.convertTIFFToFormat.mockResolvedValue(mockBlob);

      const result = await compressor.convertTIFFFormat(mockFile, 'webp', 70);

      expect(mockTIFFUtils.convertTIFFToFormat).toHaveBeenCalledWith(
        mockFile,
        'image/webp',
        0.7
      );
      expect(result).toBe(mockBlob);
    });

    it('should handle conversion errors', async () => {
      mockTIFFUtils.convertTIFFToFormat.mockRejectedValue(new Error('Conversion error'));

      await expect(compressor.convertTIFFFormat(mockFile, 'jpeg', 80))
        .rejects.toThrow('TIFF format conversion failed: Conversion error');
    });

    it('should throw error when UTIF is not available for conversion', async () => {
      mockTIFFUtils.isAvailable.mockReturnValue(false);

      await expect(compressor.convertTIFFFormat(mockFile, 'jpeg', 80))
        .rejects.toThrow('UTIF library is not available');
    });
  });

  describe('Standard Image Processing', () => {
    it('should process non-TIFF images normally', async () => {
      const jpegFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await compressor.compressImage(jpegFile, settings);

      expect(mockTIFFUtils.isAvailable).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
    });
  });
});