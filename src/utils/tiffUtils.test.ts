/**
 * Tests for TIFFUtils
 */

import TIFFUtils from './tiffUtils';

// Mock UTIF library
const mockUTIF = {
  decode: jest.fn(() => [
    {
      width: 800,
      height: 600,
      t258: [8], // BitsPerSample
      t277: 3, // SamplesPerPixel
      t262: 2, // PhotometricInterpretation
      t259: 1, // Compression
    },
  ]),
  decodeImage: jest.fn(),
  toRGBA8: jest.fn(() => new Uint8Array(800 * 600 * 4)),
};

jest.mock('utif', () => mockUTIF, { virtual: true });

// Mock File methods
const mockArrayBuffer = new ArrayBuffer(8);
const mockUint8Array = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x00]);
mockArrayBuffer.slice = jest.fn(() => mockArrayBuffer);

Object.defineProperty(File.prototype, 'arrayBuffer', {
  value: jest.fn(() => Promise.resolve(mockArrayBuffer)),
  writable: true,
});

Object.defineProperty(File.prototype, 'slice', {
  value: jest.fn(() => ({
    arrayBuffer: jest.fn(() => Promise.resolve(mockUint8Array.buffer)),
  })),
  writable: true,
});

describe('TIFFUtils', () => {
  let mockFile: File;

  beforeEach(() => {
    mockFile = new File(['mock-content'], 'test.tiff', { type: 'image/tiff' });
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when UTIF is available', () => {
      expect(TIFFUtils.isAvailable()).toBe(true);
    });
  });

  describe('validateTIFFSignature', () => {
    it('should validate little-endian TIFF signature', async () => {
      const littleEndianBytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00]);
      mockFile.slice = jest.fn(() => ({
        arrayBuffer: jest.fn(() => Promise.resolve(littleEndianBytes.buffer)),
      })) as any;

      const result = await TIFFUtils.validateTIFFSignature(mockFile);
      expect(result).toBe(true);
    });

    it('should validate big-endian TIFF signature', async () => {
      const bigEndianBytes = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a]);
      mockFile.slice = jest.fn(() => ({
        arrayBuffer: jest.fn(() => Promise.resolve(bigEndianBytes.buffer)),
      })) as any;

      const result = await TIFFUtils.validateTIFFSignature(mockFile);
      expect(result).toBe(true);
    });

    it('should reject invalid TIFF signature', async () => {
      const invalidBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG signature
      mockFile.slice = jest.fn(() => ({
        arrayBuffer: jest.fn(() => Promise.resolve(invalidBytes.buffer)),
      })) as any;

      const result = await TIFFUtils.validateTIFFSignature(mockFile);
      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      mockFile.slice = jest.fn(() => {
        throw new Error('File read error');
      }) as any;

      const result = await TIFFUtils.validateTIFFSignature(mockFile);
      expect(result).toBe(false);
    });
  });

  describe('parseTIFFMetadata', () => {
    it('should parse TIFF metadata successfully', async () => {
      const metadata = await TIFFUtils.parseTIFFMetadata(mockFile);

      expect(metadata).toEqual({
        width: 800,
        height: 600,
        bitsPerSample: 8,
        samplesPerPixel: 3,
        photometricInterpretation: 2,
        compression: 1,
        colorSpace: 'RGB',
        hasMultiplePages: false,
        pageCount: 1,
      });
    });

    it('should handle multi-page TIFF files', async () => {
      mockUTIF.decode.mockReturnValue([
        { width: 800, height: 600, t258: [8], t277: 3, t262: 2, t259: 1 },
        { width: 800, height: 600, t258: [8], t277: 3, t262: 2, t259: 1 },
        { width: 800, height: 600, t258: [8], t277: 3, t262: 2, t259: 1 },
      ]);

      const metadata = await TIFFUtils.parseTIFFMetadata(mockFile);

      expect(metadata.hasMultiplePages).toBe(true);
      expect(metadata.pageCount).toBe(3);
    });

    it('should handle parsing errors', async () => {
      mockFile.arrayBuffer = jest.fn(() => Promise.reject(new Error('Read error')));

      await expect(TIFFUtils.parseTIFFMetadata(mockFile)).rejects.toThrow('Failed to parse TIFF file: Read error');
    });
  });

  describe('tiffToCanvas', () => {
    beforeEach(() => {
      // Mock document.createElement
      global.document.createElement = jest.fn(() => ({
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          putImageData: jest.fn(),
        })),
      })) as any;

      // Mock ImageData constructor
      global.ImageData = jest.fn((data, width, height) => ({
        data,
        width,
        height,
      })) as any;
    });

    it('should convert TIFF to canvas', async () => {
      const canvas = await TIFFUtils.tiffToCanvas(mockFile);

      expect(mockUTIF.decode).toHaveBeenCalled();
      expect(mockUTIF.decodeImage).toHaveBeenCalled();
      expect(mockUTIF.toRGBA8).toHaveBeenCalled();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it('should handle multi-page TIFF with page index', async () => {
      mockUTIF.decode.mockReturnValue([
        { width: 800, height: 600, t258: [8], t277: 3, t262: 2, t259: 1 },
        { width: 400, height: 300, t258: [8], t277: 3, t262: 2, t259: 1 },
      ]);

      await TIFFUtils.tiffToCanvas(mockFile, 1);

      expect(mockUTIF.decode).toHaveBeenCalled();
      expect(mockUTIF.decodeImage).toHaveBeenCalled();
    });

    it('should handle conversion errors', async () => {
      mockUTIF.decode.mockImplementation(() => {
        throw new Error('Canvas conversion error');
      });

      await expect(TIFFUtils.tiffToCanvas(mockFile)).rejects.toThrow(
        'Failed to convert TIFF to canvas: Canvas conversion error'
      );
    });
  });

  describe('tiffToImageData', () => {
    it('should convert TIFF to ImageData', async () => {
      const imageData = await TIFFUtils.tiffToImageData(mockFile);

      expect(imageData.width).toBe(800);
      expect(imageData.height).toBe(600);
      expect(imageData.data).toBeInstanceOf(Uint8Array);
    });

    it('should handle context creation failure', async () => {
      global.document.createElement = jest.fn(() => ({
        width: 800,
        height: 600,
        getContext: jest.fn(() => null),
      })) as any;

      await expect(TIFFUtils.tiffToImageData(mockFile)).rejects.toThrow('Failed to get canvas context');
    });
  });

  describe('convertTIFFToFormat', () => {
    beforeEach(() => {
      // Mock canvas toBlob method
      global.document.createElement = jest.fn(() => ({
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          putImageData: jest.fn(),
        })),
        toBlob: jest.fn((callback, format) => {
          const mockBlob = new Blob(['mock-data'], { type: format });
          callback(mockBlob);
        }),
      })) as any;
    });

    it('should convert TIFF to JPEG', async () => {
      const result = await TIFFUtils.convertTIFFToFormat(mockFile, 'image/jpeg', 0.8);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
    });

    it('should convert TIFF to PNG', async () => {
      const result = await TIFFUtils.convertTIFFToFormat(mockFile, 'image/png', 1.0);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
    });

    it('should convert TIFF to WebP', async () => {
      const result = await TIFFUtils.convertTIFFToFormat(mockFile, 'image/webp', 0.9);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
    });

    it('should handle conversion with page index', async () => {
      mockUTIF.decode.mockReturnValue([
        { width: 800, height: 600, t258: [8], t277: 3, t262: 2, t259: 1 },
        { width: 400, height: 300, t258: [8], t277: 3, t262: 2, t259: 1 },
      ]);

      await TIFFUtils.convertTIFFToFormat(mockFile, 'image/jpeg', 0.8, 1);

      expect(mockUTIF.decode).toHaveBeenCalled();
    });

    it('should handle conversion failure', async () => {
      global.document.createElement = jest.fn(() => ({
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          putImageData: jest.fn(),
        })),
        toBlob: jest.fn(callback => callback(null)),
      })) as any;

      await expect(TIFFUtils.convertTIFFToFormat(mockFile, 'image/jpeg', 0.8)).rejects.toThrow(
        'Failed to convert TIFF to image/jpeg'
      );
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = TIFFUtils.getCapabilities();

      expect(capabilities).toEqual({
        available: true,
        canParse: true,
        canConvert: true,
        supportedOutputFormats: ['image/jpeg', 'image/png', 'image/webp'],
        supportsMultiPage: true,
        supportsMetadata: true,
      });
    });
  });
});
